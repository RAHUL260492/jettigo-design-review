import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Ctx } from "../app.js";
import { otpCodes, users } from "../db/schema.js";
import { publicUser, signToken } from "../lib/auth.js";
import { hashOtp, otpCode, safeEqualHex, shortCode } from "../lib/crypto.js";
import { HttpError, parse } from "../lib/errors.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 5;

const email = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));

export async function newReferralCode(db: Ctx["db"]): Promise<string> {
  for (;;) {
    const code = `JETTIGO-${shortCode(6)}`;
    const [hit] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, code)).limit(1);
    if (!hit) return code;
  }
}

export async function authRoutes(app: FastifyInstance, { db, cfg }: Ctx) {
  // Per-IP throttle; the per-email limit below also applies. Relaxed in tests, which share one IP.
  const tight = { rateLimit: { max: cfg.env === "test" ? 10_000 : 10, timeWindow: "15 minutes" } };

  app.post("/auth/otp", { config: tight }, async (req) => {
    const body = parse(z.object({ email }), req.body);
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const [recent] = await db
      .select({ n: count() })
      .from(otpCodes)
      .where(and(eq(otpCodes.email, body.email), gt(otpCodes.createdAt, since)));
    if ((recent?.n ?? 0) >= MAX_CODES_PER_WINDOW) {
      throw new HttpError(429, "rate_limited", "Too many codes requested. Try again in a few minutes.");
    }
    const code = otpCode();
    // A new code supersedes any earlier ones for this email.
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(and(eq(otpCodes.email, body.email), isNull(otpCodes.consumedAt)));
    await db.insert(otpCodes).values({
      email: body.email,
      codeHash: hashOtp(cfg.jwtSecret, body.email, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    // No email provider is connected yet: log in development, optionally echo for demos.
    if (cfg.env !== "production") req.log.info({ email: body.email, code }, "one-time code");
    return { sent: true, expiresInSeconds: OTP_TTL_MS / 1000, ...(cfg.demoOtp ? { demoCode: code } : {}) };
  });

  app.post("/auth/verify", { config: tight }, async (req) => {
    const body = parse(
      z.object({ email, code: z.string().regex(/^\d{6}$/), name: z.string().trim().max(120).optional(), referralCode: z.string().max(40).optional() }),
      req.body,
    );
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.email, body.email), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    if (!otp) throw new HttpError(400, "invalid_code", "Code expired or not found. Request a new one.");
    if (otp.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "too_many_attempts", "Too many attempts. Request a new code.");

    if (!safeEqualHex(otp.codeHash, hashOtp(cfg.jwtSecret, body.email, body.code))) {
      await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.id, otp.id));
      throw new HttpError(400, "invalid_code", "That code is not correct.");
    }
    // Consume atomically so a code can only be used once, even under concurrent requests.
    const consumed = await db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpCodes.id, otp.id), isNull(otpCodes.consumedAt)))
      .returning({ id: otpCodes.id });
    if (consumed.length === 0) throw new HttpError(400, "invalid_code", "Code already used. Request a new one.");

    let [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (!user) {
      let referredBy: string | null = null;
      if (body.referralCode) {
        const [ref] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, body.referralCode.toUpperCase())).limit(1);
        referredBy = ref?.id ?? null;
      }
      [user] = await db
        .insert(users)
        .values({ email: body.email, name: body.name ?? null, referralCode: await newReferralCode(db), referredBy })
        .onConflictDoNothing({ target: users.email })
        .returning();
      if (!user) [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    }
    if (!user) throw new HttpError(500, "internal", "Could not create account");
    return { token: await signToken(cfg.jwtSecret, user), user: publicUser(user) };
  });
}
