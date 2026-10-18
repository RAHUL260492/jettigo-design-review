/* Jettigo — public + passenger screens */
(function () {
  const { ic, ph, money, brand } = J;
  const S = J.state;

  const progress = (on) => {
    const steps = ["Route", "Jet", "Travelers", "Payment"];
    return `<div class="progress" aria-label="Booking progress">${steps
      .map((l, i) => `<div class="st ${i < on ? "done" : i === on ? "on" : ""}"><span class="dot">${i < on ? ic("check") : ""}</span>${l}</div>`)
      .join("")}</div>`;
  };
  const when = () => `${J.dow(S.day)} ${S.day} Oct`;
  const legs = () => `${J.code(S.origin)} → ${J.code(S.dest)}`;
  J.when = when; J.legs = legs;
  const tripLine = () => `${when()} · ${S.time} · ${S.pax} passenger${S.pax > 1 ? "s" : ""}`;
  J.tripLine = tripLine;

  /* =============== Landing =============== */
  J.screen("home", {
    doc: "Private jets, premium and accessible",
    group: "Website",
    full: () => `<div class="landing">
      <header class="mnav"><div class="mnav-in">
        <a href="#/home" aria-label="Jettigo home">${brand()}</a>
        <nav><a href="#/fleet">Fleet</a><a href="#/membership">Membership</a><a href="#/corp">For business</a><a href="#/partner">Partner with us</a></nav>
        <div class="row gap-8">
          <a class="btn ghost sm round desk-only" href="#/login">Sign in</a>
          <a class="btn sm round desk-only" href="#/route">Book a jet</a>
          <button class="iconbtn mob-only" data-act="drawer" aria-label="Open menu" aria-controls="drawer" aria-expanded="false">${ic("menu")}</button>
        </div>
      </div></header>

      <section class="hero">
        <div class="hero-bg"><div class="cabin">${ph("cabin-hero", "Private jet cabin")}</div><div class="sky">${ph("jet-clouds", "Jet above the clouds at sunset")}</div></div>
        <div class="hero-in">
          <div class="hero-copy">
            <span class="eyebrow">Private jets</span>
            <h1><span class="soft">Premium.</span><br>Accessible.</h1>
            <p>Your dedication deserves recognition. Charter a private jet in minutes, with a concierge on call around the clock.</p>
            <div class="row hero-ctas gap-12"><a class="btn light round lg" href="#/fleet" style="min-width:150px">Discover</a><a class="btn round lg" href="#/route" style="min-width:150px">Book now</a></div>
          </div>
          <div class="hero-art">${ph("jet-hero", "Private jet on the runway")}<a class="hero-badge" href="#/fleet"><span class="dot"></span><span><b>Gulfstream G650</b><small>Available from London today</small></span></a></div>
          <div class="search-widget" role="search">
            <a class="sw" href="#/route"><div class="lbl">From</div><div class="val">London City (LCY)</div></a>
            <a class="sw" href="#/route"><div class="lbl">To</div><div class="val">Nice Côte d'Azur (NCE)</div></a>
            <a class="sw" href="#/route"><div class="lbl">Departure</div><div class="val">Thu 29 Oct · 10:00</div></a>
            <a class="sw" href="#/route"><div class="lbl">Passengers</div><div class="val">4 adults</div></a>
            <a class="btn" href="#/jets">${ic("search")} Search jets</a>
          </div>
        </div>
      </section>

      <section class="lp-section">
        <div class="stat-row">
          <div class="stat"><div class="n">2,400+</div><div class="muted">Vetted aircraft worldwide</div></div>
          <div class="stat"><div class="n">4 min</div><div class="muted">Average time to first quote</div></div>
          <div class="stat"><div class="n">180</div><div class="muted">Countries and 5,000 airports</div></div>
          <div class="stat"><div class="n">24/7</div><div class="muted">Dedicated concierge</div></div>
        </div>
      </section>

      <section class="lp-section" style="padding-top:0">
        <div class="stack gap-8" style="max-width:640px"><span class="label">How it works</span><h2 class="h1">From request to runway, quietly handled.</h2></div>
        <div class="g4 mt-32 gap-24" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <div class="feature"><span class="ico">${ic("route")}</span><h3 class="h3">Tell us the trip</h3><p class="muted">Route, date and party size. One way, return or multi-city.</p></div>
          <div class="feature"><span class="ico">${ic("scale")}</span><h3 class="h3">Compare live quotes</h3><p class="muted">Verified operators respond in minutes. Compare aircraft, cabin and price side by side.</p></div>
          <div class="feature"><span class="ico">${ic("shield-check")}</span><h3 class="h3">Fly with confidence</h3><p class="muted">Every operator is licensed, insured and safety audited before joining Jettigo.</p></div>
          <div class="feature"><span class="ico">${ic("car-front")}</span><h3 class="h3">Door to door</h3><p class="muted">Chauffeur, catering and concierge arranged around your schedule.</p></div>
        </div>
      </section>

      <section class="lp-section" style="padding-top:0">
        <div class="row between wrap"><div class="stack gap-8"><span class="label">The fleet</span><h2 class="h1">Aircraft for every journey</h2></div><a class="btn ghost round" href="#/fleet">View the fleet ${ic("arrow-right")}</a></div>
        <div class="carousel mt-24">
          ${["global7500", "g650", "longitude"].map((k) => {
            const j = J.jets[k];
            return `<a class="card flush hover" href="#/fleet">${ph(j.img, j.name, "", "aspect-ratio:16/9")}<div style="padding:16px"><div class="h3">${j.name}</div><div class="muted small">${j.cls} · Up to ${j.pax} guests · ${j.range}</div></div></a>`;
          }).join("")}
        </div>
      </section>

      <section class="lp-section" style="padding-top:0">
        <div class="card navy" style="padding:32px;border-radius:24px;display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));align-items:center">
          <div class="stack gap-12"><span class="elite" style="color:var(--gold-200);border-color:var(--gold)">${ic("crown")} Membership</span><h2 class="h1">Priority access, guaranteed rates and a personal travel manager.</h2></div>
          <div class="row wrap gap-12" style="justify-content:flex-end"><a class="btn gold round lg" href="#/membership">Explore membership</a><a class="btn glass round lg" href="#/corp">For business</a></div>
        </div>
      </section>

      <footer class="lp-foot"><div class="lp-section">
        <div class="row between wrap gap-24">${brand("light")}<div class="row wrap gap-24 small"><a href="#/fleet">Fleet</a><a href="#/membership">Membership</a><a href="#/partner">Partner with us</a><a href="#/op-login">Operator login</a><a href="#/login">Sign in</a></div></div>
        <p class="xs mt-32" style="opacity:.6">© 2026 Jettigo. Prototype for design review.</p>
      </div></footer>

      <div class="drawer" id="drawer"><div class="drawer-in">
        <div class="row between" style="margin-bottom:12px">${brand()}<button class="iconbtn" data-act="drawer" aria-label="Close menu">${ic("x")}</button></div>
        <a class="item" href="#/route">${ic("plane-takeoff")} Book a jet</a>
        <a class="item" href="#/fleet">${ic("compass")} Explore the fleet</a>
        <a class="item" href="#/membership">${ic("crown")} Membership</a>
        <a class="item" href="#/corp">${ic("building-2")} For business</a>
        <a class="item" href="#/partner">${ic("handshake")} Partner with us</a>
        <div class="grow"></div>
        <a class="btn block lg" href="#/login">Sign in</a>
      </div></div>
    </div>`,
    init(root) {
      const dr = root.querySelector("#drawer");
      const opener = root.querySelector('.mnav [data-act="drawer"]');
      const set = (open) => {
        dr.classList.toggle("open", open);
        dr.inert = !open;
        opener.setAttribute("aria-expanded", String(open));
        if (open) dr.querySelector("a.item").focus();
        else if (opener) opener.focus();
      };
      dr.inert = true;
      root.addEventListener("click", (e) => {
        if (e.target.closest('[data-act="drawer"]') || e.target === dr) set(!dr.classList.contains("open"));
      });
      root.addEventListener("keydown", (e) => {
        if (!dr.classList.contains("open")) return;
        if (e.key === "Escape") { e.preventDefault(); set(false); }
        if (e.key === "Tab") {
          const items = [...dr.querySelectorAll("a[href], button")];
          const first = items[0], last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    },
  });

  /* =============== Login =============== */
  const GOOGLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/></svg>`;
  const APPLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>`;
  J.screen("login", {
    doc: "Passenger & corporate login",
    group: "Website",
    full: () => `<div class="auth split-auth">
      <div class="auth-art">${ph("jet-clouds", "")}<p class="q">Every journey, impeccably arranged.</p></div>
      <div class="auth-pane"><div class="auth-card">
        <a href="#/home" style="align-self:center" aria-label="Jettigo home">${brand("light lg")}</a>
        <div class="stack gap-8 center" style="margin:8px 0 4px"><h1 class="h1">Welcome aboard</h1><p style="opacity:.7">Sign in to book, track and manage your flights.</p></div>
        <div class="seg block" id="acct"><button class="on" data-v="passenger">Passenger</button><button data-v="corporate">Corporate</button></div>
        <div id="s-id" class="stack gap-12">
          <input class="input" id="ident" placeholder="Email or phone number" autocomplete="username" value="james@thompson.co">
          <button class="btn gold block lg" data-act="otp">Send one-time code</button>
          <button class="btn glass block lg" data-act="sso">${ic("building-2")} Sign in with company SSO</button>
        </div>
        <div id="s-otp" class="stack gap-12" hidden>
          <p class="small" style="opacity:.75">Enter the 6-digit code sent to <b id="sent-to">james@thompson.co</b></p>
          <div class="otp">${[4, 7, 2, 9, 1, 6].map((d) => `<input class="input" inputmode="numeric" maxlength="1" value="${d}" aria-label="Digit">`).join("")}</div>
          <button class="btn gold block lg" data-act="verify">Verify &amp; continue</button>
          <button class="small" style="opacity:.7" data-act="back">Use a different email</button>
        </div>
        <div class="or">OR</div>
        <div class="social"><button data-act="social">${APPLE} Apple</button><button data-act="social">${GOOGLE} Google</button></div>
        <a class="btn ghost block lg" style="color:#fff;border-color:var(--gold)" href="#/route">Get a quote as guest</a>
        <p class="center small" style="opacity:.75">New to Jettigo? <a class="link" style="color:var(--gold-200)" href="#/membership">Join Jettigo</a></p>
      </div></div>
    </div>`,
    init(root) {
      const next = () => J.go(S.account === "corporate" ? "corp" : "route");
      root.querySelector("#acct").addEventListener("seg", (e) => (S.account = e.detail));
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        const act = a.dataset.act;
        if (act === "otp") {
          root.querySelector("#sent-to").textContent = root.querySelector("#ident").value || "your email";
          root.querySelector("#s-id").hidden = true;
          root.querySelector("#s-otp").hidden = false;
        }
        if (act === "back") {
          root.querySelector("#s-id").hidden = false;
          root.querySelector("#s-otp").hidden = true;
        }
        if (act === "verify" || act === "social") {
          a.classList.add("is-loading");
          J.later(700, next);
        }
        if (act === "sso") {
          S.account = "corporate";
          a.classList.add("is-loading");
          J.later(700, () => J.go("corp"));
        }
      });
    },
  });

  /* =============== Booking: route =============== */
  function calendar() {
    const first = 4; // 1 Oct 2026 is a Thursday (Sun = 0)
    let cells = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<span class="dow">${d}</span>`).join("");
    for (let i = 0; i < first; i++) cells += "<span></span>";
    for (let d = 1; d <= 31; d++) {
      cells += `<button data-day="${d}" class="${d === S.day ? "on" : ""} ${d === 18 ? "today" : ""}" ${d < 18 ? "disabled" : ""} aria-label="${d} October">${d}</button>`;
    }
    return `<div class="card cal">
      <div class="row between" style="padding:4px 4px 10px"><button class="iconbtn" aria-label="Previous month" data-toast="Earlier dates are unavailable" data-icon="info">${ic("chevron-left")}</button><b>October 2026</b><button class="iconbtn" aria-label="Next month" data-toast="November opens in the full build" data-icon="info">${ic("chevron-right")}</button></div>
      <div class="cal-grid" id="cal">${cells}</div>
      <div class="divider"></div>
      <div class="row" style="padding:2px 6px">${ic("clock-3")}<select class="grow" id="time" aria-label="Departure time" style="border:0;background:none;font-weight:600">${["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "16:00"].map((t) => `<option ${t === S.time ? "selected" : ""}>${t}</option>`).join("")}</select><span class="pill">Local time</span></div>
    </div>`;
  }
  const summary = (withBtn) => `<div class="card pad-lg stack gap-12 sticky">
      <span class="label">Trip summary</span>
      <div class="row top gap-12"><div class="stack gap-8" style="align-items:center;padding-top:4px"><i style="width:8px;height:8px;border-radius:50%;background:var(--gold)"></i><i style="width:1px;height:28px;background:var(--line-2)"></i><i style="width:8px;height:8px;border-radius:50%;border:2px solid var(--navy-900)"></i></div>
        <div class="stack gap-12"><div><div class="strong" id="sum-o">${S.origin}</div><div class="xs faint">Departure</div></div><div><div class="strong" id="sum-d">${S.dest}</div><div class="xs faint">Arrival</div></div></div></div>
      <div class="divider" style="margin:4px 0"></div>
      <div class="kv"><span class="k">Date</span><span class="v" id="sum-date">${when()}, ${S.time}</span></div>
      <div class="kv"><span class="k">Passengers</span><span class="v" id="sum-pax">${S.pax}</span></div>
      <div class="kv"><span class="k">Bags</span><span class="v" id="sum-bags">${S.bags} · ${S.weight} ${S.unit}</span></div>
      <div class="kv"><span class="k">Est. flight time</span><span class="v">1h 50m</span></div>
      ${withBtn ? `<a class="btn block lg mt-8" href="#/jets">${ic("search")} Search available jets</a>` : ""}
    </div>`;

  J.screen("route", {
    title: "Book a flight",
    doc: "Booking: select route",
    group: "Booking",
    shell: "passenger",
    nav: "route",
    back: "home",
    ctaMobOnly: true,
    cta: () => `<a class="btn block lg" href="#/jets">${ic("search")} Search available jets</a>`,
    body: () => `${progress(0)}
      <div class="split mt-16">
        <div class="stack gap-24">
          <div class="stack gap-12">
            <div class="row between"><h2 class="h2">Where to?</h2><div class="seg sm" id="trip-type"><button class="on" data-v="one">One way</button><button data-v="return">Return</button><button data-v="multi">Multi-city</button></div></div>
            <div style="position:relative" class="stack gap-8">
              <label class="inputbox">${ic("plane-takeoff")}<div class="grow"><div class="lbl">Origin</div><select id="org">${J.airports.map((a) => `<option>${a}</option>`).join("")}</select></div>${ic("chevron-down")}</label>
              <label class="inputbox">${ic("plane-landing")}<div class="grow"><div class="lbl">Destination</div><select id="dst">${J.airports.map((a) => `<option>${a}</option>`).join("")}</select></div>${ic("chevron-down")}</label>
              <button class="iconbtn" data-act="swap" aria-label="Swap origin and destination" style="position:absolute;right:52px;top:50%;transform:translateY(-50%);background:var(--white);border:1px solid var(--line-2);width:38px;height:38px">${ic("arrow-down-up")}</button>
            </div>
          </div>
          <div class="stack gap-12"><h2 class="h2">Date &amp; time</h2>${calendar()}</div>
          <div class="stack gap-12"><h2 class="h2">Passengers &amp; baggage</h2>
            <div class="g2 gap-12">
              <div class="inputbox">${ic("users")}<div class="grow"><div class="lbl">Passengers</div><div class="val">Adults</div></div><div class="stepper" data-min="1" data-max="19" id="pax"><button data-d="-" aria-label="Fewer">${ic("minus")}</button><output>${S.pax}</output><button data-d="+" aria-label="More">${ic("plus")}</button></div></div>
              <div class="inputbox">${ic("luggage")}<div class="grow"><div class="lbl">Number of bags</div><div class="val">Checked</div></div><div class="stepper" data-min="0" data-max="30" id="bags"><button data-d="-" aria-label="Fewer">${ic("minus")}</button><output>${S.bags}</output><button data-d="+" aria-label="More">${ic("plus")}</button></div></div>
            </div>
            <div class="inputbox">${ic("weight")}<div class="grow"><div class="lbl">Total baggage weight</div><input id="wt" type="number" inputmode="numeric" value="${S.weight}" aria-label="Total baggage weight"></div><div class="seg sm dark-on" id="unit"><button class="${S.unit === "KG" ? "on" : ""}" data-v="KG">KG</button><button class="${S.unit === "LBS" ? "on" : ""}" data-v="LBS">LBS</button></div></div>
          </div>
        </div>
        <div class="desk-only">${summary(true)}</div>
      </div>`,
    init(root) {
      const upd = () => {
        const q = (id) => root.querySelector(id);
        q("#sum-o").textContent = S.origin;
        q("#sum-d").textContent = S.dest;
        q("#sum-date").textContent = `${when()}, ${S.time}`;
        q("#sum-pax").textContent = S.pax;
        q("#sum-bags").textContent = `${S.bags} · ${S.weight} ${S.unit}`;
      };
      const org = root.querySelector("#org"), dst = root.querySelector("#dst");
      org.value = S.origin; dst.value = S.dest;
      org.onchange = () => { S.origin = org.value; upd(); };
      dst.onchange = () => { S.dest = dst.value; upd(); };
      root.querySelector("#cal").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-day]");
        if (!b || b.disabled) return;
        root.querySelectorAll("#cal button").forEach((x) => x.classList.toggle("on", x === b));
        S.day = +b.dataset.day; upd();
      });
      root.querySelector("#trip-type").addEventListener("seg", (e) => {
        if (e.detail === "one") return;
        J.toast("This prototype covers one-way trips. Return and multi-city follow the same steps.", "info");
        root.querySelectorAll("#trip-type button").forEach((b) => b.classList.toggle("on", b.dataset.v === "one"));
      });
      root.querySelector("#time").onchange = (e) => { S.time = e.target.value; upd(); };
      root.querySelector("#pax").addEventListener("step", (e) => { S.pax = e.detail; upd(); });
      root.querySelector("#bags").addEventListener("step", (e) => { S.bags = e.detail; upd(); });
      root.querySelector("#unit").addEventListener("seg", (e) => { S.unit = e.detail; upd(); });
      root.querySelector("#wt").oninput = (e) => { S.weight = e.target.value || 0; upd(); };
      root.querySelector('[data-act="swap"]').onclick = (e) => {
        e.preventDefault();
        [S.origin, S.dest] = [S.dest, S.origin];
        org.value = S.origin; dst.value = S.dest; upd();
      };
    },
  });

  /* =============== Booking: choose jet =============== */
  const jetCard = (k) => {
    const j = J.jets[k];
    const small = j.pax < S.pax;
    return `<article class="card flush hover jet-card ${S.jet === k ? "sel" : ""}${small ? " too-small" : ""}" data-cat="${j.cat}">
      ${ph(j.img, j.name)}
      <div class="stack gap-12" style="padding:16px">
        <div class="row between top"><div><h3 class="h3" style="font-size:18px">${j.name}</h3><div class="small faint">${j.cls}</div></div><div class="row gap-8">${ic("calendar-days")}<div style="line-height:1.1"><b>${j.yom}</b><div class="xs faint">YOM</div></div></div></div>
        <div class="jet-specs">
          <div class="s">${ic("armchair")}<div><b>${j.pax}</b><span>Passengers</span></div></div>
          <div class="s">${ic("globe-2")}<div><b>${j.range}</b><span>Range</span></div></div>
          <div class="s">${ic("timer")}<div><b>${money(j.rate)}/hr</b><span>Rate</span></div></div>
        </div>
        <div class="row between" style="padding-top:4px;border-top:1px solid var(--line)"><div><div class="xs faint">Estimated trip</div><b style="font-size:18px">${money(j.est)}</b></div>${small ? `<span class="pill">Seats ${j.pax} · too small</span>` : `<a class="btn" href="#/travelers" data-jet="${k}" style="min-width:120px">Select</a>`}</div>
      </div>
    </article>`;
  };
  J.screen("jets", {
    title: "Choose your jet",
    doc: "Booking: choose your jet",
    group: "Booking",
    shell: "passenger",
    nav: "route",
    back: "route",
    action: () => `<a class="iconbtn" href="#/membership" aria-label="Account">${ic("circle-user-round")}</a>`,
    body: () => `${progress(1)}
      <div class="route-banner mt-16"><div><div class="r">${J.city(S.origin)} (${J.code(S.origin)}) → ${J.city(S.dest)} (${J.code(S.dest)})</div><div class="m">${tripLine()}</div></div><a class="btn glass sm" href="#/route">${ic("pencil")} Edit</a></div>
      <a class="card row between hover mt-16" href="#/compare" style="border-color:var(--gold-200);background:var(--gold-100)"><div class="row gap-12"><span class="folder" style="background:var(--gold)">${ic("scale")}</span><div><b>3 operator quotes received</b><div class="small muted">Compare aircraft, cabin and price side by side</div></div></div>${ic("chevron-right")}</a>
      <div class="row wrap gap-8 mt-16"><button class="chip" data-f="all" style="background:var(--navy-900);color:#fff;border-color:var(--navy-900)">All jets</button><button class="chip" data-f="mid">Midsize</button><button class="chip" data-f="heavy">Heavy</button><button class="chip" data-f="ulr">Ultra-long range</button><span class="grow"></span><span class="small faint">Sorted by recommended</span></div>
      <div class="g2 mt-16">${Object.keys(J.jets).map(jetCard).join("")}</div>`,
    init(root) {
      root.querySelectorAll("[data-jet]").forEach((a) => a.addEventListener("click", () => (S.jet = a.dataset.jet)));
      root.querySelectorAll(".chip").forEach((c) =>
        c.addEventListener("click", () => {
          root.querySelectorAll(".chip").forEach((x) => (x.style.cssText = ""));
          c.style.cssText = "background:var(--navy-900);color:#fff;border-color:var(--navy-900)";
          root.querySelectorAll(".jet-card").forEach((card) => (card.hidden = c.dataset.f !== "all" && card.dataset.cat !== c.dataset.f));
        })
      );
    },
  });

  /* =============== Quote comparison =============== */
  J.screen("compare", {
    title: "Compare quotes",
    sub: "3 verified operators responded",
    doc: "Quote comparison",
    group: "Booking",
    shell: "passenger",
    nav: "route",
    back: "jets",
    body: () => {
      const opts = [
        { k: "g650", tag: `<span class="pill gold">Recommended</span>`, amen: "Wi-Fi, full-flat bed, shower", bag: "195 cu ft · ~15 bags", rating: "4.9 / 5", op: "Gold operator" },
        { k: "global7500", tag: `<span class="pill">Most space</span>`, amen: "4K cinema, conference suite, full galley", bag: "195 cu ft · ~18 bags", rating: "5.0 / 5", op: "Platinum operator" },
        { k: "falcon8x", tag: `<span class="pill green">Best value</span>`, amen: "Ka-band Wi-Fi, lounge, en-suite", bag: "140 cu ft · ~13 bags", rating: "4.8 / 5", op: "Silver operator" },
      ];
      const cell = (fn, cls = "") => opts.map((o, i) => `<div class="${i === 0 ? "best " : ""}${cls}">${fn(o, J.jets[o.k])}</div>`).join("");
      return `<p class="muted mob-only" style="margin-bottom:12px">Swipe the table to see every option.</p>
      <div class="compare">
        <div class="rh"></div>${cell((o, j) => `${ph(j.img, j.name)}<b>Option ${opts.indexOf(o) + 1}</b><div style="margin-top:6px">${o.tag}</div>`)}
        <div class="rh">Aircraft &amp; YOM</div>${cell((o, j) => `${j.name} (${j.yom})`)}
        <div class="rh">Quote</div>${cell((o, j) => `<b style="font-size:18px">${money(j.est)}</b><span class="xs faint">before taxes</span>`)}
        <div class="rh">Cabin amenities</div>${cell((o) => o.amen)}
        <div class="rh">Baggage allowance</div>${cell((o) => o.bag)}
        <div class="rh">Flight time</div>${cell((o, j) => j.time)}
        <div class="rh">Operator rating</div>${cell((o) => `<b>${o.rating}</b><span class="xs faint">${o.op}</span>`)}
        <div class="rh last"></div>${cell((o, j) => (j.pax < S.pax ? `<span class="pill">Too small</span>` : `<a class="btn sm" href="#/travelers" data-jet="${o.k}">Book now</a>`), "last")}
      </div>
      <div class="card row gap-12 mt-16">${ic("shield-check", "gold")}<p class="small muted">Quotes include crew, fuel, positioning and landing fees. Taxes and fees (${money(J.fees)}) are added at checkout. Prices are held for 30 minutes.</p></div>`;
    },
    init(root) {
      root.querySelectorAll("[data-jet]").forEach((a) => a.addEventListener("click", () => (S.jet = a.dataset.jet)));
    },
  });

  /* =============== Traveler manifest & KYC =============== */
  const NAMES = ["James Thompson", "Olivia Thompson", "Ethan Thompson", "Sophie Laurent", "Daniel Reyes", "Priya Nair", "Marcus Webb", "Ana Costa"];
  const FIELDS = ["name", "passport", "nat", "dob"];
  const fixture = (n) => ({ name: NAMES[n - 1] || `Guest Traveler ${n}`, passport: "5" + (31846270 + n * 7919), nat: n === 4 ? "French" : "British", dob: ["12/03/1979", "08/07/1982", "21/11/2009", "02/05/1990"][n - 1] || "01/01/1990" });
  const paxCard = (n) => {
    const done = !!S.verified[n];
    const t = S.travelers[n] || (done ? fixture(n) : {});
    const v = (f) => (t[f] ? `value="${J.esc(t[f])}"` : "");
    return `<div class="card pax-card stack gap-12 ${done ? "done" : ""}" data-pax="${n}">
      <span class="ok">${ic("badge-check")}</span>
      <div><b>Passenger ${n}${n === 1 ? " · Lead traveler" : ""}</b><div class="xs faint">${done ? "Verified" : "Details required"}</div></div>
      <input class="input" data-f="name" aria-label="Passenger ${n} full legal name" placeholder="Full legal name (as on passport)" ${v("name")}>
      <input class="input" data-f="passport" aria-label="Passenger ${n} passport number" placeholder="Passport number" ${v("passport")}>
      <div class="g2 gap-8" style="grid-template-columns:1fr 1fr"><input class="input" data-f="nat" aria-label="Passenger ${n} nationality" placeholder="Nationality" ${v("nat")}><input class="input" data-f="dob" aria-label="Passenger ${n} date of birth" placeholder="Date of birth" ${v("dob")}></div>
      <button class="scan" data-act="scan">${ic("scan-line")} ${done ? "Rescan passport" : "Scan passport"}</button>
      ${n === 1 ? `<button class="scan" data-act="selfie">${ic("scan-face")} Identity check: take a selfie</button>` : ""}
    </div>`;
  };
  J.screen("travelers", {
    title: "Traveler details",
    doc: "Booking: traveler manifest & KYC",
    group: "Booking",
    shell: "passenger",
    nav: "route",
    back: "jets",
    cta: () => `<div class="grow mob-only"><div class="xs faint">Verified</div><b id="vcount"></b></div><a class="btn lg" href="#/amenities" style="flex:1.4">Continue</a>`,
    body: () => `${progress(2)}
      <div class="card row gap-12 mt-16" style="background:var(--surface-2)">${ic("info", "gold")}<p class="small muted">Names must match passports exactly. Scanning a passport fills the details and runs the required checks.</p></div>
      <div class="row between mt-24"><h2 class="h2">${S.pax} travelers</h2><span class="pill green desk-only" id="vpill"></span></div>
      <div class="g2 mt-16">${Array.from({ length: S.pax }, (_, i) => paxCard(i + 1)).join("")}</div>`,
    init(root) {
      const count = () => {
        const n = Object.keys(S.verified).filter((k) => S.verified[k] && +k <= S.pax).length;
        const t = `${n} of ${S.pax} verified`;
        root.querySelector("#vcount").textContent = t;
        const p = root.querySelector("#vpill");
        if (p) p.innerHTML = `${t}`;
      };
      count();
      // Keep typed details; editing a verified traveler requires a rescan.
      root.addEventListener("input", (e) => {
        const f = e.target.dataset.f;
        const card = e.target.closest("[data-pax]");
        if (!f || !card) return;
        const n = +card.dataset.pax;
        S.travelers[n] = { ...(S.travelers[n] || (S.verified[n] ? fixture(n) : {})), [f]: e.target.value };
        if (S.verified[n]) {
          S.verified[n] = false;
          card.classList.remove("done");
          card.querySelector(".xs.faint").textContent = "Rescan passport to verify";
          count();
        }
      });
      root.addEventListener("click", (e) => {
        const b = e.target.closest('[data-act="scan"],[data-act="selfie"]');
        if (!b) return;
        const card = b.closest("[data-pax]");
        const n = +card.dataset.pax;
        b.classList.add("is-loading");
        J.later(900, () => {
          if (b.dataset.act === "selfie") { b.classList.remove("is-loading"); J.toast("Identity confirmed"); return; }
          S.verified[n] = true;
          S.travelers[n] = fixture(n);
          card.outerHTML = paxCard(n);
          J.icons(root);
          count();
          J.toast(`Passport read for passenger ${n}`, "scan-line");
        });
      });
    },
  });

  /* =============== Amenities =============== */
  const amen = (key, img, title, desc, price) => {
    const included = !price;
    const on = included || S.amen[key];
    return `<div class="card amen">
      ${img.startsWith("ico:") ? `<span class="ico-tile">${ic(img.slice(4))}</span>` : ph(img, title)}
      <div><b>${title}</b><p class="small muted">${desc}</p></div>
      <div class="amen-foot">${included ? `<span class="pill green">Included</span>` : `<span class="pill">+${money(price)}</span>`}
      <label class="switch" aria-label="${title}"><input type="checkbox" ${on ? "checked" : ""} ${included ? "disabled" : `data-amen="${key}"`}><span></span></label></div>
    </div>`;
  };
  J.screen("amenities", {
    title: "Customize your journey",
    doc: "On-board amenities",
    group: "Booking",
    shell: "passenger",
    nav: "route",
    back: "travelers",
    cta: () => `<div class="grow"><div class="xs faint">Service summary</div><b>Added: <span id="amen-t">${money(J.amenTotal())}</span></b></div><a class="btn lg" href="#/pay" style="flex:1.2">Save &amp; continue</a>`,
    body: () => `<div class="banner-img">${ph("cabin-amen", "Cabin interior")}<div class="cap"><div class="label" style="color:var(--gold-200)">${J.jets[S.jet].name}</div><div class="h1">Make the cabin yours</div></div></div>
      <div class="section"><div class="row gap-8">${ic("utensils")}<h2 class="h2" style="margin:0">Dining</h2></div><div class="g2 mt-16">
        ${amen("menu", "food", "Gourmet tasting menu", "Multi-course menu by Michelin-starred chefs", 0)}
        ${amen("wine", "wine", "Fine wines &amp; spirits", "Rare vintages and premium spirits", J.amenities.wine)}
      </div></div>
      <div class="section"><div class="row gap-8">${ic("clapperboard")}<h2 class="h2" style="margin:0">Entertainment</h2></div><div class="g2 mt-16">
        ${amen("wifi", "ico:satellite-dish", "High-speed Starlink Wi-Fi", "Low-latency internet for streaming and calls", 0)}
        ${amen("sound", "ico:speaker", "Premium sound system", "Audiophile-grade cabin audio", J.amenities.sound)}
      </div></div>
      <div class="section"><div class="row gap-8">${ic("bed-double")}<h2 class="h2" style="margin:0">Comfort</h2></div><div class="g2 mt-16">
        ${amen("linen", "linen", "Luxury linens", "Egyptian cotton bedding and cashmere throws", 0)}
        ${amen("masks", "ico:moon-star", "Silk sleep kits", "Silk masks, slippers and aromatherapy", J.amenities.masks)}
      </div></div>
      <div class="section"><h2 class="h2">Special requests</h2><textarea class="input" rows="3" placeholder="Dietary needs, celebrations, pets on board..."></textarea></div>`,
    init(root) {
      root.querySelectorAll("[data-amen]").forEach((c) =>
        c.addEventListener("change", () => {
          S.amen[c.dataset.amen] = c.checked;
          root.querySelector("#amen-t").textContent = money(J.amenTotal());
        })
      );
    },
  });

  /* =============== Review & pay =============== */
  const total = () => J.jets[S.jet].est + J.amenTotal() + J.fees;
  const priceCard = () => {
    const j = J.jets[S.jet];
    return `<div class="card pad-lg stack gap-8 sticky">
      <div class="row gap-12">${ph(j.img, j.name, "", "width:84px;height:56px;border-radius:8px;flex:none")}<div><b>${j.name}</b><div class="small faint">${j.cls}</div></div></div>
      <div class="divider"></div>
      <div class="kv"><span class="k">Route</span><span class="v">${legs()}</span></div>
      <div class="kv"><span class="k">Departure</span><span class="v">${when()}, ${S.time}</span></div>
      <div class="kv"><span class="k">Passengers</span><span class="v">${S.pax}</span></div>
      <div class="divider"></div>
      <div class="kv"><span class="k">Flight quote</span><span class="v">${money(j.est)}</span></div>
      <div class="kv"><span class="k">Amenities</span><span class="v">${money(J.amenTotal())}</span></div>
      <div class="kv"><span class="k">Taxes &amp; fees</span><span class="v">${money(J.fees)}</span></div>
      <div class="divider"></div>
      <div class="row between"><b>Total</b><b style="font-size:28px;letter-spacing:-0.02em">${money(total())}</b></div>
      <button class="btn block lg mt-8 desk-only" data-act="pay">${ic("lock")} Confirm &amp; pay</button>
    </div>`;
  };
  J.screen("pay", {
    title: "Review &amp; pay",
    doc: "Booking: review & pay",
    group: "Booking",
    shell: "passenger",
    nav: "route",
    back: "amenities",
    ctaMobOnly: true,
    cta: () => `<div class="grow"><div class="xs faint">Total</div><b style="font-size:20px">${money(total())}</b></div><button class="btn lg" data-act="pay" style="flex:1.3">${ic("lock")} Confirm booking</button>`,
    body: () => `${progress(3)}
      <div class="split mt-16">
        <div class="stack gap-24">
          <div class="mob-only">${priceCard()}</div>
          <div class="stack gap-12"><h2 class="h2">Payment method</h2>
            <div class="seg block" id="pm"><button class="on" data-v="card">Card</button><button data-v="wire">Wire transfer</button><button data-v="credits">Flight credits</button></div>
            <div id="pm-card" class="card stack gap-12">
              <label class="field"><span>Card number</span><input class="input" value="4242 4242 4242 1234" inputmode="numeric"></label>
              <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><label class="field"><span>Expiry</span><input class="input" placeholder="MM / YY" value="08 / 29"></label><label class="field"><span>CVC</span><input class="input" placeholder="123" inputmode="numeric"></label></div>
              <label class="field"><span>Cardholder name</span><input class="input" value="James Thompson"></label>
              <div class="row gap-8 small faint">${ic("shield-check")} Payments are encrypted and processed securely.</div>
            </div>
            <div id="pm-wire" class="card stack gap-8" hidden><b>Pay by wire transfer</b><p class="small muted">Confirm your booking and our team will email bank details. The aircraft is held for 24 hours while the transfer clears.</p></div>
            <div id="pm-credits" class="card stack gap-8" hidden><div class="row between"><b>Corporate flight credits</b><span class="pill green">$1,450,000 available</span></div><p class="small muted">Charged to Thompson Holdings. Your travel manager will be notified.</p></div>
          </div>
          <div class="stack gap-12"><h2 class="h2">Billing address</h2>
            <div class="card stack gap-12"><label class="field"><span>Street address</span><input class="input" value="14 Belgrave Square" autocomplete="street-address"></label><div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><label class="field"><span>City</span><input class="input" value="London" autocomplete="address-level2"></label><label class="field"><span>Postcode</span><input class="input" value="SW1X 8PS" autocomplete="postal-code"></label></div><label class="field"><span>Country</span><input class="input" value="United Kingdom" autocomplete="country-name"></label></div>
          </div>
        </div>
        <div class="desk-only">${priceCard()}</div>
      </div>`,
    init(root) {
      root.querySelector("#pm").addEventListener("seg", (e) => {
        ["card", "wire", "credits"].forEach((k) => (root.querySelector("#pm-" + k).hidden = k !== e.detail));
      });
      root.addEventListener("click", (e) => {
        const b = e.target.closest('[data-act="pay"]');
        if (!b) return;
        b.classList.add("is-loading");
        J.later(1100, () => J.go("confirmed"));
      });
    },
  });

  /* =============== Confirmation =============== */
  J.screen("confirmed", {
    doc: "Booking confirmed",
    group: "Booking",
    shell: "passenger",
    nav: "trip",
    body: () => {
      const j = J.jets[S.jet];
      return `<div class="split even" style="padding-top:24px">
        <div class="stack gap-24" style="max-width:480px;width:100%;margin:0 auto">
          <div class="stack gap-12 center"><span class="check-big">${ic("check")}</span><h1 class="h1">Booking confirmed</h1><p class="muted">Your ${j.name} is reserved. A confirmation is on its way to james@thompson.co.</p></div>
          <div class="pass">
            <div class="qr">${J.qr(742)}</div>
            <div class="tear"></div>
            <div class="info">
              <div><div class="k">Booking ref</div><div class="v mono">JG-742</div></div>
              <div class="right"><div class="k">Lead passenger</div><div class="v">James Thompson</div></div>
              <div><div class="k">From</div><div class="v">${J.city(S.origin)}</div></div>
              <div><div class="k">To</div><div class="v">${J.city(S.dest)}</div></div>
              <div><div class="k">Date</div><div class="v">${when()} 2026</div></div>
              <div><div class="k">Departs</div><div class="v">${S.time}</div></div>
            </div>
          </div>
          <div class="stack gap-12"><button class="btn block lg" style="background:#000" data-toast="Pass added to Apple Wallet" data-icon="wallet">${ic("wallet")} Add to Apple Wallet</button><a class="btn ghost block lg" href="#/trip">Go to trip dashboard</a></div>
        </div>
        <div class="stack gap-12">
          <span class="label">Complete your journey</span>
          <a class="card row between hover" href="#/ground"><div class="row gap-12"><span class="folder">${ic("car-front")}</span><div><b>Book ground transport</b><div class="small muted">Chauffeur waiting on arrival in ${J.city(S.dest).split(" ")[0]}</div></div></div>${ic("chevron-right")}</a>
          <a class="card row between hover" href="#/amenities"><div class="row gap-12"><span class="folder">${ic("utensils")}</span><div><b>Catering &amp; amenities</b><div class="small muted">Change until 24h before departure</div></div></div>${ic("chevron-right")}</a>
          <a class="card row between hover" href="#/concierge"><div class="row gap-12"><span class="folder">${ic("message-circle")}</span><div><b>Message your concierge</b><div class="small muted">Sophia is on call around the clock</div></div></div>${ic("chevron-right")}</a>
          <a class="card row between hover" href="#/referral"><div class="row gap-12"><span class="folder" style="background:var(--gold)">${ic("gift")}</span><div><b>Share the sky</b><div class="small muted">Give a friend $1,000 in flight credit</div></div></div>${ic("chevron-right")}</a>
        </div>
      </div>`;
    },
  });

  /* =============== Day of trip =============== */
  const fboMap = () => `<div class="map" style="height:150px;border-radius:12px"><svg class="base" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="#33414e" stroke-width="1">${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 36}" y1="0" x2="${i * 36}" y2="150"/>`).join("")}${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 30}" x2="400" y2="${i * 30}"/>`).join("")}</g>
      <path d="M0 110 C80 100 140 60 220 64 S340 40 400 30" stroke="#46576a" stroke-width="10" fill="none"/>
      <rect x="250" y="80" width="130" height="34" rx="4" fill="#2a3642" stroke="#3d4b59"/>
      <path d="M40 150 L40 70 L170 70 L196 54" stroke="var(--gold)" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="1 7" style="stroke:var(--gold)"/>
      <circle cx="196" cy="54" r="8" style="fill:var(--gold)"/><circle cx="196" cy="54" r="16" style="fill:var(--gold)" opacity=".25"/>
      <text x="214" y="50" fill="#fff" font-size="12" font-weight="600">London City Jet Centre</text><text x="214" y="66" fill="#9aa6b2" font-size="11">Hangar 2 · Gate J</text>
    </svg></div>`;
  J.screen("trip", {
    title: "Your trip",
    sub: () => `JG-742 · ${legs()}`,
    doc: "Passenger: day-of-trip dashboard",
    group: "Day of travel",
    shell: "passenger",
    nav: "trip",
    dark: true,
    back: "confirmed",
    action: () => `<button class="iconbtn" aria-label="Notifications" data-toast="Boarding opens at 09:40" data-icon="bell">${ic("bell")}</button>`,
    body: () => `<div class="center stack gap-8" style="padding:12px 0 20px"><span class="label">Departing in</span><div class="display tnum" id="cd">2h 15m</div><div class="muted">Scheduled ${S.time} · ${when()}</div></div>
      <div class="split">
        <div class="stack gap-16">
          <div class="glass-card stack gap-12" style="padding:16px"><div class="row between"><span class="label">Departure FBO</span><span class="pill green">On time</span></div>${fboMap()}<a class="btn light block" href="https://maps.google.com/?q=London+City+Jet+Centre" target="_blank" rel="noopener">Get directions ${ic("arrow-up-right")}</a></div>
          <div class="glass-card" style="padding:16px"><span class="label">Status</span>
            <div class="tl mt-16"><div class="t done"><i></i><b>Baggage</b><small>Loaded</small></div><div class="t done"><i></i><b>Fueling</b><small>Complete</small></div><div class="t" id="board"><i></i><b>Boarding</b><small>Opens 09:40</small></div></div>
          </div>
          <a class="glass-card stack gap-12" href="#/tracker" style="padding:16px;display:flex"><div class="row between"><span class="label">Live flight tracking</span>${ic("arrow-up-right")}</div><div class="map" style="height:120px">${trackerSvg(0.12, true)}</div></a>
        </div>
        <div class="stack gap-16">
          <div class="glass-card" style="padding:16px"><span class="label">Your crew</span>
            <div class="g2 gap-12 mt-16" style="grid-template-columns:1fr 1fr"><div class="person"><span class="avatar lg">${ph("crew-captain", "Captain David Lee")}</span><div class="who"><b>David Lee</b><span>Captain</span></div></div><div class="person"><span class="avatar lg">${ph("crew-fa", "Sarah Kim")}</span><div class="who"><b>Sarah Kim</b><span>Lead flight attendant</span></div></div></div>
          </div>
          <div class="glass-card" style="padding:16px"><span class="label">Aircraft</span><div class="row gap-12 mt-16">${ph(J.jets[S.jet].img, "", "", "width:96px;height:60px;border-radius:8px;flex:none")}<div><b>${J.jets[S.jet].name}</b><div class="small muted">Tail G-JTGO · ${S.pax} passengers</div></div></div></div>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr">
            <a class="glass-card stack gap-8" href="#/ground" style="padding:16px">${ic("car-front", "gold")}<b>Ground transport</b><span class="small muted">Chauffeur on arrival</span></a>
            <a class="glass-card stack gap-8" href="#/concierge" style="padding:16px">${ic("message-circle", "gold")}<b>Concierge</b><span class="small muted">Reply in &lt; 2 min</span></a>
          </div>
        </div>
      </div>`,
    init(root) {
      let left = 2 * 3600 + 15 * 60;
      const el = root.querySelector("#cd");
      J.every(1000, () => {
        left--;
        const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
        el.textContent = `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
      });
      const path = root.querySelector(".route-path"), mk = root.querySelector(".mk");
      if (path && mk) J.along(path, mk, 0.12);
    },
  });

  /* =============== Live flight tracker =============== */
  function trackerSvg(t = 0.8, mini = false) {
    return `<svg class="base" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="520" fill="#18212a"/>
      <g stroke="#26323d" stroke-width="1">${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="520"/>`).join("")}${Array.from({ length: 14 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="400" y2="${i * 40}"/>`).join("")}</g>
      <g fill="#24303b" stroke="#34424f" stroke-width="1.2" stroke-linejoin="round">
        <path d="M58 30 L96 18 L112 44 L104 64 L128 92 L150 124 L158 160 L138 174 L104 172 L84 182 L66 168 L82 146 L70 118 L50 104 L62 78 Z"/>
        <path d="M28 70 L44 62 L52 84 L40 104 L22 96 Z"/>
        <path d="M148 226 L196 206 L236 196 L274 210 L300 250 L312 296 L296 336 L316 372 L300 408 L262 420 L226 412 L194 436 L160 418 L150 382 L164 338 L136 304 L122 262 Z"/>
        <path d="M30 430 L132 418 L156 452 L140 500 L96 520 L24 520 L18 470 Z"/>
        <path d="M300 250 L344 232 L400 236 L400 352 L376 396 L352 384 L334 346 L316 300 Z"/>
        <path d="M344 440 L356 432 L364 458 L352 480 L342 466 Z"/>
      </g>
      <path class="route-path" d="M128 150 Q 196 262 318 392" fill="none" stroke="var(--gold)" style="stroke:var(--gold)" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/>
      <circle cx="128" cy="150" r="6" fill="#fff"/><circle cx="318" cy="392" r="6" style="fill:var(--gold)"/>
      ${mini ? "" : `<text x="138" y="140" fill="#fff" font-size="15" font-weight="600">${J.esc(J.city(J.state.origin).split(" ")[0])}</text><text x="138" y="158" fill="#9aa6b2" font-size="12">${J.code(J.state.origin)}</text><text x="308" y="420" text-anchor="end" fill="#fff" font-size="15" font-weight="600">${J.esc(J.city(J.state.dest).split(" ")[0])} <tspan fill="#9aa6b2" font-size="12" font-weight="400">${J.code(J.state.dest)}</tspan></text>`}
      <g class="mk"><circle r="16" style="fill:var(--gold)" opacity=".18"/><g transform="scale(${mini ? 1.1 : 1.35})">${J.PLANE}</g></g>
    </svg>`;
  }
  J.trackerSvg = trackerSvg;
  J.screen("tracker", {
    title: "Live flight",
    sub: () => `JG-742 · ${legs()} · In flight`,
    doc: "Live flight status tracker",
    group: "Day of travel",
    shell: "passenger",
    nav: "trip",
    dark: true,
    back: "trip",
    body: () => `<div class="tracker-wrap">
      <div class="map tracker-map">${trackerSvg(0.8)}</div>
      <div class="tracker-panel stack gap-16">
        <div class="glass-card stack gap-12" style="padding:18px;border-color:rgba(184,158,103,.45)">
          <span class="label">Live progress</span>
          <div class="h1 tnum"><span id="eta">45</span> min to arrival</div>
          <div class="row gap-12"><div class="bar grow"><i id="bar" style="width:80%"></i></div><b class="small tnum" id="pct">80%</b></div>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr">
            <div class="row gap-8">${ic("mountain")}<div><div class="xs faint">Altitude</div><b class="tnum">39,000 ft</b></div></div>
            <div class="row gap-8">${ic("gauge")}<div><div class="xs faint">Ground speed</div><b class="tnum" id="gs">480 kts</b></div></div>
          </div>
        </div>
        <div class="glass-card list" style="padding:4px 18px">
          <div class="row top gap-12">${ic("plane-landing", "gold")}<div><b>Arrival</b><p class="small muted">${J.esc(S.dest)}, private aviation terminal, stand A12</p></div></div>
          <div class="row top gap-12">${ic("sun", "gold")}<div><b>Weather at destination</b><p class="small muted">Sunny, 25°C, clear skies</p></div></div>
          <a class="row top gap-12" href="#/chauffeur">${ic("car-front", "gold")}<div class="grow"><b>Chauffeur confirmed</b><p class="small muted">Alexander will meet you planeside</p></div>${ic("chevron-right")}</a>
        </div>
      </div>
    </div>`,
    init(root) {
      let t = 0.8, eta = 45;
      const path = root.querySelector(".route-path"), mk = root.querySelector(".mk");
      J.along(path, mk, t);
      J.every(1200, () => {
        t = Math.min(0.99, t + 0.002);
        J.along(path, mk, t);
        root.querySelector("#bar").style.width = (t * 100).toFixed(1) + "%";
        root.querySelector("#pct").textContent = Math.round(t * 100) + "%";
        root.querySelector("#gs").textContent = 476 + Math.round(Math.random() * 8) + " kts";
      });
      J.every(8000, () => { eta = Math.max(1, eta - 1); root.querySelector("#eta").textContent = eta; });
    },
  });

  /* =============== Ground transport =============== */
  J.screen("ground", {
    title: "Ground transport",
    sub: () => `Arriving at ${J.code(S.dest)} · 11:50`,
    doc: "Ground transport booking",
    group: "Day of travel",
    shell: "passenger",
    nav: "trip",
    back: "trip",
    cta: () => `<div class="grow"><div class="xs faint">Estimated total</div><b style="font-size:20px" id="car-t">${money(J.cars[S.car].price)}</b></div><a class="btn lg" href="#/chauffeur" style="flex:1.3">Confirm transport</a>`,
    body: () => `<div class="split">
      <div class="stack gap-12"><h2 class="h2">Choose a vehicle</h2>
        ${Object.entries(J.cars).map(([k, c]) => `<button class="card navy row gap-16 hover car ${S.car === k ? "sel" : ""}" data-car="${k}" style="text-align:left;padding:14px;background:linear-gradient(120deg,#2b3644,#1b242e)">
          ${ph(c.img, c.name, "car-img")}
          <div class="grow stack gap-8" style="--gap:4px"><b style="font-size:17px">${c.name}</b><span class="small muted">${c.cls}</span><span class="xs muted row gap-12">${ic("user")} ${c.pax} · ${ic("briefcase")} ${c.bags}</span></div>
          <div class="stack" style="align-items:flex-end;--gap:8px"><b>${money(c.price)}</b><span class="pill gold sel-pill">${S.car === k ? "Selected" : "Select"}</span></div>
        </button>`).join("")}
      </div>
      <div class="stack gap-12"><h2 class="h2">Pickup details</h2>
        <div class="card stack gap-12">
          <label class="field"><span>Pickup</span><div class="inputbox" style="min-height:52px">${ic("plane-landing")}<b>Planeside · ${J.esc(S.dest)}</b></div></label>
          <label class="field"><span>Destination</span><div class="search" style="background:var(--ivory);border:1px solid var(--gold)">${ic("search")}<input id="addr" placeholder="Enter destination address" aria-label="Destination address" value="${J.esc(S.addr)}"></div></label>
          <div class="list" id="sugg" style="margin-top:-4px">
            ${["Hôtel de Paris Monte-Carlo, Monaco", "Grand-Hôtel du Cap-Ferrat, Saint-Jean-Cap-Ferrat", "Hôtel Negresco, Promenade des Anglais, Nice", "Belmond Hotel Splendido, Portofino"].map((a) => `<button class="row gap-12" style="text-align:left;width:100%">${ic("map-pin")}<span class="small">${a}</span></button>`).join("")}
          </div>
          <div class="row between"><div><b>Meet &amp; greet</b><div class="small muted">Chauffeur waits planeside with a name board</div></div><label class="switch" aria-label="Meet and greet"><input type="checkbox" checked><span></span></label></div>
        </div>
      </div>
    </div>`,
    init(root) {
      root.querySelectorAll("[data-car]").forEach((b) =>
        b.addEventListener("click", () => {
          S.car = b.dataset.car;
          root.querySelectorAll("[data-car]").forEach((x) => {
            x.classList.toggle("sel", x === b);
            x.querySelector(".sel-pill").textContent = x === b ? "Selected" : "Select";
          });
          root.querySelector("#car-t").textContent = money(J.cars[S.car].price);
        })
      );
      const addr = root.querySelector("#addr");
      root.querySelector("#sugg").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        addr.value = b.textContent.trim();
        S.addr = addr.value;
        root.querySelector("#sugg").hidden = true;
      });
      addr.addEventListener("input", () => {
        S.addr = addr.value;
        root.querySelector("#sugg").hidden = false;
        const q = addr.value.toLowerCase();
        root.querySelectorAll("#sugg button").forEach((b) => (b.hidden = q && !b.textContent.toLowerCase().includes(q)));
      });
    },
  });

  /* =============== Chauffeur tracking =============== */
  J.screen("chauffeur", {
    title: "Your chauffeur",
    sub: () => `${J.cars[S.car].name} · JTG-007`,
    doc: "Chauffeur profile & live tracking",
    group: "Day of travel",
    shell: "passenger",
    nav: "trip",
    dark: true,
    back: "ground",
    body: () => `<div class="tracker-wrap">
      <div class="map tracker-map"><svg class="base" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="400" height="520" fill="#1b242d"/>
        <g fill="#232e38" stroke="#2f3b47">
          <rect x="230" y="70" width="150" height="120" rx="6"/><rect x="250" y="40" width="40" height="40" rx="4"/><rect x="40" y="250" width="70" height="50" rx="4"/><rect x="40" y="320" width="50" height="60" rx="4"/><rect x="200" y="300" width="110" height="80" rx="6"/><rect x="250" y="400" width="60" height="50" rx="4"/>
        </g>
        <g stroke="#3a4856" stroke-width="16" fill="none" stroke-linecap="round"><path d="M-10 420 L410 330"/><path d="M150 530 C150 380 170 300 220 240 S300 200 380 210"/><path d="M60 0 L130 520"/></g>
        <g stroke="#2a3540" stroke-width="2" fill="none"><path d="M250 210 h120 M250 225 h120 M250 240 h120"/></g>
        <path id="carpath" d="M150 500 C150 380 170 300 220 240 S280 205 300 196" fill="none" stroke="#8fb3dd" stroke-width="4" stroke-linecap="round" opacity=".85"/>
        <g transform="translate(305 128)"><rect x="-14" y="-14" width="28" height="28" rx="6" fill="#36506b"/><g transform="scale(.9)">${J.PLANE}</g></g>
        <text x="305" y="166" text-anchor="middle" fill="#cfe0f3" font-size="12" font-weight="600">Terminal 1 · Private aviation</text>
        <g class="car-mk"><circle r="18" fill="#8fb3dd" opacity=".2"/><rect x="-7" y="-12" width="14" height="24" rx="5" fill="#0b1621" stroke="#cfe0f3" stroke-width="1.5"/></g>
      </svg></div>
      <div class="tracker-panel stack gap-16">
        <div class="glass-card stack gap-16" style="padding:18px">
          <div class="row gap-16"><span class="avatar xl">${ph("chauffeur", "Alexander")}</span><div class="stack gap-8" style="--gap:4px"><b style="font-size:22px">Alexander</b><span class="row gap-8 small">${ic("star", "gold")}<b>5.0</b><span class="muted">(128 reviews)</span></span><span class="small muted">12 years experience</span></div></div>
          <div class="small muted">${J.cars[S.car].name} · Plate <b style="color:var(--text)">JTG-007</b></div>
          <div class="btn light block lg" style="pointer-events:none">${ic("clock-3")} Arriving in <span id="mins">8</span> minutes</div>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><a class="btn ghost" href="#/concierge">${ic("mail")} Message</a><button class="btn ghost" data-toast="Calling Alexander…" data-icon="phone">${ic("phone")} Call</button></div>
        </div>
        <div class="glass-card list" style="padding:4px 18px"><div class="row gap-12">${ic("map-pin", "gold")}<div><b>Planeside pickup</b><p class="small muted">Stand A12 · Meet &amp; greet</p></div></div><div class="row gap-12">${ic("flag", "gold")}<div><b>${J.esc(S.addr || "Destination to confirm")}</b><p class="small muted">ETA 12:35</p></div></div></div>
      </div>
    </div>`,
    init(root) {
      const path = root.querySelector("#carpath"), mk = root.querySelector(".car-mk");
      let t = 0.05, mins = 8;
      J.along(path, mk, t);
      J.every(600, () => { t = Math.min(0.98, t + 0.006); J.along(path, mk, t); });
      J.every(9000, () => { mins = Math.max(1, mins - 1); root.querySelector("#mins").textContent = mins; });
    },
  });

  /* =============== Concierge chat =============== */
  const REPLIES = {
    "Flight update": "Your flight JG-742 is on schedule. Boarding opens at 09:40 at London City Jet Centre.",
    "Catering change": "Of course. Shall I swap the tasting menu for a lighter Mediterranean selection?",
    "Ground transport": "Alexander will meet you planeside in Nice with the S-Class. Would you like a second car for luggage?",
    "Add a passenger": "Happy to help. Please share the passenger's full name and I'll send a secure passport link.",
  };
  J.screen("concierge", {
    title: "Jettigo Concierge",
    sub: "Sophia · Available 24/7",
    doc: "Concierge chat",
    group: "Day of travel",
    shell: "passenger",
    nav: "concierge",
    back: "trip",
    lined: true,
    action: () => `<span class="avatar" style="width:40px;height:40px;position:relative">${ph("concierge", "Sophia")}<i style="position:absolute;right:0;bottom:0;width:11px;height:11px;border-radius:50%;background:#22a35a;border:2px solid var(--bg)"></i></span>`,
    cta: () => `<div class="stack gap-8 grow" style="--gap:10px;min-width:0"><div class="chips-scroll">${Object.keys(REPLIES).map((k) => `<button class="chip" data-q="${k}">${k}</button>`).join("")}</div>
      <form class="composer" id="composer"><button type="button" class="iconbtn" aria-label="Attach" data-toast="Attachments open in the full build" data-icon="paperclip">${ic("paperclip")}</button><input class="input" id="msg" placeholder="Type a message…" autocomplete="off"><button class="send" aria-label="Send">${ic("send-horizontal")}</button></form></div>`,
    body: () => `<div class="split"><div class="chat" id="chat">
        <div class="center xs faint">Today</div>
        <div class="msg me">Hello Sophia, could you arrange a bottle of 1996 vintage Champagne for my flight on Thursday?<span class="ts">09:12</span></div>
        <div class="msg them">Certainly, Mr. Thompson. A bottle of the 1996 vintage has been confirmed for your journey. Anything else?<span class="ts">09:13</span></div>
      </div>
      <div class="desk-only"><div class="card stack gap-12 sticky"><span class="label">Your upcoming trip</span><div class="row gap-12">${ph(J.jets[S.jet].img, "", "", "width:84px;height:56px;border-radius:8px;flex:none")}<div><b>LCY → NCE</b><div class="small muted">Thu ${S.day} Oct · ${S.time}</div></div></div><div class="divider"></div><div class="kv"><span class="k">Requests</span><span class="v">2 open</span></div><div class="kv"><span class="k">Champagne 1996</span><span class="v"><span class="pill green">Confirmed</span></span></div><div class="kv"><span class="k">Chauffeur</span><span class="v"><span class="pill green">Confirmed</span></span></div><a class="btn ghost block" href="#/trip">View trip</a></div></div>
    </div>`,
    init(root) {
      const chat = root.querySelector("#chat");
      const t = () => new Date().toTimeString().slice(0, 5);
      const send = (text) => {
        if (!text.trim()) return;
        chat.insertAdjacentHTML("beforeend", `<div class="msg me">${J.esc(text)}<span class="ts">${t()}</span></div>`);
        const typing = document.createElement("div");
        typing.className = "msg them typing";
        typing.innerHTML = "<i></i><i></i><i></i>";
        chat.appendChild(typing);
        typing.scrollIntoView({ behavior: "smooth", block: "end" });
        J.later(1300, () => {
          typing.remove();
          const reply = REPLIES[text] || "Noted. I'll take care of it and confirm shortly.";
          chat.insertAdjacentHTML("beforeend", `<div class="msg them">${reply}<span class="ts">${t()}</span></div>`);
          chat.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
        });
      };
      root.querySelector("#composer").addEventListener("submit", (e) => {
        e.preventDefault();
        const i = root.querySelector("#msg");
        send(i.value);
        i.value = "";
      });
      root.querySelectorAll("[data-q]").forEach((c) => c.addEventListener("click", () => send(c.dataset.q)));
    },
  });

  /* =============== Fleet gallery =============== */
  const FLEET = ["global7500", "g650", "longitude", "falcon8x"];
  const HEIGHT = { global7500: "6ft 2in", g650: "6ft 5in", longitude: "6ft 0in", falcon8x: "6ft 2in" };
  const fj = () => (FLEET.includes(S.jet) ? S.jet : "global7500");
  J.screen("fleet", {
    title: "Jettigo fleet",
    doc: "Fleet gallery",
    group: "Website",
    shell: "passenger",
    nav: "fleet",
    back: "home",
    action: () => `<button class="iconbtn" aria-label="Filters" data-toast="Filters: size, range, amenities" data-icon="sliders-horizontal">${ic("sliders-horizontal")}</button>`,
    body: () => `<div class="carousel" id="fc">${FLEET.map((k, i) => {
        const j = J.jets[k];
        return `<button class="card flush hover ${k === fj() ? "sel" : ""}" data-k="${k}" style="text-align:left">${ph(j.img, j.name, "", "aspect-ratio:16/9")}<div style="padding:14px 16px"><b style="font-size:17px">${j.name}</b><div class="small muted">${j.cls}</div></div></button>`;
      }).join("")}</div>
      <div class="split mt-16">
        <div class="stack gap-12"><div class="row between"><h2 class="h2">360° interior tour</h2><span class="pill gold">${ic("rotate-3d")} Interactive</span></div>
          <a href="#/cabin" class="banner-img fleet-preview" style="display:block;border-radius:16px;margin:0">${ph("cabin-tall", "Cabin interior", "", "aspect-ratio:16/10")}<span style="position:absolute;inset:0;display:grid;place-items:center"><span style="width:96px;height:96px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.22);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;border:1px solid rgba(255,255,255,.5);font-size:13px;font-weight:600;text-align:center">${ic("rotate-3d")}<br>Rotate</span></span></a>
        </div>
        <div class="stack gap-16">
          <div class="card stack gap-16"><div><h3 class="h2" id="fname">${J.jets[fj()].name}</h3><p class="small muted" id="fcls">${J.jets[fj()].cls}</p></div>
            <div class="g3 gap-8" style="grid-template-columns:repeat(3,1fr);text-align:center">
              <div class="stack gap-8" style="align-items:center">${ic("users")}<div class="xs faint">Passengers</div><b id="fp">${J.jets[fj()].pax}</b></div>
              <div class="stack gap-8" style="align-items:center;border-left:1px solid var(--line);border-right:1px solid var(--line)">${ic("globe-2")}<div class="xs faint">Range</div><b id="fr">${J.jets[fj()].range}</b></div>
              <div class="stack gap-8" style="align-items:center">${ic("ruler")}<div class="xs faint">Cabin height</div><b id="fh">${HEIGHT[fj()]}</b></div>
            </div>
            <p class="small muted">Explore the cabin in 360°, then request a quote for your dates. Every aircraft is operated by a verified, insured partner.</p>
          </div>
          <a class="btn block lg" href="#/cabin">Explore this jet</a>
          <a class="btn ghost block lg" href="#/route">Request a quote</a>
        </div>
      </div>`,
    init(root) {
      const selected = root.querySelector("#fc .sel");
      if (selected) root.querySelector("#fc").scrollLeft = selected.offsetLeft - root.querySelector("#fc").offsetLeft;
      root.querySelectorAll("[data-k]").forEach((b) =>
        b.addEventListener("click", () => {
          const j = J.jets[b.dataset.k];
          root.querySelectorAll("[data-k]").forEach((x) => x.classList.toggle("sel", x === b));
          root.querySelector("#fname").textContent = j.name;
          root.querySelector("#fcls").textContent = j.cls;
          root.querySelector("#fp").textContent = j.pax;
          root.querySelector("#fr").textContent = j.range;
          root.querySelector("#fh").textContent = HEIGHT[b.dataset.k];
          S.jet = b.dataset.k;
        })
      );
    },
  });

  /* =============== 360° cabin tour =============== */
  const HOTS = [
    { x: 37.4, y: 48.2, t: "Gourmet galley", d: "Espresso bar, wine chiller and a convection oven for fresh-plated meals." },
    { x: 28.9, y: 62.1, t: "Full-flat bed", d: "Converts into a 6-foot bed for restful sleep. Premium linens included." },
    { x: 92.7, y: 55.3, t: "High-speed Wi-Fi", d: "Ka-band connectivity for video calls and streaming at 41,000 ft." },
  ];
  J.screen("cabin", {
    title: "Cabin tour",
    sub: () => J.jets[S.jet].name,
    doc: "Interior: 360° cabin tour",
    group: "Website",
    shell: "passenger",
    nav: "fleet",
    dark: true,
    back: "fleet",
    ctaMobOnly: true,
    cta: () => `<a class="btn block lg" href="#/route">${ic("plane-takeoff")} Book this jet</a>`,
    body: () => `<div class="split">
      <div class="tour"><div class="stage" id="stage">
        ${ph("cabin-tall", "Lounge", "scene on")}${ph("cabin-hero", "Forward cabin", "scene", "opacity:0")}${ph("cabin-amen", "Aft suite", "scene", "opacity:0")}
        <div id="hots">${HOTS.map((h, i) => `<button class="hot ${i === 1 ? "on" : ""}" data-h="${i}" style="left:${h.x}%;top:${h.y}%" aria-label="${h.t}">${ic("plus")}</button>`).join("")}
        <div class="tip" id="tip"></div></div>
        <div class="scenes">${["Lounge|cabin-tall", "Forward cabin|cabin-hero", "Aft suite|cabin-amen"].map((s, i) => { const [l, img] = s.split("|"); return `<button class="${i === 0 ? "on" : ""}" data-s="${i}">${ph(img, "")}${l}</button>`; }).join("")}</div>
      </div></div>
      <div class="stack gap-16">
        <div class="glass-card stack gap-12" style="padding:18px"><span class="label">${J.jets[S.jet].name}</span><h2 class="h1">A cabin built for living</h2><p class="muted">Tap the hotspots to explore cabin features. Switch scenes to walk through the aircraft.</p>
          <div class="list">${HOTS.map((h) => `<div class="row top gap-12">${ic("sparkles", "gold")}<div><b>${h.t}</b><p class="small muted">${h.d}</p></div></div>`).join("")}</div></div>
        <a class="btn block lg desk-only" href="#/route">${ic("plane-takeoff")} Book this jet</a>
      </div>
    </div>`,
    init(root) {
      const tip = root.querySelector("#tip");
      const show = (i) => {
        const h = HOTS[i];
        root.querySelectorAll(".hot").forEach((b) => b.classList.toggle("on", +b.dataset.h === i));
        tip.innerHTML = `<b>${h.t}</b>${h.d}`;
        tip.style.left = `clamp(8px, calc(${h.x}% - 120px), calc(100% - 248px))`;
        tip.style.top = h.y > 55 ? `calc(${h.y}% - 28px)` : `calc(${h.y}% + 28px)`;
        tip.style.transform = h.y > 55 ? "translateY(-100%)" : "none";
      };
      show(1);
      root.querySelectorAll(".hot").forEach((b) => b.addEventListener("click", () => show(+b.dataset.h)));
      root.querySelectorAll("[data-s]").forEach((b) =>
        b.addEventListener("click", () => {
          const i = +b.dataset.s;
          root.querySelectorAll("[data-s]").forEach((x) => x.classList.toggle("on", x === b));
          root.querySelectorAll(".stage > .scene").forEach((s, k) => (s.style.opacity = k === i ? 1 : 0));
          root.querySelector("#hots").hidden = i !== 0;
        })
      );
    },
  });

  /* =============== Membership =============== */
  const TIERS = [
    { k: "silver", name: "Silver", price: "2,500", perks: ["Flexible booking", "Standard catering", "Limited empty-leg access"] },
    { k: "gold", name: "Gold", price: "5,000", perks: ["Priority booking", "Complimentary premium catering", "Empty-leg access", "Dedicated concierge"] },
    { k: "elite", name: "Elite", price: "10,000", perks: ["Global priority, 24h guarantee", "Gourmet catering", "Exclusive terminal access", "Personal travel manager"] },
  ];
  J.screen("membership", {
    title: "Membership",
    sub: "Compare and upgrade your travel experience",
    doc: "Membership tiers",
    group: "Account",
    shell: "passenger",
    nav: "membership",
    back: "home",
    cta: () => `<button class="btn lg block" data-act="upgrade" style="background:var(--navy-950);box-shadow:inset 0 0 0 1.5px var(--gold)">Upgrade to <span id="tier-n">${TIERS.find((t) => t.k === S.tier).name}</span> ${ic("arrow-up-right", "gold")}</button>`,
    body: () => `<div class="carousel" style="padding-top:18px">${TIERS.map((t) => `<button class="card pad-lg tier ${S.tier === t.k ? "sel" : ""}" data-tier="${t.k}" style="text-align:left">
        ${t.k === "gold" ? `<span class="pill navy flag">Most popular</span>` : ""}
        <div class="row between"><b style="font-size:20px">${t.name}</b>${ic("plane", t.k === "gold" ? "gold" : "faint")}</div>
        <div class="price">$${t.price}<small>/year</small></div>
        <ul>${t.perks.map((p) => `<li>${ic("check")}${p}</li>`).join("")}</ul>
      </button>`).join("")}</div>
      <div class="section"><h2 class="h2">Compare benefits</h2>
        <div style="overflow-x:auto"><table class="ctable"><thead><tr><th>Benefit</th><th>Silver</th><th>Gold</th><th>Elite</th></tr></thead><tbody>
          ${[["Lounge access", 0, 1, 1], ["Guest passes per year", 0, "2", "4"], ["Chauffeur service", 0, 1, 1], ["No peak-day surcharges", 0, 1, 1], ["Special event invitations", 0, 0, 1], ["Guaranteed availability", "72h", "48h", "24h"]]
            .map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v) => `<td>${v === 1 ? `<span class="yes">${ic("circle-check")}</span>` : v === 0 ? `<span class="no">${ic("minus")}</span>` : `<b>${v}</b>`}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
      </div>
      <a class="card row between hover section" href="#/referral"><div class="row gap-12"><span class="folder" style="background:var(--gold)">${ic("gift")}</span><div><b>Refer a friend, earn $1,000</b><div class="small muted">Credits for you and them on their first flight</div></div></div>${ic("chevron-right")}</a>`,
    init(root) {
      const carousel = root.querySelector(".carousel");
      carousel.scrollLeft = carousel.querySelector(".sel").offsetLeft - carousel.offsetLeft;
      root.querySelectorAll("[data-tier]").forEach((b) =>
        b.addEventListener("click", () => {
          S.tier = b.dataset.tier;
          root.querySelectorAll("[data-tier]").forEach((x) => x.classList.toggle("sel", x === b));
          root.querySelector("#tier-n").textContent = TIERS.find((t) => t.k === S.tier).name;
        })
      );
      root.querySelector('[data-act="upgrade"]').addEventListener("click", (e) => {
        const b = e.currentTarget;
        b.classList.add("is-loading");
        J.later(900, () => { b.classList.remove("is-loading"); J.toast(`Welcome to Jettigo ${TIERS.find((t) => t.k === S.tier).name}`, "crown"); });
      });
    },
  });

  /* =============== Referral =============== */
  J.screen("referral", {
    title: "Refer &amp; earn",
    doc: "Referral rewards",
    group: "Account",
    shell: "passenger",
    nav: "membership",
    back: "membership",
    body: () => `<div class="split even">
      <div class="banner-img referral-banner">${ph("referral", "Friends toasting on a private jet", "", "aspect-ratio:4/3")}</div>
      <div class="stack gap-16">
        <h1 class="display" style="font-size:clamp(34px,5vw,52px)">Share the sky</h1>
        <p class="body-lg muted">Refer a friend and you both receive $1,000 in flight credit on their first booking.</p>
        <div class="card row between referral-code" style="background:var(--surface-2);padding:14px"><b class="mono">JETTIGO-1000-VIP</b><button class="btn" data-act="copy">${ic("copy")} Copy</button></div>
        <button class="btn block lg" data-act="share">${ic("share")} Share via…</button>
        <div class="section"><h2 class="h2">How it works</h2>
          <div class="g3 gap-12" style="grid-template-columns:repeat(3,1fr);text-align:center">
            <div class="stack gap-8" style="align-items:center"><span class="ico-tile" style="width:64px;height:64px;border-radius:16px">${ic("mail-open")}</span><b class="small">1. Send invite</b></div>
            <div class="stack gap-8" style="align-items:center"><span class="ico-tile" style="width:64px;height:64px;border-radius:16px">${ic("calendar-check")}</span><b class="small">2. They book</b></div>
            <div class="stack gap-8" style="align-items:center"><span class="ico-tile" style="width:64px;height:64px;border-radius:16px">${ic("hand-coins")}</span><b class="small">3. Both get credits</b></div>
          </div>
        </div>
        <div class="card row between"><div><div class="xs faint">Friends joined</div><b style="font-size:22px">2</b></div><div class="right"><div class="xs faint">Credits earned</div><b style="font-size:22px" class="gold">$2,000</b></div></div>
      </div>
    </div>`,
    init(root) {
      root.querySelector('[data-act="copy"]').addEventListener("click", () => {
        navigator.clipboard?.writeText("JETTIGO-1000-VIP").catch(() => {});
        J.toast("Referral code copied", "copy");
      });
      root.querySelector('[data-act="share"]').addEventListener("click", () => {
        if (navigator.share) navigator.share({ title: "Fly with Jettigo", text: "Use my code JETTIGO-1000-VIP for $1,000 off your first private flight." }).catch(() => {});
        else J.toast("Share sheet opens on mobile", "share");
      });
    },
  });
})();
