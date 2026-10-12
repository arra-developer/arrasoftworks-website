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

  if (enabled) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID);
  }

  const track = (name, params = {}) => {
    if (enabled) gtag("event", name, params);
    else console.debug("[analytics]", name, params);
  };

  /* Campaign attribution: keep UTM params for the session and send them with the form. */
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const params = new URLSearchParams(location.search);
  const store = (() => { try { return sessionStorage; } catch { return null; } })();
  UTM_KEYS.forEach((k) => { if (params.get(k) && store) store.setItem(k, params.get(k)); });
  if (store && !store.getItem("landing_page")) store.setItem("landing_page", location.pathname + location.search);
  if (store && !store.getItem("referrer")) store.setItem("referrer", document.referrer || "direct");

  document.addEventListener("DOMContentLoaded", () => {
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
