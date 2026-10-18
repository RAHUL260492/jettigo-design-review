import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Ctx } from "../app.js";
import type { DB } from "../db/client.js";
import {
  aircraft,
  airports,
  amenities,
  bookingAmenities,
  bookings,
  companies,
  groundTransfers,
  invoices,
  payments,
  quoteRequests,
  quotes,
  travelers,
} from "../db/schema.js";
import { requireUser, type User } from "../lib/auth.js";
import { decrypt, encrypt, shortCode } from "../lib/crypto.js";
import { badRequest, conflict, notFound, parse } from "../lib/errors.js";
import { feesCents, VEHICLES } from "../lib/pricing.js";
import { aircraftView, effectiveStatus } from "../lib/views.js";

type Booking = typeof bookings.$inferSelect;

const idParam = z.object({ id: z.uuid() });
const CHAUFFEURS = [
  { name: "Alexander", plate: "JTG-007" },
  { name: "Marco", plate: "JTG-214" },
  { name: "Élodie", plate: "JTG-391" },
];

/** Owner, a company admin/booker of the same company, or platform admin. Anyone else gets 404. */
export async function loadBooking(db: DB, user: User, id: string): Promise<Booking> {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  const companyAccess = !!b?.companyId && b.companyId === user.companyId && (user.companyRole === "admin" || user.companyRole === "booker");
  if (!b || !(b.userId === user.id || companyAccess || user.role === "admin")) throw notFound("Booking");
  return b;
}

async function uniqueRef(db: DB): Promise<string> {
  for (;;) {
    const ref = `JG-${shortCode(6)}`;
    const [hit] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.ref, ref)).limit(1);
    if (!hit) return ref;
  }
}

export async function bookingView(db: DB, b: Booking) {
  const [[ac], trav, amen, [ground], pays, ports] = await Promise.all([
    db.select().from(aircraft).where(eq(aircraft.id, b.aircraftId)).limit(1),
    db.select().from(travelers).where(eq(travelers.bookingId, b.id)).orderBy(asc(travelers.position)),
    db.select().from(bookingAmenities).where(eq(bookingAmenities.bookingId, b.id)),
    db.select().from(groundTransfers).where(eq(groundTransfers.bookingId, b.id)).orderBy(desc(groundTransfers.createdAt)).limit(1),
    db.select().from(payments).where(eq(payments.bookingId, b.id)).orderBy(desc(payments.createdAt)),
    db.select().from(airports).where(inArray(airports.code, [b.origin, b.destination])),
  ]);
  return {
    id: b.id,
    ref: b.ref,
    status: b.status,
    origin: ports.find((p) => p.code === b.origin),
    destination: ports.find((p) => p.code === b.destination),
    departAt: b.departAt,
    flightMinutes: b.flightMinutes,
    passengers: b.passengers,
    aircraft: ac ? aircraftView(ac) : null,
    price: { flightCents: b.flightCents, amenitiesCents: b.amenitiesCents, feesCents: b.feesCents, totalCents: b.totalCents },
    paymentMethod: b.paymentMethod,
    payment: pays[0] ? { status: pays[0].status, method: pays[0].method, amountCents: pays[0].amountCents } : null,
    travelers: trav.map((t) => ({
      position: t.position,
      fullName: t.fullName,
      passport: `•••• ${t.passportLast4}`,
      nationality: t.nationality,
      dateOfBirth: t.dateOfBirth,
      verified: t.verified,
    })),
    amenities: amen.map((a) => ({ code: a.code, priceCents: a.priceCents })),
    specialRequests: b.specialRequests,
    ground: ground
      ? { vehicle: ground.vehicle, vehicleName: VEHICLES[ground.vehicle].name, destination: ground.destination, meetAndGreet: ground.meetAndGreet, priceCents: ground.priceCents, chauffeur: { name: ground.chauffeurName, plate: ground.plate } }
      : null,
    companyId: b.companyId,
    createdAt: b.createdAt,
  };
}

/** Simulated day-of-travel status derived from the schedule (no live flight feed yet). */
export function liveStatus(b: Booking, origin: { lat: number; lon: number }, dest: { lat: number; lon: number }, now = new Date()) {
  const dep = b.departAt.getTime();
  const arr = dep + b.flightMinutes * 60_000;
  const t = now.getTime();
  const min = 60_000;
  const phase = t < dep - 40 * min ? "scheduled" : t < dep ? "boarding" : t < arr ? "in_flight" : "landed";
  const progress = phase === "in_flight" ? (t - dep) / (arr - dep) : phase === "landed" ? 1 : 0;
  const cruise = Math.min(progress, 1 - progress) * b.flightMinutes > 20;
  return {
    simulated: true,
    phase,
    countdownSeconds: Math.max(0, Math.round((dep - t) / 1000)),
    minutesToArrival: phase === "landed" ? 0 : Math.max(0, Math.round((arr - t) / min)),
    progress: Math.round(progress * 1000) / 1000,
    position: { lat: origin.lat + (dest.lat - origin.lat) * progress, lon: origin.lon + (dest.lon - origin.lon) * progress },
    altitudeFt: phase === "in_flight" ? (cruise ? 41_000 : 18_000) : 0,
    groundSpeedKts: phase === "in_flight" ? (cruise ? 480 : 320) : 0,
    readiness: {
      baggageLoaded: t >= dep - 90 * min,
      fuelingComplete: t >= dep - 60 * min,
      boardingOpen: t >= dep - 40 * min,
    },
    crew: [
      { role: "Captain", name: "David Lee" },
      { role: "Lead flight attendant", name: "Sarah Kim" },
    ],
  };
}

const travelerInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  passportNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,15}$/, "Passport number must be 5–15 letters or digits"),
  nationality: z.string().trim().min(2).max(56),
  dateOfBirth: z.iso.date().refine((d) => new Date(d) < new Date(), "Date of birth must be in the past"),
});

export async function bookingRoutes(app: FastifyInstance, { db, cfg }: Ctx) {
  const auth = (req: Parameters<typeof requireUser>[0]) => requireUser(req, db, cfg.jwtSecret);

  app.post("/bookings", async (req, reply) => {
    const user = await auth(req);
    const body = parse(z.object({ quoteId: z.uuid() }), req.body);
    const [row] = await db
      .select({ quote: quotes, request: quoteRequests })
      .from(quotes)
      .innerJoin(quoteRequests, eq(quotes.requestId, quoteRequests.id))
      .where(eq(quotes.id, body.quoteId))
      .limit(1);
    if (!row || (row.request.userId && row.request.userId !== user.id)) throw notFound("Quote");
    const status = effectiveStatus(row.quote);
    if (status !== "offered" && status !== "countered") throw conflict("This quote is no longer available. Search again for fresh quotes.");
    if (row.request.status !== "open") throw conflict("This trip has already been booked");

    const [existing] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.quoteId, row.quote.id), eq(bookings.userId, user.id), eq(bookings.status, "draft")))
      .limit(1);
    if (existing) return bookingView(db, existing);

    if (!row.request.userId) {
      await db.update(quoteRequests).set({ userId: user.id }).where(and(eq(quoteRequests.id, row.request.id), isNull(quoteRequests.userId)));
    }
    const flight = row.quote.priceCents;
    const fees = feesCents(flight);
    const [b] = await db
      .insert(bookings)
      .values({
        ref: await uniqueRef(db),
        userId: user.id,
        companyId: user.companyId,
        quoteId: row.quote.id,
        aircraftId: row.quote.aircraftId,
        origin: row.request.origin,
        destination: row.request.destination,
        departAt: row.request.departAt,
        flightMinutes: row.quote.flightMinutes,
        passengers: row.request.passengers,
        flightCents: flight,
        feesCents: fees,
        totalCents: flight + fees,
      })
      .returning();
    reply.status(201);
    return bookingView(db, b!);
  });

  app.get("/bookings", async (req) => {
    const user = await auth(req);
    const rows = await db.select().from(bookings).where(eq(bookings.userId, user.id)).orderBy(desc(bookings.departAt));
    return { bookings: await Promise.all(rows.map((b) => bookingView(db, b))) };
  });

  app.get("/bookings/:id", async (req) => {
    const user = await auth(req);
    const { id } = parse(idParam, req.params);
    return bookingView(db, await loadBooking(db, user, id));
  });

  app.put("/bookings/:id/travelers", async (req) => {
    const user = await auth(req);
    const { id } = parse(idParam, req.params);
    const b = await loadBooking(db, user, id);
    if (b.status !== "draft") throw conflict("Travelers can only be changed before payment");
    const body = parse(z.object({ travelers: z.array(travelerInput).min(1).max(19) }), req.body);
    if (body.travelers.length !== b.passengers) throw conflict(`This booking needs exactly ${b.passengers} travelers`);

    const old = await db.select().from(travelers).where(eq(travelers.bookingId, b.id));
    await db.transaction(async (tx) => {
      await tx.delete(travelers).where(eq(travelers.bookingId, b.id));
      await tx.insert(travelers).values(
        body.travelers.map((t, i) => {
          const prev = old.find((o) => o.position === i + 1);
          // Keep a completed identity check only if none of the identity fields changed.
          const same = !!prev && prev.fullName === t.fullName && prev.nationality === t.nationality && prev.dateOfBirth === t.dateOfBirth && decrypt(cfg.piiKey, prev.passportEnc) === t.passportNumber;
          return {
            bookingId: b.id,
            position: i + 1,
            fullName: t.fullName,
            passportEnc: encrypt(cfg.piiKey, t.passportNumber),
            passportLast4: t.passportNumber.slice(-4),
            nationality: t.nationality,
            dateOfBirth: t.dateOfBirth,
            verified: same ? prev.verified : false,
          };
        }),
      );
    });
    return bookingView(db, b);
  });

  // Mock identity check: a real KYC provider (passport OCR + selfie match) plugs in here.
  app.post("/bookings/:id/travelers/:position/verify", async (req) => {
    const user = await auth(req);
    const p = parse(z.object({ id: z.uuid(), position: z.coerce.number().int().min(1).max(19) }), req.params);
    const b = await loadBooking(db, user, p.id);
    if (b.status !== "draft") throw conflict("Booking is no longer editable");
    const updated = await db
      .update(travelers)
      .set({ verified: true })
      .where(and(eq(travelers.bookingId, b.id), eq(travelers.position, p.position)))
      .returning({ position: travelers.position });
    if (!updated.length) throw notFound("Traveler");
    return { verified: true, provider: "mock" };
  });

  app.put("/bookings/:id/amenities", async (req) => {
    const user = await auth(req);
    const { id } = parse(idParam, req.params);
    const b = await loadBooking(db, user, id);
    if (b.status !== "draft") throw conflict("Amenities can only be changed before payment");
    const body = parse(z.object({ codes: z.array(z.string().max(40)).max(30), specialRequests: z.string().trim().max(1000).optional() }), req.body);
    const codes = [...new Set(body.codes)];
    const catalog = codes.length ? await db.select().from(amenities).where(inArray(amenities.code, codes)) : [];
    if (catalog.length !== codes.length) throw badRequest("Unknown amenity code");
    const amenTotal = catalog.reduce((s, a) => s + a.priceCents, 0);
    await db.transaction(async (tx) => {
      await tx.delete(bookingAmenities).where(eq(bookingAmenities.bookingId, b.id));
      if (catalog.length) await tx.insert(bookingAmenities).values(catalog.map((a) => ({ bookingId: b.id, code: a.code, priceCents: a.priceCents })));
      await tx
        .update(bookings)
        .set({ amenitiesCents: amenTotal, totalCents: b.flightCents + b.feesCents + amenTotal, specialRequests: body.specialRequests ?? null })
        .where(eq(bookings.id, b.id));
    });
    return bookingView(db, (await db.select().from(bookings).where(eq(bookings.id, b.id)))[0]!);
  });

  app.post("/bookings/:id/pay", async (req) => {
    const user = await auth(req);
    const { id } = parse(idParam, req.params);
    const body = parse(z.object({ method: z.enum(["card", "wire", "credits"]) }), req.body);
    const b = await loadBooking(db, user, id);
    if (b.status !== "draft") throw conflict("This booking has already been paid");

    const [quote] = await db.select().from(quotes).where(eq(quotes.id, b.quoteId)).limit(1);
    const qs = quote ? effectiveStatus(quote) : "expired";
    if (qs !== "offered" && qs !== "countered") throw conflict("The quote has expired. Search again for a fresh price.");
    const trav = await db.select().from(travelers).where(eq(travelers.bookingId, b.id));
    if (trav.length !== b.passengers || trav.some((t) => !t.verified)) throw conflict("All travelers must be added and verified before payment");
    if (body.method === "credits" && !(user.companyId && b.companyId === user.companyId && (user.companyRole === "admin" || user.companyRole === "booker"))) {
      throw conflict("Flight credits are available to company admins and bookers only");
    }

    await db.transaction(async (tx) => {
      // Claim the draft first so concurrent payment attempts cannot both succeed.
      const status = body.method === "wire" ? "pending_payment" : "confirmed";
      const claimed = await tx
        .update(bookings)
        .set({ status, paymentMethod: body.method })
        .where(and(eq(bookings.id, b.id), eq(bookings.status, "draft")))
        .returning();
      const nb = claimed[0];
      if (!nb) throw conflict("This booking has already been paid");

      if (body.method === "credits") {
        const debited = await tx
          .update(companies)
          .set({ creditBalanceCents: sql`${companies.creditBalanceCents} - ${nb.totalCents}` })
          .where(and(eq(companies.id, nb.companyId!), sql`${companies.creditBalanceCents} >= ${nb.totalCents}`))
          .returning({ id: companies.id });
        if (!debited.length) throw conflict("Not enough flight credits for this booking");
      }
      await tx.insert(payments).values({ bookingId: nb.id, method: body.method, status: body.method === "wire" ? "pending" : "succeeded", amountCents: nb.totalCents });
      await tx.update(quotes).set({ status: "accepted" }).where(eq(quotes.id, nb.quoteId));
      await tx
        .update(quotes)
        .set({ status: "expired" })
        .where(and(eq(quotes.requestId, quote!.requestId), inArray(quotes.status, ["offered", "countered"]), sql`${quotes.id} <> ${nb.quoteId}`));
      await tx.update(quoteRequests).set({ status: "booked" }).where(eq(quoteRequests.id, quote!.requestId));
      if (nb.companyId) {
        const ym = new Date().toISOString().slice(0, 7).replace("-", "");
        await tx.insert(invoices).values({
          number: `INV-${ym}-${shortCode(5)}`,
          companyId: nb.companyId,
          bookingId: nb.id,
          amountCents: nb.totalCents,
          status: body.method === "wire" ? "pending" : "paid",
        });
      }
    });
    return bookingView(db, (await db.select().from(bookings).where(eq(bookings.id, b.id)))[0]!);
  });

  app.get("/bookings/:id/live", async (req) => {
    const user = await auth(req);
    const { id } = parse(idParam, req.params);
    const b = await loadBooking(db, user, id);
    if (b.status !== "confirmed") throw conflict("Live status is available for confirmed bookings");
    const ports = await db.select().from(airports).where(inArray(airports.code, [b.origin, b.destination]));
    const o = ports.find((p) => p.code === b.origin)!;
    const d = ports.find((p) => p.code === b.destination)!;
    return { ref: b.ref, origin: o, destination: d, departAt: b.departAt, ...liveStatus(b, o, d) };
  });

  app.post("/bookings/:id/ground", async (req) => {
    const user = await auth(req);
    const { id } = parse(idParam, req.params);
    const body = parse(
      z.object({ vehicle: z.enum(["sclass", "rover", "ghost"]), destination: z.string().trim().min(3).max(200), meetAndGreet: z.boolean().default(true) }),
      req.body,
    );
    const b = await loadBooking(db, user, id);
    if (b.status !== "confirmed") throw conflict("Ground transport can be added once the booking is confirmed");
    const chauffeur = CHAUFFEURS[b.ref.charCodeAt(3) % CHAUFFEURS.length]!;
    await db.transaction(async (tx) => {
      await tx.delete(groundTransfers).where(eq(groundTransfers.bookingId, b.id));
      await tx.insert(groundTransfers).values({
        bookingId: b.id,
        vehicle: body.vehicle,
        destination: body.destination,
        meetAndGreet: body.meetAndGreet,
        priceCents: VEHICLES[body.vehicle].priceCents,
        chauffeurName: chauffeur.name,
        plate: chauffeur.plate,
      });
    });
    return bookingView(db, b);
  });
}

