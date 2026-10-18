/* Jettingo — live mode. Active with ?live=1. Connects the prototype screens to the
   Jettingo API: loaders fill J.state / J.data before render, and capture-phase
   listeners take over actions (search, book, pay…) before the demo handlers run. */
(function () {
  const params = new URLSearchParams(location.search);
  const cfg = window.JETTINGO_CONFIG || {};
  const L = (J.live = { on: params.get("live") === "1", base: (cfg.apiBase || "").replace(/\/$/, ""), token: null, user: null });
  if (!L.on) return;

  const S = J.state;
  const D = () => J.data;
  const initialState = structuredClone(S);
  const initialData = structuredClone(J.data);
  let sessionGeneration = 0;
  function clearPrivateState() {
    sessionGeneration++;
    J.timers.forEach((stop) => stop());
    J.timers = [];
    Object.keys(S).forEach((key) => delete S[key]);
    Object.assign(S, structuredClone(initialState), { travelers: {}, verified: {}, lead: "", addr: "", chauffeur: { name: "", plate: "" } });
    Object.keys(J.data).forEach((key) => delete J.data[key]);
    Object.assign(J.data, structuredClone(initialData));
    J.jets = {};
    J.fees = 0;
    L.company = null;
  }
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  L.token = store.get("jg_token");
  L.user = store.get("jg_user");

  /* ---------- API client ---------- */
  async function api(method, path, body, { raw = false } = {}) {
    const generation = sessionGeneration;
    let res;
    try {
      res = await fetch(L.base + path, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(L.token ? { Authorization: `Bearer ${L.token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error("Can't reach the Jettingo server. If it was asleep it may take up to a minute to wake; please try again."), { status: 0 });
    }
    if (generation !== sessionGeneration) throw Object.assign(new Error("Session changed"), { staleSession: true });
    if (res.status === 401 && L.token) setSession(null, null);
    if (raw && res.ok) return res;
    const data = await res.json().catch(() => ({}));
    if (generation !== sessionGeneration && res.status !== 401) throw Object.assign(new Error("Session changed"), { staleSession: true });
    if (!res.ok) {
      const details = data.error && Array.isArray(data.error.details) ? data.error.details.map((d) => d.message).join("; ") : "";
      const msg = data.error && data.error.message ? data.error.message + (details ? `: ${details}` : "") : `Request failed (${res.status})`;
      throw Object.assign(new Error(msg), { status: res.status, data });
    }
    return data;
  }
  L.api = api;

  function setSession(token, user) {
    if (!token || (L.user && user && L.user.id !== user.id)) clearPrivateState();
    L.token = token;
    L.user = user;
    store.set("jg_token", token);
    store.set("jg_user", user);
    pill();
  }
  L.toLogin = (next) => {
    S.after = next;
    J.toast("Please sign in to continue", "lock");
    J.go("login");
  };
  const needAuth = (next) => {
    if (!L.token) throw Object.assign(new Error("Please sign in to continue"), { status: 401, next });
  };
  const redirect = (to, message) => Object.assign(new Error(message || ""), { redirect: to });

  /* ---------- Helpers ---------- */
  const label = (a) => `${a.name} (${a.code})`;
  const fmtMin = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
  const CLS = { light: "Light jet", mid: "Midsize", heavy: "Heavy jet", ulr: "Ultra-long range", helicopter: "Helicopter" };
  const CAT = { light: "mid", mid: "mid", heavy: "heavy", ulr: "ulr", helicopter: "mid" };
  const busy = (el, on) => el && el.classList.toggle("is-loading", on);
  const fail = (err, el) => {
    busy(el, false);
    if (err && err.staleSession) return;
    if (err && err.status === 401) return L.toLogin(J.current());
    J.toast((err && err.message) || "Something went wrong", "circle-alert");
  };
  const toIsoDate = (s) => {
    const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : String(s || "").trim();
  };
  function departAtIso() {
    const [hh, mm] = S.time.split(":").map(Number);
    return new Date(Date.UTC(S.date.y, S.date.m, S.date.d, hh, mm)).toISOString();
  }
  function download(res, fallbackName) {
    return res.blob().then((blob) => {
      const cd = res.headers.get("Content-Disposition") || "";
      const name = (cd.match(/filename="([^"]+)"/) || [])[1] || fallbackName;
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }
  /** Intercept events on a screen before the demo handlers see them. */
  function on(root, type, selector, fn) {
    root.addEventListener(
      type,
      (e) => {
        const el = e.target.closest(selector);
        if (!el || !root.contains(el)) return;
        e.preventDefault();
        e.stopPropagation();
        fn(el, e);
      },
      true,
    );
  }

  function mapQuotes(quotes) {
    const jets = {};
    for (const q of quotes) {
      if (q.status !== "offered" && q.status !== "countered") continue;
      const a = q.aircraft;
      jets[q.id] = {
        quoteId: q.id,
        name: a.model,
        cls: CLS[a.category] || a.category,
        cat: CAT[a.category] || "mid",
        yom: a.yearOfManufacture || "—",
        pax: a.seats,
        range: `${a.rangeNm.toLocaleString("en-US")} nm`,
        rate: a.hourlyRateCents / 100,
        est: q.priceCents / 100,
        img: a.image || "jet-g650",
        time: fmtMin(q.flightMinutes),
        amenText: a.amenities,
        bagText: a.baggageCuFt ? `${a.baggageCuFt} cu ft` : "",
        rating: q.operator.rating.toFixed(1),
        opName: q.operator.name,
        countered: q.status === "countered",
      };
    }
    return jets;
  }

  /** Put an API booking into the shared state every screen reads from. */
  function applyBooking(b) {
    S.booking = b;
    S.tripType = "one"; // live bookings are single flights for now
    S.ref = b.ref;
    S.lead = b.travelers[0]?.fullName || "";
    S.travelers = Object.fromEntries(b.travelers.map((t) => [t.position, { name: t.fullName, passport: t.passport, nat: t.nationality, dob: t.dateOfBirth }]));
    S.travelersDirty = false;
    S.addr = b.ground?.destination || "";
    S.chauffeur = b.ground?.chauffeur || { name: "", plate: "" };
    S.origin = label(b.origin);
    S.dest = label(b.destination);
    const d = new Date(b.departAt);
    S.date = { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
    S.time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    S.pax = b.passengers;
    const a = b.aircraft || {};
    J.jets = { ...J.jets, booked: { name: a.model, cls: CLS[a.category] || "", cat: CAT[a.category] || "mid", yom: a.yearOfManufacture, pax: a.seats, range: `${(a.rangeNm || 0).toLocaleString("en-US")} nm`, rate: (a.hourlyRateCents || 0) / 100, est: b.price.flightCents / 100, img: a.image || "jet-g650", time: fmtMin(b.flightMinutes) } };
    S.jet = "booked";
    J.fees = b.price.feesCents / 100;
    // A fresh booking has no amenities saved yet: included ones start on, paid ones off.
    const saved = b.amenities.map((x) => x.code);
    S.amen = Object.fromEntries([...J.included, ...Object.keys(J.amenities)].map((k) => [k, saved.length ? saved.includes(k) : J.included.includes(k)]));
    S.verified = Object.fromEntries(b.travelers.map((t) => [t.position, t.verified]));
    if (b.ground) {
      S.car = b.ground.vehicle;
      S.addr = b.ground.destination;
      S.chauffeur = { name: b.ground.chauffeur.name, plate: b.ground.chauffeur.plate };
    }
  }

  async function ensureAirports() {
    if (L.airports) return;
    L.airports = (await api("GET", "/v1/airports")).airports;
    J.airports = L.airports.map(label);
    if (!J.airports.includes(S.origin)) S.origin = J.airports[0];
    if (!J.airports.includes(S.dest)) S.dest = J.airports.find((a) => a !== S.origin);
  }
  async function runSearch() {
    await ensureAirports();
    const r = await api("POST", "/v1/search", {
      origin: J.code(S.origin),
      destination: J.code(S.dest),
      departAt: departAtIso(),
      passengers: S.pax,
      bags: S.bags,
      baggageKg: S.unit === "LBS" ? Math.round(S.weight * 0.4536) : +S.weight || 0,
    });
    S.request = r.request;
    S.quotes = r.quotes;
    J.jets = mapQuotes(r.quotes);
    S.jet = Object.keys(J.jets)[0] || S.jet;
  }
  async function bookQuote(key, el) {
    const j = J.jets[key];
    if (!j || !j.quoteId) return;
    if (!L.token) {
      S.pendingQuote = key;
      return L.toLogin("travelers");
    }
    busy(el, true);
    try {
      const b = await api("POST", "/v1/bookings", { quoteId: j.quoteId });
      S.travelers = {};
      applyBooking(b);
      J.go("travelers");
    } catch (err) {
      fail(err, el);
    }
  }
  async function needBooking({ confirmed = false, receipt = false } = {}) {
    needAuth();
    if (!S.booking) {
      const list = (await api("GET", "/v1/bookings")).bookings;
      const pick = confirmed ? list.filter((b) => b.status === "confirmed").sort((a, b) => new Date(a.departAt) - new Date(b.departAt)).find((b) => new Date(b.departAt) > Date.now() - 12 * 3600_000) : receipt ? list.filter((b) => ["confirmed", "pending_payment"].includes(b.status)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : list.find((b) => b.status === "draft");
      if (!pick) throw redirect("route", confirmed ? "No confirmed trips yet. Book a flight first." : "Start by searching for a flight.");
      applyBooking(pick);
    } else {
      applyBooking(await api("GET", `/v1/bookings/${S.booking.id}`));
    }
    if (!confirmed && !receipt && S.booking.status !== "draft") throw redirect("confirmed", "This booking is no longer editable.");
    if (receipt && S.booking.status === "draft") throw redirect("pay", "Complete payment first.");
    if (confirmed && S.booking.status !== "confirmed") throw redirect(S.booking.status === "pending_payment" ? "confirmed" : "pay", "Complete payment to see your trip.");
  }

  /* ---------- Per-screen wiring ---------- */
  const wire = (id, { load, init } = {}) => {
    const def = J.defs[id];
    if (!def) return;
    if (load) def.load = load;
    if (init) {
      const orig = def.init;
      def.init = (root) => {
        if (orig) orig(root);
        init(root);
      };
    }
  };

  wire("login", {
    init(root) {
      const ident = root.querySelector("#ident");
      if (S.partner && S.partner.email) ident.value = S.partner.email;
      else if (L.user) ident.value = L.user.email;
      on(root, "click", '[data-act="otp"]', async (el) => {
        busy(el, true);
        try {
          const r = await api("POST", "/v1/auth/otp", { email: ident.value });
          busy(el, false);
          root.querySelector("#sent-to").textContent = ident.value;
          root.querySelector("#s-id").hidden = true;
          root.querySelector("#s-otp").hidden = false;
          const inputs = [...root.querySelectorAll(".otp input")];
          inputs.forEach((i, n) => (i.value = r.demoCode ? r.demoCode[n] : ""));
          if (r.demoCode) root.querySelector("#s-otp p").insertAdjacentHTML("afterend", `<p class="live-hint">Demo mode: no email service is connected yet, so the code is filled in for you.</p>`);
          else inputs[0].focus();
        } catch (err) {
          fail(err, el);
        }
      });
      on(root, "click", '[data-act="verify"]', async (el) => {
        busy(el, true);
        try {
          const code = [...root.querySelectorAll(".otp input")].map((i) => i.value).join("");
          const r = await api("POST", "/v1/auth/verify", { email: ident.value, code });
          setSession(r.token, r.user);
          J.toast(`Signed in as ${r.user.email}`, "circle-check");
          if (r.user.role === "operator") return J.go("quotes");
          if (S.account === "corporate" && r.user.companyId) return J.go("corp");
          if (S.pendingQuote && J.jets[S.pendingQuote]) {
            const k = S.pendingQuote;
            S.pendingQuote = null;
            return bookQuote(k, el);
          }
          J.go(S.after || "route");
          S.after = null;
        } catch (err) {
          fail(err, el);
        }
      });
      on(root, "click", '[data-act="sso"],[data-act="social"]', () => J.toast("Company SSO and Apple / Google sign-in connect in the next phase. Use your email code for now.", "info"));
    },
  });

  wire("route", {
    load: ensureAirports,
    init(root) {
      on(root, "click", 'a[href="#/jets"]', async (el) => {
        if (S.tripType !== "one") return J.toast("The live API prices one-way trips for now. Return and multi-city work in the prototype; switch to One way to search live.", "info");
        busy(el, true);
        try {
          await runSearch();
          J.go("jets");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  const quotesLoad = async () => {
    if (!S.request) await runSearch();
    else {
      const r = await api("GET", `/v1/quote-requests/${S.request.id}`);
      S.quotes = r.quotes;
      J.jets = mapQuotes(r.quotes);
    }
  };
  wire("jets", { load: quotesLoad, init: (root) => on(root, "click", "[data-jet]", (el) => bookQuote(el.dataset.jet, el)) });
  wire("compare", { load: quotesLoad, init: (root) => on(root, "click", "[data-jet]", (el) => bookQuote(el.dataset.jet, el)) });

  wire("travelers", {
    load: () => needBooking(),
    init(root) {
      root.addEventListener("input", (e) => { if (e.target.dataset.f) S.travelersDirty = true; });
      on(root, "click", '[data-act="scan"],[data-act="selfie"]', (el) => {
        const card = el.closest("[data-pax]");
        const n = +card.dataset.pax;
        const t = S.travelers[n] || {};
        if (!t.name || !t.passport || !t.nat || !t.dob) return J.toast("Enter all traveler details first", "info");
        S.verified[n] = true;
        S.travelersDirty = true;
        card.classList.add("done");
        card.querySelector(".xs.faint").textContent = "Verified (simulated)";
        root.querySelector("#vcount").textContent = `${Object.values(S.verified).filter(Boolean).length} of ${S.pax} verified`;
        J.toast("Identity check completed (simulated)");
      });
      on(root, "click", 'a[href="#/amenities"]', async (el) => {
        const b = S.booking;
        const allVerified = b.travelers.length === b.passengers && b.travelers.every((t) => t.verified);
        const edited = S.travelersDirty;
        if (allVerified && !edited) return J.go("amenities");
        const list = [];
        for (let n = 1; n <= b.passengers; n++) {
          const t = (S.travelers || {})[n] || {};
          if (!t.name || !t.passport || !t.nat || !t.dob) return J.toast(`Add all details for passenger ${n}`, "info");
          if (!S.verified[n]) return J.toast(`Scan passenger ${n}'s passport to verify their identity`, "scan-line");
          list.push({ fullName: t.name, passportNumber: String(t.passport).startsWith("•••• ") ? undefined : String(t.passport).replace(/\s/g, ""), nationality: t.nat, dateOfBirth: toIsoDate(t.dob) });
        }
        busy(el, true);
        try {
          await api("PUT", `/v1/bookings/${b.id}/travelers`, { travelers: list });
          for (let n = 1; n <= b.passengers; n++) await api("POST", `/v1/bookings/${b.id}/travelers/${n}/verify`);
          applyBooking(await api("GET", `/v1/bookings/${b.id}`));
          J.go("amenities");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("amenities", {
    async load() {
      await needBooking();
      if (!L.amenCatalog) {
        L.amenCatalog = (await api("GET", "/v1/amenities")).amenities;
        for (const a of L.amenCatalog) if (a.code in J.amenities) J.amenities[a.code] = a.priceCents / 100;
      }
    },
    init(root) {
      root.querySelector("textarea").value = S.booking.specialRequests || "";
      on(root, "click", 'a[href="#/pay"]', async (el) => {
        busy(el, true);
        try {
          const known = new Set(L.amenCatalog.map((a) => a.code));
          const chosen = Object.keys(S.amen).filter((k) => S.amen[k] && known.has(k));
          const note = root.querySelector("textarea");
          applyBooking(await api("PUT", `/v1/bookings/${S.booking.id}/amenities`, { codes: chosen, specialRequests: note && note.value ? note.value : undefined }));
          J.go("pay");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("pay", {
    load: () => needBooking(),
    init(root) {
      S.payMethod = "card";
      root.querySelector("#pm").addEventListener("seg", (e) => (S.payMethod = e.detail));
      on(root, "click", '[data-act="pay"]', async (el) => {
        busy(el, true);
        try {
          applyBooking(await api("POST", `/v1/bookings/${S.booking.id}/pay`, { method: S.payMethod }));
          if (S.booking.status === "pending_payment") J.toast("Mock wire payment is pending. No email is sent.", "landmark");
          J.go("confirmed");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("confirmed", { load: () => needBooking({ receipt: true }) });

  wire("trip", {
    async load() {
      await needBooking({ confirmed: true });
      S.live = await api("GET", `/v1/bookings/${S.booking.id}/live`);
    },
  });

  wire("tracker", {
    async load() {
      await needBooking({ confirmed: true });
      S.live = await api("GET", `/v1/bookings/${S.booking.id}/live`);
    },
    init() {
      J.every(30_000, async () => {
        try {
          S.live = await api("GET", `/v1/bookings/${S.booking.id}/live`);
        } catch { /* keep last known position */ }
      });
    },
  });

  wire("ground", {
    load: () => needBooking({ confirmed: true }),
    init(root) {
      on(root, "click", 'a[href="#/chauffeur"]', async (el) => {
        const destination = (root.querySelector("#addr").value || "").trim();
        if (destination.length < 3) return J.toast("Enter a destination address", "map-pin");
        busy(el, true);
        try {
          const mg = root.querySelector('.switch input[type="checkbox"]');
          applyBooking(await api("POST", `/v1/bookings/${S.booking.id}/ground`, { vehicle: S.car, destination, meetAndGreet: mg ? mg.checked : true }));
          J.go("chauffeur");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("chauffeur", {
    async load() {
      await needBooking({ confirmed: true });
      if (!S.booking.ground) throw redirect("ground", "Choose a vehicle first.");
    },
  });

  wire("concierge", {
    async load() {
      needAuth();
      S.thread = (await api("GET", "/v1/messages")).messages;
    },
    init(root) {
      const chat = root.querySelector("#chat");
      const time = (d) => new Date(d).toTimeString().slice(0, 5);
      const send = async (text) => {
        text = text.trim();
        if (!text) return;
        chat.insertAdjacentHTML("beforeend", `<div class="msg me">${J.esc(text)}<span class="ts">${time(Date.now())}</span></div>`);
        const typing = Object.assign(document.createElement("div"), { className: "msg them typing", innerHTML: "<i></i><i></i><i></i>" });
        chat.appendChild(typing);
        typing.scrollIntoView({ behavior: "smooth", block: "end" });
        try {
          const r = await api("POST", "/v1/messages", { body: text, bookingId: S.booking ? S.booking.id : undefined });
          const reply = r.messages.find((m) => m.sender === "concierge");
          J.later(700, () => {
            typing.remove();
            chat.insertAdjacentHTML("beforeend", `<div class="msg them">${J.esc(reply.body)}<span class="ts">${time(reply.createdAt)}</span></div>`);
            chat.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
          });
        } catch (err) {
          typing.remove();
          fail(err);
        }
      };
      on(root, "submit", "#composer", () => {
        const i = root.querySelector("#msg");
        send(i.value);
        i.value = "";
        root.querySelector("#composer .send").disabled = true;
      });
      on(root, "click", "[data-q]", (el) => send(el.dataset.q));
    },
  });

  wire("membership", {
    init(root) {
      // On phones the account pill is hidden, so the Account tab carries sign-in status.
      root.querySelector(".main").insertAdjacentHTML(
        "afterbegin",
        `<div class="card row between mob-only" style="margin-bottom:16px"><div class="row gap-8"><i style="width:8px;height:8px;border-radius:50%;background:#22c55e"></i><span class="small">${L.user ? `Signed in as <b>${J.esc(L.user.email)}</b>` : "Live API · not signed in"}</span></div><button class="btn sm ghost" data-live-account>${L.user ? "Sign out" : "Sign in"}</button></div>`,
      );
      on(root, "click", "[data-live-account]", () => document.querySelector(".live-pill button").click());
      on(root, "click", '[data-act="upgrade"]', async (el) => {
        if (!L.token) return L.toLogin("membership");
        busy(el, true);
        try {
          const r = await api("POST", "/v1/me/membership", { tier: S.tier });
          setSession(L.token, r.user);
          busy(el, false);
          J.toast(`Welcome to Jettingo ${r.user.tier[0].toUpperCase()}${r.user.tier.slice(1)} (test mode, no charge)`, "crown");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("referral", {
    async load() {
      needAuth();
      S.referral = await api("GET", "/v1/me/referral");
    },
  });

  /* ---------- Corporate ---------- */
  const shortMoney = (cents) => {
    const d = cents / 100;
    return d >= 1000 ? `$${(d / 1000).toFixed(d >= 100000 ? 0 : 1)}k` : J.money(d);
  };
  const ROLE = { admin: "Administrator", booker: "Booker", traveler: "Traveler" };
  async function companyLoad() {
    needAuth();
    let c;
    try {
      c = await api("GET", "/v1/company");
    } catch (err) {
      if (err.status === 403) throw redirect("route", "This account isn't part of a company. Corporate tools are for company accounts.");
      throw err;
    }
    L.company = c;
    return c;
  }
  wire("corp", {
    async load() {
      const c = await companyLoad();
      const manager = c.role === "admin" || c.role === "booker";
      const [members, trips] = manager ? await Promise.all([api("GET", "/v1/company/members"), api("GET", "/v1/company/bookings")]) : [{ members: [] }, { bookings: [] }];
      const months = c.monthly.map((m) => J.MONTHS[+m.month.slice(5) - 1]);
      Object.assign(D().corp, {
        name: c.company.name,
        balance: c.company.creditBalanceCents / 100,
        members: c.members,
        kpis: [
          { label: "Spent (last 6 months)", value: shortMoney(c.kpis.spentCents), delta: `${c.kpis.flights} bookings`, flat: true },
          { label: "Flights booked", value: String(c.kpis.flights), delta: "Last 6 months", flat: true },
          { label: "Avg. cost per flight", value: shortMoney(c.kpis.averageCents), delta: "Incl. taxes & fees", flat: true },
          { label: "Your role", value: ROLE[c.role] || c.role, delta: c.company.name, flat: true },
        ],
        chart: { values: c.monthly.map((m) => Math.round(m.cents / 100000)), labels: months, caption: "Last 6 months, $k", total: shortMoney(c.kpis.spentCents) },
        activity: trips.bookings.slice(0, 5).map((b) => ({
          name: b.bookedBy.name || b.bookedBy.email,
          status: new Date(b.departAt) > Date.now() ? (b.status === "confirmed" ? "Upcoming" : b.status.replace("_", " ")) : "Completed",
          date: new Date(b.departAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          route: `${b.origin} → ${b.destination}`,
          aircraft: b.ref,
        })),
        team: members.members.map((m) => ({ id: m.id, name: m.name || m.email, role: ROLE[m.companyRole] || "" })),
      });
    },
    init(root) {
      on(root, "submit", "#addf", async (form) => {
        const name = root.querySelector("#nn").value.trim();
        const email = root.querySelector("#ne").value.trim();
        const role = (root.querySelector("#nr .on") || {}).dataset?.v || "traveler";
        const btn = form.querySelector("button:not([type])");
        busy(btn, true);
        try {
          await api("POST", "/v1/company/members", { name, email, role });
          J.toast(`${name} added. They can sign in with ${email}.`, "user-plus");
          J.rerender();
        } catch (err) {
          fail(err, btn);
        }
      });
    },
  });

  wire("invoices", {
    async load() {
      const c = await companyLoad();
      const inv = await api("GET", "/v1/company/invoices");
      D().invoices = inv.invoices.map((i) => ({
        date: new Date(i.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        id: i.id,
        number: i.number,
        amount: i.amountCents / 100,
        status: i.status[0].toUpperCase() + i.status.slice(1),
      }));
      D().spend = { values: c.monthly.map((m) => m.cents / 100), labels: c.monthly.map((m) => J.MONTHS[+m.month.slice(5) - 1]) };
    },
    init(root) {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      root.querySelector("#rfrom").value = iso(from);
      root.querySelector("#rto").value = iso(new Date(today.getFullYear(), today.getMonth() + 3, 0));
      on(root, "click", '[data-act="csv"]', async (el) => {
        busy(el, true);
        try {
          const res = await api("GET", `/v1/company/report?from=${root.querySelector("#rfrom").value}&to=${root.querySelector("#rto").value}&format=csv`, null, { raw: true });
          await download(res, "jettingo-report.csv");
          busy(el, false);
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("documents", {
    async load() {
      await companyLoad();
      const docs = (await api("GET", "/v1/company/documents")).documents;
      D().docs = docs.map((d) => ({ kind: d.kind, cat: d.kind, id: d.id, title: d.title + (d.kind === "manifest" ? ".csv" : ""), meta: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) }));
      if (!D().docs.length) D().docs = [{ title: "No documents yet", meta: "Invoices and flight manifests appear after company bookings" }];
    },
    init(root) {
      on(root, "click", '[data-act="doc-dl"]', async (el) => {
        const d = D().docs[+el.dataset.i];
        if (!d || d.kind !== "invoice") return;
        busy(el, true);
        try {
          await download(await api("GET", `/v1/company/documents/invoice/${d.id}`, null, { raw: true }), "invoice.csv");
          busy(el, false);
        } catch (err) {
          fail(err, el);
        }
      });
      on(root, "click", "[data-manifest]", async (el) => {
        busy(el, true);
        try {
          await download(await api("GET", `/v1/company/documents/manifest/${el.dataset.manifest}`, null, { raw: true }), "manifest.csv");
          busy(el, false);
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  /* ---------- Partners & operators ---------- */
  wire("verify", {
    init(root) {
      const p = S.partner || {};
      ["pc", "pn", "pe", "pa", "py"].forEach((id) => {
        const v = { pc: p.companyName, pn: p.contactName, pe: p.email, pa: p.aocNumber, py: p.yearsInOperation }[id];
        if (v != null) root.querySelector(`#${id}`).value = v;
      });
      on(root, "click", 'a[href="#/rates"]', () => {
        const v = (id) => root.querySelector(`#${id}`).value.trim();
        S.partner = { companyName: v("pc"), contactName: v("pn"), email: v("pe"), aocNumber: v("pa"), country: v("pk"), yearsInOperation: v("py") ? +v("py") : undefined, kind: S.role === "provider" ? "provider" : "operator" };
        if (!S.partner.companyName || !S.partner.contactName || !/\S+@\S+\.\S+/.test(S.partner.email)) return J.toast("Add your company, contact name and work email", "info");
        if (S.partner.kind === "operator" && !S.partner.aocNumber) return J.toast("Operators need an air operator certificate (AOC) number", "info");
        J.go("rates");
      });
    },
  });

  wire("rates", {
    init(root) {
      on(root, "click", '[data-act="submit"]', async (el) => {
        if (!S.partner) return J.go("verify");
        const v = (id) => (root.querySelector(`#${id}`) || {}).value?.trim() || "";
        const heli = (root.querySelector("#kind .on") || {}).dataset?.v === "helicopter";
        if (S.partner.kind === "operator") {
          if (!v("am") || !v("at") || !v("as") || !v("ar")) return J.toast("Add the model, tail number, seats and hourly rate", "info");
          S.partnerAircraft = {
            model: v("am"),
            category: heli ? "helicopter" : /global|g[5-7]\d\d|falcon 8|lineage/i.test(v("am")) ? "ulr" : /falcon|challenger|legacy/i.test(v("am")) ? "heavy" : "mid",
            tailNumber: v("at"),
            seats: +v("as"),
            rangeNm: heli ? 400 : 3000,
            hourlyRateCents: Math.round(+v("ar").replace(/[^\d.]/g, "") * 100),
          };
        }
        busy(el, true);
        try {
          S.applicationId = (await api("POST", "/v1/partners/apply", S.partner)).applicationId;
          await api("POST", "/v1/auth/otp", { email: S.partner.email }).then((r) => (S.opDemoCode = r.demoCode));
          busy(el, false);
          J.toast("Application submitted. Sign in to finish setting up your fleet.", "send");
          J.go("op-login");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("op-login", {
    init(root) {
      const email = root.querySelector('#op-cred input[autocomplete="username"]');
      const pw = root.querySelector("#pw");
      if (pw) pw.closest(".field").hidden = true;
      const forgot = root.querySelector('[data-act="forgot"]');
      if (forgot) forgot.hidden = true; // live sign-in uses one-time codes, no passwords
      if (S.partner && S.partner.email) email.value = S.partner.email;
      root.querySelector("#op-2fa p").textContent = "Enter the one-time code sent to your email.";
      const showCode = (code) => {
        root.querySelector("#op-cred").hidden = true;
        root.querySelector("#op-2fa").hidden = false;
        root.querySelectorAll("#op-2fa .otp input").forEach((i, n) => (i.value = code ? code[n] : ""));
        if (code) root.querySelector("#op-2fa p").insertAdjacentHTML("afterend", `<p class="live-hint" style="color:var(--gold-700)">Demo mode: the code is filled in for you.</p>`);
      };
      if (S.opDemoCode) showCode(S.opDemoCode);
      on(root, "click", '[data-act="signin"]', async (el) => {
        busy(el, true);
        try {
          const r = await api("POST", "/v1/auth/otp", { email: email.value });
          busy(el, false);
          showCode(r.demoCode);
        } catch (err) {
          fail(err, el);
        }
      });
      on(root, "click", '[data-act="verify"]', async (el) => {
        busy(el, true);
        try {
          const code = [...root.querySelectorAll("#op-2fa .otp input")].map((i) => i.value).join("");
          const r = await api("POST", "/v1/auth/verify", { email: email.value, code });
          if (r.user.role !== "operator") {
            busy(el, false);
            return J.toast("This isn't an operator account. Use the passenger sign-in instead.", "circle-alert");
          }
          setSession(r.token, r.user);
          S.opDemoCode = null;
          if (S.partnerAircraft) {
            await api("POST", "/v1/operator/aircraft", S.partnerAircraft);
            S.partnerAircraft = null;
          }
          J.go("quotes");
        } catch (err) {
          fail(err, el);
        }
      });
    },
  });

  wire("quotes", {
    async load() {
      needAuth();
      const op = D().op;
      let me;
      try {
        me = await api("GET", "/v1/operator/me");
      } catch (err) {
        if (err.status === 403) throw redirect("op-login", "Sign in with your operator account.");
        throw err;
      }
      op.stats = { win: `${Math.round(me.stats.winRate * 100)}%`, resp: String(me.stats.quotes30d) };
      if (me.operator.status !== "approved") {
        op.review = me.operator.status === "pending" ? `Thanks, ${me.operator.name}. Our compliance team reviews every partner within 48 hours. You'll receive requests here once approved.` : "Your application was not approved. Contact partners@jettingo.com for details.";
        op.req = null;
        op.queue = [];
        return;
      }
      op.review = null;
      const reqs = (await api("GET", "/v1/operator/requests")).requests;
      const card = (r) => {
        const q = r.quotes[0];
        const d = new Date(r.departAt);
        return {
          quoteId: q.id,
          from: r.origin.code,
          to: r.destination.code,
          date: d.toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }),
          time: d.toISOString().slice(11, 16) + " UTC",
          pax: r.passengers,
          bags: `${r.bags} bags, ${r.baggageKg} kg`,
          member: "",
          model: q.aircraft.model,
          tail: q.aircraft.tailNumber,
          range: `${q.aircraft.rangeNm.toLocaleString("en-US")} nm`,
          img: q.aircraft.image || "jet-latitude",
          standard: q.standardPriceCents / 100,
          seconds: Math.max(0, Math.round((new Date(q.expiresAt) - Date.now()) / 1000)),
        };
      };
      op.req = reqs[0] ? card(reqs[0]) : null;
      op.queue = reqs.slice(1, 6).map((r) => {
        const c = card(r);
        return { route: `${c.from} → ${c.to}`, meta: `${c.date} · ${c.pax} pax`, left: `${Math.floor(c.seconds / 60)}:${String(c.seconds % 60).padStart(2, "0")}`, req: c };
      });
    },
    init(root) {
      const r = D().op.req;
      if (!r) return;
      const respond = async (el, body, done) => {
        busy(el, true);
        try {
          await api("POST", `/v1/operator/quotes/${r.quoteId}/respond`, body);
          busy(el, false);
          J.finishQuote(...done);
        } catch (err) {
          fail(err, el);
        }
      };
      on(root, "click", '[data-act="accept"]', (el) => respond(el, { action: "accept" }, [`Accepted at ${J.money(r.standard)}`, "The traveler sees your confirmed price."]));
      on(root, "submit", "#counter", (form) => {
        const v = +root.querySelector("#cv").value.replace(/[^\d]/g, "");
        if (!v) return J.toast("Enter a price first", "info");
        respond(form.querySelector("button"), { action: "counter", priceCents: v * 100 }, [`Counter offer sent: ${J.money(v)}`, "The traveler sees your new price on their quote."]);
      });
      on(root, "change", "#decl", (sel) => sel.value && respond(sel, { action: "decline", reason: sel.value }, ["Request declined", `Reason shared: ${sel.value}.`]));
    },
  });

  /* ---------- Account pill ---------- */
  function pill() {
    let el = document.querySelector(".live-pill");
    if (!el) {
      el = document.createElement("div");
      el.className = "live-pill";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
      el.addEventListener("click", (e) => {
        if (!e.target.closest("button")) return;
        if (L.token) {
          setSession(null, null);
          Object.assign(S, { booking: null, quotes: null, request: null, thread: null, referral: null, live: null });
          J.toast("Signed out", "log-out");
          J.go("home");
        } else J.go("login");
      });
    }
    el.innerHTML = L.user ? `<i></i><span>Live · ${J.esc(L.user.email)}</span><button type="button">Sign out</button>` : `<i></i><span>Live API</span><button type="button">Sign in</button>`;
  }
  pill();
})();
