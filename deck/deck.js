/* Jettigo design review — shared navigation, screen index and live device frames. */
(function () {
  const D = (window.D = {});
  const APP = "app/";

  D.pages = [
    { href: "index.html", label: "Overview" },
    { sep: true },
    { href: "sitemap.html", label: "Sitemap & architecture", phase: 1 },
    { href: "journeys.html", label: "User journeys", phase: 1 },
    { href: "wireframes.html", label: "Wireframes", phase: 1 },
    { sep: true },
    { href: "visual.html", label: "Visual direction", phase: 2 },
    { href: "screens.html", label: "UI screens", phase: 2 },
    { href: "prototype.html", label: "Prototype", phase: 2 },
  ];

  D.groups = ["Website & account", "Booking", "Day of travel", "Corporate", "Partners"];
  D.screens = [
    { id: "home", t: "Landing page", g: 0, n: "Brand hero with the two primary actions, quick search on desktop, proof points, how it works, fleet teaser and membership band." },
    { id: "login", t: "Passenger & corporate login", g: 0, n: "Account-type switch, one-time code by email or phone, company SSO, Apple / Google, and a guest quote path." },
    { id: "fleet", t: "Fleet gallery", g: 0, n: "Swipeable aircraft carousel, entry to the 360° tour, three headline specs and explore / quote actions." },
    { id: "cabin", t: "360° cabin tour", g: 0, n: "Immersive viewer with feature hotspots, scene switcher, aircraft story and a booking action." },
    { id: "membership", t: "Membership tiers", g: 0, n: "Three tier cards, benefit comparison table, upgrade action and referral cross-sell." },
    { id: "referral", t: "Referral rewards", g: 0, n: "Reward headline, copyable code, native share, three-step explainer and earnings summary." },
    { id: "route", t: "Select route", g: 1, n: "Funnel progress, origin / destination with swap, trip type, calendar and time, passengers and baggage. Live trip summary on desktop." },
    { id: "jets", t: "Choose your jet", g: 1, n: "Trip banner with edit, quotes-received prompt, category filters and aircraft cards with specs, rate and estimate." },
    { id: "compare", t: "Quote comparison", g: 1, n: "Side-by-side table of three operator quotes: aircraft, price, cabin, baggage, flight time and rating." },
    { id: "travelers", t: "Traveler manifest & KYC", g: 1, n: "One card per traveler with passport scan, lead-traveler identity check and a verified counter." },
    { id: "amenities", t: "On-board amenities", g: 1, n: "Dining, entertainment and comfort add-ons with included / paid states and a running total." },
    { id: "pay", t: "Review & pay", g: 1, n: "Price breakdown, card / wire / flight-credit payment, billing address and confirm action." },
    { id: "confirmed", t: "Booking confirmed", g: 1, n: "Confirmation, boarding pass with QR, wallet action and next-step cross-sells." },
    { id: "trip", t: "Day-of-trip dashboard", g: 2, n: "Live countdown, departure FBO with directions, readiness timeline, crew, aircraft and quick services." },
    { id: "tracker", t: "Live flight tracker", g: 2, n: "Full map with live aircraft position, progress, altitude and speed, arrival and weather details." },
    { id: "ground", t: "Ground transport", g: 2, n: "Vehicle selection, planeside pickup, destination search with suggestions and meet & greet." },
    { id: "chauffeur", t: "Chauffeur tracking", g: 2, n: "Live car position, chauffeur profile and rating, ETA, message and call actions." },
    { id: "concierge", t: "Concierge chat", g: 2, n: "Conversation thread, quick-request chips, composer and trip context on desktop." },
    { id: "corp", t: "Corporate dashboard", g: 3, n: "Credit balance, KPIs, spending chart, team travel activity and team management." },
    { id: "invoices", t: "Invoices & reports", g: 3, n: "Invoice list with statuses, quarterly spend, custom report builder with PDF / CSV export." },
    { id: "documents", t: "Tax & compliance", g: 3, n: "Document search, recent files with download / share, and document categories." },
    { id: "partner", t: "Partner welcome", g: 4, n: "Partner pitch, role selection (operator or service provider), benefits and get started." },
    { id: "verify", t: "Business verification", g: 4, n: "Onboarding progress, company and licence details, secure document upload." },
    { id: "rates", t: "Fleet & services setup", g: 4, n: "Aircraft / helicopter details, hourly rate, cabin dimensions, photos and service toggles." },
    { id: "op-login", t: "Operator secure login", g: 4, n: "Email and password with two-factor step, recovery, partner application links." },
    { id: "quotes", t: "Operator quote hub", g: 4, n: "Request with response timer, requested aircraft, accept / counter / decline, and the queue." },
  ];
  D.byId = Object.fromEntries(D.screens.map((s) => [s.id, s]));

  D.icons = (root) => window.lucide && window.lucide.createIcons({ attrs: { "stroke-width": 1.75 }, root: root || document.body });

  D.top = (active) => {
    const el = document.getElementById("d-top");
    el.outerHTML = `<header class="d-top"><div class="d-wrap d-top-in">
      <a href="index.html">${J_BRAND}</a><span class="tag">Design review · Phases 1 &amp; 2</span>
      <nav class="d-nav" aria-label="Sections"><div class="d-nav-in">${D.pages.map((p) => (p.sep ? `<span class="sep"></span>` : `<a href="${p.href}" class="${p.href === active ? "on" : ""}"${p.href === active ? ' aria-current="page"' : ""}>${p.label}</a>`)).join("")}<span class="fx-spot" aria-hidden="true"></span><span class="fx-amb" aria-hidden="true"></span></div></nav>
    </div></header>`;
  };

  D.pager = (active) => {
    const list = D.pages.filter((p) => !p.sep);
    const i = list.findIndex((p) => p.href === active);
    const prev = list[i - 1], next = list[i + 1];
    return `<div class="d-pager">${prev ? `<a href="${prev.href}"><small>← Previous</small><b>${prev.label}</b></a>` : "<span></span>"}${next ? `<a class="next" href="${next.href}"><small>Next →</small><b>${next.label}</b></a>` : ""}</div>`;
  };
  D.foot = () => `<footer class="d-foot"><div class="d-wrap">
    <div class="d-foot-top">
      <div class="stack gap-8">${J_BRAND.replace('class="brand"', 'class="brand lg"')}<span class="d-muted d-small">Private aviation, booked in minutes.</span></div>
      <nav class="d-foot-nav" aria-label="Footer">${D.pages.filter((p) => !p.sep).map((p) => `<a href="${p.href}">${p.label}</a>`).join("")}</nav>
      <a class="btn sm round" href="${APP}">Open the live app ↗</a>
    </div>
    <div class="d-foot-bot"><span>Jettigo UI/UX design, phases 1 and 2 review. October 2026.</span><span>Motion adapted from <a href="https://skiper-ui.com" target="_blank" rel="noopener">Skiper UI</a> and <a href="https://www.vengenceui.com" target="_blank" rel="noopener">Vengeance UI</a></span></div>
    <div class="d-foot-mark" aria-hidden="true">Jetti<span>go</span></div>
  </div></footer>`;

  const SIZES = { phone: [390, 844], tablet: [820, 1180], desktop: [1440, 900] };
  // A device frame holding the live app scaled to fit its width.
  D.device = (type, route, { wire = false, lazy = true, flat = false, interactive = true, hints = false, id = "" } = {}) => {
    const [w, h] = SIZES[type];
    const q = [wire && "wire=1", hints && "hints=1"].filter(Boolean).join("&");
    const src = `${APP}${q ? "?" + q : ""}#/${route}`;
    return `<div class="d-dev ${type}${flat ? " flat" : ""}"${id ? ` id="${id}"` : ""}><div class="scr" style="aspect-ratio:${w}/${h}">
      <iframe src="${src}" width="${w}" height="${h}" data-w="${w}" ${lazy ? 'loading="lazy"' : ""} title="Jettigo ${route} screen" ${interactive ? "" : 'tabindex="-1" style="pointer-events:none"'}></iframe></div></div>`;
  };
  D.fit = (root = document) => {
    root.querySelectorAll(".d-dev .scr").forEach((scr) => {
      if (scr._ro) return;
      const f = scr.querySelector("iframe");
      scr._ro = new ResizeObserver(() => {
        const s = scr.clientWidth / +f.dataset.w;
        f.style.transform = `scale(${s})`;
      });
      scr._ro.observe(scr);
    });
  };

  const J_BRAND = `<span class="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M19.5 4h6v14.6c0 5.9-4 9.4-9.6 9.4-4.6 0-8.2-2.4-9.7-6.6l5.3-2.2c.8 2.1 2.3 3.3 4.3 3.3 2.4 0 3.7-1.5 3.7-4.3V4z"/><path fill="#B89E67" d="M2.5 12.4 26 7.2l-6.2 6.4L2.5 15.3z"/></svg><span>Jetti<span class="go">go</span></span></span>`;
  D.BRAND = J_BRAND;

  // Gallery of screens (used by wireframes + UI screens pages).
  D.gallery = (el, { wire = false, type = "phone", filter = "all", link = "screens" } = {}) => {
    const out = [];
    D.groups.forEach((g, gi) => {
      if (filter !== "all" && +filter !== gi) return;
      out.push(`<div class="d-grp-title">${g}</div>`);
      D.screens.filter((s) => s.g === gi).forEach((s, i) => {
        const num = String(D.screens.indexOf(s) + 1).padStart(2, "0");
        out.push(`<div class="d-tile">
          <a href="${link === "screens" ? `screens.html#${s.id}` : `prototype.html#${s.id}`}" aria-label="Open ${s.t}">${D.device(type, s.id, { wire, flat: true, interactive: false })}</a>
          <div class="cap"><b>${s.t}</b><span class="id">${num}</span></div>
          ${wire ? `<p class="note">${s.n}</p>` : ""}
          <div class="acts">${wire ? `<a href="screens.html#${s.id}">View hi-fi</a>` : ""}<a href="prototype.html#${s.id}">Try in prototype</a></div>
        </div>`);
      });
    });
    el.className = "d-gallery" + (type === "desktop" ? " wide" : "");
    el.innerHTML = out.join("");
    D.fit(el);
  };
})();
