import { and, asc, count, desc, eq, gt, gte, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Ctx } from "../app.js";
import { aircraft, airports, operators, quoteRequests, quotes, users } from "../db/schema.js";
import { requireRole, requireUser } from "../lib/auth.js";
import { badRequest, conflict, forbidden, notFound, parse } from "../lib/errors.js";
import { aircraftView, effectiveStatus, quotesForRequests } from "../lib/views.js";
import { newReferralCode } from "./auth.js";

const email = z.string().trim().toLowerCase().pipe(z.email());

const aircraftInput = z.object({
  model: z.string().trim().min(2).max(80),
  category: z.enum(["light", "mid", "heavy", "ulr", "helicopter"]),
  tailNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,10}$/),
  seats: z.number().int().min(1).max(19),
  rangeNm: z.number().int().min(100).max(8500),
  cruiseKts: z.number().int().min(100).max(520).optional(),
  hourlyRateCents: z.number().int().min(50_000).max(5_000_000),
  yearOfManufacture: z.number().int().min(1970).max(new Date().getFullYear() + 1).optional(),
  cabinHeightIn: z.number().int().min(40).max(90).optional(),
  baggageCuFt: z.number().int().min(0).max(500).optional(),
});

export async function operatorRoutes(app: FastifyInstance, { db, cfg }: Ctx) {
  async function operatorOf(req: FastifyRequest, { allowPending = false } = {}) {
    const user = await requireUser(req, db, cfg.jwtSecret);
    if (user.role !== "operator" || !user.operatorId) throw forbidden("Operator account required");
    const [op] = await db.select().from(operators).where(eq(operators.id, user.operatorId)).limit(1);
    if (!op) throw forbidden("Operator account required");
    if (!allowPending && op.status !== "approved") throw forbidden(op.status === "pending" ? "Your application is under review" : "Your application was not approved");
    return { user, op };
  }

  // ---------- Partner onboarding ----------
  app.post("/partners/apply", { config: { rateLimit: { max: cfg.env === "test" ? 10_000 : 5, timeWindow: "1 hour" } } }, async (req, reply) => {
    const body = parse(
      z.object({
        companyName: z.string().trim().min(2).max(120),
        contactName: z.string().trim().min(2).max(120),
        email,
        kind: z.enum(["operator", "provider"]),
        aocNumber: z.string().trim().max(40).optional(),
        country: z.string().trim().min(2).max(56),
        yearsInOperation: z.number().int().min(0).max(100).optional(),
        services: z.array(z.enum(["catering", "ground", "concierge", "fbo"])).max(4).default([]),
      }),
      req.body,
    );
    if (body.kind === "operator" && !body.aocNumber) throw badRequest("Operators must provide an air operator certificate number");
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (existing) throw conflict("An account with this email already exists. Use a dedicated email for your partner account.");
    const referralCode = await newReferralCode(db);
    const result = await db.transaction(async (tx) => {
      const [op] = await tx
        .insert(operators)
        .values({ name: body.companyName, kind: body.kind, aocNumber: body.aocNumber, country: body.country, yearsInOperation: body.yearsInOperation, services: body.services })
        .returning();
      await tx.insert(users).values({ email: body.email, name: body.contactName, role: "operator", operatorId: op!.id, referralCode });
      return op!;
    });
    reply.status(201);
    return { applicationId: result.id, status: result.status };
  });

  app.get("/partners/applications/:id", async (req) => {
    const { id } = parse(z.object({ id: z.uuid() }), req.params);
    const [op] = await db.select({ id: operators.id, name: operators.name, status: operators.status }).from(operators).where(eq(operators.id, id)).limit(1);
    if (!op) throw notFound("Application");
    return op;
  });

  // ---------- Operator portal ----------
  app.get("/operator/me", async (req) => {
    const { op } = await operatorOf(req, { allowPending: true });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total] = await db.select({ n: count() }).from(quotes).where(and(eq(quotes.operatorId, op.id), gte(quotes.createdAt, since)));
    const [won] = await db.select({ n: count() }).from(quotes).where(and(eq(quotes.operatorId, op.id), eq(quotes.status, "accepted"), gte(quotes.createdAt, since)));
    return { operator: op, stats: { quotes30d: total?.n ?? 0, won30d: won?.n ?? 0, winRate: total?.n ? (won?.n ?? 0) / total.n : 0 } };
  });

  app.get("/operator/aircraft", async (req) => {
    const { op } = await operatorOf(req, { allowPending: true });
    const rows = await db.select().from(aircraft).where(eq(aircraft.operatorId, op.id)).orderBy(asc(aircraft.model));
    return { aircraft: rows.map((a) => ({ ...aircraftView(a), active: a.active })) };
  });

  app.post("/operator/aircraft", async (req, reply) => {
    const { op } = await operatorOf(req, { allowPending: true });
    const body = parse(aircraftInput, req.body);
    const cruise = body.cruiseKts ?? (body.category === "helicopter" ? 150 : body.category === "ulr" ? 488 : body.category === "heavy" ? 460 : 430);
    const [a] = await db.insert(aircraft).values({ ...body, cruiseKts: cruise, operatorId: op.id }).returning();
    reply.status(201);
    return { aircraft: aircraftView(a!) };
  });

  app.patch("/operator/aircraft/:id", async (req) => {
    const { op } = await operatorOf(req, { allowPending: true });
    const { id } = parse(z.object({ id: z.uuid() }), req.params);
    const body = parse(z.object({ hourlyRateCents: aircraftInput.shape.hourlyRateCents.optional(), active: z.boolean().optional() }).refine((v) => Object.keys(v).length > 0, "Provide at least one field"), req.body);
    const [a] = await db.update(aircraft).set(body).where(and(eq(aircraft.id, id), eq(aircraft.operatorId, op.id))).returning();
    if (!a) throw notFound("Aircraft");
    return { aircraft: { ...aircraftView(a), active: a.active } };
  });

  app.get("/operator/requests", async (req) => {
    const { op } = await operatorOf(req);
    const now = new Date();
    const open = await db
      .select({ request: quoteRequests })
      .from(quoteRequests)
      .innerJoin(quotes, eq(quotes.requestId, quoteRequests.id))
      .where(and(eq(quoteRequests.status, "open"), gt(quoteRequests.departAt, now), eq(quotes.operatorId, op.id), inArray(quotes.status, ["offered", "countered"]), gt(quotes.expiresAt, now)))
      .orderBy(asc(quoteRequests.departAt))
      .limit(50);
    const requests = [...new Map(open.map((o) => [o.request.id, o.request])).values()];
    const myQuotes = await quotesForRequests(db, requests.map((r) => r.id), op.id);
    const codes = [...new Set(requests.flatMap((r) => [r.origin, r.destination]))];
    const ports = codes.length ? await db.select().from(airports).where(inArray(airports.code, codes)) : [];
    return {
      requests: requests.map((r) => ({
        id: r.id,
        origin: ports.find((p) => p.code === r.origin),
        destination: ports.find((p) => p.code === r.destination),
        departAt: r.departAt,
        passengers: r.passengers,
        bags: r.bags,
        baggageKg: r.baggageKg,
        distanceNm: r.distanceNm,
        quotes: myQuotes.filter((q) => q.requestId === r.id),
      })),
    };
  });

  app.post("/operator/quotes/:id/respond", async (req) => {
    const { op } = await operatorOf(req);
    const { id } = parse(z.object({ id: z.uuid() }), req.params);
    const body = parse(
      z.discriminatedUnion("action", [
        z.object({ action: z.literal("accept") }),
        z.object({ action: z.literal("counter"), priceCents: z.number().int().positive() }),
        z.object({ action: z.literal("decline"), reason: z.string().trim().min(3).max(200) }),
      ]),
      req.body,
    );
    return db.transaction(async (tx) => {
      const [pointer] = await tx.select().from(quotes).where(and(eq(quotes.id, id), eq(quotes.operatorId, op.id)));
      if (!pointer) throw notFound("Quote");
      await tx.select().from(quoteRequests).where(eq(quoteRequests.id, pointer.requestId)).for("update");
      const [row] = await tx
        .select({ quote: quotes, request: quoteRequests })
        .from(quotes)
        .innerJoin(quoteRequests, eq(quotes.requestId, quoteRequests.id))
        .where(and(eq(quotes.id, id), eq(quotes.operatorId, op.id)))
        .limit(1);
      if (!row) throw notFound("Quote");
      const status = effectiveStatus(row.quote);
      if ((status !== "offered" && status !== "countered") || row.request.status !== "open") throw conflict("This request can no longer be answered");
  
      const patch =
        body.action === "accept"
          ? { status: "offered" as const, priceCents: row.quote.standardPriceCents, operatorConfirmed: true }
          : body.action === "counter"
            ? (() => {
                const std = row.quote.standardPriceCents;
                if (body.priceCents < std * 0.5 || body.priceCents > std * 3) throw badRequest("Counter offer must be between 50% and 300% of the standard rate");
                return { status: "countered" as const, priceCents: body.priceCents, operatorConfirmed: true };
              })()
            : { status: "declined" as const, declineReason: body.reason, operatorConfirmed: true };
      const [q] = await tx.update(quotes).set(patch).where(eq(quotes.id, id)).returning();
      return { quote: { id: q!.id, status: q!.status, priceCents: q!.priceCents, declineReason: q!.declineReason } };
    });
  });

  // ---------- Platform admin ----------
  app.get("/admin/operators", async (req) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    requireRole(user, "admin");
    const q = parse(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }), req.query);
    const rows = await db.select().from(operators).where(q.status ? eq(operators.status, q.status) : undefined).orderBy(desc(operators.createdAt));
    return { operators: rows };
  });

  app.post("/admin/operators/:id/decision", async (req) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    requireRole(user, "admin");
    const { id } = parse(z.object({ id: z.uuid() }), req.params);
    const body = parse(z.object({ decision: z.enum(["approve", "reject"]) }), req.body);
    const [op] = await db
      .update(operators)
      .set({ status: body.decision === "approve" ? "approved" : "rejected" })
      .where(eq(operators.id, id))
      .returning();
    if (!op) throw notFound("Operator");
    return { operator: op };
  });
}
