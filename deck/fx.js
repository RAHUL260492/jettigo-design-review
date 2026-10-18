/* Jettigo design review — motion layer (see fx.css for credits).
   Runs after each page's inline script has rendered, on DOMContentLoaded. */
(function () {
  const D = (window.D = window.D || {});
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // A damped spring, the stand-in for framer-motion's animate(…, { type: "spring" }).
  const springs = new Map();
  const spring = (key, from, to, set, { k = 200, c = 20 } = {}) => {
    cancelAnimationFrame(springs.get(key));
    if (reduce) return set(to);
    let x = from, v = 0, last = performance.now();
    const step = (t) => {
      const dt = Math.min(0.032, (t - last) / 1000); last = t;
      v += (-k * (x - to) - c * v) * dt; x += v * dt;
      if (Math.abs(v) < 0.02 && Math.abs(x - to) < 0.1) return set(to);
      set(x); springs.set(key, requestAnimationFrame(step));
    };
    springs.set(key, requestAnimationFrame(step));
  };

  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };

  // Calls fn once per element the first time it scrolls into view.
  const onView = (els, fn, opts = {}) => {
    if (!("IntersectionObserver" in window)) return els.forEach((el) => fn(el, 0));
    const io = new IntersectionObserver((entries) => {
      // Anything already scrolled past (e.g. after an anchor jump) shows at once.
      entries.filter((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)
        .sort((a, b) => (a.target.compareDocumentPosition(b.target) & 4 ? -1 : 1))
        .forEach((e, i) => { io.unobserve(e.target); fn(e.target, e.isIntersecting ? i : 0); });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px", ...opts });
    els.forEach((el) => io.observe(el));
  };

  // Spotlight navbar (Vengeance UI).
  const navbar = () => {
    const inner = document.querySelector(".d-nav-in");
    if (!inner) return;
    const center = (a) => a.offsetLeft + a.offsetWidth / 2;
    const active = inner.querySelector("a.on");
    let spotX = 0, ambX = active ? center(active) : -100;
    const setSpot = (x) => { spotX = x; inner.style.setProperty("--spot-x", x + "px"); };
    const setAmb = (x) => { ambX = x; inner.style.setProperty("--amb-x", x + "px"); };

    // The line springs over from where it sat on the previous page.
    const prev = parseFloat(store.get("fx-amb"));
    if (active) { setAmb(isNaN(prev) ? ambX : prev); spring("amb", ambX, center(active), setAmb); store.set("fx-amb", center(active)); }
    inner.addEventListener("pointermove", (e) => { cancelAnimationFrame(springs.get("spot")); setSpot(e.clientX - inner.getBoundingClientRect().left); });
    inner.addEventListener("pointerleave", () => active && spring("spot", spotX, center(active), setSpot));
    addEventListener("resize", () => active && setAmb(center(active)));
  };

  // Stagger text (Vengeance UI): wrap each word in a mask, keeping <em>/<br>.
  const splitWords = (node, n = { i: 0 }) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(" ");
          const w = document.createElement("span"), s = document.createElement("span");
          w.className = "fx-w"; s.textContent = part; s.style.setProperty("--i", n.i++);
          w.append(s); frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== "BR") splitWords(child, n);
    });
  };
  const headings = () => {
    const els = $$(".d-cover h1, .d-head h1");
    els.forEach((el) => {
      el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
      splitWords(el);
      el.classList.add("fx-split");
      el.style.setProperty("--d", el.closest(".d-cover") ? "150ms" : "0ms");
    });
    requestAnimationFrame(() => requestAnimationFrame(() => onView(els, (el) => el.classList.add("fx-in"))));
  };

  // Stats counter (Vengeance UI).
  const counters = () => {
    const els = $$(".d-num").filter((el) => /^\d+$/.test(el.textContent.trim()));
    els.forEach((el) => { el.dataset.to = el.textContent.trim(); el.style.fontVariantNumeric = "tabular-nums"; el.textContent = "0"; });
    onView(els, (el, i) => {
      const to = +el.dataset.to, dur = 1500, start = performance.now() + i * 90;
      const tick = (t) => {
        const p = Math.max(0, Math.min(1, (t - start) / dur));
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  // Scroll reveal with a stagger (Vengeance UI staggered grid, minus GSAP).
  D.reveal = (root = document) => {
    const els = $$(".d-card, .d-stats > div, .d-ledger > li, .d-ways > div, .d-phase, .d-branch, .d-journey, .d-layer, .d-sw, .d-surface, .d-type > div, .d-root, .d-pager, .d-cover .elite, .d-cover p, .d-cover .row, .d-cover .meta, .d-devices", root)
      .filter((el) => !el.classList.contains("fx-rv") && !el.parentElement.closest(".fx-rv"));
    els.forEach((el) => el.classList.add("fx-rv"));
    // Cover copy follows the headline in sequence instead of all at once.
    $$(".d-cover .fx-rv").forEach((el, i) => el.style.setProperty("--rd", 350 + i * 110 + "ms"));
    onView(els, (el, i) => {
      if (!el.style.getPropertyValue("--rd")) el.style.setProperty("--rd", Math.min(i, 6) * 70 + "ms");
      el.classList.add("fx-in");
      // Hand transitions back to the component (e.g. card hover) once revealed.
      setTimeout(() => { el.classList.remove("fx-rv", "fx-in"); el.style.removeProperty("--rd"); }, 1400 + parseFloat(el.style.getPropertyValue("--rd") || 0));
    });
  };

  // Cover: animated rays (Vengeance UI) and the radial glow CTA (Vengeance UI).
  const cover = () => {
    const c = document.querySelector(".d-cover");
    if (!c) return;
    if (!reduce) c.insertAdjacentHTML("afterbegin", '<div class="fx-rays" aria-hidden="true"></div>');
    $$(".btn.gold", c).forEach((b) => b.classList.add("fx-glow"));
  };

  // Border beam (Vengeance UI) on the upcoming phase.
  const beams = () => $$(".d-phase.next").forEach((el) => { el.style.overflow = "visible"; el.insertAdjacentHTML("beforeend", '<span class="fx-beam" aria-hidden="true"></span>'); });

  // Hover expand gallery (Skiper UI 52).
  const photos = () => $$(".d-photo").forEach((g) => {
    const items = $$(":scope > .ph", g);
    const pick = (ph) => items.forEach((x) => { const on = x === ph; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    items.forEach((ph) => {
      ph.dataset.cap = ph.querySelector("img")?.alt || "";
      ph.tabIndex = 0; ph.setAttribute("role", "button");
      ph.addEventListener("pointerenter", () => pick(ph));
      ph.addEventListener("focus", () => pick(ph));
      ph.addEventListener("click", () => pick(ph));
    });
    g.classList.add("fx-expand");
    pick(items[0]);
  });

  // Journey emotion curve draws itself (Skiper UI 19), then each mood lands.
  let maskN = 0;
  D.curves = (root = document) => {
    const boxes = $$(".d-curve", root).filter((b) => !b.dataset.fx && b.querySelector("svg path"));
    boxes.forEach((box) => {
      box.dataset.fx = 1;
      const svg = box.querySelector("svg"), path = svg.querySelector("path"), vb = svg.viewBox.baseVal, id = "fx-m" + maskN++;
      svg.insertAdjacentHTML("afterbegin", `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${vb.width}" height="${vb.height}"><path class="fx-draw" d="${path.getAttribute("d")}" fill="none" stroke="#fff" stroke-width="8" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></mask></defs>`);
      path.setAttribute("mask", `url(#${id})`);
      $$("circle", svg).forEach((c, i) => c.style.setProperty("--i", i));
      box.classList.add("fx-wait");
    });
    onView(boxes, (box) => {
      box.querySelector(".fx-draw").style.strokeDashoffset = 0;
      box.classList.remove("fx-wait");
    }, { threshold: 0.4 });
  };

  // Screens marquee (Vengeance UI logo-slider): one set of frames, doubled for a seamless loop.
  D.marquee = (el, ids) => {
    const item = (id) => {
      const s = D.byId[id], n = String(D.screens.indexOf(s) + 1).padStart(2, "0");
      return `<a class="fx-mq-it" href="screens.html#${id}" aria-label="${s.t}, screen ${n}">${D.device("phone", id, { flat: true, interactive: false })}<span><b>${s.t}</b><i>${n}</i></span></a>`;
    };
    const set = ids.map(item).join("");
    el.className = "fx-mq";
    el.style.setProperty("--dur", ids.length * 5 + "s");
    el.innerHTML = `<div class="fx-mq-track">${set}${reduce ? "" : set}</div>`;
    $$(".fx-mq-it", el).slice(ids.length).forEach((a) => { a.setAttribute("aria-hidden", "true"); a.tabIndex = -1; });
    D.fit(el);
  };

  // Ambient dot grid + gold wash behind interior page titles.
  const ambient = () => {
    if (document.querySelector(".d-head") && !document.querySelector(".d-cover")) document.body.insertAdjacentHTML("afterbegin", '<div class="fx-ambient" aria-hidden="true"></div>');
  };

  const init = () => {
    navbar(); ambient();
    if (reduce) return;
    cover(); headings(); counters(); beams(); photos(); D.curves(); D.reveal();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
