/* Jettingo — corporate console + partner / operator portal */
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
      { date: "26 Oct 2026", number: "INV-8829", amount: 24500, status: "Paid", route: "LCY → NCE", traveler: "Sarah Lee" },
      { date: "15 Oct 2026", number: "INV-8825", amount: 18750, status: "Pending", route: "LCY → GVA", traveler: "Mark Davis" },
      { date: "10 Oct 2026", number: "INV-8821", amount: 31200, status: "Processing", route: "LBG → DWC", traveler: "John Kim" },
    ],
    spend: { values: [18400, 24750, 31300], labels: ["Aug", "Sep", "Oct"] },
    op: {
      review: null,
      req: { from: "LCY", to: "NCE", date: "Thu 29 Oct 2026", time: "10:00", pax: 4, bags: "4 bags, 80 kg", member: "Gold member", model: "Citation Latitude", tail: "G-RVRA", range: "2,700 nm", img: "jet-latitude", standard: 12500, seconds: 14 * 60 + 22 },
      queue: [
        { route: "FAB → GVA", meta: "Fri 30 Oct · 2 pax", left: "42:10", req: { from: "FAB", to: "GVA", date: "Fri 30 Oct 2026", time: "09:00", pax: 2, bags: "2 bags, 30 kg", member: "", model: "Citation Latitude", tail: "G-RVRA", range: "2,700 nm", img: "jet-latitude", standard: 9800, seconds: 42 * 60 + 10 } },
        { route: "BQH → LBG", meta: "Sat 31 Oct · 6 pax", left: "1:12:44", req: { from: "BQH", to: "LBG", date: "Sat 31 Oct 2026", time: "11:30", pax: 6, bags: "6 bags, 95 kg", member: "Elite member", model: "Citation Longitude", tail: "G-RVLN", range: "3,500 nm", img: "jet-longitude", standard: 8900, seconds: 72 * 60 + 44 } },
        { route: "LCY → PMI", meta: "Mon 2 Nov · 3 pax", left: "2:05:00", req: { from: "LCY", to: "PMI", date: "Mon 2 Nov 2026", time: "14:00", pax: 3, bags: "3 bags, 45 kg", member: "", model: "Citation Latitude", tail: "G-RVRA", range: "2,700 nm", img: "jet-latitude", standard: 14200, seconds: 125 * 60 } },
      ],
      stats: { win: "38%", resp: "6m" },
    },
    docs: [
      { cat: "vat", title: "Q3 VAT Certificate.pdf", meta: "Today, 10:30" },
      { cat: "manifest", title: "Flight Manifest – G-JTGO.pdf", meta: "Yesterday" },
      { cat: "permit", title: "US Entry Permit.pdf", meta: "25 Oct" },
      { cat: "tax", title: "2025 Annual Tax Statement.pdf", meta: "25 Oct" },
      { cat: "vat", title: "Q2 VAT Certificate.pdf", meta: "3 Jul" },
      { cat: "manifest", title: "Flight Manifest – HB-JGO.pdf", meta: "28 Jun" },
    ],
  });
  const STATUS = { Paid: ["green", "circle-check"], Pending: ["amber", "clock-3"], Processing: ["blue", "refresh-cw"] };
  const esc = J.esc;

  /* =============== Corporate dashboard =============== */
  J.screen("corp", {
    title: "Jettingo Corporate",
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
          <div class="row gap-8 mt-8"><a class="btn gold sm" href="#/route">${ic("plus")} Book for team</a><button class="btn glass sm" data-act="topup">Top up credits</button></div>
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
            ${D.corp.team.map((t, i) => `<div class="person"><span class="avatar">${ph("rahul", t.name)}</span><div class="who"><b>${esc(t.name)}</b></div><span class="pill">${esc(t.role)}</span><button class="iconbtn" aria-label="Manage ${esc(t.name)}" data-act="manage" data-i="${i}">${ic("square-pen")}</button></div>`).join("")}
          </div>
          <button class="btn block mt-16" data-act="add">${ic("user-plus")} Add new traveler</button>
          <form id="addf" class="stack gap-12 mt-16" hidden><input class="input" id="nn" placeholder="Full name" aria-label="Full name" required><input class="input" id="ne" type="email" placeholder="Work email" aria-label="Work email" required><div class="seg block sm" id="nr"><button type="button" class="on" data-v="traveler">Traveler</button><button type="button" data-v="booker">Booker</button><button type="button" data-v="admin">Admin</button></div><button class="btn ghost block">Send invitation</button></form>
        </div>
      </div>
    </div>`,
    init(root) {
      const live = J.live && J.live.on;
      const ROLES = [["admin", "Administrator"], ["booker", "Booker"], ["traveler", "Traveler"]];
      root.querySelector('[data-act="topup"]').addEventListener("click", () => {
        let amount = 100000;
        J.sheet({
          title: "Top up flight credits",
          body: `<p class="small muted">Current balance <b style="color:var(--ink)">${money(D.corp.balance)}</b>. Credits are charged to your company card on file${live ? " (test mode, no charge)" : ""}.</p>
            <div class="row wrap gap-8" id="amts">${[25000, 100000, 250000].map((a) => `<button type="button" class="chip" data-a="${a}" aria-pressed="${a === amount}" style="${a === amount ? "background:var(--navy-900);color:#fff;border-color:var(--navy-900)" : ""}">${money(a)}</button>`).join("")}</div>
            <label class="field"><span>Or enter an amount (USD)</span><div class="affix"><b>$</b><input class="input" id="amt" inputmode="numeric" value="100,000"></div></label>
            <button type="button" class="btn block lg" data-v="confirm">Add credits</button>`,
          onOpen(panel) {
            const input = panel.querySelector("#amt");
            panel.addEventListener("click", async (e) => {
              const chip = e.target.closest("[data-a]");
              if (chip) {
                amount = +chip.dataset.a;
                input.value = amount.toLocaleString("en-US");
                panel.querySelectorAll("[data-a]").forEach((c) => (c.style.cssText = c === chip ? "background:var(--navy-900);color:#fff;border-color:var(--navy-900)" : ""));
              }
              const go = e.target.closest('[data-v="confirm"]');
              if (!go) return;
              amount = +input.value.replace(/[^\d]/g, "");
              if (!amount || amount < 1000 || amount > 1000000) return J.toast("Enter an amount between $1,000 and $1,000,000", "info");
              go.classList.add("is-loading");
              try {
                if (live) await J.live.api("POST", "/v1/company/credits/top-up", { amountCents: amount * 100 });
                else D.corp.balance += amount;
                J.closeSheet();
                J.toast(`${money(amount)} added to your flight credits`, "wallet");
                J.rerender();
              } catch (err) {
                go.classList.remove("is-loading");
                J.toast(err.message, "circle-alert");
              }
            });
            input.addEventListener("input", () => panel.querySelectorAll("[data-a]").forEach((c) => (c.style.cssText = "")));
          },
        });
      });
      root.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-act="manage"]');
        if (!btn) return;
        const m = D.corp.team[+btn.dataset.i];
        let role = (ROLES.find(([, l]) => l === m.role) || ROLES[2])[0];
        J.sheet({
          title: `Manage ${m.name}`,
          body: `<span class="small muted">Role</span>
            <div class="seg block" id="mrole">${ROLES.map(([v, l]) => `<button type="button" class="${v === role ? "on" : ""}" data-v="${v}">${l}</button>`).join("")}</div>
            <p class="small muted" id="mhelp"></p>
            <button type="button" class="btn block lg" data-v="save">Save changes</button>
            <button type="button" class="btn danger-ghost block" data-v="remove">Remove from team</button>`,
          onOpen(panel) {
            const HELP = { admin: "Full access: credits, invoices, team and bookings.", booker: "Can book for anyone in the company and see invoices.", traveler: "Can book their own trips on the company account." };
            const help = () => (panel.querySelector("#mhelp").textContent = HELP[role]);
            help();
            panel.querySelector("#mrole").addEventListener("seg", (ev) => { role = ev.detail; help(); });
            panel.addEventListener("click", async (ev) => {
              const save = ev.target.closest('[data-v="save"]');
              const remove = ev.target.closest('[data-v="remove"]');
              if (!save && !remove) return;
              const b = save || remove;
              b.classList.add("is-loading");
              try {
                if (live) {
                  if (save) await J.live.api("PATCH", `/v1/company/members/${m.id}`, { role });
                  else await J.live.api("DELETE", `/v1/company/members/${m.id}`);
                } else if (save) m.role = ROLES.find(([v]) => v === role)[1];
                else {
                  D.corp.team.splice(D.corp.team.indexOf(m), 1);
                  D.corp.members -= 1;
                }
                J.closeSheet();
                J.toast(save ? `${m.name} is now ${ROLES.find(([v]) => v === role)[1].toLowerCase()}` : `${m.name} removed from the team`, save ? "user-cog" : "user-minus");
                J.rerender();
              } catch (err) {
                b.classList.remove("is-loading");
                J.toast(err.message, "circle-alert");
              }
            });
          },
        });
      });
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
          ${D.invoices.length ? D.invoices.map((r) => { const [cls, icon] = STATUS[r.status] || STATUS.Pending; return `<div class="card row between"><div class="stack gap-8"><div class="xs faint">${esc(r.date)} · ${esc(r.number)}</div><div class="row gap-12"><b style="font-size:22px" class="tnum">${r.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}</b><span class="pill ${cls}">${ic(icon)} ${esc(r.status)}</span></div></div><button class="sq-btn ghost" aria-label="Download ${esc(r.number)}" data-act="inv-dl" data-i="${D.invoices.indexOf(r)}">${ic("file-down")}</button></div>`; }).join("") : `<div class="card"><p class="small muted">No invoices yet. They appear here after company bookings.</p></div>`}
          ${(() => { const v = D.spend.values, total = v.reduce((a, b) => a + b, 0); return v.length > 1 ? `<div class="card pad-lg"><h2 class="h2">Spending trend</h2><div class="mt-16">${J.chart(v.map((x) => x / 1000), D.spend.labels, { prefix: "" })}</div><div class="row between small mt-8"><span class="muted">Total <b style="color:var(--text)">${total.toLocaleString("en-US", { style: "currency", currency: "USD" })}</b></span><span class="muted">Avg. monthly <b style="color:var(--text)">${(total / v.length).toLocaleString("en-US", { style: "currency", currency: "USD" })}</b></span></div></div>` : ""; })()}
        </div>
        <div class="stack gap-12" id="p-rep" hidden>
          ${[["Travel summary", "Every trip with route, traveler and amount"], ["Traveler activity", "Spend and trips per traveler"], ["VAT reclaim pack", "Invoices with status, for your accountant"]].map((r, i) => `<div class="card row between"><div class="row gap-12"><span class="folder">${ic("file-bar-chart")}</span><div><b>${r[0]}</b><div class="small muted">${r[1]}</div></div></div><button class="sq-btn ghost" aria-label="Download ${r[0]}" data-act="rep-dl" data-i="${i}">${ic("download")}</button></div>`).join("")}
        </div>
        <div class="card pad-lg stack gap-12 sticky"><h2 class="h2">Generate custom report</h2>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><label class="field"><span>Start date</span><input class="input" id="rfrom" type="date" value="2026-07-01"></label><label class="field"><span>End date</span><input class="input" id="rto" type="date" value="2026-09-30"></label></div>
          <label class="field"><span>Group by</span><select class="input"><option>Department</option><option>Traveler</option><option>Aircraft category</option></select></label>
          <span class="small muted">Export format</span>
          <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><button class="btn" data-act="pdf">Export PDF</button><button class="btn ghost" data-act="csv">Export CSV</button></div>
        </div>
      </div>`,
    init(root) {
      const live = J.live && J.live.on;
      const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
      const rows = () => D.invoices.map((r) => [r.date, r.number, r.traveler || "", r.route || "", r.status, r.amount.toFixed(2)]);
      const HEAD = ["Date", "Invoice", "Traveler", "Route", "Status", "Amount (USD)"];
      root.addEventListener("click", async (e) => {
        const inv = e.target.closest('[data-act="inv-dl"]');
        if (inv) {
          const r = D.invoices[+inv.dataset.i];
          if (live && r.id) {
            inv.classList.add("is-loading");
            try {
              const res = await J.live.api("GET", `/v1/company/documents/invoice/${r.id}`, null, { raw: true });
              J.download(`${r.number}.csv`, await res.blob());
            } catch (err) { J.toast(err.message, "circle-alert"); }
            inv.classList.remove("is-loading");
            return;
          }
          J.download(`${r.number}.pdf`, J.pdf(`Invoice ${r.number}`, [`Billed to: ${D.corp.name}`, `Date: ${r.date}`, `Traveler: ${r.traveler || "-"}`, `Route: ${r.route || "-"}`, `Status: ${r.status}`, "", `Amount due: ${usd(r.amount)}`, "", "Jettingo · Private aviation"]));
          return J.toast(`${r.number}.pdf downloaded`, "file-down");
        }
        const rep = e.target.closest('[data-act="rep-dl"]');
        if (rep) {
          const i = +rep.dataset.i;
          const by = {};
          D.invoices.forEach((r) => { const k = r.traveler || "Unassigned"; by[k] = by[k] || [0, 0]; by[k][0] += 1; by[k][1] += r.amount; });
          const files = [
            ["jettingo-travel-summary.csv", [HEAD, ...rows()]],
            ["jettingo-traveler-activity.csv", [["Traveler", "Trips", "Spend (USD)"], ...Object.entries(by).map(([k, [n, a]]) => [k, n, a.toFixed(2)])]],
            ["jettingo-vat-pack.csv", [["Invoice", "Date", "Status", "Amount (USD)"], ...D.invoices.map((r) => [r.number, r.date, r.status, r.amount.toFixed(2)])]],
          ];
          J.download(files[i][0], J.csv(files[i][1]), "text/csv;charset=utf-8");
          return J.toast(`${files[i][0]} downloaded`, "download");
        }
        if (e.target.closest('[data-act="pdf"]')) {
          const total = D.invoices.reduce((a, r) => a + r.amount, 0);
          J.download("jettingo-report.pdf", J.pdf(`${D.corp.name} · travel report`, [`Period: ${root.querySelector("#rfrom").value} to ${root.querySelector("#rto").value}`, "", ...D.invoices.map((r) => `${r.date}   ${r.number}   ${r.route || ""}   ${r.status}   ${usd(r.amount)}`), "", `Total: ${usd(total)}`]));
          return J.toast("jettingo-report.pdf downloaded", "file-down");
        }
        if (!live && e.target.closest('[data-act="csv"]')) {
          J.download("jettingo-report.csv", J.csv([HEAD, ...rows()]), "text/csv;charset=utf-8");
          return J.toast("jettingo-report.csv downloaded", "sheet");
        }
      });
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
            ${D.docs.map((d) => `<div class="row between doc" data-cat="${esc(d.cat || d.kind || "")}"><div class="row gap-12" style="min-width:0">${ic("file-text", "faint")}<div style="min-width:0"><b class="small" style="font-size:15px">${esc(d.title)}</b><div class="xs faint">${esc(d.meta)}</div></div></div><div class="row gap-8"><button class="sq-btn" aria-label="Download ${esc(d.title)}" ${d.kind === "manifest" ? `data-manifest="${esc(d.id)}"` : `data-act="doc-dl" data-i="${D.docs.indexOf(d)}"`}>${ic("download")}</button><a class="sq-btn" aria-label="Email ${esc(d.title)}" href="mailto:?subject=${encodeURIComponent(`Jettingo document: ${d.title}`)}&body=${encodeURIComponent(`Please find "${d.title}" from our Jettingo account.`)}">${ic("mail")}</a></div></div>`).join("")}
            <p class="small muted" id="none" hidden>No documents match your search.</p>
          </div>
        </div>
        <div><h2 class="h2">Document categories</h2>
          <div class="list mt-12">
            ${[["vat", "VAT certificates"], ["manifest", "Flight manifests"], ["permit", "International permits"], ["tax", "Annual tax statements"], ["invoice", "Invoices"]].map(([k, l]) => [k, l, D.docs.filter((d) => (d.cat || d.kind) === k).length]).filter(([k, , n]) => n || k !== "invoice").map(([k, l, n]) => `<button class="row gap-12" style="width:100%;text-align:left" data-act="doc-cat" data-cat="${k}" aria-pressed="false"><span class="folder">${ic("folder")}</span><b class="grow">${l}</b><span class="small faint">${n} document${n === 1 ? "" : "s"}</span>${ic("chevron-right", "faint")}</button>`).join("")}
          </div>
        </div>
      </div>`,
    init(root) {
      let cat = "";
      const filter = () => {
        const q = root.querySelector("#q").value.toLowerCase();
        let shown = 0;
        root.querySelectorAll(".doc").forEach((d) => {
          const hit = d.textContent.toLowerCase().includes(q) && (!cat || d.dataset.cat === cat);
          d.hidden = !hit;
          shown += hit;
        });
        root.querySelector("#none").hidden = shown > 0;
        root.querySelectorAll('[data-act="doc-cat"]').forEach((b) => {
          b.setAttribute("aria-pressed", b.dataset.cat === cat);
          b.style.background = b.dataset.cat === cat ? "var(--gold-100)" : "";
        });
        const label = root.querySelector('[data-act="doc-cat"][aria-pressed="true"] b');
        let note = root.querySelector("#catnote");
        if (!note) { root.querySelector("#docs").insertAdjacentHTML("beforebegin", `<div class="row between mt-8" id="catnote"></div>`); note = root.querySelector("#catnote"); }
        note.innerHTML = cat ? `<span class="small muted">Showing ${label ? label.textContent : ""}</span><button type="button" class="small link" data-act="doc-all">Show all</button>` : "";
      };
      root.addEventListener("click", (e) => {
        const c = e.target.closest('[data-act="doc-cat"]');
        if (c) { cat = cat === c.dataset.cat ? "" : c.dataset.cat; return filter(); }
        if (e.target.closest('[data-act="doc-all"]')) { cat = ""; return filter(); }
        const dl = e.target.closest('[data-act="doc-dl"]');
        if (dl) {
          const d = D.docs[+dl.dataset.i];
          if (J.live && J.live.on && d.kind === "invoice") return; // handled by live mode
          const name = d.title.replace(/\.pdf$/i, "") + ".pdf";
          J.download(name, J.pdf(d.title.replace(/\.pdf$/i, ""), [`Company: ${D.corp.name}`, `Issued: ${d.meta}`, "", "This document is a demo copy generated by the Jettingo prototype."]));
          J.toast(`${name} downloaded`, "download");
        }
      });
      root.querySelector("#q").addEventListener("input", filter);
    },
  });

  /* =============== Partner welcome =============== */
  J.screen("partner", {
    doc: "Vendor: welcome & role selection",
    group: "Partners",
    full: () => `<div class="app dark no-tabs" style="background:radial-gradient(100% 60% at 50% 0%,#2a3644,transparent),var(--night)">
      <header class="mnav" style="position:static"><div class="mnav-in"><a href="#/home">${brand("light")}</a><a class="btn ghost sm round" href="#/op-login">Operator login</a></div></header>
      <main class="main" style="padding-bottom:40px"><div class="split even" style="align-items:center">
        <div class="banner-img" style="border-radius:20px;margin:0">${ph("hangar", "Jet and crew in a hangar", "", "aspect-ratio:4/3")}<div class="cap" style="padding:24px"><h1 class="h1">Partner with Jettingo</h1><p style="opacity:.8">Join an exclusive network of global aviation partners.</p></div></div>
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
          <div class="card row gap-12" style="background:var(--surface-2)">${ic("lock", "gold")}<p class="small muted">Documents are encrypted and only reviewed by the Jettingo compliance team.</p></div>
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
          <p class="small faint center">Jettingo reviews every partner within 48 hours to ensure premium standards.</p>
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
        <button type="button" class="small" style="opacity:.7;align-self:center" data-act="forgot">Forgot password?</button>
        <div class="g2 gap-12" style="grid-template-columns:1fr 1fr"><a class="btn glass round" href="#/partner">Become a partner</a><button type="button" class="btn glass round" data-act="appstatus">Application status</button></div>
      </div>
    </div>`,
    init(root) {
      root.addEventListener("click", async (e) => {
        if (e.target.closest('[data-act="forgot"]')) {
          const email = root.querySelector('#op-cred input[autocomplete="username"]').value;
          return J.sheet({
            title: "Reset your password",
            body: `<p class="small muted">Enter your operator email and we'll send a secure link to set a new password.</p>
              <input class="input" id="remail" type="email" value="${J.esc(email)}" aria-label="Operator email">
              <button type="button" class="btn block lg" data-v="send">Send reset link</button>`,
            onOpen(panel) {
              panel.querySelector('[data-v="send"]').addEventListener("click", () => {
                const v = panel.querySelector("#remail").value.trim();
                if (!/\S+@\S+\.\S+/.test(v)) return J.toast("Enter a valid email", "info");
                panel.querySelector(".sheet-body").innerHTML = `<div class="stack gap-12 center" style="padding:8px 0"><span class="check-big">${ic("mail-check")}</span><b>Check your inbox</b><p class="small muted">If ${J.esc(v)} is registered, a reset link is on its way. It expires in 30 minutes.</p><button type="button" class="btn ghost block" data-sheet-close>Back to sign in</button></div>`;
                J.icons(panel);
              });
            },
          });
        }
        if (e.target.closest('[data-act="appstatus"]')) {
          let status = "pending";
          const id = J.state.applicationId;
          if (J.live && J.live.on && id) {
            try { status = (await J.live.api("GET", `/v1/partners/applications/${id}`)).status; } catch { /* show default */ }
          }
          const steps = [["Application received", "We have your company details and documents.", true], ["Compliance review", "Licence, insurance and safety checks. Usually within 48 hours.", status !== "pending"], ["Approved", status === "rejected" ? "Not approved. Contact partners@jettingo.com." : "You can start receiving quote requests.", status === "approved"]];
          return J.sheet({
            title: "Application status",
            body: `<div class="steps-v">${steps.map(([t, d, done], i) => `<div class="s ${done ? "done" : !steps[i - 1] || steps[i - 1][2] ? "now" : ""}"><i></i><div><b>${t}</b><p class="small muted">${d}</p></div></div>`).join("")}</div>
              ${!id && J.live && J.live.on ? `<p class="xs faint">Applied from another device? Sign in with your operator email to see your live status.</p>` : ""}`,
          });
        }
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
    action: () => `<button class="iconbtn" aria-label="Notifications" data-act="notifs">${ic("bell")}${D.op.queue.length ? '<span class="badge"></span>' : ""}</button>`,
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
          ${op.queue.length ? op.queue.map((q, i) => `<button class="row between" style="width:100%;text-align:left" data-act="open-req" data-i="${i}" aria-label="Open request ${esc(q.route)}"><div><b>${esc(q.route)}</b><div class="xs faint">${esc(q.meta)}</div></div><span class="small faint tnum">${esc(q.left)}</span></button>`).join("") : `<p class="small muted">Nothing else waiting.</p>`}
        </div></div>
      </div>
    </div>`;
    },
    init(root) {
      root.addEventListener("click", (e) => {
        if (e.target.closest('[data-act="notifs"]')) {
          return J.notifications("Operator updates", [
            ...D.op.queue.map((q) => ["inbox", `New request: ${q.route}`, `${q.meta} · respond within ${q.left}`, true]),
            ["badge-check", "Verification complete", "Your operator profile is approved", false],
            ["banknote", "Payout sent", "Last completed trip has been paid out", false],
          ]);
        }
        const open = e.target.closest('[data-act="open-req"]');
        if (open) {
          // Swap the selected queue item with the request in focus.
          const i = +open.dataset.i;
          const picked = D.op.queue[i];
          if (D.op.req) {
            const r = D.op.req;
            D.op.queue[i] = { route: `${r.from} → ${r.to}`, meta: `${r.date} · ${r.pax} pax`, left: `${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")}`, req: r };
          } else D.op.queue.splice(i, 1);
          D.op.req = picked.req;
          J.rerender();
        }
      });
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
