import { asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Ctx } from "../app.js";
import { aircraft, airports, amenities, operators } from "../db/schema.js";
import { TIERS, VEHICLES } from "../lib/pricing.js";

export async function catalogRoutes(app: FastifyInstance, { db }: Ctx) {
  app.get("/airports", async () => ({ airports: await db.select().from(airports).orderBy(asc(airports.city)) }));

  app.get("/amenities", async () => ({ amenities: await db.select().from(amenities).orderBy(asc(amenities.category)) }));

  app.get("/fleet", async () => {
    const rows = await db
      .select({ aircraft, operator: { id: operators.id, name: operators.name, rating: operators.rating } })
      .from(aircraft)
      .innerJoin(operators, eq(aircraft.operatorId, operators.id))
      .where(eq(operators.status, "approved"))
      .orderBy(asc(aircraft.seats));
    return { fleet: rows.filter((r) => r.aircraft.active).map((r) => ({ ...r.aircraft, operator: r.operator })) };
  });

  app.get("/membership/tiers", async () => ({ tiers: Object.entries(TIERS).map(([code, t]) => ({ code, ...t })) }));

  app.get("/ground/vehicles", async () => ({ vehicles: Object.entries(VEHICLES).map(([code, v]) => ({ code, ...v })) }));
}
