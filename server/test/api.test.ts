import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { companies, quotes } from "../src/db/schema.js";
import { decrypt, encrypt } from "../src/lib/crypto.js";
import { distanceNm, quotePriceCents } from "../src/lib/pricing.js";
import { inDays, login, setup, teardown, traveler, type TestCtx } from "./helpers.js";

let t: TestCtx;
beforeAll(async () => {
  t = await setup();
});
afterAll(async () => {
  await teardown(t);
});

const search = (headers: Record<string, string> = {}, over: Record<string, unknown> = {}) =>
  t.app.inject({
    method: "POST",
    url: "/v1/search",
    headers,
    payload: { origin: "LCY", destination: "NCE", departAt: inDays(10), passengers: 4, bags: 2, baggageKg: 40, ...over },
  });

/** Search → draft booking → travelers (verified) → ready to pay. */
async function readyBooking(headers: Record<string, string>, pax = 2, pick = (qs: { id: string }[]) => qs[0]!) {
  const s = (await search(headers, { passengers: pax })).json();
  const b = await t.app.inject({ method: "POST", url: "/v1/bookings", headers, payload: { quoteId: pick(s.quotes).id } });
  expect(b.statusCode).toBe(201);
  const id = b.json().id as string;
  const tr = await t.app.inject({ method: "PUT", url: `/v1/bookings/${id}/travelers`, headers, payload: { travelers: Array.from({ length: pax }, (_, i) => traveler(i + 1)) } });
  expect(tr.statusCode).toBe(200);
  for (let p = 1; p <= pax; p++) {
    const v = await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/travelers/${p}/verify`, headers });
    expect(v.statusCode).toBe(200);
  }
  return { id, search: s };
}

describe("units", () => {
  it("encrypts passport numbers reversibly with AES-GCM", () => {
    const key = Buffer.alloc(32, 7);
    const c = encrypt(key, "P1234567");
    expect(c).not.toContain("P1234567");
    expect(decrypt(key, c)).toBe("P1234567");
    expect(() => decrypt(Buffer.alloc(32, 8), c)).toThrow();
  });
  it("prices quotes from distance and hourly rate", () => {
    const nm = distanceNm({ lat: 51.5053, lon: 0.0553 }, { lat: 43.6584, lon: 7.2159 });
    expect(nm).toBeGreaterThan(540);
    expect(nm).toBeLessThan(560);
    expect(quotePriceCents(850_000, 90) % 10_000).toBe(0);
  });
});

describe("health", () => {
  it("reports ok", async () => {
    const r = await t.app.inject({ url: "/health" });
    expect(r.json()).toMatchObject({ ok: true });
  });
});

describe("auth", () => {
  it("signs in with a one-time code and creates the account", async () => {
    const { token, user } = await login(t.app, "New.Person@Example.com ");
    expect(token).toBeTruthy();
    expect(user.email).toBe("new.person@example.com");
    expect(user.referralCode).toMatch(/^JETTIGO-/);
    const me = await t.app.inject({ url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
    expect(me.json().user.email).toBe("new.person@example.com");
  });

  it("rejects wrong codes, locks after 5 attempts and never reuses a code", async () => {
    const email = "lock@example.com";
    const { demoCode } = (await t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } })).json();
    const wrong = demoCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      const r = await t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: wrong } });
      expect(r.statusCode).toBe(400);
    }
    const locked = await t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: demoCode } });
    expect(locked.statusCode).toBe(429);

    const fresh = (await t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } })).json().demoCode;
    expect((await t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: fresh } })).statusCode).toBe(200);
    expect((await t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email, code: fresh } })).statusCode).toBe(400);
  });

  it("limits codes per email", async () => {
    const email = "spam@example.com";
    for (let i = 0; i < 5; i++) await t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } });
    const r = await t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email } });
    expect(r.statusCode).toBe(429);
  });

  it("rejects tampered tokens", async () => {
    const r = await t.app.inject({ url: "/v1/me", headers: { authorization: "Bearer abc.def.ghi" } });
    expect(r.statusCode).toBe(401);
  });
});

describe("search", () => {
  it("validates input", async () => {
    expect((await search({}, { destination: "LCY" })).statusCode).toBe(400);
    expect((await search({}, { departAt: new Date(Date.now() + 3600_000).toISOString() })).statusCode).toBe(400);
    expect((await search({}, { origin: "XXX" })).statusCode).toBe(400);
    expect((await search({}, { passengers: 0 })).statusCode).toBe(400);
  });

  it("returns priced quotes only from aircraft with enough seats and range", async () => {
    const all = (await search({}, { passengers: 4 })).json();
    expect(all.quotes.length).toBe(5);
    expect(all.request.distanceNm).toBeGreaterThan(500);
    const big = (await search({}, { passengers: 18 })).json();
    expect(big.quotes.map((q: { aircraft: { model: string } }) => q.aircraft.model)).toEqual(["Bombardier Global 7500"]);
    const longHaul = (await search({}, { origin: "LCY", destination: "VNY", passengers: 2 })).json();
    expect(longHaul.quotes.every((q: { aircraft: { rangeNm: number } }) => q.aircraft.rangeNm >= 4600)).toBe(true);
  });
});

describe("booking flow", () => {
  it("books, verifies, adds amenities, pays by card and confirms", async () => {
    const { headers } = await login(t.app, "flyer@example.com");
    const { id, search: s } = await readyBooking(headers, 2);

    const am = await t.app.inject({ method: "PUT", url: `/v1/bookings/${id}/amenities`, headers, payload: { codes: ["wine", "wifi"] } });
    expect(am.json().price.amenitiesCents).toBe(35_000);
    expect((await t.app.inject({ method: "PUT", url: `/v1/bookings/${id}/amenities`, headers, payload: { codes: ["caviar"] } })).statusCode).toBe(400);

    const pay = await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/pay`, headers, payload: { method: "card" } });
    expect(pay.statusCode).toBe(200);
    const b = pay.json();
    expect(b.status).toBe("confirmed");
    expect(b.price.totalCents).toBe(b.price.flightCents + b.price.feesCents + 35_000);
    expect(JSON.stringify(b)).not.toContain("P100001");
    expect(b.travelers[0].passport).toBe("•••• 0001");

    expect((await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/pay`, headers, payload: { method: "card" } })).statusCode).toBe(409);
    const req = (await t.app.inject({ url: `/v1/quote-requests/${s.request.id}`, headers })).json();
    expect(req.request.status).toBe("booked");
    expect(req.quotes.filter((q: { status: string }) => q.status === "accepted")).toHaveLength(1);
    expect(req.quotes.filter((q: { status: string }) => q.status === "offered")).toHaveLength(0);

    const live = await t.app.inject({ url: `/v1/bookings/${id}/live`, headers });
    expect(live.json()).toMatchObject({ simulated: true, phase: "scheduled" });

    const g = await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/ground`, headers, payload: { vehicle: "rover", destination: "Hôtel Negresco, Nice" } });
    expect(g.json().ground).toMatchObject({ vehicle: "rover", vehicleName: "Range Rover Autobiography" });
  });

  it("requires every traveler to be verified before payment", async () => {
    const { headers } = await login(t.app, "unverified@example.com");
    const s = (await search(headers, { passengers: 2 })).json();
    const id = (await t.app.inject({ method: "POST", url: "/v1/bookings", headers, payload: { quoteId: s.quotes[0].id } })).json().id;
    await t.app.inject({ method: "PUT", url: `/v1/bookings/${id}/travelers`, headers, payload: { travelers: [traveler(1), traveler(2)] } });
    const pay = await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/pay`, headers, payload: { method: "card" } });
    expect(pay.statusCode).toBe(409);
    const wrongCount = await t.app.inject({ method: "PUT", url: `/v1/bookings/${id}/travelers`, headers, payload: { travelers: [traveler(1)] } });
    expect(wrongCount.statusCode).toBe(409);
  });

  it("drops verification when a traveler's identity changes", async () => {
    const { headers } = await login(t.app, "editor@example.com");
    const { id } = await readyBooking(headers, 1);
    const edited = await t.app.inject({ method: "PUT", url: `/v1/bookings/${id}/travelers`, headers, payload: { travelers: [{ ...traveler(1), passportNumber: "X9999999" }] } });
    expect(edited.json().travelers[0].verified).toBe(false);
  });

  it("refuses expired quotes", async () => {
    const { headers } = await login(t.app, "late@example.com");
    const s = (await search(headers)).json();
    await t.database.db.update(quotes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(quotes.id, s.quotes[0].id));
    const r = await t.app.inject({ method: "POST", url: "/v1/bookings", headers, payload: { quoteId: s.quotes[0].id } });
    expect(r.statusCode).toBe(409);
  });

  it("hides bookings from other users", async () => {
    const owner = await login(t.app, "owner@example.com");
    const other = await login(t.app, "snoop@example.com");
    const { id } = await readyBooking(owner.headers, 1);
    expect((await t.app.inject({ url: `/v1/bookings/${id}`, headers: other.headers })).statusCode).toBe(404);
    expect((await t.app.inject({ method: "PUT", url: `/v1/bookings/${id}/amenities`, headers: other.headers, payload: { codes: [] } })).statusCode).toBe(404);
    expect((await t.app.inject({ method: "POST", url: "/v1/messages", headers: other.headers, payload: { body: "hi", bookingId: id } })).statusCode).toBe(404);
  });
});

describe("corporate", () => {
  it("pays with flight credits atomically and records an invoice", async () => {
    const admin = await login(t.app, "james@thompson.co");
    const company = (await t.app.inject({ url: "/v1/company", headers: admin.headers })).json();
    const before = company.company.creditBalanceCents;
    const { id } = await readyBooking(admin.headers, 2);
    const pay = (await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/pay`, headers: admin.headers, payload: { method: "credits" } })).json();
    expect(pay.status).toBe("confirmed");
    const after = (await t.app.inject({ url: "/v1/company", headers: admin.headers })).json();
    expect(after.company.creditBalanceCents).toBe(before - pay.price.totalCents);
    const inv = (await t.app.inject({ url: "/v1/company/invoices", headers: admin.headers })).json();
    expect(inv.invoices.some((i: { bookingId: string; status: string }) => i.bookingId === id && i.status === "paid")).toBe(true);
  });

  it("rolls back when credits are insufficient", async () => {
    const admin = await login(t.app, "sarah@thompson.co");
    const { id } = await readyBooking(admin.headers, 1);
    const [c] = await t.database.db.select().from(companies);
    await t.database.db.update(companies).set({ creditBalanceCents: 100 }).where(eq(companies.id, c!.id));
    const pay = await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/pay`, headers: admin.headers, payload: { method: "credits" } });
    expect(pay.statusCode).toBe(409);
    const b = (await t.app.inject({ url: `/v1/bookings/${id}`, headers: admin.headers })).json();
    expect(b.status).toBe("draft");
    expect(b.payment).toBeNull();
    await t.database.db.update(companies).set({ creditBalanceCents: c!.creditBalanceCents }).where(eq(companies.id, c!.id));
  });

  it("keeps travelers out of credits, members and reports", async () => {
    const trav = await login(t.app, "john@thompson.co");
    expect((await t.app.inject({ url: "/v1/company/members", headers: trav.headers })).statusCode).toBe(403);
    const { id } = await readyBooking(trav.headers, 1);
    expect((await t.app.inject({ method: "POST", url: `/v1/bookings/${id}/pay`, headers: trav.headers, payload: { method: "credits" } })).statusCode).toBe(409);
  });

  it("manages members and exports a formula-safe CSV report", async () => {
    const admin = await login(t.app, "james@thompson.co");
    const add = await t.app.inject({ method: "POST", url: "/v1/company/members", headers: admin.headers, payload: { email: "new.hire@thompson.co", name: "=HYPERLINK(evil)", role: "traveler" } });
    expect(add.statusCode).toBe(201);
    const hire = await login(t.app, "new.hire@thompson.co");
    await readyBooking(hire.headers, 1);
    const from = new Date().toISOString().slice(0, 10);
    const to = inDays(30).slice(0, 10);
    const csv = await t.app.inject({ url: `/v1/company/report?from=${from}&to=${to}&format=csv`, headers: admin.headers });
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.body).toContain(`"'=HYPERLINK(evil)"`);
    const docs = (await t.app.inject({ url: "/v1/company/documents", headers: admin.headers })).json().documents;
    const manifest = docs.find((d: { kind: string }) => d.kind === "manifest");
    const m = await t.app.inject({ url: `/v1/company/documents/manifest/${manifest.id}`, headers: admin.headers });
    expect(m.body).toContain("•••• ");
    expect(m.body).not.toMatch(/P1000\d\d/);
  });
});

describe("partners and operators", () => {
  it("onboards, waits for approval, then answers quote requests", async () => {
    const apply = await t.app.inject({
      method: "POST",
      url: "/v1/partners/apply",
      payload: { companyName: "Sky Test Air", contactName: "Ops Lead", email: "ops@skytest.air", kind: "operator", aocNumber: "GB-123", country: "United Kingdom", yearsInOperation: 5 },
    });
    expect(apply.statusCode).toBe(201);
    const op = await login(t.app, "ops@skytest.air");
    const ac = await t.app.inject({
      method: "POST",
      url: "/v1/operator/aircraft",
      headers: op.headers,
      payload: { model: "Embraer Phenom 300E", category: "light", tailNumber: "G-SKYT", seats: 8, rangeNm: 2000, hourlyRateCents: 400_000 },
    });
    expect(ac.statusCode).toBe(201);
    expect((await t.app.inject({ url: "/v1/operator/requests", headers: op.headers })).statusCode).toBe(403);
    expect((await search({}, { passengers: 6 })).json().quotes.some((q: { aircraft: { model: string } }) => q.aircraft.model.includes("Phenom"))).toBe(false);

    const admin = await login(t.app, "admin@jettigo.app");
    const opId = apply.json().applicationId;
    expect((await t.app.inject({ method: "POST", url: `/v1/admin/operators/${opId}/decision`, headers: op.headers, payload: { decision: "approve" } })).statusCode).toBe(403);
    expect((await t.app.inject({ method: "POST", url: `/v1/admin/operators/${opId}/decision`, headers: admin.headers, payload: { decision: "approve" } })).statusCode).toBe(200);

    const pax = await login(t.app, "client@example.com");
    const s = (await search(pax.headers, { passengers: 6 })).json();
    const reqs = (await t.app.inject({ url: "/v1/operator/requests", headers: op.headers })).json().requests;
    const mine = reqs.find((r: { id: string }) => r.id === s.request.id);
    const quote = mine.quotes[0];
    const tooLow = await t.app.inject({ method: "POST", url: `/v1/operator/quotes/${quote.id}/respond`, headers: op.headers, payload: { action: "counter", priceCents: 1 } });
    expect(tooLow.statusCode).toBe(400);
    const counter = await t.app.inject({ method: "POST", url: `/v1/operator/quotes/${quote.id}/respond`, headers: op.headers, payload: { action: "counter", priceCents: quote.standardPriceCents + 50_000 } });
    expect(counter.json().quote.status).toBe("countered");
    const seen = (await t.app.inject({ url: `/v1/quote-requests/${s.request.id}`, headers: pax.headers })).json();
    expect(seen.quotes.find((q: { id: string }) => q.id === quote.id).priceCents).toBe(quote.standardPriceCents + 50_000);

    const riviera = await login(t.app, "ops@rivieraair.com");
    expect((await t.app.inject({ method: "POST", url: `/v1/operator/quotes/${quote.id}/respond`, headers: riviera.headers, payload: { action: "accept" } })).statusCode).toBe(404);
  });
});

describe("concierge and account", () => {
  it("stores the thread and replies", async () => {
    const u = await login(t.app, "chatty@example.com");
    const r = await t.app.inject({ method: "POST", url: "/v1/messages", headers: u.headers, payload: { body: "Can you change the catering?" } });
    expect(r.statusCode).toBe(201);
    const thread = (await t.app.inject({ url: "/v1/messages", headers: u.headers })).json().messages;
    expect(thread.map((m: { sender: string }) => m.sender)).toEqual(["user", "concierge"]);
  });

  it("upgrades membership and reports referrals", async () => {
    const u = await login(t.app, "member@example.com");
    const m = await t.app.inject({ method: "POST", url: "/v1/me/membership", headers: u.headers, payload: { tier: "elite" } });
    expect(m.json().user.tier).toBe("elite");
    const code = (await t.app.inject({ url: "/v1/me/referral", headers: u.headers })).json().code;
    const otp = (await t.app.inject({ method: "POST", url: "/v1/auth/otp", payload: { email: "friend@example.com" } })).json().demoCode;
    await t.app.inject({ method: "POST", url: "/v1/auth/verify", payload: { email: "friend@example.com", code: otp, referralCode: code } });
    expect((await t.app.inject({ url: "/v1/me/referral", headers: u.headers })).json().friendsJoined).toBe(1);
  });
});

describe("corporate credits, members and invoices", () => {
  it("tops up credits (admin only) and records a paid invoice that downloads", async () => {
    const admin = await login(t.app, "james@thompson.co");
    const before = (await t.app.inject({ url: "/v1/company", headers: admin.headers })).json().company.creditBalanceCents;
    const top = await t.app.inject({ method: "POST", url: "/v1/company/credits/top-up", headers: admin.headers, payload: { amountCents: 2_500_000 } });
    expect(top.statusCode).toBe(201);
    expect(top.json().creditBalanceCents).toBe(before + 2_500_000);
    expect((await t.app.inject({ method: "POST", url: "/v1/company/credits/top-up", headers: admin.headers, payload: { amountCents: 5 } })).statusCode).toBe(400);
    const traveler = await login(t.app, "john@thompson.co");
    expect((await t.app.inject({ method: "POST", url: "/v1/company/credits/top-up", headers: traveler.headers, payload: { amountCents: 2_500_000 } })).statusCode).toBe(403);
    const inv = (await t.app.inject({ url: "/v1/company/invoices", headers: admin.headers })).json().invoices.find((i: { amountCents: number }) => i.amountCents === 2_500_000);
    const file = await t.app.inject({ url: `/v1/company/documents/invoice/${inv.id}`, headers: admin.headers });
    expect(file.headers["content-type"]).toContain("text/csv");
    expect(file.body).toContain(inv.number);
    const outsider = await login(t.app, "outsider@example.com");
    expect((await t.app.inject({ url: `/v1/company/documents/invoice/${inv.id}`, headers: outsider.headers })).statusCode).toBe(403);
  });

  it("removes members but never yourself", async () => {
    const admin = await login(t.app, "james@thompson.co");
    const add = await t.app.inject({ method: "POST", url: "/v1/company/members", headers: admin.headers, payload: { email: "temp.member@thompson.co", name: "Temp Member", role: "traveler" } });
    const id = add.json().member.id;
    expect((await t.app.inject({ method: "DELETE", url: `/v1/company/members/${id}`, headers: admin.headers })).json()).toEqual({ removed: true });
    const members = (await t.app.inject({ url: "/v1/company/members", headers: admin.headers })).json().members;
    expect(members.some((m: { id: string }) => m.id === id)).toBe(false);
    expect((await t.app.inject({ method: "DELETE", url: `/v1/company/members/${admin.user.id}`, headers: admin.headers })).statusCode).toBe(400);
  });
});
