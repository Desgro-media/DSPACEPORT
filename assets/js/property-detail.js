(function renderPropertyDetail() {
  const root = document.getElementById("propertyDetail");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const p = PROPERTIES.find((x) => x.id === id) || PROPERTIES[0];

  document.title = `${p.name} — DSPACE | Global Real Estate`;

  document.getElementById("pdBreadcrumbName").textContent = p.name;
  document.getElementById("pdTag").textContent = p.tag;
  document.getElementById("pdName").textContent = p.name;
  document.getElementById("pdLocation").textContent = p.city + ", " + p.countryLabel;
  document.getElementById("pdPrice").textContent = p.price;
  document.getElementById("pdPriceSub").textContent = p.priceSub;
  document.getElementById("pdSummary").textContent = p.summary;

  const gallery = p.gallery && p.gallery.length ? p.gallery : [p.cover];
  document.getElementById("galMain").src = gallery[0];
  const side = document.getElementById("galSide");
  side.innerHTML = "";
  for (let i = 1; i < 3; i++) {
    const src = gallery[i] || gallery[0];
    const div = document.createElement("div");
    div.innerHTML = `<img src="${src}" alt="${p.name} interior" loading="lazy" />`;
    side.appendChild(div);
  }
  document.getElementById("galCount").textContent = `01 / ${String(gallery.length).padStart(2, "0")}`;

  const specs = [
    { label: "Type", value: p.type },
    { label: "Status", value: p.status },
    { label: "Bedrooms", value: p.beds },
    { label: "Bathrooms", value: p.baths },
    { label: "Interior", value: p.area },
    { label: "Plot Size", value: p.plot },
    { label: "Year Built", value: p.year },
    { label: "Country", value: p.countryLabel }
  ];
  document.getElementById("pdSpecs").innerHTML = specs.map((s) => `
    <div class="spec-cell">
      <div class="spec-cell__label">${s.label}</div>
      <div class="spec-cell__value">${s.value}</div>
    </div>`).join("");

  document.getElementById("pdDescription").innerHTML = p.description.map((para) => `<p class="body-lg muted-dark" style="margin-bottom:20px;">${para}</p>`).join("");

  document.getElementById("pdFeatures").innerHTML = p.features.map((f) => `
    <div class="flex gap-sm" style="align-items:center; padding:14px 0; border-bottom:1px solid var(--line-on-dark);">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8.5L6 12.5L14 3.5" stroke="#b48c53" stroke-width="1.6"/></svg>
      <span class="body-md">${f}</span>
    </div>`).join("");

  document.getElementById("agentName").textContent = p.agent.name;
  document.getElementById("agentRole").textContent = p.agent.role;
  document.getElementById("agentPhone").textContent = p.agent.phone;
  document.getElementById("agentPhone").href = "tel:" + p.agent.phone.replace(/\s+/g, "");
  document.getElementById("agentEmail").textContent = p.agent.email;
  document.getElementById("agentEmail").href = "mailto:" + p.agent.email;
  document.getElementById("agentInitials").textContent = p.agent.name.split(" ").map((n) => n[0]).join("");
  const waMsg = encodeURIComponent(`Hello, I'm interested in ${p.name} (${p.city}). Could you share more details?`);
  const waHref = `https://wa.me/${p.agent.phone.replace(/\D/g, "")}?text=${waMsg}`;
  document.getElementById("agentWhatsapp").href = waHref;
  document.getElementById("pdWhatsapp").href = waHref;

  const inquiryProperty = document.getElementById("inquiryProperty");
  if (inquiryProperty) inquiryProperty.value = p.name;

  const related = PROPERTIES.filter((x) => x.id !== p.id && x.country === p.country).slice(0, 3);
  const fallback = PROPERTIES.filter((x) => x.id !== p.id).slice(0, 3);
  const relatedList = related.length ? related : fallback;
  document.getElementById("relatedGrid").innerHTML = relatedList.map(propertyCardHTML).join("");

  window.dispatchEvent(new Event("dspace:detail-ready"));
})();
