import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../db/client.js";
import { aircraft, operators, quotes } from "../db/schema.js";

type QuoteRow = typeof quotes.$inferSelect;
type AircraftRow = typeof aircraft.$inferSelect;

/** Offers past their expiry are reported as expired even before a sweep updates them. */
export function effectiveStatus(q: Pick<QuoteRow, "status" | "expiresAt">, now = new Date()): QuoteRow["status"] {
  if ((q.status === "offered" || q.status === "countered") && q.expiresAt <= now) return "expired";
  return q.status;
}

export function aircraftView(a: AircraftRow) {
  return {
    id: a.id,
    model: a.model,
    category: a.category,
    tailNumber: a.tailNumber,
    seats: a.seats,
    rangeNm: a.rangeNm,
    hourlyRateCents: a.hourlyRateCents,
    yearOfManufacture: a.yearOfManufacture,
    cabinHeightIn: a.cabinHeightIn,
    baggageCuFt: a.baggageCuFt,
    amenities: a.amenities,
    image: a.image,
  };
}

export async function quotesForRequests(db: DB, requestIds: string[], operatorId?: string) {
  if (requestIds.length === 0) return [];
  const where = operatorId
    ? and(inArray(quotes.requestId, requestIds), eq(quotes.operatorId, operatorId))
    : inArray(quotes.requestId, requestIds);
  const rows = await db
    .select({ quote: quotes, aircraft, operator: { id: operators.id, name: operators.name, rating: operators.rating } })
    .from(quotes)
    .innerJoin(aircraft, eq(quotes.aircraftId, aircraft.id))
    .innerJoin(operators, eq(quotes.operatorId, operators.id))
    .where(where);
  const now = new Date();
  return rows
    .map((r) => ({
      id: r.quote.id,
      requestId: r.quote.requestId,
      priceCents: r.quote.priceCents,
      standardPriceCents: r.quote.standardPriceCents,
      flightMinutes: r.quote.flightMinutes,
      status: effectiveStatus(r.quote, now),
      operatorConfirmed: r.quote.operatorConfirmed,
      declineReason: r.quote.declineReason,
      expiresAt: r.quote.expiresAt,
      aircraft: aircraftView(r.aircraft),
      operator: r.operator,
    }))
    .sort((a, b) => a.priceCents - b.priceCents);
}
