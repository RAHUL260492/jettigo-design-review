import { and, count, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { shutdownOnce } from "../src/lib/shutdown.js";
import { buildApp } from "../src/app.js";
import { postgresOptions } from "../src/db/client.js";
import { aircraft, bookings, companies, operators, otpCodes, payments, quotes, users } from "../src/db/schema.js";
import { seedDemo, seedReference } from "../src/db/seed.js";
import { loadConfig } from "../src/env.js";
import { inDays, login, setup, teardown, traveler, type TestCtx } from "./helpers.js";

let t: TestCtx;
beforeAll(async () => { t = await setup(); });
afterAll(async () => { await teardown(t); });
const search = async (headers = {}) => (await t.app.inject({ method: "POST", url: "/v1/search", headers,
  payload: { origin: "LCY", destination: "NCE", departAt: inDays(10), passengers: 1 } })).json();
async function draft(headers: Record<string, string>, quoteId: string) {
  const r = await t.app.inject({ method: "POST", url: "/v1/bookings", headers, payload: { quoteId } });
  expect([200, 201]).toContain(r.statusCode);
  const b = r.json();
  await t.app.inject({ method: "PUT", url: `/v1/bookings/${b.id}/travelers`, headers, payload: { travelers: [traveler(1)] } });
  await t.app.inject({ method: "POST", url: `/v1/bookings/${b.id}/travelers/1/verify`, headers });
  return b;
}
const pay = (headers: Record<string, string>, id: string, method = "card") => t.app.inject({ method: "POST", url: `/v1/bookings/${id}/pay`, headers, payload: { method } });

describe("authentication and isolation regressions", () => {
  it("serializes OTP issuance, supersession and the attempt budget", async () => {
    const email = "race-otp@example.com";
    const issued = await Promise.all(Array.from({ length: 8 }, () => t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } })));
    expect(issued.filter((r) => r.statusCode === 200)).toHaveLength(5);
    expect(issued.filter((r) => r.statusCode === 429)).toHaveLength(3);
    const active = await t.database.db.select().from(otpCodes).where(and(eq(otpCodes.email, email), isNull(otpCodes.consumedAt)));
    expect(active).toHaveLength(1);
    const code = issued.filter((r) => r.statusCode === 200).at(-1)!.json().demoCode;
    const wrong = code === "000000" ? "111111" : "000000";
    const attempts = await Promise.all(Array.from({ length: 9 }, () => t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: wrong } })));
    expect(attempts.filter((r) => r.statusCode === 400)).toHaveLength(5);
    expect(attempts.filter((r) => r.statusCode === 429)).toHaveLength(4);
    expect((await t.database.db.select().from(otpCodes).where(eq(otpCodes.id, active[0]!.id)))[0]!.attempts).toBe(5);
  });
  it("expires codes and consumes a correct code only once concurrently", async () => {
    const email = "once@example.com";
    const r = await t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } });
    const results = await Promise.all(Array.from({ length: 3 }, () => t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: r.json().demoCode } })));
    expect(results.filter((x) => x.statusCode === 200)).toHaveLength(1);
    const r2 = await t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } });
    await t.database.db.update(otpCodes).set({ expiresAt: new Date(0) }).where(eq(otpCodes.email, email));
    expect((await t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: r2.json().demoCode } })).statusCode).toBe(400);
  });
  it("allows only one account to claim a guest search", async () => {
    const a = await login(t.app, "claim-a@example.com"), b = await login(t.app, "claim-b@example.com");
    const s = await search();
    const rs = await Promise.all([a, b].map((u) => t.app.inject({ method: "POST", url: "/v1/bookings", headers: u.headers, payload: { quoteId: s.quotes[0].id } })));
    expect(rs.map((r) => r.statusCode).sort()).toEqual([201, 404]);
    const winner = rs[0]!.statusCode === 201 ? a : b, loser = winner === a ? b : a;
    expect((await t.app.inject({ url: `/v1/quote-requests/${s.request.id}`, headers: loser.headers })).statusCode).toBe(404);
  });
  it("does not overwrite another company's concurrent member claim", async () => {
    const a = await login(t.app, "james@thompson.co"), b = await login(t.app, "second-admin@example.com");
    const [c] = await t.database.db.insert(companies).values({ name: "Other company" }).returning();
    await t.database.db.update(users).set({ companyId: c!.id, companyRole: "admin" }).where(eq(users.id, b.user.id));
    await login(t.app, "unaffiliated@example.com");
    const rs = await Promise.all([a, b].map((u) => t.app.inject({ method: "POST", url: "/v1/company/members", headers: u.headers, payload: { email: "unaffiliated@example.com", name: "New member", role: "traveler" } })));
    expect(rs.map((r) => r.statusCode).sort()).toEqual([201, 409]);
  });
  it("rejects empty updates and exposes no database error details", async () => {
    const u = await login(t.app, "empty@example.com"), op = await login(t.app, "ops@rivieraair.com");
    expect((await t.app.inject({ method: "POST", url: "/v1/search", headers: { authorization: "Bearer invalid" }, payload: { origin: "LCY", destination: "NCE", departAt: inDays(10), passengers: 1 } })).statusCode).toBe(401);
    expect((await t.app.inject({ method: "PATCH", url: "/v1/me", headers: u.headers, payload: {} })).statusCode).toBe(400);
    const ac = (await t.app.inject({ url: "/v1/operator/aircraft", headers: op.headers })).json().aircraft[0];
    expect((await t.app.inject({ method: "PATCH", url: `/v1/operator/aircraft/${ac.id}`, headers: op.headers, payload: {} })).statusCode).toBe(400);
  });
});

describe("booking integrity regressions", () => {
  it("creates one draft for repeated simultaneous quote selection", async () => {
    const u = await login(t.app, "draft-race@example.com"), s = await search(u.headers);
    const rs = await Promise.all([1, 2, 3].map(() => t.app.inject({ method: "POST", url: "/v1/bookings", headers: u.headers, payload: { quoteId: s.quotes[0].id } })));
    expect(new Set(rs.map((r) => r.json().id)).size).toBe(1);
  });
  it("permits only one paid booking per search, across different quotes", async () => {
    const u = await login(t.app, "sibling@example.com"), s = await search(u.headers);
    const a = await draft(u.headers, s.quotes[0].id), b = await draft(u.headers, s.quotes[1].id);
    const rs = await Promise.all([pay(u.headers, a.id), pay(u.headers, b.id)]);
    expect(rs.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const accepted = await t.database.db.select().from(quotes).where(and(eq(quotes.requestId, s.request.id), eq(quotes.status, "accepted")));
    expect(accepted).toHaveLength(1);
  });
  it("serializes payment with traveler and amenity edits", async () => {
    const u = await login(t.app, "edit-race@example.com"), s = await search(u.headers), b = await draft(u.headers, s.quotes[0].id);
    await Promise.all([
      pay(u.headers, b.id),
      t.app.inject({ method: "PUT", url: `/v1/bookings/${b.id}/travelers`, headers: u.headers, payload: { travelers: [{ ...traveler(1), fullName: "Changed Identity" }] } }),
      t.app.inject({ method: "PUT", url: `/v1/bookings/${b.id}/amenities`, headers: u.headers, payload: { codes: ["wine"] } }),
    ]);
    const latest = (await t.app.inject({ url: `/v1/bookings/${b.id}`, headers: u.headers })).json();
    if (latest.status === "confirmed") {
      expect(latest.travelers.every((p: { verified: boolean }) => p.verified)).toBe(true);
      expect(latest.price.totalCents).toBe(latest.payment.amountCents);
    } else expect(latest.payment).toBeNull();
  });
  it("rejects stale prices and lets selection acknowledge the new price", async () => {
    const u = await login(t.app, "counter-client@example.com"), op = await login(t.app, "ops@rivieraair.com"), s = await search(u.headers);
    const q = s.quotes.find((q: { operator: { name: string } }) => q.operator.name === "Riviera Air Charter");
    const b = await draft(u.headers, q.id);
    const change = await t.app.inject({ method: "POST", url: `/v1/operator/quotes/${q.id}/respond`, headers: op.headers, payload: { action: "counter", priceCents: q.priceCents + 50_000 } });
    expect(change.statusCode).toBe(200);
    expect((await pay(u.headers, b.id)).statusCode).toBe(409);
    const selected = await t.app.inject({ method: "POST", url: "/v1/bookings", headers: u.headers, payload: { quoteId: q.id } });
    expect(selected.json().price.flightCents).toBe(q.priceCents + 50_000);
    expect((await pay(u.headers, b.id)).statusCode).toBe(200);
    expect((await t.app.inject({ method: "POST", url: `/v1/operator/quotes/${q.id}/respond`, headers: op.headers, payload: { action: "accept" } })).statusCode).toBe(409);
  });
  it("retains encrypted passport when omitted and resets verification on identity edits", async () => {
    const u = await login(t.app, "masked@example.com"), s = await search(u.headers), b = await draft(u.headers, s.quotes[0].id);
    const { passportNumber: _passport, ...identity } = traveler(1);
    const same = await t.app.inject({ method: "PUT", url: `/v1/bookings/${b.id}/travelers`, headers: u.headers, payload: { travelers: [identity] } });
    expect(same.json().travelers[0]).toMatchObject({ verified: true, passport: "•••• 0001" });
    const edit = await t.app.inject({ method: "PUT", url: `/v1/bookings/${b.id}/travelers`, headers: u.headers, payload: { travelers: [{ ...identity, fullName: "Different Person" }] } });
    expect(edit.json().travelers[0].verified).toBe(false);
    const s2 = await search(u.headers);
    const fresh = (await t.app.inject({ method: "POST", url: "/v1/bookings", headers: u.headers, payload: { quoteId: s2.quotes[0].id } })).json();
    expect((await t.app.inject({ method: "PUT", url: `/v1/bookings/${fresh.id}/travelers`, headers: u.headers, payload: { travelers: [identity] } })).statusCode).toBe(400);
  });
  it("rejects withdrawn aircraft and expired draft quotes", async () => {
    const u = await login(t.app, "withdrawn@example.com"), s = await search(u.headers), b = await draft(u.headers, s.quotes[0].id);
    await t.database.db.update(aircraft).set({ active: false }).where(eq(aircraft.id, s.quotes[0].aircraft.id));
    expect((await pay(u.headers, b.id)).statusCode).toBe(409);
    await t.database.db.update(aircraft).set({ active: true }).where(eq(aircraft.id, s.quotes[0].aircraft.id));
    await t.database.db.update(quotes).set({ expiresAt: new Date(0) }).where(eq(quotes.id, s.quotes[0].id));
    expect((await pay(u.headers, b.id)).statusCode).toBe(409);
  });
  it("debits once under double payment and keeps wire pending", async () => {
    const u = await login(t.app, "james@thompson.co"), s = await search(u.headers), b = await draft(u.headers, s.quotes[0].id);
    const [before] = await t.database.db.select().from(companies).where(eq(companies.id, u.user.companyId));
    const rs = await Promise.all([pay(u.headers, b.id, "credits"), pay(u.headers, b.id, "credits")]);
    expect(rs.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const [after] = await t.database.db.select().from(companies).where(eq(companies.id, u.user.companyId));
    expect(after!.creditBalanceCents).toBe(before!.creditBalanceCents - b.price.totalCents);
    expect(await t.database.db.select().from(payments).where(eq(payments.bookingId, b.id))).toHaveLength(1);
    const s2 = await search(u.headers), wire = await draft(u.headers, s2.quotes[0].id);
    expect((await pay(u.headers, wire.id, "wire")).json().status).toBe("pending_payment");
    expect((await t.app.inject({ url: `/v1/bookings/${wire.id}/live`, headers: u.headers })).statusCode).toBe(409);
  });
});

describe("production configuration", () => {
  it("closes the database even if HTTP shutdown fails, and only once", async () => {
    const app = { close: vi.fn(async () => { throw new Error("close failed"); }) };
    const database = { close: vi.fn(async () => {}) };
    const close = shutdownOnce(app, database);
    const first = close();
    expect(close()).toBe(first);
    await expect(first).rejects.toThrow("close failed");
    expect(database.close).toHaveBeenCalledTimes(1);
  });
  it("keeps database parameters out of error responses and logs", async () => {
    const app = await buildApp(loadConfig({ NODE_ENV: "test" }), t.database);
    const log = vi.fn();
    app.log.error = log;
    app.get("/test-failure", async () => { throw new Error("SQL params passport=SECRET"); });
    const r = await app.inject({ url: "/test-failure" });
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain("SECRET");
    expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET");
    await app.close();
  });
  it("requires explicit production secrets/origins and validates URLs and ports", () => {
    const valid = { NODE_ENV: "production", JWT_SECRET: "j".repeat(40), PII_KEY: "p".repeat(40), DATABASE_URL: "postgres://u:p@host/db", CORS_ORIGINS: "https://example.com" };
    expect(loadConfig(valid).corsOrigins).toEqual(["https://example.com"]);
    for (const patch of [{ CORS_ORIGINS: "" }, { CORS_ORIGINS: "*" }, { CORS_ORIGINS: "https://example.com/path" }, { PORT: "65536" }, { DATABASE_URL: "https://host/db" }, { JWT_SECRET: "short" }, { TRUST_PROXY_HOPS: "-1" }]) expect(() => loadConfig({ ...valid, ...patch })).toThrow();
  });
  it("verifies external TLS and allows explicitly configured private connections", () => {
    expect(postgresOptions("postgres://localhost:password@remote.example/db?sslmode=no-verify").ssl).toEqual({ rejectUnauthorized: true });
    expect(postgresOptions("postgres://u:p@localhost/db").ssl).toBe(false);
    expect(postgresOptions("postgres://u:p@dpg-private/db", false).ssl).toBe(false);
    expect(postgresOptions("postgres://u:p@remote/db?sslmode=disable").connectionString).not.toContain("sslmode");
  });
  it("seeds idempotently and keeps large corporate aggregates readable", async () => {
    const before = await t.database.db.select({ n: count() }).from(operators);
    await Promise.all([seedDemo(t.database.db), seedDemo(t.database.db)]);
    await seedReference(t.database.db);
    expect(await t.database.db.select({ n: count() }).from(operators)).toEqual(before);
    const u = await login(t.app, "james@thompson.co");
    const extraSearch = await search(u.headers);
    const extra = await draft(u.headers, extraSearch.quotes[0].id);
    expect((await pay(u.headers, extra.id)).statusCode).toBe(200);
    await t.database.db.update(bookings).set({ totalCents: 2_000_000_000 }).where(and(eq(bookings.companyId, u.user.companyId), eq(bookings.status, "confirmed")));
    const r = await t.app.inject({ url: "/v1/company", headers: u.headers });
    expect(r.statusCode).toBe(200);
    expect(r.json().kpis.spentCents).toBeGreaterThan(2_147_483_647);
  });
  it("ignores forged forwarding prefixes, enforces IP limits and exact CORS", async () => {
    const cfg = loadConfig({ NODE_ENV: "development", PGLITE_DIR: "memory", TRUST_PROXY_HOPS: "1", CORS_ORIGINS: "https://allowed.example" });
    cfg.env = "production";
    const app = await buildApp(cfg, t.database);
    app.log.level = "silent";
    for (let i = 0; i < 10; i++) await app.inject({ method: "POST", url: "/v1/auth/otp", headers: { "x-forwarded-for": `192.0.2.${i}, 198.51.100.1` }, payload: { email: `rate-${i}@example.com` } });
    expect((await app.inject({ method: "POST", url: "/v1/auth/otp", headers: { "x-forwarded-for": "192.0.2.99, 198.51.100.1" }, payload: { email: "rate-11@example.com" } })).statusCode).toBe(429);
    expect((await app.inject({ url: "/health", headers: { origin: "https://evil.example" } })).headers["access-control-allow-origin"]).toBeUndefined();
    const allowed = await app.inject({ url: "/health", headers: { origin: "https://allowed.example" } });
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://allowed.example");
    expect(allowed.headers["access-control-expose-headers"]).toContain("Content-Disposition");
    await app.close();
  });
});
