document.documentElement.classList.remove("no-js");

/* ---------- Preloader: curtain reveal with a running counter ---------- */
(function preloader() {
  const pre = document.querySelector(".preloader");
  if (!pre) return;
  const mark = pre.querySelector(".preloader__mark");
  const label = pre.querySelector(".preloader__label");
  const digits = pre.querySelector(".preloader__count-digits");
  const panelL = pre.querySelector(".preloader__panel--l");
  const panelR = pre.querySelector(".preloader__panel--r");

  let progress = 0;
  gsap.to(mark, { opacity: 1, duration: 0.6, ease: "power2.out" });
  gsap.to(label, { opacity: 1, duration: 0.6, delay: 0.15, ease: "power2.out" });

  const timer = setInterval(() => {
    progress += Math.random() * 16;
    if (progress >= 100) {
      progress = 100;
      clearInterval(timer);
      finish();
    }
    digits.textContent = Math.floor(progress);
  }, 130);

  function finish() {
    const tl = gsap.timeline({
      delay: 0.2,
      onComplete: () => {
        pre.style.display = "none";
        document.body.classList.add("is-ready");
        window.dispatchEvent(new Event("dspace:ready"));
      }
    });
    tl.to(pre.querySelector(".preloader__center"), {
      opacity: 0,
      y: -16,
      duration: 0.45,
      ease: "power2.in"
    })
      .to(panelL, { xPercent: -100, duration: 0.85, ease: "power4.inOut" }, 0.05)
      .to(panelR, { xPercent: 100, duration: 0.85, ease: "power4.inOut" }, 0.05);
  }
})();

/* ---------- Smooth scroll (Lenis + ScrollTrigger) ---------- */
let lenis;
(function smoothScroll() {
  if (window.matchMedia("(max-width: 860px)").matches || !window.Lenis) return;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
})();

/* ---------- Nav scroll state ---------- */
(function navScroll() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* ---------- Mobile menu ---------- */
(function mobileMenu() {
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.querySelector(".mobile-menu");
  if (!toggle || !menu) return;
  const links = menu.querySelectorAll("a");
  const open = () => {
    menu.classList.add("is-open");
    toggle.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    menu.classList.remove("is-open");
    toggle.classList.remove("is-open");
    document.body.style.overflow = "";
  };
  toggle.addEventListener("click", () => {
    menu.classList.contains("is-open") ? close() : open();
  });
  links.forEach((a) => a.addEventListener("click", close));
})();

/* ---------- Custom cursor ---------- */
(function cursor() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const ring = document.querySelector(".cursor-ring");
  if (!ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0, seeded = false;
  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!seeded) { rx = mx; ry = my; seeded = true; }
  });

  const loop = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.left = rx + "px";
    ring.style.top = ry + "px";
    requestAnimationFrame(loop);
  };
  loop();

  // Media elements get the filled "View" label; plain links/buttons just outline.
  document.querySelectorAll(".p-card, .pillar, .loc-panel, .split__panel, .team-card__media").forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("is-media"));
    el.addEventListener("mouseleave", () => ring.classList.remove("is-media"));
  });

  document.querySelectorAll("a, button").forEach((el) => {
    if (el.closest(".p-card, .pillar, .loc-panel, .split__panel")) return;
    el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
    el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
  });
})();

/* ---------- Footer year ---------- */
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

/* ---------- Active nav link ---------- */
(function activeLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__links a, .mobile-menu__links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("is-active");
    }
  });
})();

/* ---------- WhatsApp float (generic links only; property-detail.js sets its own agent links) ---------- */
(function whatsapp() {
  const els = document.querySelectorAll("[data-whatsapp]");
  if (!els.length) return;
  const number = (typeof SITE_SETTINGS !== "undefined" && SITE_SETTINGS.contact && SITE_SETTINGS.contact.whatsapp) || "971501234567";
  const msg = encodeURIComponent("Hello DSPACE, I'd like to enquire about a property.");
  els.forEach((el) => { el.href = `https://wa.me/${number}?text=${msg}`; });
})();

/* ---------- Testimonial slider ---------- */
(function testimonials() {
  const wrap = document.querySelector("[data-testi]");
  if (!wrap) return;
  const slides = wrap.querySelectorAll(".testi");
  const dots = wrap.querySelectorAll(".testi__dot");
  let i = 0;
  const show = (n) => {
    slides.forEach((s, idx) => s.classList.toggle("is-active", idx === n));
    dots.forEach((d, idx) => d.classList.toggle("is-active", idx === n));
    i = n;
  };
  dots.forEach((d, idx) => d.addEventListener("click", () => show(idx)));
  setInterval(() => show((i + 1) % slides.length), 6000);
})();
