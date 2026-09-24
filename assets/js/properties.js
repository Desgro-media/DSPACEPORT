function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function propertyCardHTML(p) {
  const id = encodeURIComponent(p.id);
  return `
  <a href="property-detail.html?id=${id}" class="p-card js-fade-up" data-country="${escapeHtml(p.country)}" data-type="${escapeHtml(p.type)}">
    <div class="p-card__media">
      <img src="${escapeHtml(p.cover)}" alt="${escapeHtml(p.name)}" loading="lazy" />
      <span class="p-card__tag">${escapeHtml(p.tag)}</span>
      <div class="p-card__price">
        <span class="amount">${escapeHtml(p.price)}</span>
        <span class="body-sm muted-dark">${escapeHtml(p.priceSub)}</span>
      </div>
    </div>
    <div class="p-card__body">
      <div>
        <h3 class="p-card__name h-sm">${escapeHtml(p.name)}</h3>
        <span class="p-card__loc">${escapeHtml(p.city)}</span>
      </div>
    </div>
    <div class="p-card__specs">
      <span>${escapeHtml(p.beds)} Beds</span>
      <span>${escapeHtml(p.baths)} Baths</span>
      <span>${escapeHtml(p.area)}</span>
    </div>
  </a>`;
}

(function renderPropertiesPage() {
  const grid = document.getElementById("propertiesGrid");
  if (!grid) return;

  const countEl = document.getElementById("propertiesCount");
  const countryBtns = document.querySelectorAll("[data-filter-country]");
  const typeBtns = document.querySelectorAll("[data-filter-type]");

  let country = "All";
  let type = "All";

  function paint() {
    const list = PROPERTIES.filter((p) => {
      return (country === "All" || p.country === country) && (type === "All" || p.type === type);
    });
    grid.style.opacity = 0;
    setTimeout(() => {
      grid.innerHTML = list.map(propertyCardHTML).join("");
      if (countEl) countEl.textContent = `${list.length} Properties`;
      grid.style.opacity = 1;
      grid.querySelectorAll(".p-card").forEach((el) => el.classList.add("js-fade-up"));
      if (window.gsap) {
        gsap.to(grid.querySelectorAll(".js-fade-up"), { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: "power3.out" });
      } else {
        grid.querySelectorAll(".js-fade-up").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
      }
    }, 180);
  }

  grid.style.transition = "opacity .25s ease";

  countryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      countryBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      country = btn.getAttribute("data-filter-country");
      paint();
    });
  });

  typeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      type = btn.getAttribute("data-filter-type");
      paint();
    });
  });

  paint();
})();

/* ---------- Featured properties (homepage) ---------- */
(function renderFeatured() {
  const grid = document.getElementById("featuredGrid");
  if (!grid) return;
  const featured = PROPERTIES.filter((p) => p.tag === "Featured" || p.tag === "Flagship").slice(0, 3);
  grid.innerHTML = featured.map(propertyCardHTML).join("");
})();
