import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Ctx } from "../app.js";
import { bookings, companies, invoices, travelers, users } from "../db/schema.js";
import { publicUser, requireUser, type User } from "../lib/auth.js";
import { badRequest, conflict, forbidden, notFound, parse } from "../lib/errors.js";
import { newReferralCode } from "./auth.js";

const email = z.string().trim().toLowerCase().pipe(z.email());
const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  // Quote, and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function companyRoutes(app: FastifyInstance, { db, cfg }: Ctx) {
  async function member(req: FastifyRequest, ...roles: NonNullable<User["companyRole"]>[]) {
    const user = await requireUser(req, db, cfg.jwtSecret);
    if (!user.companyId || !user.companyRole) throw forbidden("This account is not part of a company");
    if (roles.length && !roles.includes(user.companyRole)) throw forbidden();
    return user as User & { companyId: string };
  }

  app.get("/company", async (req) => {
    const user = await member(req);
    const [company] = await db.select().from(companies).where(eq(companies.id, user.companyId));
    if (!company) throw notFound("Company");
    const since = new Date();
    since.setMonth(since.getMonth() - 6, 1);
    since.setHours(0, 0, 0, 0);
    const paid = and(eq(bookings.companyId, user.companyId), inArray(bookings.status, ["confirmed", "pending_payment"]), gte(bookings.createdAt, since));
    const monthly = await db
      .select({ month: sql<string>`to_char(date_trunc('month', ${bookings.createdAt}), 'YYYY-MM')`, cents: sql<number>`coalesce(sum(${bookings.totalCents}), 0)::int`, flights: count() })
      .from(bookings)
      .where(paid)
      .groupBy(sql`1`)
      .orderBy(sql`1`);
    const [members] = await db.select({ n: count() }).from(users).where(eq(users.companyId, user.companyId));
    const spent = monthly.reduce((s, m) => s + Number(m.cents), 0);
    const flights = monthly.reduce((s, m) => s + Number(m.flights), 0);
    return {
      company: { id: company.id, name: company.name, creditBalanceCents: company.creditBalanceCents },
      members: members?.n ?? 0,
      kpis: { spentCents: spent, flights, averageCents: flights ? Math.round(spent / flights) : 0 },
      monthly: monthly.map((m) => ({ month: m.month, cents: Number(m.cents), flights: Number(m.flights) })),
      role: user.companyRole,
    };
  });

  app.get("/company/members", async (req) => {
    const user = await member(req, "admin", "booker");
    const rows = await db.select().from(users).where(eq(users.companyId, user.companyId)).orderBy(asc(users.name));
    return { members: rows.map(publicUser) };
  });

  app.post("/company/members", async (req, reply) => {
    const user = await member(req, "admin");
    const body = parse(z.object({ email, name: z.string().trim().min(1).max(120), role: z.enum(["admin", "booker", "traveler"]) }), req.body);
    const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing?.companyId) throw conflict("This person already belongs to a company");
    if (existing && existing.role !== "passenger") throw conflict("Operator and admin accounts cannot join a company");
    const [m] = existing
      ? await db.update(users).set({ companyId: user.companyId, companyRole: body.role, name: existing.name ?? body.name }).where(eq(users.id, existing.id)).returning()
      : await db.insert(users).values({ email: body.email, name: body.name, companyId: user.companyId, companyRole: body.role, referralCode: await newReferralCode(db) }).returning();
    reply.status(201);
    return { member: publicUser(m!) };
  });

  app.patch("/company/members/:id", async (req) => {
    const user = await member(req, "admin");
    const { id } = parse(z.object({ id: z.uuid() }), req.params);
    const body = parse(z.object({ role: z.enum(["admin", "booker", "traveler"]) }), req.body);
    if (id === user.id) throw badRequest("You cannot change your own role");
    const [m] = await db
      .update(users)
      .set({ companyRole: body.role })
      .where(and(eq(users.id, id), eq(users.companyId, user.companyId)))
      .returning();
    if (!m) throw notFound("Member");
    return { member: publicUser(m) };
  });

  app.get("/company/bookings", async (req) => {
    const user = await member(req, "admin", "booker");
    const rows = await db
      .select({ booking: bookings, traveler: { name: users.name, email: users.email } })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.companyId, user.companyId))
      .orderBy(desc(bookings.departAt))
      .limit(100);
    return {
      bookings: rows.map((r) => ({
        id: r.booking.id, ref: r.booking.ref, status: r.booking.status, origin: r.booking.origin, destination: r.booking.destination,
        departAt: r.booking.departAt, totalCents: r.booking.totalCents, bookedBy: r.traveler,
      })),
    };
  });

  app.get("/company/invoices", async (req) => {
    const user = await member(req, "admin", "booker");
    return { invoices: await db.select().from(invoices).where(eq(invoices.companyId, user.companyId)).orderBy(desc(invoices.issuedAt)) };
  });

  app.get("/company/report", async (req, reply) => {
    const user = await member(req, "admin", "booker");
    const q = parse(z.object({ from: z.iso.date(), to: z.iso.date(), format: z.enum(["json", "csv"]).default("json") }), req.query);
    const from = new Date(`${q.from}T00:00:00Z`);
    const to = new Date(`${q.to}T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 1);
    if (from >= to) throw badRequest("`from` must be before `to`");
    const rows = await db
      .select({ ref: bookings.ref, status: bookings.status, origin: bookings.origin, destination: bookings.destination, departAt: bookings.departAt, totalCents: bookings.totalCents, traveler: users.name, email: users.email })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(and(eq(bookings.companyId, user.companyId), gte(bookings.departAt, from), lt(bookings.departAt, to)))
      .orderBy(asc(bookings.departAt));
    if (q.format === "csv") {
      const lines = [["Ref", "Status", "From", "To", "Departure", "Total (USD)", "Booked by", "Email"].map(csvCell).join(",")];
      for (const r of rows) lines.push([r.ref, r.status, r.origin, r.destination, r.departAt.toISOString(), (r.totalCents / 100).toFixed(2), r.traveler, r.email].map(csvCell).join(","));
      reply.header("Content-Type", "text/csv; charset=utf-8").header("Content-Disposition", `attachment; filename="jettigo-report-${q.from}-to-${q.to}.csv"`);
      return lines.join("\n");
    }
    return { from: q.from, to: q.to, totalCents: rows.reduce((s, r) => s + r.totalCents, 0), rows };
  });

  // Tax & compliance documents are generated from invoices and confirmed bookings.
  app.get("/company/documents", async (req) => {
    const user = await member(req, "admin", "booker");
    const [inv, trips] = await Promise.all([
      db.select().from(invoices).where(eq(invoices.companyId, user.companyId)).orderBy(desc(invoices.issuedAt)),
      db.select().from(bookings).where(and(eq(bookings.companyId, user.companyId), eq(bookings.status, "confirmed"))).orderBy(desc(bookings.departAt)),
    ]);
    return {
      documents: [
        ...inv.map((i) => ({ kind: "invoice", id: i.id, title: `Invoice ${i.number}`, date: i.issuedAt })),
        ...trips.map((b) => ({ kind: "manifest", id: b.id, title: `Flight manifest ${b.ref}`, date: b.departAt })),
      ],
    };
  });

  app.get("/company/documents/manifest/:id", async (req, reply) => {
    const user = await member(req, "admin", "booker");
    const { id } = parse(z.object({ id: z.uuid() }), req.params);
    const [b] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.companyId, user.companyId))).limit(1);
    if (!b) throw notFound("Manifest");
    const pax = await db.select().from(travelers).where(eq(travelers.bookingId, b.id)).orderBy(asc(travelers.position));
    const lines = [["Seq", "Full name", "Nationality", "Date of birth", "Passport"].map(csvCell).join(",")];
    for (const t of pax) lines.push([t.position, t.fullName, t.nationality, t.dateOfBirth, `•••• ${t.passportLast4}`].map(csvCell).join(","));
    reply.header("Content-Type", "text/csv; charset=utf-8").header("Content-Disposition", `attachment; filename="manifest-${b.ref}.csv"`);
    return lines.join("\n");
  });
}
