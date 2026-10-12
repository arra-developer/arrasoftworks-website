(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w, i) => `<span class="word"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");
    el.insertAdjacentHTML("afterbegin", `<span class="sr-only">${words.join(" ")}</span>`);
    [...el.querySelectorAll(".word")].forEach((w) => w.setAttribute("aria-hidden", "true"));
  });

  // Per-character rise for body copy, words kept unbreakable.
  $$(".chars").forEach((el) => {
    let i = 0;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = `<span class="sr-only">${words.join(" ")}</span>` + words
      .map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="ch" style="--i:${i++}">${c}</span>`).join("")}</span>`)
      .join(" ");
  });

  /* ---------- Scroll reveals ---------- */
  $$("[data-delay]").forEach((el) => el.style.setProperty("--d", `${el.dataset.delay}s`));

  // Stagger siblings that reveal together.
  $$(".problem__grid, .stats, .features, .plans, .team__grid, .faq__list").forEach((group) => {
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
    const track = $(".ticker__track", t);
    // Duplicate until the track is at least twice the viewport, so the -50% loop is seamless.
    const original = track.innerHTML;
    track.innerHTML = original + original;
    while (track.scrollWidth < window.innerWidth * 2.2) track.innerHTML += original + original;
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
  const parallaxEls = $$(".parallax");
  const process = $(".process");
  const steps = $$(".step");
  const bar = $(".process__bar span");
  const count = $(".process__count b");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;

    progress.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

    nav.classList.toggle("is-scrolled", y > 40);
    const menuOpen = document.body.classList.contains("menu-open");
    nav.classList.toggle("is-hidden", !menuOpen && y > lastY && y > 400);
    lastY = y;

    if (!reduced) {
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const offset = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.speed || 0.1);
        el.style.translate = `0 ${offset.toFixed(1)}px`;
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

  /* ---------- FAQ accordion ---------- */
  $$(".qa").forEach((qa) => {
    const q = $(".qa__q", qa);
    const a = $(".qa__a", qa);
    q.addEventListener("click", () => {
      const open = !qa.classList.contains("is-open");
      // Close the others so only one answer is open at a time.
      $$(".qa.is-open").forEach((other) => {
        if (other === qa) return;
        other.classList.remove("is-open");
        $(".qa__q", other).setAttribute("aria-expanded", "false");
        $(".qa__a", other).style.height = "0px";
      });
      qa.classList.toggle("is-open", open);
      q.setAttribute("aria-expanded", String(open));
      a.style.height = open ? `${a.scrollHeight}px` : "0px";
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
  if (finePointer && !reduced) {
    // Custom cursor with easing.
    const cursor = $(".cursor");
    document.documentElement.classList.add("has-cursor");
    let mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.add("is-active");
    });
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
    const follow = () => {
      cx += (mx - cx) * 0.45; cy += (my - cy) * 0.45;
      cursor.style.translate = `${cx}px ${cy}px`;
      requestAnimationFrame(follow);
    };
    follow();
    $$("a, button, .qa__q, .av").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });

    // Magnetic buttons.
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.translate = `${x}px ${y}px`;
      });
      el.addEventListener("pointerleave", () => (el.style.translate = ""));
    });

    // 3D tilt cards.
    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });

    // Hero floating cards drift away from the pointer.
    const floats = $$(".float-card");
    const hero = $(".hero");
    hero.addEventListener("pointermove", (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      floats.forEach((f, i) => {
        const depth = (i % 2 ? 1 : -1) * (10 + i * 4);
        f.style.marginLeft = `${nx * depth}px`;
        f.style.marginTop = `${ny * depth}px`;
      });
    });
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
        status.textContent = "Thanks! We'll get back to you with next steps.";
        form.dispatchEvent(new CustomEvent("arra:lead", { bubbles: true }));
        form.reset();
      } catch (err) {
        status.textContent = "Sorry, that didn't send. Please email developer@arrasoftworks.com directly.";
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
  const question = "Why should I choose Arra Softworks for app development and founder services?";
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
