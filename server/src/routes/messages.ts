import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Ctx } from "../app.js";
import { messages } from "../db/schema.js";
import { requireUser } from "../lib/auth.js";
import { parse } from "../lib/errors.js";
import { loadBooking } from "./bookings.js";

/**
 * Concierge replies are rule-based placeholders until the 24/7 concierge desk tool exists;
 * the thread, storage and access rules are production-shaped.
 */
export function conciergeReply(text: string): string {
  const t = text.toLowerCase();
  if (/(flight|status|delay|on time|boarding)/.test(t)) return "Your flight is on schedule. Boarding opens 40 minutes before departure at the private terminal.";
  if (/(catering|menu|food|meal|champagne|wine|vegan|diet)/.test(t)) return "Of course. I've noted your catering request and will confirm with the crew within the hour.";
  if (/(car|chauffeur|transport|pickup|transfer)/.test(t)) return "I'll arrange ground transport. Would you like the S-Class, the Range Rover or the Ghost?";
  if (/(passenger|traveller|traveler|guest)/.test(t)) return "Happy to help. Please add the traveler's passport details in your booking and I'll handle the rest.";
  return "Noted. I'll take care of it and confirm shortly.";
}

export async function messageRoutes(app: FastifyInstance, { db, cfg }: Ctx) {
  app.get("/messages", async (req) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    const q = parse(z.object({ bookingId: z.uuid().optional() }), req.query);
    if (q.bookingId) await loadBooking(db, user, q.bookingId);
    const where = q.bookingId ? and(eq(messages.userId, user.id), eq(messages.bookingId, q.bookingId)) : eq(messages.userId, user.id);
    return { messages: await db.select().from(messages).where(where).orderBy(asc(messages.createdAt)).limit(200) };
  });

  app.post("/messages", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const user = await requireUser(req, db, cfg.jwtSecret);
    const body = parse(z.object({ body: z.string().trim().min(1).max(2000), bookingId: z.uuid().optional() }), req.body);
    if (body.bookingId) await loadBooking(db, user, body.bookingId);
    const rows = await db
      .insert(messages)
      .values([
        { userId: user.id, bookingId: body.bookingId ?? null, sender: "user", body: body.body },
        { userId: user.id, bookingId: body.bookingId ?? null, sender: "concierge", body: conciergeReply(body.body), createdAt: new Date(Date.now() + 1000) },
      ])
      .returning();
    reply.status(201);
    return { messages: rows };
  });
}
