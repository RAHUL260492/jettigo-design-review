import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Exercise the actual browser scripts/templates without adding a DOM dependency.
function browser(live = false) {
  const elements = new Map<string, any>();
  const node = () => ({ innerHTML: "", className: "", classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, addEventListener(type: string, fn: unknown) { this[type] = fn; } });
  const document = {
    body: { ...node(), appendChild(el: any) { elements.set(`.${el.className}`, el); } },
    querySelector(sel: string) { return elements.get(sel) || null; },
    createElement: node, addEventListener() {},
    getElementById(id: string) { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); },
  };
  const storage = new Map<string, string>();
  const ctx: any = createContext({ URLSearchParams, URL, structuredClone, document,
    location: { search: live ? "?live=1" : "", hash: "#/home" },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame(fn: () => void) { fn(); },
    localStorage: { getItem: (k: string) => storage.get(k), setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) },
    fetch: async () => { throw new Error("Unexpected fetch"); },
  });
  ctx.window = ctx;
  for (const file of ["app.js", "screens-passenger.js", "screens-business.js", "live.js"]) runInContext(readFileSync(new URL(`../../app/${file}`, import.meta.url), "utf8"), ctx);
  return { ctx, J: ctx.J, elements, storage };
}

describe("live UI regressions", () => {
  it("leaves all demo loaders and initial fixtures untouched without live=1", () => {
    const { J, elements } = browser();
    expect(J.live.on).toBe(false);
    expect(Object.values(J.defs).some((d: any) => d.load)).toBe(false);
    expect(J.state.lead).toBe("James Thompson");
    expect(J.defs.confirmed.body()).toContain("A confirmation is on its way to james@thompson.co.");
    expect(J.defs.route.body()).toContain("Local time");
    expect(elements.has(".live-pill")).toBe(false);
    for (const def of Object.values(J.defs) as any[]) {
      if (def.body) expect(typeof def.body()).toBe("string");
      if (def.full) expect(typeof def.full()).toBe("string");
    }
  });
  it("escapes aircraft, avatar and toast payloads at HTML sinks", () => {
    const { J, elements } = browser(true);
    const evil = '"><img src=x onerror=alert(1)>';
    expect(J.ph("jet-g650", evil)).not.toContain('alt=""><img');
    J.data.corp.team = [{ name: evil, role: "Traveler" }];
    expect(J.defs.corp.body()).not.toContain('<img src=x');
    J.jets = { x: { ...J.demoJets.g650, name: evil, quoteId: "x" } };
    J.state.jet = "x";
    for (const id of ["jets", "compare", "amenities", "pay", "cabin"]) {
      if (J.defs[id]?.body) expect(J.defs[id].body()).not.toContain('<img src=x');
    }
    J.toast(evil);
    expect(elements.get(".toast").innerHTML).toContain("&lt;img");
  });
  it("clears all private state on 401 and discards prior-session responses", async () => {
    const { J, ctx } = browser(true);
    J.live.token = "old"; J.live.user = { id: "a", email: "a@example.com" };
    J.state.travelers = { 1: { passport: "SECRET" } }; J.state.partner = { email: "PRIVATE" };
    J.state.booking = { id: "private" }; J.data.corp.name = "PRIVATE"; J.live.company = { secret: true };
    let release: (value: unknown) => void = () => {};
    ctx.fetch = () => new Promise((resolve) => { release = resolve; });
    const late = J.live.api("GET", "/late");
    ctx.fetch = async () => ({ status: 401, ok: false, json: async () => ({}) });
    await expect(J.live.api("GET", "/v1/me")).rejects.toMatchObject({ status: 401 });
    expect(J.live.token).toBeNull(); expect(J.state.booking).toBeUndefined();
    expect(JSON.stringify(J.state)).not.toContain("SECRET"); expect(JSON.stringify(J.state)).not.toContain("PRIVATE");
    expect(J.data.corp.name).not.toBe("PRIVATE"); expect(J.live.company).toBeNull();
    release({ status: 200, ok: true, json: async () => ({ secret: true }) });
    await expect(late).rejects.toMatchObject({ staleSession: true });
  });
  it("renders an error instead of private cached templates after loader failure", async () => {
    const { J, ctx, elements } = browser(true);
    ctx.location.hash = "#/corp";
    J.defs.corp.load = async () => { throw new Error("offline"); };
    J.defs.corp.body = () => { throw new Error("Must not render cached data"); };
    await J.rerender();
    expect(elements.get("app").innerHTML).toContain("Unable to load");
  });
  it("uses UTC and preserves real masked traveler details on reload", async () => {
    const { J, ctx } = browser(true);
    J.live.token = "token";
    const booking = { id: "b", ref: "JG-ABC", status: "draft", passengers: 1,
      origin: { name: "London", code: "LCY" }, destination: { name: "Nice", code: "NCE" },
      departAt: "2026-12-12T10:00:00Z", flightMinutes: 90, aircraft: { model: "Real aircraft" },
      price: { flightCents: 10000, feesCents: 900 }, amenities: [],
      travelers: [{ position: 1, fullName: "Real Passenger", nationality: "French", dateOfBirth: "1980-01-01", passport: "•••• 1234", verified: true }], ground: null };
    ctx.fetch = async () => ({ status: 200, ok: true, json: async () => ({ bookings: [booking] }) });
    await J.defs.travelers.load();
    expect(J.state.time).toBe("10:00"); expect(J.state.travelers[1].name).toBe("Real Passenger");
    expect(J.defs.travelers.body()).toContain("Real Passenger");
    expect(J.defs.travelers.body()).not.toContain("James Thompson");
    expect(J.defs.route.body()).toContain(">UTC<");
    J.state.request = { id: "request" };
    ctx.fetch = async () => ({ status: 200, ok: true, json: async () => ({ quotes: [] }) });
    await J.defs.jets.load();
    expect(Object.keys(J.jets)).toHaveLength(0);
  });
});
