(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const esc = (str) => str.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ---------- Intro ---------- */
  // No splash screen: once the first frame has painted, flip `loaded` so the hero
  // intro transitions (cards, headline, buttons) play from their start state.
  const finishLoad = () => document.body.classList.add("loaded");
  requestAnimationFrame(() => requestAnimationFrame(finishLoad));

  /* ---------- Button label roll ---------- */
  // The label clips; an inner span carries the text plus a copy below it, and slides up on hover.
  $$(".btn__label").forEach((label) => {
    const text = label.dataset.text || label.textContent;
    const roll = document.createElement("span");
    roll.className = "btn__roll";
    roll.dataset.text = text;
    roll.textContent = label.textContent;
    label.replaceChildren(roll);
  });

  /* ---------- Text splitting ---------- */
  // Word-mask reveal for headings.
  // Text is escaped before it goes back in as HTML ("&" in the hero title, for one).
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = `<span class="sr-only">${esc(words.join(" "))}</span>` + words
      .map((w, i) => `<span class="word" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`)
      .join(" ");
    el.classList.add("is-split");
  });

  // Per-character rise for body copy, words kept unbreakable.
  $$(".chars").forEach((el) => {
    let i = 0;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = `<span class="sr-only">${esc(words.join(" "))}</span>` + words
      .map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join("")}</span>`)
      .join(" ");
    el.classList.add("is-split");
  });

  /* ---------- Scroll reveals ---------- */
  $$("[data-delay]").forEach((el) => el.style.setProperty("--d", `${el.dataset.delay}s`));

  // Stagger siblings that reveal together.
  $$(".problem__grid, .stats, .features, .plans, .team__grid, .faq__list, .nextsteps").forEach((group) => {
    [...group.children].forEach((child, i) => {
      if (!child.dataset.delay) child.style.setProperty("--d", `${i * 0.08}s`);
    });
  });

  $$(".compare tbody tr").forEach((row, r) =>
    $$("i", row).forEach((icon, c) => icon.style.setProperty("--i", r * 3 + c))
  );

  const revealTargets = $$(".reveal, .split, .chars, .table-wrap, .footer__big");
  const heroTargets = new Set($$(".hero .reveal, .hero .split, .hero .chars"));

  if (reduced || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((el) => {
      // Hero content waits for the loader to clear.
      if (heroTargets.has(el)) return;
      io.observe(el);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => heroTargets.forEach((el) => el.classList.add("in"))));
  }

  /* ---------- Tickers ---------- */
  $$(".ticker").forEach((t) => {
    if (t.hidden || t.closest("[hidden]")) return; // hidden strips have no width to measure
    const track = $(".ticker__track", t);
    // Duplicate until the track is at least twice the viewport, so the -50% loop is seamless.
    const original = track.innerHTML;
    track.innerHTML = original + original;
    for (let n = 0; n < 12 && track.scrollWidth && track.scrollWidth < window.innerWidth * 2.2; n++) track.innerHTML += original + original;
    const pxPerSec = Number(t.dataset.speed) || 40;
    track.style.setProperty("--dur", `${track.scrollWidth / 2 / pxPerSec}s`);
    $$("[id]", track).forEach((n) => n.removeAttribute("id"));
    [...track.children].slice(track.children.length / 2).forEach((n) => n.setAttribute("aria-hidden", "true"));
  });

  /* ---------- Vertical checklist loop ---------- */
  $$(".pain__list").forEach((list) => {
    const track = $(".pain__track", list);
    const original = track.innerHTML;
    track.innerHTML = original + original;
    [...track.children].slice(track.children.length / 2).forEach((n) => n.setAttribute("aria-hidden", "true"));
    const pxPerSec = Number(list.dataset.speed) || 22;
    track.style.setProperty("--dur", `${track.scrollHeight / 2 / pxPerSec}s`);
  });

  // Decorative loops pause while off screen.
  if (!reduced && "IntersectionObserver" in window) {
    const lio = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle("is-offscreen", !e.isIntersecting));
    }, { rootMargin: "100px 0px" });
    $$(".ticker:not([hidden]), .pain__list").forEach((el) => lio.observe(el));
  }

  /* ---------- Staggered groups (cards rise / pop in sequence) ---------- */
  $$(".solution__grid").forEach((g) => $$(".rise", g).forEach((c, i) => c.style.setProperty("--i", i)));
  const groups = $$(".solution__grid, .board-wrap, .pgrid");
  if (reduced || !("IntersectionObserver" in window)) groups.forEach((g) => g.classList.add("in"));
  else {
    const gio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); gio.unobserve(e.target); } });
    }, { threshold: 0.25 });
    groups.forEach((g) => gio.observe(g));
  }

  /* ---------- Scroll-driven effects (one rAF loop) ---------- */
  const nav = $(".nav");
  const progress = $(".progress");
  // offsetTop ignores transforms, so the offset we apply never feeds back into the next measurement.
  const parallaxEls = $$(".parallax").map((el) => ({ el, speed: Number(el.dataset.speed || 0.1) }));
  const process = $(".process");
  const steps = $$(".step");
  const bar = $(".process__bar span");
  const count = $(".process__count b");
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;

    progress.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

    nav.classList.toggle("is-scrolled", y > 40);

    if (!reduced) {
      parallaxEls.forEach(({ el, speed }) => {
        if (!el.offsetParent) return; // display:none on this breakpoint
        const top = el.offsetParent.getBoundingClientRect().top + el.offsetTop;
        const h = el.offsetHeight;
        if (top + h < -200 || top > vh + 200) return;
        el.style.setProperty("--sy", `${((top + h / 2 - vh / 2) * speed).toFixed(1)}px`);
      });
    }

    // Process: activate the step nearest the viewport centre.
    if (process && steps.length) {
      let active = 0;
      steps.forEach((s, i) => {
        if (s.getBoundingClientRect().top < vh * 0.55) active = i;
      });
      steps.forEach((s, i) => s.classList.toggle("is-active", i === active));
      const pr = process.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.55 - pr.top) / (pr.height - vh * 0.3)));
      bar.style.transform = `scaleX(${p})`;
      count.textContent = String(active + 1).padStart(2, "0");
    }
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Counters ---------- */
  const counters = $$(".count");
  const runCounter = (el) => {
    const to = Number(el.dataset.to);
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = to + suffix; return; }
    const dur = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(to * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  } else counters.forEach(runCounter);

  /* ---------- Pricing toggle ---------- */
  const toggle = $(".toggle");
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle__btn");
      if (!btn || btn.classList.contains("is-active")) return;
      const plan = btn.dataset.plan;
      toggle.dataset.plan = plan;
      $$(".toggle__btn", toggle).forEach((b) => b.classList.toggle("is-active", b === btn));
      $$(".price").forEach((p) => {
        p.classList.remove("flip");
        void p.offsetWidth; // restart animation
        p.classList.add("flip");
        setTimeout(() => (p.textContent = p.dataset[plan]), 220);
      });
    });
  }

  /* ---------- Per-card currency toggle ---------- */
  const symbols = { usd: "USD", eur: "EUR", cad: "CAD", gbp: "GBP" };
  $$(".cur-toggle").forEach((group) => {
    const card = group.closest(".pcard");
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cur]");
      if (!btn || btn.classList.contains("is-active")) return;
      const cur = btn.dataset.cur;
      $$("button", group).forEach((b) => b.classList.toggle("is-active", b === btn));
      const price = $(".price", card);
      price.classList.remove("flip");
      void price.offsetWidth; // restart the flip animation
      price.classList.add("flip");
      setTimeout(() => {
        price.textContent = price.dataset[cur];
        $(".cur", card).textContent = symbols[cur];
      }, 220);
    });
  });
  $$(".pgrid").forEach((g) => $$(".rise", g).forEach((c, i) => c.style.setProperty("--i", i)));
  $$(".cmp__table tbody tr").forEach((row, r) => $$("td i", row).forEach((d, c) => d.style.setProperty("--i", r * 4 + c)));

  /* ---------- Comparison tabs ---------- */
  // Two tables share one slot; the pill slides under the active tab. Arrow keys / Home / End move focus.
  $$(".cmp__tabs").forEach((tabs) => {
    const btns = $$('[role="tab"]', tabs);
    const select = (btn, focus) => {
      btns.forEach((b, i) => {
        const on = b === btn;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(b.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
        if (on) tabs.dataset.active = String(i);
      });
      if (focus) btn.focus();
    };
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest('[role="tab"]');
      if (b && b.getAttribute("aria-selected") !== "true") select(b);
    });
    tabs.addEventListener("keydown", (e) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const n = e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length;
      select(btns[n], true);
    });
  });

  /* ---------- FAQ accordion ---------- */
  // Height animates to the measured size, then is released to `auto` so an open answer
  // still fits after a resize; closing pins it back to pixels first so it can animate.
  const setQa = (qa, open) => {
    const q = $(".qa__q", qa);
    const a = $(".qa__a", qa);
    qa.classList.toggle("is-open", open);
    q.setAttribute("aria-expanded", String(open));
    if (reduced) { a.style.height = open ? "auto" : "0px"; return; }
    a.style.height = `${a.scrollHeight}px`;
    if (!open) { void a.offsetHeight; a.style.height = "0px"; }
  };
  $$(".qa").forEach((qa, i) => {
    const q = $(".qa__q", qa);
    const a = $(".qa__a", qa);
    a.id = a.id || `qa-answer-${i + 1}`;
    q.setAttribute("aria-controls", a.id);
    a.addEventListener("transitionend", (e) => {
      if (e.target === a && e.propertyName === "height" && qa.classList.contains("is-open")) a.style.height = "auto";
    });
    q.addEventListener("click", () => {
      const open = !qa.classList.contains("is-open");
      // Close the others so only one answer is open at a time.
      $$(".qa.is-open").forEach((other) => { if (other !== qa) setQa(other, false); });
      setQa(qa, open);
    });
  });

  /* ---------- Mobile menu ---------- */
  const burger = $(".nav__burger");
  const menu = $(".mobile-menu");
  menu.inert = true;
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menu.inert = !open;
    document.body.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); burger.focus(); }
  });

  /* ---------- Work rail: drag to scroll ---------- */
  const rail = $(".work__rail");
  if (rail && finePointer) {
    let down = false, startX = 0, startScroll = 0, moved = false;
    rail.addEventListener("pointerdown", (e) => {
      down = true; moved = false; startX = e.clientX; startScroll = rail.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; rail.classList.add("is-dragging"); }
      rail.scrollLeft = startScroll - dx;
    });
    window.addEventListener("pointerup", () => { down = false; rail.classList.remove("is-dragging"); });
    rail.addEventListener("click", (e) => { if (moved) e.preventDefault(); }, true);
  }

  /* ---------- Pointer effects (desktop only) ---------- */
  // Everything here writes `translate`, `rotate` or CSS variables: compositor work, no layout.
  if (finePointer && !reduced) {
    // Custom cursor: eases toward the pointer and stops its rAF loop once it has caught up.
    const cursor = $(".cursor");
    document.documentElement.classList.add("has-cursor");
    let mx = 0, my = 0, cx = 0, cy = 0, following = false, seen = false;
    const follow = () => {
      cx += (mx - cx) * 0.4; cy += (my - cy) * 0.4;
      cursor.style.translate = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
      if (Math.abs(mx - cx) + Math.abs(my - cy) > 0.3) requestAnimationFrame(follow);
      else following = false;
    };
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!seen) { cx = mx; cy = my; seen = true; } // don't fly in from the corner
      cursor.classList.add("is-active");
      if (!following) { following = true; requestAnimationFrame(follow); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
    window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
    window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
    // One delegated listener covers ticker clones and anything added later.
    const hoverSel = "a, button, .qa__q, .av, .float-card, .tilt";
    document.addEventListener("pointerover", (e) => {
      const t = e.target instanceof Element ? e.target : null;
      cursor.classList.toggle("is-hover", !!(t && t.closest(hoverSel)));
      cursor.classList.toggle("is-text", !!(t && t.closest("input, textarea")));
    });

    // Magnetic buttons (the CSS transition on `translate` smooths the follow and the release).
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      el.addEventListener("pointerleave", () => (el.style.translate = ""));
    });

    // 3D tilt: one axis-angle `rotate`, so it composes with the reveal transform and hover lift.
    $$(".tilt").forEach((el) => {
      let r = null;
      el.addEventListener("pointerenter", () => (r = el.getBoundingClientRect()));
      el.addEventListener("pointermove", (e) => {
        if (!r) r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const mag = Math.hypot(px, py);
        if (mag < 0.01) return;
        el.style.rotate = `${(-py / mag).toFixed(3)} ${(px / mag).toFixed(3)} 0 ${(mag * 9).toFixed(2)}deg`;
      });
      el.addEventListener("pointerleave", () => { el.style.rotate = ""; r = null; });
    });

    // Soft spotlight that follows the pointer across cards.
    $$(".pcard, .tl-card, .cform").forEach((el) => {
      el.classList.add("spotlight");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
        el.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
      });
    });

    // Hero chips drift away from the pointer (CSS variables feed `translate`).
    const floats = $$(".float-card");
    const hero = $(".hero");
    let nx = 0, ny = 0, queued = false;
    const drift = () => {
      queued = false;
      floats.forEach((f, i) => {
        const depth = (i % 2 ? 1 : -1) * (14 + i * 6);
        f.style.setProperty("--dx", `${(nx * depth).toFixed(1)}px`);
        f.style.setProperty("--dy", `${(ny * depth).toFixed(1)}px`);
      });
    };
    hero.addEventListener("pointermove", (e) => {
      nx = e.clientX / window.innerWidth - 0.5;
      ny = e.clientY / window.innerHeight - 0.5;
      if (!queued) { queued = true; requestAnimationFrame(drift); }
    });
    hero.addEventListener("pointerleave", () => { nx = 0; ny = 0; if (!queued) { queued = true; requestAnimationFrame(drift); } });
  }

  /* ---------- Nav: highlight the section in view ---------- */
  const navLinks = $$('.nav__links a[href^="#"]');
  if ("IntersectionObserver" in window && navLinks.length) {
    const byId = new Map(navLinks.map((l) => [l.getAttribute("href").slice(1), l]));
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const link = byId.get(e.target.id);
        if (link) link.classList.toggle("is-current", e.isIntersecting);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    byId.forEach((_, id) => { const sec = document.getElementById(id); if (sec) sio.observe(sec); });
  }

  /* ---------- Contact form: sent to developer@arrasoftworks.com via FormSubmit ---------- */
  const FORM_ENDPOINT = "https://formsubmit.co/ajax/developer@arrasoftworks.com";
  const form = $(".cform");
  if (form) {
    const submitBtn = $(".cform__submit", form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let ok = true;
      $$("[required]", form).forEach((field) => {
        field.classList.remove("is-invalid");
        if (!field.value.trim() || (field.type === "email" && !/^\S+@\S+\.\S+$/.test(field.value))) {
          void field.offsetWidth; // restart the shake animation
          field.classList.add("is-invalid");
          ok = false;
        }
      });
      const status = $(".cform__status", form);
      status.hidden = false;
      if (!ok) { status.textContent = "Please fill in your name and a valid email."; return; }
      if (form.elements._honey && form.elements._honey.value) return; // bot trap

      const data = Object.fromEntries(new FormData(form));
      delete data._honey;
      data._subject = `New enquiry from ${data.name} (arrasoftworks.com)`;
      data._template = "table";
      data._replyto = data.email;

      submitBtn.disabled = true;
      form.classList.add("is-sending");
      status.textContent = "Sending…";
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || String(body.success) === "false") throw new Error(body.message || res.status);
        status.textContent = "Got it. We'll reply within 1 business day with next steps.";
        form.dispatchEvent(new CustomEvent("arra:lead", { bubbles: true }));
        form.reset();
      } catch (err) {
        status.textContent = "That didn't go through. Email us at developer@arrasoftworks.com and we'll pick it up from there.";
      } finally {
        submitBtn.disabled = false;
        form.classList.remove("is-sending");
      }
    });
  }

  /* ---------- Misc ---------- */
  $("#year").textContent = new Date().getFullYear();
})();

// "Ask AI" buttons: open each assistant with a prefilled question
(() => {
  const question = "What should I look for in an app development partner, and how does Arra Softworks (arrasoftworks.com) compare for brands and founders?";
  const q = encodeURIComponent(question);
  const urls = {
    chatgpt: `https://chatgpt.com/?q=${q}`,
    claude: `https://claude.ai/new?q=${q}`,
    perplexity: `https://www.perplexity.ai/search?q=${q}`,
  };
  document.querySelectorAll("[data-ask]").forEach((a) => {
    if (urls[a.dataset.ask]) a.href = urls[a.dataset.ask];
  });
})();
