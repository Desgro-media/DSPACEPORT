/* Applies SITE_SETTINGS / TEAM (from the server-generated assets/js/site-settings.js)
   onto elements tagged with data-cms-* attributes, so admin edits show up on every
   page without touching the static HTML again. No-ops gracefully if the globals
   aren't present (e.g. viewing the files without the Node server running). */
(function applySiteContent() {
  if (typeof SITE_SETTINGS === "undefined") return;

  function getPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  document.querySelectorAll("[data-cms-text]").forEach((el) => {
    const val = getPath(SITE_SETTINGS, el.getAttribute("data-cms-text"));
    if (val !== undefined) el.textContent = val;
  });

  document.querySelectorAll("[data-cms-src]").forEach((el) => {
    const val = getPath(SITE_SETTINGS, el.getAttribute("data-cms-src"));
    if (val) el.src = val;
  });

  document.querySelectorAll("[data-cms-href]").forEach((el) => {
    const val = getPath(SITE_SETTINGS, el.getAttribute("data-cms-href"));
    if (val === undefined) return;
    const prefix = el.getAttribute("data-cms-href-prefix") || "";
    el.href = prefix + val;
  });

  // Office cards (contact page) — rebuilt from the offices array so admin can add/remove offices.
  document.querySelectorAll("[data-cms-offices]").forEach((container) => {
    const offices = SITE_SETTINGS.offices || [];
    container.innerHTML = offices.map((o) => `
      <div class="office-card">
        <span class="office-card__flag">${o.countryLabel || ""}</span>
        <h3 class="h-sm">${o.name || ""}</h3>
        <p class="office-card__line body-sm">${o.address || ""}</p>
        <div class="office-card__divider"></div>
        <p class="office-card__line body-sm">${o.hours || ""}</p>
        <p class="office-card__line body-sm">${o.phone || ""}</p>
      </div>`).join("");
  });

  // Google Maps embeds keyed by office index.
  document.querySelectorAll("[data-cms-map]").forEach((iframe) => {
    const idx = Number(iframe.getAttribute("data-cms-map"));
    const office = (SITE_SETTINGS.offices || [])[idx];
    if (office && office.mapQuery) {
      iframe.src = `https://www.google.com/maps?q=${office.mapQuery}&output=embed`;
    }
  });

  // Footer "Offices" column — short labels + the contact email link.
  document.querySelectorAll("[data-cms-footer-offices]").forEach((container) => {
    const emailLink = container.querySelector("[data-cms-email]");
    container.querySelectorAll("span").forEach((s) => s.remove());
    (SITE_SETTINGS.offices || []).forEach((o) => {
      const span = document.createElement("span");
      span.textContent = o.shortLabel || [o.name, o.countryLabel].filter(Boolean).join(" — ");
      container.insertBefore(span, emailLink || null);
    });
    if (emailLink && SITE_SETTINGS.contact && SITE_SETTINGS.contact.email) {
      emailLink.textContent = SITE_SETTINGS.contact.email;
      emailLink.href = "mailto:" + SITE_SETTINGS.contact.email;
    }
  });

  // Team grid (about page) — rebuilt from the team array.
  document.querySelectorAll("[data-cms-team]").forEach((container) => {
    const team = typeof TEAM !== "undefined" ? TEAM : [];
    container.innerHTML = team.map((t) => `
      <div class="team-card">
        <div class="team-card__media"><img src="${t.photo || ""}" alt="${t.name || ""}" loading="lazy" /></div>
        <h3 class="h-sm">${t.name || ""}</h3>
        <span class="team-card__role">${t.role || ""}</span>
      </div>`).join("");
  });

  document.querySelectorAll("[data-cms-instagram-href]").forEach((el) => {
    if (SITE_SETTINGS.contact && SITE_SETTINGS.contact.instagramUrl) el.href = SITE_SETTINGS.contact.instagramUrl;
  });

  document.querySelectorAll("[data-cms-linkedin-href]").forEach((el) => {
    if (SITE_SETTINGS.contact && SITE_SETTINGS.contact.linkedinUrl) el.href = SITE_SETTINGS.contact.linkedinUrl;
  });
})();
