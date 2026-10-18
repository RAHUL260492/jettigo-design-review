import { and, countDistinct, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Ctx } from "../app.js";
import { bookings, companies, users } from "../db/schema.js";
import { publicUser, requireUser } from "../lib/auth.js";
import { parse } from "../lib/errors.js";
import { TIERS } from "../lib/pricing.js";

const REFERRAL_CREDIT_CENTS = 100_000;

export async function meRoutes(app: FastifyInstance, { db, cfg }: Ctx) {
  app.get("/me", async (req) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    const [company] = user.companyId ? await db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.id, user.companyId)) : [];
    return { user: publicUser(user), company: company ?? null };
  });

  app.patch("/me", async (req) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    const body = parse(
      z.object({ name: z.string().trim().min(1).max(120).optional(), phone: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/).optional() }),
      req.body,
    );
    const [u] = await db.update(users).set(body).where(eq(users.id, user.id)).returning();
    return { user: publicUser(u!) };
  });

  // Mock purchase: payment provider integration replaces this when payments go live.
  app.post("/me/membership", async (req) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    const body = parse(z.object({ tier: z.enum(["silver", "gold", "elite"]) }), req.body);
    const [u] = await db.update(users).set({ tier: body.tier }).where(eq(users.id, user.id)).returning();
    return { user: publicUser(u!), charged: { amountCents: TIERS[body.tier].priceCents, provider: "mock" } };
  });

  app.get("/me/referral", async (req) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    const [joined] = await db.select({ n: countDistinct(users.id) }).from(users).where(eq(users.referredBy, user.id));
    const [flown] = await db
      .select({ n: countDistinct(users.id) })
      .from(users)
      .innerJoin(bookings, and(eq(bookings.userId, users.id), eq(bookings.status, "confirmed")))
      .where(eq(users.referredBy, user.id));
    return { code: user.referralCode, friendsJoined: joined?.n ?? 0, creditsEarnedCents: (flown?.n ?? 0) * REFERRAL_CREDIT_CENTS };
  });
}
