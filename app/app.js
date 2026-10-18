/* Jettigo prototype — router, shells and shared helpers.
   Screens register themselves in screens-*.js via J.screen(id, def). */
(function () {
  const params = new URLSearchParams(location.search);
  const IMG = "../assets/img/";

  const J = (window.J = {
    defs: Object.create(null),
    order: [],
    timers: [],
    wire: params.get("wire") === "1",
    hints: params.get("hints") === "1",
    // Shared trip state so choices carry through the flow.
    state: {
      account: "passenger",
      // Departure defaults to 11 days out so the demo never shows a past date.
      date: (() => { const d = new Date(); d.setDate(d.getDate() + 11); return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() }; })(),
      view: null,
      ref: "JG-742",
      lead: "James Thompson",
      chauffeur: { name: "Alexander", plate: "JTG-007" },
      time: "10:00",
      pax: 4,
      bags: 2,
      weight: 40,
      unit: "KG",
      origin: "London City (LCY)",
      dest: "Nice Côte d'Azur (NCE)",
      addr: "Hôtel de Paris Monte-Carlo, Monaco",
      travelers: {},
      jet: "g650",
      // Included amenities are on by default and can be opted out of at no cost.
      amen: { menu: true, wifi: true, linen: true, wine: true, sound: false, masks: false },
      car: "sclass",
      tier: "gold",
      verified: { 1: true },
    },
  });

  J.jets = {
    longitude: { name: "Cessna Citation Longitude", cls: "Super-midsize", yom: 2022, pax: 12, range: "3,500 nm", rate: 5500, est: 12900, cat: "mid", img: "jet-longitude", time: "1h 55m" },
    g650: { name: "Gulfstream G650", cls: "Ultra-long range", yom: 2022, pax: 16, range: "7,000 nm", rate: 8500, est: 18200, cat: "ulr", img: "jet-g650", time: "1h 50m" },
    global7500: { name: "Bombardier Global 7500", cls: "Ultra-long range", yom: 2023, pax: 19, range: "7,700 nm", rate: 9800, est: 21400, cat: "ulr", img: "jet-global7500", time: "1h 50m" },
    falcon8x: { name: "Dassault Falcon 8X", cls: "Heavy", yom: 2021, pax: 14, range: "6,450 nm", rate: 7900, est: 16900, cat: "heavy", img: "opt-3", time: "1h 52m" },
  };
  // Demo fleet is kept separately: live mode replaces J.jets with real quotes.
  J.demoJets = J.jets;
  J.jet = () => J.jets[J.state.jet] || Object.values(J.jets)[0] || J.demoJets.g650;
  J.amenities = { wine: 350, sound: 250, masks: 75 };
  J.included = ["menu", "wifi", "linen"];
  J.cars = {
    sclass: { name: "Mercedes-Benz S-Class", cls: "Luxury sedan", pax: 3, bags: 3, price: 450, img: "car-sclass" },
    rover: { name: "Range Rover Autobiography", cls: "Premium SUV", pax: 4, bags: 4, price: 520, img: "car-rover" },
    ghost: { name: "Rolls-Royce Ghost", cls: "Prestige", pax: 3, bags: 3, price: 890, img: "car-ghost" },
  };
  J.airports = ["London City (LCY)", "London Biggin Hill (BQH)", "Farnborough (FAB)", "Nice Côte d'Azur (NCE)", "Geneva (GVA)", "Paris Le Bourget (LBG)"];
  J.code = (a) => (a.match(/\((\w+)\)/) || [])[1] || a;
  J.city = (a) => a.replace(/ \(.*\)$/, "");
  J.MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  J.dateOf = (x = J.state.date) => new Date(x.y, x.m, x.d);
  J.dow = (x = J.state.date) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][J.dateOf(x).getDay()];
  J.amenTotal = () => Object.keys(J.amenities).reduce((t, k) => t + (J.state.amen[k] ? J.amenities[k] : 0), 0);
  J.fees = 1640;

  /* ---------- Template helpers ---------- */
  J.ic = (n, cls = "") => `<i data-lucide="${n}"${cls ? ` class="${cls}"` : ""}></i>`;
  J.ph = (src, alt = "", cls = "", style = "") =>
    `<span class="ph ${cls}"${style ? ` style="${style}"` : ""}><img src="${IMG}${J.esc(src)}.jpg" alt="${J.esc(alt)}" loading="lazy" decoding="async"></span>`;
  J.money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  J.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MARK = `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M19.5 4h6v14.6c0 5.9-4 9.4-9.6 9.4-4.6 0-8.2-2.4-9.7-6.6l5.3-2.2c.8 2.1 2.3 3.3 4.3 3.3 2.4 0 3.7-1.5 3.7-4.3V4z"/><path fill="#B89E67" d="M2.5 12.4 26 7.2l-6.2 6.4L2.5 15.3z"/></svg>`;
  J.brand = (cls = "", suffix = "") =>
    `<span class="brand ${cls}">${MARK}<span>Jetti<span class="go">go</span>${suffix ? ` <span style="font-weight:500;opacity:.7">${suffix}</span>` : ""}</span></span>`;

  /* ---------- Navigation shells ---------- */
  const NAVS = {
    passenger: [
      { id: "fleet", label: "Explore", desk: "Fleet", icon: "compass" },
      { id: "route", label: "Book", desk: "Book a jet", icon: "plane-takeoff" },
      { id: "trip", label: "Trips", desk: "My trips", icon: "briefcase" },
      { id: "concierge", label: "Concierge", desk: "Concierge", icon: "message-circle" },
      { id: "membership", label: "Account", desk: "Membership", icon: "user-round" },
    ],
    corporate: [
      { id: "corp", label: "Overview", icon: "layout-dashboard" },
      { id: "invoices", label: "Invoices", desk: "Invoices & reports", icon: "receipt" },
      { id: "documents", label: "Documents", desk: "Tax & compliance", icon: "folder-closed" },
      { id: "route", label: "Book", desk: "Book for team", icon: "plane-takeoff" },
      { id: "concierge", label: "Concierge", icon: "message-circle" },
    ],
    partner: [
      { id: "quotes", label: "Quotes", desk: "Quote requests", icon: "inbox" },
      { id: "rates", label: "Fleet", desk: "Fleet & services", icon: "plane" },
      { id: "verify", label: "Verification", icon: "shield-check" },
    ],
  };
  const SUFFIX = { corporate: "Corporate", partner: "Operators" };

  function desknav(shell, on) {
    const items = NAVS[shell];
    const right =
      shell === "passenger"
        ? `<a class="btn ghost sm round" href="#/referral">${J.ic("gift")} Refer &amp; earn</a><a href="#/membership" class="avatar" style="width:38px;height:38px">${J.ph("rahul", "Your profile")}</a>`
        : shell === "corporate"
        ? `<a class="btn sm round" href="#/route">${J.ic("plus")} New booking</a><span class="avatar" style="width:38px;height:38px">${J.ph("rahul", "Sarah Lee")}</span>`
        : `<span class="pill green">${J.ic("badge-check")} Verified operator</span>`;
    return `<header class="desknav"><div class="desknav-in">
      <a href="#/${shell === "partner" ? "quotes" : shell === "corporate" ? "corp" : "home"}">${J.brand("", SUFFIX[shell] || "")}</a>
      <nav>${items.map((i) => `<a href="#/${i.id}" class="${i.id === on ? "on" : ""}">${i.desk || i.label}</a>`).join("")}</nav>
      <div class="row gap-12">${right}</div>
    </div></header>`;
  }
  function tabbar(shell, on) {
    return `<nav class="tabbar" aria-label="Primary">${NAVS[shell]
      .map((i) => `<a href="#/${i.id}" class="${i.id === on ? "on" : ""}">${J.ic(i.icon)}<span>${i.label}</span></a>`)
      .join("")}</nav>`;
  }
  function topbar(s) {
    const back = s.back ? `<a class="iconbtn" href="#/${s.back}" aria-label="Back">${J.ic("chevron-left")}</a>` : `<span></span>`;
    const sub = s.sub ? `<small>${typeof s.sub === "function" ? s.sub() : s.sub}</small>` : "";
    const action = s.action ? s.action() : `<span></span>`;
    return `<header class="topbar${s.lined ? " lined" : ""}">${back}<div class="t">${s.title}${sub}</div>${action}</header>`;
  }

  function frame(s) {
    if (s.full) return s.full();
    const shell = s.shell;
    const cls = ["app", s.dark ? "dark" : "", shell ? "" : "no-tabs", s.cta ? "has-cta" : ""].join(" ");
    return `<div class="${cls}">
      ${shell ? desknav(shell, s.nav) : ""}
      ${s.title ? topbar(s) : ""}
      <main class="main">${s.body()}</main>
      ${s.cta ? `<div class="cta${s.ctaMobOnly ? " mob-only" : ""}"><div class="cta-in">${s.cta()}</div></div>` : ""}
      ${shell ? tabbar(shell, s.nav) : ""}
    </div>`;
  }

  /* ---------- Registry + router ---------- */
  J.screen = (id, def) => {
    J.defs[id] = def;
    J.order.push(id);
  };
  J.go = (id) => {
    location.hash = "#/" + id;
  };
  J.every = (ms, fn) => {
    const t = setInterval(fn, ms);
    J.timers.push(() => clearInterval(t));
    return t;
  };
  J.later = (ms, fn) => {
    const t = setTimeout(fn, ms);
    J.timers.push(() => clearTimeout(t));
    return t;
  };

  let toastTimer;
  J.toast = (msg, icon = "check-circle-2") => {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.innerHTML = `${J.ic(icon)}<span>${J.live && J.live.on ? J.esc(msg) : msg}</span>`;
    J.icons(el);
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  };

  J.icons = (root) => {
    if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.75 }, root: root || document.body });
  };

  function current() {
    const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
    return id && Object.prototype.hasOwnProperty.call(J.defs, id) ? id : "home";
  }

  let renderSeq = 0;
  async function render() {
    J.timers.forEach((stop) => stop());
    J.timers = [];
    const id = current();
    const s = J.defs[id];
    const seq = ++renderSeq;
    // Live mode: fetch the screen's data first. Loaders may ask to sign in or redirect.
    if (J.live && J.live.on && s.load) {
      document.body.classList.add("is-loading");
      try {
        await s.load();
      } catch (err) {
        if (seq !== renderSeq || (err && err.staleSession)) return;
        document.body.classList.remove("is-loading");
        if (err && err.redirect) {
          if (err.message) J.toast(err.message, "info");
          J.go(err.redirect);
          return;
        }
        if (err && err.status === 401) return J.live.toLogin(id);
        J.toast((err && err.message) || "Something went wrong", "circle-alert");
        document.getElementById("app").innerHTML = `<main class="main"><p>Unable to load this screen.</p><button class="btn" id="retry-load">Try again</button><a href="#/home">Home</a></main>`;
        document.getElementById("retry-load").onclick = render;
        return;
      }
      if (seq !== renderSeq) return;
      document.body.classList.remove("is-loading");
    }
    // Swap in a fresh root so listeners from the previous screen are dropped.
    const old = document.getElementById("app");
    const root = old.cloneNode(false);
    old.replaceWith(root);
    root.innerHTML = frame(s);
    root.className = "screen-enter";
    document.title = `${s.doc || s.title || "Jettigo"} · Jettigo`;
    J.icons(root);
    window.scrollTo(0, 0);
    if (s.init) s.init(root);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "jettigo:route", id, title: s.doc || s.title || id }, "*");
    }
  }

  // Shared interaction primitives used across screens.
  document.addEventListener("click", (e) => {
    const seg = e.target.closest(".seg button");
    if (seg) {
      seg.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === seg));
      seg.parentElement.dispatchEvent(new CustomEvent("seg", { detail: seg.dataset.v, bubbles: true }));
    }
    const step = e.target.closest(".stepper button");
    if (step) {
      const out = step.parentElement.querySelector("output");
      const min = +(step.parentElement.dataset.min || 0);
      const max = +(step.parentElement.dataset.max || 99);
      const v = Math.min(max, Math.max(min, +out.textContent + (step.dataset.d === "+" ? 1 : -1)));
      out.textContent = v;
      step.parentElement.dispatchEvent(new CustomEvent("step", { detail: v, bubbles: true }));
    }
    const fake = e.target.closest("[data-toast]");
    if (fake) {
      e.preventDefault();
      J.toast(fake.dataset.toast, fake.dataset.icon || "check-circle-2");
    }
    // Prototype hint: tapping a non-interactive spot flashes every hotspot.
    if (J.hints && !e.target.closest("a,button,input,select,textarea,label,[data-act],[data-toast]")) {
      document.body.classList.add("hint-flash");
      setTimeout(() => document.body.classList.remove("hint-flash"), 650);
    }
  });

  /** "10d 4h" for far-off departures, "2h 14m 59s" on the day. */
  J.countdown = (sec, withSeconds = false) => {
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (d >= 2) return `${d}d ${h}h`;
    const hh = d * 24 + h;
    return withSeconds ? `${hh}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s` : `${hh}h ${String(m).padStart(2, "0")}m`;
  };
  J.current = current;
  J.rerender = render;
  J.boot = () => {
    if (J.wire) document.documentElement.classList.add("wire");
    window.addEventListener("hashchange", render);
    render();
  };

  /* ---------- Shared visuals ---------- */
  // Line/area chart in a fixed viewBox so it scales without distortion.
  J.chart = (vals, labels, { prefix = "", max } = {}) => {
    const top = max || Math.max(1, Math.ceil(Math.max(0, ...vals) * 1.15));
    const W = 600, H = 200;
    const xp = (i) => (i * 100) / Math.max(1, vals.length - 1);
    const yp = (v) => (1 - v / top) * 100;
    const pts = vals.map((v, i) => [(xp(i) * W) / 100, (yp(v) * H) / 100]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = `${line} L${W} ${H} L0 ${H} Z`;
    const grid = [0, 0.5, 1].map((f) => `<line x1="0" x2="${W}" y1="${H * (1 - f)}" y2="${H * (1 - f)}" vector-effect="non-scaling-stroke" style="stroke:var(--line)"/>`).join("");
    const yl = [0, 0.5, 1].map((f) => `<span class="yl" style="top:${(1 - f) * 100}%">${prefix}${Math.round(top * f)}</span>`).join("");
    const dots = vals.map((v, i) => `<i class="pt" style="left:${xp(i)}%;top:${yp(v)}%"></i>`).join("");
    return `<div class="chart" role="img" aria-label="Spending trend"><div class="plot">${yl}<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--gold)" stop-opacity=".28"/><stop offset="1" style="stop-color:var(--gold)" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path class="area" d="${area}" fill="url(#ga)"/><path d="${line}" fill="none" vector-effect="non-scaling-stroke" style="stroke:var(--navy-900)" stroke-width="2.25" stroke-linejoin="round"/></svg>${dots}</div>
      <div class="xl">${labels.map((l) => `<span>${l}</span>`).join("")}</div></div>`;
  };

  // Deterministic QR-style code for the boarding pass.
  J.qr = (seed = 7) => {
    const n = 25;
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const finder = (cx, cy) => `<rect x="${cx}" y="${cy}" width="7" height="7" fill="currentColor"/><rect x="${cx + 1}" y="${cy + 1}" width="5" height="5" style="fill:var(--surface)"/><rect x="${cx + 2}" y="${cy + 2}" width="3" height="3" fill="currentColor"/>`;
    let cells = "";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const inFinder = (r < 8 && c < 8) || (r < 8 && c > n - 9) || (r > n - 9 && c < 8);
        if (!inFinder && rnd() > 0.52) cells += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
      }
    return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" aria-label="Boarding QR code" role="img"><g fill="currentColor">${cells}</g>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
  };

  J.PLANE = `<path d="M0 -11 C1.2 -11 1.8 -9.5 1.8 -8 L1.8 -3 L11 2.5 L11 5 L1.8 2.2 L1.4 7.5 L4.2 9.6 L4.2 11.4 L0 10.2 L-4.2 11.4 L-4.2 9.6 L-1.4 7.5 L-1.8 2.2 L-11 5 L-11 2.5 L-1.8 -3 L-1.8 -8 C-1.8 -9.5 -1.2 -11 0 -11 Z" fill="#fff"/>`;

  // Move a marker along an SVG path; progress 0..1. Rotates to the path tangent.
  J.along = (path, marker, t) => {
    const L = path.getTotalLength();
    const p = path.getPointAtLength(L * t);
    const q = path.getPointAtLength(Math.min(L, L * t + 1));
    const a = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI + 90;
    marker.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${a.toFixed(1)})`);
  };
})();
