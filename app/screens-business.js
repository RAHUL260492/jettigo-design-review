/* Jettigo — corporate console + partner / operator portal */
(function () {
  const { ic, ph, money, brand } = J;

  /* Demo data. In live mode (app/live.js) the same shapes are filled from the API. */
  const D = (J.data = {
    corp: {
      name: "Thompson Holdings",
      balance: 1450000,
      members: 24,
      kpis: [
        { label: "Spent (last 6 months)", value: "$520k", delta: "▲ 12% vs last half" },
        { label: "Flights this quarter", value: "18", delta: "▲ 4" },
        { label: "Avg. cost per flight", value: "$28.9k", delta: "Stable", flat: true },
        { label: "Carbon offset", value: "100%", delta: "All flights" },
      ],
      chart: { values: [42, 68, 96, 74, 118, 122], labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], caption: "Last 6 months, $k", total: "$520k" },
      activity: [
        { name: "Mark Davis", status: "Upcoming", date: "12 Nov", route: "NYC → LAX", aircraft: "Learjet 75" },
        { name: "Sarah Lee", status: "Completed", date: "05 Oct", route: "LON → CDG", aircraft: "Global 6000" },
        { name: "John Kim", status: "Upcoming", date: "18 Nov", route: "DXB → HKG", aircraft: "Challenger 350" },
      ],
      team: [
        { name: "Sarah Lee", role: "Administrator" },
        { name: "John Kim", role: "Traveler" },
        { name: "Mark Davis", role: "Traveler" },
      ],
    },
    invoices: [
      { date: "26 Oct 2026", number: "INV-8829", amount: 24500, status: "Paid" },
      { date: "15 Oct 2026", number: "INV-8825", amount: 18750, status: "Pending" },
      { date: "10 Oct 2026", number: "INV-8821", amount: 31200, status: "Processing" },
    ],
    spend: { values: [18400, 24750, 31300], labels: ["Aug", "Sep", "Oct"] },
    op: {
      review: null,
      req: { from: "LCY", to: "NCE", date: "Thu 29 Oct 2026", time: "10:00", pax: 4, bags: "4 bags, 80 kg", member: "Gold member", model: "Citation Latitude", tail: "G-RVRA", range: "2,700 nm", img: "jet-latitude", standard: 12500, seconds: 14 * 60 + 22 },
      queue: [
        { route: "FAB → GVA", meta: "Fri 30 Oct · 2 pax", left: "42:10" },
        { route: "BQH → LBG", meta: "Sat 31 Oct · 6 pax", left: "1:12:44" },
        { route: "LCY → PMI", meta: "Mon 2 Nov · 3 pax", left: "2:05:00" },
      ],
      stats: { win: "38%", resp: "6m" },
    },
    docs: [
      { title: "Q3 VAT Certificate.pdf", meta: "Today, 10:30 · 1.2 MB" },
      { title: "Flight Manifest – G-JTGO.pdf", meta: "Yesterday · 850 KB" },
      { title: "US Entry Permit.pdf", meta: "25 Oct · 2.5 MB" },
      { title: "2025 Annual Tax Statement.pdf", meta: "25 Oct · 4.1 MB" },
    ],
  });
  const STATUS = { Paid: ["green", "circle-check"], Pending: ["amber", "clock-3"], Processing: ["blue", "refresh-cw"] };
  const esc = J.esc;

  /* =============== Corporate dashboard =============== */
  J.screen("corp", {
    title: "Jettigo Corporate",
    sub: () => esc(D.corp.name),
    doc: "Corporate management dashboard",
    group: "Corporate",
    shell: "corporate",
    nav: "corp",
    back: "login",
    body: () => `<div class="split">
      <div class="stack gap-24">
        <div class="card navy pad-lg stack gap-8" style="border-radius:16px;background:linear-gradient(135deg,#202a36,#0b1621)">
          <div class="row between"><span class="label">Flight credits &amp; team</span>${ic("bar-chart-3", "gold")}</div>
          <div class="row wrap gap-8" style="align-items:baseline"><span class="muted">Total balance</span><b style="font-size:34px;letter-spacing:-0.02em" class="tnum">${money(D.corp.balance)}</b></div>
          <div class="small muted">Active team members: <b style="color:#fff">${D.corp.members}</b> across all roles</div>
          <div class="row gap-8 mt-8"><a class="btn gold sm" href="#/route">${ic("plus")} Book for team</a><button class="btn glass sm" data-toast="Top-up request sent to finance" data-icon="wallet">Top up credits</button></div>
        </div>
        <div class="g4 gap-12">
          ${D.corp.kpis.map((k) => `<div class="card kpi"><div class="xs faint">${esc(k.label)}</div><div class="n">${esc(k.value)}</div><div class="d"${k.flat ? ' style="color:var(--text-3)"' : ""}>${esc(k.delta)}</div></div>`).join("")}
        </div>
        <div class="card pad-lg"><div class="row between"><div><h2 class="h2">Spending analytics</h2><div class="small faint">${esc(D.corp.chart.caption)}</div></div><div class="right"><div class="xs faint">Total spent</div><b>${esc(D.corp.chart.total)}</b></div></div>
          <div class="mt-16">${D.corp.chart.values.length > 1 ? J.chart(D.corp.chart.values, D.corp.chart.labels, { prefix: "" }) : `<p class="small muted">Spending appears here after your first company booking.</p>`}</div>
        </div>
      </div>
      <div class="stack gap-24">
        <div class="card pad-lg"><div class="row between"><h2 class="h2">Travel activity</h2><a class="small link" href="#/invoices">All trips</a></div>
          <div class="list mt-8">
            ${D.corp.activity.length ? D.corp.activity
              .map((r) => `<div class="person"><span class="avatar">${ph("rahul", r.name)}</span><div class="who"><span class="pill ${r.status === "Completed" ? "green" : "blue"}" style="height:20px;font-size:11px">${esc(r.status)}</span><b>${esc(r.name)}</b></div><div class="right"><b class="small">${esc(r.route)}</b><div class="xs faint">${esc(r.date)} · ${esc(r.aircraft)}</div></div></div>`).join("") : `<p class="small muted">No company trips yet.</p>`}
          </div>
        </div>
        <div class="card pad-lg"><div class="row between"><h2 class="h2">Team management</h2><span class="small faint">${D.corp.members} members</span></div>
          <div class="list mt-8" id="team">
            ${D.corp.team.map((t) => `<div class="person"><span class="avatar">${ph("rahul", t.name)}</span><div class="who"><b>${esc(t.name)}</b></div><span class="pill">${esc(t.role)}</span><button class="iconbtn" aria-label="Manage ${esc(t.name)}" data-toast="Permissions for ${esc(t.name)}" data-icon="user-cog">${ic("square-pen")}</button></div>`).join("")}
          </div>
          <button class="btn block mt-16" data-act="add">${ic("user-plus")} Add new traveler</button>
          <form id="addf" class="stack gap-12 mt-16" hidden><input class="input" id="nn" placeholder="Full name" aria-label="Full name" required><input class="input" id="ne" type="email" placeholder="Work email" aria-label="Work email" required><div class="seg block sm" id="nr"><button type="button" class="on" data-v="traveler">Traveler</button><button type="button" data-v="booker">Booker</button><button type="button" data-v="admin">Admin</button></div><button class="btn ghost block">Send invitation</button></form>
        </div>
      </div>
    </div>`,
    init(root) {
      root.querySelector('[data-act="add"]').addEventListener("click", () => {
        root.querySelector("#addf").hidden = false;
        root.querySelector("#nn").focus();
      });
      root.querySelector("#addf").addEventListener("submit", (e) => {
        e.preventDefault();
        if (J.live && J.live.on) return; // live.js handles the API call
        const n = J.esc(root.querySelector("#nn").value);
        root.querySelector("#team").insertAdjacentHTML("beforeend", `<div class="person"><span class="avatar" style="display:grid;place-items:center;background:var(--gold-100);color:var(--gold-700);font-weight:600">${n.charAt(0)}</span><div class="who"><b>${n}</b><span>Invitation sent</span></div><span class="pill amber">Pending</span></div>`);
        e.target.reset();
        e.target.hidden = true;
        J.toast(`Invitation sent to ${n}`, "send");
      });
    },
  });

  /* =============== Invoices & reports =============== */
  J.screen("invoices", {
    title: "Financial overview",
    doc: "Corporate invoicing & reports",
    group: "Corporate",
    shell: "corporate",
    nav: "invoices",
    back: "corp",
    body: () => `<div class="seg block" id="tabs" style="max-width:420px"><button class="on" data-v="inv">Invoices</button><button data-v="rep">Reports</button></div>
      <div class="split mt-24">
        <div class="stack gap-12" id="p-inv">
          ${D.invoices.length ? D.invoices.map((r) => { const [cls, icon] = STATUS[r.status] || STATUS.Pending; return `<div class="card row between"><div class="stack gap-8"><div class="xs faint">${esc(r.date)} · ${esc(r.number)}</div><div class="row gap-12"><b style="font-size:22px" class="tnum">${r.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}</b><span class="pill ${cls}">${ic(icon)} ${esc(r.status)}</span></div></div><button class="sq-btn ghost" aria-label="Download ${esc(r.number)}" data-toast="${esc(r.number)}.pdf downloaded" data-icon="download">${ic("file-down")}</button></div>`; }).join("") : `<div class="card"><p class="small muted">No invoices yet. They appear here after company bookings.</p></div>`}
          ${(() => { const v = D.spend.values, total = v.reduce((a, b) => a + b, 0); return v.length > 1 ? `<div class="card pad-lg"><h2 class="h2">Spending trend</h2><div class="mt-16">${J.chart(v.map((x) => x / 1000), D.spend.labels, { prefix: "" })}</div><div class="row between small mt-8"><span class="muted">Total <b style="color:var(--text)">${total.toLocaleString("en-US", { style: "currency", currency: "USD" })}</b></span><span class="muted">Avg. monthly <b style="color:var(--text)">${(total / v.length).toLocaleString("en-US", { style: "currency", currency: "USD" })}</b></span></div></div>` : ""; })()}
        </div>
        <div class="stack gap-12" id="p-rep" hidden>
          ${[["Q3 2026 travel summary", "Trips, spend and CO₂ by department"], ["Traveler activity", "Per-person flights and policy exceptions"], ["VAT reclaim pack", "Invoices grouped by jurisdiction"]].map((r) => `<div class="card row between"><div class="row gap-12"><span class="folder">${ic("file-bar-chart")}</span><div><b>${r[0]}</b><div class="small muted">${r[1]}</div></div></div><button class="sq-btn ghost" aria-label="Download" data-toast="Report exported" data-icon="download">${ic("download")}</button></div>`).join("")}
        </div>
        <div class="card pad-lg stack gap-12 sticky"><h2 class="h2">Generate custom report</h2>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><label class="field"><span>Start date</span><input class="input" id="rfrom" type="date" value="2026-07-01"></label><label class="field"><span>End date</span><input class="input" id="rto" type="date" value="2026-09-30"></label></div>
          <label class="field"><span>Group by</span><select class="input"><option>Department</option><option>Traveler</option><option>Aircraft category</option></select></label>
          <span class="small muted">Export format</span>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><button class="btn" data-act="pdf" data-toast="Report_Q3_2026.pdf exported" data-icon="file-down">Export PDF</button><button class="btn ghost" data-act="csv" data-toast="Report_Q3_2026.csv exported" data-icon="sheet">Export CSV</button></div>
        </div>
      </div>`,
    init(root) {
      root.querySelector("#tabs").addEventListener("seg", (e) => {
        root.querySelector("#p-inv").hidden = e.detail !== "inv";
        root.querySelector("#p-rep").hidden = e.detail !== "rep";
      });
    },
  });

  /* =============== Tax & compliance =============== */
  J.screen("documents", {
    title: "Tax &amp; compliance",
    doc: "Tax & compliance documentation",
    group: "Corporate",
    shell: "corporate",
    nav: "documents",
    back: "corp",
    body: () => `<label class="search">${ic("search")}<input id="q" placeholder="Search documents" aria-label="Search documents"></label>
      <div class="split mt-24">
        <div><h2 class="h2">Recent documents</h2>
          <div class="list card mt-12" style="padding:0 16px" id="docs">
            ${D.docs.map((d) => `<div class="row between doc"><div class="row gap-12" style="min-width:0">${ic("file-text", "faint")}<div style="min-width:0"><b class="small" style="font-size:15px">${esc(d.title)}</b><div class="xs faint">${esc(d.meta)}</div></div></div><div class="row gap-8"><button class="sq-btn" aria-label="Download ${esc(d.title)}" ${d.kind === "manifest" ? `data-manifest="${esc(d.id)}"` : `data-toast="${esc(d.title)} downloaded" data-icon="download"`}>${ic("download")}</button><button class="sq-btn" aria-label="Share" data-toast="Secure link copied" data-icon="link">${ic("share")}</button></div></div>`).join("")}
            <p class="small muted" id="none" hidden>No documents match your search.</p>
          </div>
        </div>
        <div><h2 class="h2">Document categories</h2>
          <div class="list mt-12">
            ${[["VAT certificates", 12], ["Flight manifests", 8], ["International permits", 4], ["Annual tax statements", 2]].map((c) => `<button class="row gap-12" style="width:100%;text-align:left" data-toast="Opening ${c[0]}" data-icon="folder-open"><span class="folder">${ic("folder")}</span><b class="grow">${c[0]}</b><span class="small faint">${c[1]} documents</span>${ic("chevron-right", "faint")}</button>`).join("")}
          </div>
        </div>
      </div>`,
    init(root) {
      root.querySelector("#q").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        let shown = 0;
        root.querySelectorAll(".doc").forEach((d) => {
          const hit = d.textContent.toLowerCase().includes(q);
          d.hidden = !hit;
          shown += hit;
        });
        root.querySelector("#none").hidden = shown > 0;
      });
    },
  });

  /* =============== Partner welcome =============== */
  J.screen("partner", {
    doc: "Vendor: welcome & role selection",
    group: "Partners",
    full: () => `<div class="app dark no-tabs" style="background:radial-gradient(100% 60% at 50% 0%,#2a3644,transparent),var(--night)">
      <header class="mnav" style="position:static"><div class="mnav-in"><a href="#/home">${brand("light")}</a><a class="btn ghost sm round" href="#/op-login">Operator login</a></div></header>
      <main class="main" style="padding-bottom:40px"><div class="split even" style="align-items:center">
        <div class="banner-img" style="border-radius:20px;margin:0">${ph("hangar", "Jet and crew in a hangar", "", "aspect-ratio:4/3")}<div class="cap" style="padding:24px"><h1 class="h1">Partner with Jettigo</h1><p style="opacity:.8">Join an exclusive network of global aviation partners.</p></div></div>
        <div class="stack gap-16">
          <span class="label">Choose your role</span>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr">
            <button class="role-card on" data-role="operator">${ic("plane")}<b>Operator</b><p>Jet owner or charter company. List aircraft in our global fleet.</p></button>
            <button class="role-card" data-role="provider">${ic("cog")}<b>Service provider</b><p>Catering, transport, FBO. Offer ground and in-flight services.</p></button>
          </div>
          <div class="glass-card list" style="padding:4px 16px">
            <div class="row gap-12">${ic("trending-up", "gold")}<span class="small">Qualified demand from vetted travelers</span></div>
            <div class="row gap-12">${ic("banknote", "gold")}<span class="small">Payouts within 48 hours of each flight</span></div>
            <div class="row gap-12">${ic("shield-check", "gold")}<span class="small">Verification in under 48 hours</span></div>
          </div>
          <a class="btn lg block" href="#/verify" style="border-radius:999px">Get started</a>
          <p class="xs center" style="color:var(--text-3)">By continuing, you agree to our Terms and Privacy Policy.</p>
        </div>
      </div></main>
    </div>`,
    init(root) {
      root.querySelectorAll("[data-role]").forEach((b) =>
        b.addEventListener("click", () => {
          J.state.role = b.dataset.role;
          root.querySelectorAll("[data-role]").forEach((x) => x.classList.toggle("on", x === b));
        })
      );
    },
  });

  /* =============== Business verification =============== */
  const vprog = (on) => `<div class="progress">${["Profile", "Documents", "Fleet & services"].map((l, i) => `<div class="st ${i < on ? "done" : i === on ? "on" : ""}"><span class="dot">${i < on ? ic("check") : ""}</span>${l}</div>`).join("")}</div>`;
  const drop = (id, title, icon) => `<button class="drop" data-drop="${id}">${ic(icon)}<b>${title}</b><span>Drag and drop or browse files</span></button>`;
  J.screen("verify", {
    title: "Business verification",
    doc: "Vendor: business verification",
    group: "Partners",
    shell: "partner",
    nav: "verify",
    back: "partner",
    cta: () => `<a class="btn block lg" href="#/rates">Continue</a>`,
    body: () => `${vprog(1)}
      <div class="split mt-24">
        <div class="card pad-lg stack gap-16">
          <label class="field"><span>Company name</span><input class="input" id="pc" placeholder="Enter company name" value="Riviera Air Charter Ltd"></label>
          <div class="g2 gap-12"><label class="field"><span>Contact name</span><input class="input" id="pn" placeholder="Your full name" autocomplete="name"></label><label class="field"><span>Work email</span><input class="input" id="pe" type="email" placeholder="ops@company.com" autocomplete="email"></label></div>
          <div class="g2 gap-12"><label class="field"><span>Air operator certificate (AOC) no.</span><input class="input" id="pa" placeholder="Enter license number"></label><label class="field"><span>Country of registration</span><select class="input" id="pk"><option>United Kingdom</option><option>France</option><option>India</option><option>United Arab Emirates</option></select></label></div>
          <label class="field"><span>Years in operation</span><input class="input" id="py" type="number" min="0" max="100" placeholder="e.g. 10"></label>
        </div>
        <div class="stack gap-12"><h2 class="h2">Document upload</h2>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr">${drop("aoc", "Operating certificate", "file-text")}${drop("ins", "Insurance coverage", "upload")}</div>
          <div class="card row gap-12" style="background:var(--surface-2)">${ic("lock", "gold")}<p class="small muted">Documents are encrypted and only reviewed by the Jettigo compliance team.</p></div>
        </div>
      </div>`,
    init(root) {
      root.querySelectorAll("[data-drop]").forEach((d) =>
        d.addEventListener("click", () => {
          if (d.classList.contains("done")) return;
          d.innerHTML = `<span class="btn is-loading sm ghost" style="border:0">Uploading</span>`;
          J.later(800, () => {
            d.classList.add("done");
            d.innerHTML = `${ic("circle-check")}<b>${d.dataset.drop === "aoc" ? "AOC_RivieraAir.pdf" : "Insurance_2026.pdf"}</b><span>Uploaded · 2.1 MB</span>`;
            J.icons(d);
          });
        })
      );
    },
  });

  /* =============== Fleet & services setup =============== */
  J.screen("rates", {
    title: "Fleet &amp; services",
    sub: "Step 3 of 3",
    doc: "Vendor: service & rates setup",
    group: "Partners",
    shell: "partner",
    nav: "rates",
    back: "verify",
    cta: () => `<button class="btn block lg" data-act="submit">Submit for review</button>`,
    body: () => `${vprog(2)}
      <div class="split mt-24">
        <div class="stack gap-12"><div class="row between"><h2 class="h2">For aircraft operators</h2><div class="seg sm" id="kind"><button class="on" data-v="aircraft">Aircraft</button><button data-v="helicopter">Helicopter</button></div></div>
          <div class="card pad-lg stack gap-16" id="aircraft">
            <b style="font-size:18px">Add your first aircraft</b>
            <label class="field"><span>Model name</span><input class="input" id="am" placeholder="e.g. Gulfstream G650"></label>
            <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><label class="field"><span>Tail number</span><input class="input" id="at" placeholder="e.g. G-RVRA"></label><label class="field"><span>Seating capacity</span><input class="input" id="as" type="number" placeholder="e.g. 12"></label></div>
            <label class="field"><span>Base hourly rate</span><div class="affix"><b>$</b><input class="input" id="ar" inputmode="numeric" placeholder="5,000"></div></label>
            <div class="field"><span>Cabin dimensions (ft)</span><div class="g3 gap-8" style="grid-template-columns:repeat(3,1fr)"><input class="input" placeholder="Length"><input class="input" placeholder="Width"><input class="input" placeholder="Height"></div></div>
            <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><label class="field"><span>Baggage capacity</span><input class="input" placeholder="Standard bags"></label><div class="field"><span>Max total weight</span><div class="row gap-8"><input class="input" placeholder="0"><div class="seg sm dark-on"><button class="on">KG</button><button>LBS</button></div></div></div></div>
            <div class="g2 gap-12" style="grid-template-columns:1fr 1fr">${drop("ext", "Exterior photo", "image-up")}${drop("int", "Interior photo", "image-up")}</div>
          </div>
          <button class="btn ghost block" data-act="add-aircraft">${ic("plus")} Add another aircraft</button>
        </div>
        <div class="stack gap-12"><h2 class="h2">For service providers</h2>
          <div class="card list" style="padding:0 16px">
            ${[["utensils-crossed", "In-flight catering"], ["car-front", "Ground transportation"], ["concierge-bell", "Concierge services"], ["warehouse", "FBO &amp; handling"]].map((s) => `<div class="row between"><div class="row gap-12">${ic(s[0], "faint")}<span>${s[1]}</span></div><label class="switch" aria-label="${s[1]}"><input type="checkbox"><span></span></label></div>`).join("")}
          </div>
          <p class="small faint center">Jettigo reviews every partner within 48 hours to ensure premium standards.</p>
        </div>
      </div>`,
    init(root) {
      root.querySelector("#kind").addEventListener("seg", (e) => {
        const helicopter = e.detail === "helicopter";
        root.querySelector("#aircraft > b").textContent = helicopter ? "Add your first helicopter" : "Add your first aircraft";
        root.querySelector("#aircraft input").placeholder = helicopter ? "e.g. Airbus H160" : "e.g. Gulfstream G650";
      });
      const template = root.querySelector("#aircraft").cloneNode(true);
      let count = 1;
      root.querySelector('[data-act="add-aircraft"]').addEventListener("click", (e) => {
        const card = template.cloneNode(true);
        card.removeAttribute("id");
        card.querySelector("b").textContent = `Aircraft ${++count}`;
        e.currentTarget.before(card);
        card.querySelector("input").focus();
        J.icons(card);
      });
      root.addEventListener("click", (e) => {
        const d = e.target.closest("[data-drop]");
        if (!d) return;
        d.classList.add("done");
        d.innerHTML = `${ic("circle-check")}<b>${d.dataset.drop === "ext" ? "exterior.jpg" : "cabin.jpg"}</b><span>Uploaded</span>`;
        J.icons(d);
      });
      root.querySelector('[data-act="submit"]').addEventListener("click", (e) => {
        e.currentTarget.classList.add("is-loading");
        J.later(900, () => {
          J.toast("Application submitted. We'll review within 48 hours.", "send");
          J.later(1400, () => J.go("op-login"));
        });
      });
    },
  });

  /* =============== Operator secure login =============== */
  J.screen("op-login", {
    doc: "Operator portal: secure login",
    group: "Partners",
    full: () => `<div class="auth">
      <div class="auth-card">
        <a href="#/home" style="align-self:center">${brand("light lg", "Operators")}</a>
        <div class="stack gap-8 center" style="margin:8px 0"><h1 class="h1">Secure login</h1><p style="opacity:.7">Authentication for jet operators</p></div>
        <div class="card stack gap-12" style="background:#fff;color:var(--ink);padding:20px" id="op-form">
          <div id="op-cred" class="stack gap-12">
            <label class="field"><span>Email</span><input class="input" style="background:var(--ivory);color:var(--ink);border-color:var(--line-2)" value="ops@rivieraair.com" autocomplete="username"></label>
            <label class="field"><span>Password</span><div style="position:relative"><input class="input" id="pw" type="password" style="background:var(--ivory);color:var(--ink);border-color:var(--line-2);padding-right:48px" value="hunter2-demo" autocomplete="current-password"><button class="iconbtn" data-act="eye" type="button" aria-label="Show password" style="position:absolute;right:2px;top:3px;color:var(--slate-600)">${ic("eye")}</button></div></label>
            <button class="btn block lg round" data-act="signin">Sign in</button>
          </div>
          <div id="op-2fa" class="stack gap-12" hidden>
            <b>Two-factor authentication</b><p class="small" style="color:var(--slate-600)">Enter the code from your authenticator app.</p>
            <div class="otp">${[3, 8, 1, 5, 0, 2].map((d) => `<input class="input" style="background:var(--ivory);color:var(--ink);border-color:var(--line-2)" value="${d}" maxlength="1" inputmode="numeric" aria-label="Digit">`).join("")}</div>
            <button class="btn block lg round" data-act="verify">Verify</button>
          </div>
        </div>
        <p class="center small" style="opacity:.75">${ic("shield-check", "gold")} 2FA required for enhanced security</p>
        <button class="small" style="opacity:.7;align-self:center" data-toast="Reset link sent to ops@rivieraair.com" data-icon="mail">Forgot password?</button>
        <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><a class="btn glass round" href="#/partner">Become a partner</a><button class="btn glass round" data-toast="Application status: under review" data-icon="hourglass">Application status</button></div>
      </div>
    </div>`,
    init(root) {
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        if (a.dataset.act === "eye") {
          const pw = root.querySelector("#pw");
          pw.type = pw.type === "password" ? "text" : "password";
        }
        if (a.dataset.act === "signin") {
          a.classList.add("is-loading");
          J.later(600, () => { root.querySelector("#op-cred").hidden = true; root.querySelector("#op-2fa").hidden = false; });
        }
        if (a.dataset.act === "verify") {
          a.classList.add("is-loading");
          J.later(600, () => J.go("quotes"));
        }
      });
    },
  });

  /* =============== Operator quote hub =============== */
  J.screen("quotes", {
    title: "Quote requests",
    doc: "Operator: quote & response hub",
    group: "Partners",
    shell: "partner",
    nav: "quotes",
    back: "op-login",
    action: () => `<button class="iconbtn" aria-label="Notifications" data-toast="2 new requests in the last hour" data-icon="bell">${ic("bell")}</button>`,
    body: () => {
      const op = D.op, r = op.req;
      const main = op.review
        ? `<div class="card stack gap-12 center" style="padding:32px"><span class="check-big" style="background:var(--slate-100);color:var(--slate-600)">${ic("hourglass")}</span><b style="font-size:18px">Application under review</b><p class="small muted">${esc(op.review)}</p></div>`
        : !r
          ? `<div class="card stack gap-12 center" style="padding:32px"><span class="check-big">${ic("inbox")}</span><b style="font-size:18px">No open requests</b><p class="small muted">New quote requests for your aircraft appear here.</p></div>`
          : `<div class="row between wrap"><h2 class="h2" style="margin:0">New booking request</h2><span class="timer">${ic("timer")} <span id="tm">${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")}</span> remaining</span></div>
        <div class="card stack gap-12">
          <div class="row between wrap"><div class="row gap-12"><b style="font-size:20px">${esc(r.from)}</b>${ic("arrow-right", "faint")}<b style="font-size:20px">${esc(r.to)}</b></div><div class="row gap-12 small"><span>${esc(r.date)}</span><span class="row gap-8">${ic("clock-3")} ${esc(r.time)}</span></div></div>
          <div class="divider" style="margin:0"></div>
          <div class="row gap-24 wrap small"><span class="row gap-8">${ic("user")} ${r.pax} passengers</span><span class="row gap-8">${ic("luggage")} ${esc(r.bags)}</span>${r.member ? `<span class="row gap-8">${ic("crown")} ${esc(r.member)}</span>` : ""}</div>
        </div>
        <div class="stack gap-8"><h3 class="h3">Requested aircraft</h3>
          <div class="card row gap-16">${ph(r.img, r.model, "", "width:120px;height:72px;border-radius:8px;flex:none")}<div><b style="font-size:17px">${esc(r.model)}</b><div class="small muted">Tail ${esc(r.tail)} · Range ${esc(r.range)}</div><span class="pill green mt-8">${ic("check")} Available</span></div></div>
        </div>
        <div class="stack gap-8" id="actions"><h3 class="h3">Your response</h3>
          <button class="btn block lg" data-act="accept">Accept at standard rate ${money(r.standard)}</button>
          <form class="op-action" id="counter"><b>Counter offer</b><div class="row gap-8"><div class="affix"><b>$</b><input class="input" id="cv" inputmode="numeric" placeholder="Enter price" aria-label="Counter offer price"></div><button class="sq-btn" aria-label="Send counter offer">${ic("send-horizontal")}</button></div></form>
          <div class="op-action"><b>Decline request</b><select id="decl" aria-label="Decline reason"><option value="">Select reason</option><option>Aircraft unavailable</option><option>Crew duty limits</option><option>Airport restrictions</option></select></div>
        </div>
        <div class="card stack gap-8 center" id="done" hidden style="padding:28px"><span class="check-big">${ic("check")}</span><b style="font-size:18px" id="done-t">Quote sent</b><p class="small muted" id="done-d">The traveler has been notified.</p></div>`;
      return `<div class="split">
      <div class="stack gap-16" id="req">${main}</div>
      <div class="stack gap-16">
        <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><div class="card kpi"><div class="xs faint">Win rate (30d)</div><div class="n">${esc(op.stats.win)}</div></div><div class="card kpi"><div class="xs faint">Avg. response</div><div class="n">${esc(op.stats.resp)}</div></div></div>
        <div class="card"><div class="row between"><b>Queue</b><span class="pill">${op.queue.length}</span></div><div class="list mt-8">
          ${op.queue.length ? op.queue.map((q) => `<button class="row between" style="width:100%;text-align:left" data-toast="Opening ${esc(q.route)}" data-icon="inbox"><div><b>${esc(q.route)}</b><div class="xs faint">${esc(q.meta)}</div></div><span class="small faint tnum">${esc(q.left)}</span></button>`).join("") : `<p class="small muted">Nothing else waiting.</p>`}
        </div></div>
      </div>
    </div>`;
    },
    init(root) {
      if (!D.op.req || D.op.review) return;
      let left = D.op.req.seconds;
      J.every(1000, () => {
        left = Math.max(0, left - 1);
        root.querySelector("#tm").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      });
      const finish = (t, d) => {
        root.querySelector("#actions").hidden = true;
        root.querySelector("#done").hidden = false;
        root.querySelector("#done-t").textContent = t;
        root.querySelector("#done-d").textContent = d;
      };
      J.finishQuote = finish;
      root.querySelector('[data-act="accept"]').addEventListener("click", () => finish(`Accepted at ${money(D.op.req.standard)}`, "The traveler has been notified and the aircraft is held."));
      root.querySelector("#counter").addEventListener("submit", (e) => {
        e.preventDefault();
        const v = root.querySelector("#cv").value.replace(/[^\d]/g, "");
        if (!v) return J.toast("Enter a price first", "info");
        finish(`Counter offer sent: ${money(+v)}`, "You'll be notified when the traveler responds.");
      });
      root.querySelector("#decl").addEventListener("change", (e) => e.target.value && finish("Request declined", `Reason shared: ${e.target.value}.`));
    },
  });
})();
