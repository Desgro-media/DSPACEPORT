window.addEventListener("dspace:ready", initAnimations);
if (document.body.classList.contains("is-ready")) initAnimations();

function initAnimations() {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Hero entrance */
  const heroTl = gsap.timeline({ defaults: { ease: "power3.out", duration: 1.1 } });
  if (document.querySelector(".hero")) {
    heroTl
      .to(".hero__eyebrow", { opacity: 1, y: 0, duration: 0.8 }, 0.15)
      .to(".hero__title", { opacity: 1, y: 0 }, 0.28)
      .to(".hero__sub", { opacity: 1, y: 0 }, 0.5)
      .to(".hero__bottom", { opacity: 1, y: 0 }, 0.65);
  } else if (document.querySelector(".page-hero")) {
    heroTl
      .to(".page-hero .eyebrow", { opacity: 1, y: 0 }, 0.1)
      .to(".page-hero__content h1", { opacity: 1, y: 0 }, 0.22)
      .to(".page-hero__content .body-lg", { opacity: 1, y: 0 }, 0.4);
  }

  gsap.set(".hero__eyebrow, .hero__title, .hero__sub, .hero__bottom, .page-hero .eyebrow, .page-hero__content h1, .page-hero__content .body-lg", { opacity: 0, y: 28 });
  heroTl.play();

  /* Nav fade in */
  gsap.fromTo(".nav", { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.2 });

  /* Generic scroll reveals */
  gsap.utils.toArray(".js-fade-up").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  gsap.utils.toArray(".js-fade").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      duration: 1.1,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" }
    });
  });

  gsap.utils.toArray(".js-scale").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      scale: 1,
      duration: 1.3,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });

  gsap.utils.toArray(".js-stagger").forEach((wrap) => {
    gsap.to(wrap.children, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.1,
      scrollTrigger: { trigger: wrap, start: "top 85%" }
    });
  });

  /* Counters */
  gsap.utils.toArray("[data-count]").forEach((el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    const decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
    const counter = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: target,
          duration: 2,
          ease: "power2.out",
          onUpdate: () => { el.textContent = counter.val.toFixed(decimals); }
        });
      }
    });
  });

  /* Hero media parallax */
  if (!reduce) {
    gsap.utils.toArray(".hero__media img, .page-hero__media img").forEach((img) => {
      gsap.to(img, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: img.closest(".hero, .page-hero"), start: "top top", end: "bottom top", scrub: true }
      });
    });
  }

  ScrollTrigger.refresh();
}
