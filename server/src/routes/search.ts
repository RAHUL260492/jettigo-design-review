import { and, eq, gte, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Ctx } from "../app.js";
import { aircraft, airports, operators, quoteRequests, quotes } from "../db/schema.js";
import { currentUser } from "../lib/auth.js";
import { badRequest, notFound, parse } from "../lib/errors.js";
import { distanceNm, flightMinutes, inRange, quotePriceCents } from "../lib/pricing.js";
import { quotesForRequests } from "../lib/views.js";

const QUOTE_TTL_MS = 30 * 60 * 1000;
const MIN_LEAD_MS = 2 * 60 * 60 * 1000;
const MAX_LEAD_MS = 365 * 24 * 60 * 60 * 1000;

const searchBody = z.object({
  origin: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  destination: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  departAt: z.iso.datetime({ offset: true }),
  passengers: z.number().int().min(1).max(19),
  bags: z.number().int().min(0).max(40).default(0),
  baggageKg: z.number().int().min(0).max(1000).default(0),
});

export async function searchRoutes(app: FastifyInstance, { db, cfg }: Ctx) {
  app.post("/search", async (req) => {
    const body = parse(searchBody, req.body);
    if (body.origin === body.destination) throw badRequest("Origin and destination must differ");
    const departAt = new Date(body.departAt);
    const lead = departAt.getTime() - Date.now();
    if (lead < MIN_LEAD_MS) throw badRequest("Departure must be at least 2 hours from now");
    if (lead > MAX_LEAD_MS) throw badRequest("Departure must be within the next 12 months");

    const found = await db.select().from(airports).where(inArray(airports.code, [body.origin, body.destination]));
    const from = found.find((a) => a.code === body.origin);
    const to = found.find((a) => a.code === body.destination);
    if (!from || !to) throw badRequest("Unknown airport");
    const nm = Math.round(distanceNm(from, to));
    const user = await currentUser(req, db, cfg.jwtSecret);

    const fleet = await db
      .select({ aircraft })
      .from(aircraft)
      .innerJoin(operators, eq(aircraft.operatorId, operators.id))
      .where(and(eq(operators.status, "approved"), eq(aircraft.active, true), gte(aircraft.seats, body.passengers)));
    const eligible = fleet.map((f) => f.aircraft).filter((a) => inRange(a.rangeNm, nm));

    const request = await db.transaction(async (tx) => {
      const [r] = await tx
        .insert(quoteRequests)
        .values({
          userId: user?.id ?? null,
          origin: from.code,
          destination: to.code,
          departAt,
          passengers: body.passengers,
          bags: body.bags,
          baggageKg: body.baggageKg,
          distanceNm: nm,
        })
        .returning();
      if (!r) throw new Error("insert failed");
      if (eligible.length) {
        const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
        await tx.insert(quotes).values(
          eligible.map((a) => {
            const minutes = flightMinutes(nm, a.cruiseKts);
            const price = quotePriceCents(a.hourlyRateCents, minutes);
            return { requestId: r.id, operatorId: a.operatorId, aircraftId: a.id, priceCents: price, standardPriceCents: price, flightMinutes: minutes, expiresAt };
          }),
        );
      }
      return r;
    });

    return { request: { ...request, origin: from, destination: to }, quotes: await quotesForRequests(db, [request.id]) };
  });

  app.get("/quote-requests/:id", async (req) => {
    const { id } = parse(z.object({ id: z.uuid() }), req.params);
    const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id)).limit(1);
    if (!request) throw notFound("Quote request");
    if (request.userId) {
      const user = await currentUser(req, db, cfg.jwtSecret);
      if (user?.id !== request.userId) throw notFound("Quote request");
    }
    const codes = await db.select().from(airports).where(inArray(airports.code, [request.origin, request.destination]));
    return {
      request: { ...request, origin: codes.find((a) => a.code === request.origin), destination: codes.find((a) => a.code === request.destination) },
      quotes: await quotesForRequests(db, [request.id]),
    };
  });
}
