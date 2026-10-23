/* Arra Softworks: analytics and conversion tracking.
   1. Create a GA4 property for arrasoftworks.com and paste its Measurement ID below.
   2. Nothing loads while the ID is still the placeholder, so local testing stays clean.
   3. In GA4, mark "generate_lead" as a key event (conversion). */
(() => {
  const GA_MEASUREMENT_ID = "G-0STV8H9KHK";

  const enabled = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX"
    && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  /* Consent: GA loads only after the visitor accepts. The choice is kept in localStorage. */
  const CONSENT_KEY = "arra_consent";
  const getConsent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } };
  const setConsent = (v) => { try { localStorage.setItem(CONSENT_KEY, v); } catch {} };
  let loaded = false;

  const loadGA = () => {
    if (!enabled || loaded) return;
    loaded = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID);
  };

  const clearGACookies = () => {
    const host = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => /^_ga/.test(n)).forEach((n) => {
      [host, "." + host, ""].forEach((d) => {
        document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? "; domain=" + d : ""}`;
      });
    });
  };

  if (getConsent() === "granted") loadGA();

  const track = (name, params = {}) => {
    if (enabled && loaded) gtag("event", name, params);
    else console.debug("[analytics]", name, params);
  };

  const showBanner = () => {
    if (document.querySelector(".consent")) return;
    if (!document.getElementById("consent-css")) {
      const css = document.createElement("style");
      css.id = "consent-css";
      css.textContent = `.consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;display:flex;gap:16px;align-items:center;padding:16px 18px;border-radius:16px;background:#131311;color:#f4f4f4;font:500 14px/1.45 "Satoshi","Satoshi Fallback",system-ui,sans-serif;box-shadow:0 18px 50px -12px rgba(0,0,0,.45);animation:consent-in .45s cubic-bezier(.165,.84,.44,1) both}
.consent p{margin:0;flex:1}.consent a{color:#c6fd50;text-decoration:underline;text-underline-offset:2px}
.consent__btns{display:flex;gap:8px;flex-shrink:0}
.consent__btn{font:inherit;font-weight:700;cursor:pointer;min-height:40px;padding:0 16px;border-radius:10px;border:1.5px solid #41413f;background:transparent;color:inherit;transition:transform .2s,background .2s,border-color .2s}
.consent__btn:hover{border-color:#969694;transform:translateY(-1px)}.consent__btn:active{transform:scale(.97)}
.consent__btn--yes{background:#c6fd50;border-color:#c6fd50;color:#131311}.consent__btn--yes:hover{background:#d4ff78;border-color:#d4ff78}
.consent__btn:focus-visible{outline:2px solid #c6fd50;outline-offset:2px}
.consent.is-out{opacity:0;transform:translateY(12px);transition:opacity .3s,transform .3s}
@keyframes consent-in{from{opacity:0;transform:translateY(16px)}}
@media (max-width:560px){.consent{flex-direction:column;align-items:stretch}.consent__btns>*{flex:1}}
@media (prefers-reduced-motion:reduce){.consent{animation:none}.consent,.consent__btn{transition:none}}`;
      document.head.appendChild(css);
    }
    const bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", "Cookie consent");
    const policy = /privacy/.test(location.pathname) ? "#cookies" : "/privacy.html#cookies";
    bar.innerHTML = `<p>We use analytics cookies to understand how the site is used. They stay off unless you accept. <a href="${policy}">Learn more</a></p>
      <div class="consent__btns"><button type="button" class="consent__btn" data-c="denied">Decline</button><button type="button" class="consent__btn consent__btn--yes" data-c="granted">Accept</button></div>`;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (!b) return;
      setConsent(b.dataset.c);
      if (b.dataset.c === "granted") loadGA(); else if (loaded) { clearGACookies(); location.reload(); return; }
      bar.classList.add("is-out");
      setTimeout(() => bar.remove(), 300);
    });
    document.body.appendChild(bar);
  };

  /* Campaign attribution: keep UTM params for the session and send them with the form. */
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const params = new URLSearchParams(location.search);
  const store = (() => { try { return sessionStorage; } catch { return null; } })();
  UTM_KEYS.forEach((k) => { if (params.get(k) && store) store.setItem(k, params.get(k)); });
  if (store && !store.getItem("landing_page")) store.setItem("landing_page", location.pathname + location.search);
  if (store && !store.getItem("referrer")) store.setItem("referrer", document.referrer || "direct");

  document.addEventListener("DOMContentLoaded", () => {
    if (!getConsent()) showBanner();
    document.querySelectorAll("[data-cookie-settings]").forEach((el) => {
      el.addEventListener("click", (e) => { e.preventDefault(); showBanner(); });
    });

    const form = document.querySelector(".cform");
    if (form && store) {
      [...UTM_KEYS, "landing_page", "referrer"].forEach((k) => {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = k; input.value = store.getItem(k) || "";
        form.appendChild(input);
      });
    }

    /* CTA clicks, labelled by button text and the section they sit in. */
    document.querySelectorAll('a.btn, .cform__submit, .tinybtn').forEach((el) => {
      el.addEventListener("click", () => {
        const section = el.closest("section, header, footer");
        track(el.matches(".tinybtn") ? "ask_ai_click" : "cta_click", {
          cta_text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          cta_location: section ? (section.id || section.className.split(" ")[0]) : "page",
          link_url: el.getAttribute("href") || "",
        });
      });
    });

    /* Form funnel: start, then lead on a valid submit. */
    if (form) {
      let started = false;
      form.addEventListener("focusin", () => { if (!started) { started = true; track("form_start", { form_id: "contact" }); } });
      form.addEventListener("arra:lead", () => track("generate_lead", { form_id: "contact", ...Object.fromEntries(UTM_KEYS.map((k) => [k, store?.getItem(k) || ""])) }));
    }

    /* FAQ engagement. */
    document.querySelectorAll(".qa__q").forEach((q) => {
      q.addEventListener("click", () => {
        if (q.getAttribute("aria-expanded") !== "true") track("faq_open", { question: q.textContent.trim().slice(0, 80) });
      });
    });
  });
})();
