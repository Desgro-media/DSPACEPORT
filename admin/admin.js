/* ---------- Shared helpers ---------- */

function resolveSrc(v) {
  if (!v) return "";
  if (/^(https?:)?\/\//.test(v) || v.startsWith("/")) return v;
  return "/" + v;
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function api(path, { method = "GET", body } = {}) {
  const opts = { method, credentials: "same-origin", headers: {} };
  if (method !== "GET") opts.headers["X-Requested-With"] = "dspace-admin";
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function uploadImage(file, category) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`/api/admin/upload?category=${encodeURIComponent(category)}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Requested-With": "dspace-admin" },
    body: fd
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

let toastTimer;
function toast(msg, isError) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("is-error", !!isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

/* ---------- Reusable field components ---------- */

function textField(label, value, placeholder) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const l = document.createElement("label");
  l.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  if (placeholder) input.placeholder = placeholder;
  wrap.appendChild(l);
  wrap.appendChild(input);
  return { el: wrap, getValue: () => input.value.trim(), setValue: (v) => { input.value = v || ""; } };
}

function createImageField({ label, value, category }) {
  const wrap = document.createElement("div");
  wrap.className = "image-field";

  const preview = document.createElement("div");
  preview.className = "image-field__preview";
  const img = document.createElement("img");
  img.alt = "";
  preview.appendChild(img);

  const controls = document.createElement("div");
  controls.className = "image-field__controls";
  const labelEl = document.createElement("div");
  labelEl.className = "image-field__label";
  labelEl.textContent = label;

  const row = document.createElement("div");
  row.className = "image-field__row";
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "assets/images/...";
  const uploadLabel = document.createElement("label");
  uploadLabel.className = "image-field__upload-label";
  uploadLabel.textContent = "Upload…";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  uploadLabel.appendChild(fileInput);
  row.appendChild(textInput);
  row.appendChild(uploadLabel);

  controls.appendChild(labelEl);
  controls.appendChild(row);
  wrap.appendChild(preview);
  wrap.appendChild(controls);

  function setValue(v) {
    textInput.value = v || "";
    img.src = v ? resolveSrc(v) : "";
  }
  setValue(value);

  textInput.addEventListener("input", () => { img.src = textInput.value ? resolveSrc(textInput.value) : ""; });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    uploadLabel.textContent = "Uploading…";
    uploadLabel.appendChild(fileInput);
    try {
      const url = await uploadImage(file, category);
      setValue(url);
    } catch (err) {
      toast(err.message, true);
    } finally {
      uploadLabel.textContent = "Upload…";
      uploadLabel.appendChild(fileInput);
      fileInput.value = "";
    }
  });

  return { el: wrap, getValue: () => textInput.value.trim(), setValue };
}

function createGalleryField(values, category) {
  const wrap = document.createElement("div");
  const labelEl = document.createElement("div");
  labelEl.className = "image-field__label";
  labelEl.textContent = "Gallery Photos";
  wrap.appendChild(labelEl);

  const list = document.createElement("div");
  list.className = "gallery-list";
  wrap.appendChild(list);

  const addRow = document.createElement("label");
  addRow.className = "image-field__upload-label";
  addRow.textContent = "+ Add Photo";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  addRow.appendChild(fileInput);
  wrap.appendChild(addRow);

  let items = (values || []).slice();

  function render() {
    list.innerHTML = "";
    items.forEach((url, idx) => {
      const row = document.createElement("div");
      row.className = "gallery-item";
      const img = document.createElement("img");
      img.src = resolveSrc(url);
      const input = document.createElement("input");
      input.type = "text";
      input.value = url;
      input.addEventListener("input", () => { items[idx] = input.value; img.src = resolveSrc(input.value); });
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "gallery-item__remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => { items.splice(idx, 1); render(); });
      row.appendChild(img);
      row.appendChild(input);
      row.appendChild(removeBtn);
      list.appendChild(row);
    });
  }
  render();

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    addRow.textContent = "Uploading…";
    addRow.appendChild(fileInput);
    try {
      const url = await uploadImage(file, category);
      items.push(url);
      render();
    } catch (err) {
      toast(err.message, true);
    } finally {
      addRow.textContent = "+ Add Photo";
      addRow.appendChild(fileInput);
      fileInput.value = "";
    }
  });

  return { el: wrap, getValue: () => items.slice() };
}

function sectionCard(title) {
  const card = document.createElement("div");
  card.className = "settings-card";
  const h = document.createElement("h3");
  h.textContent = title;
  card.appendChild(h);
  return card;
}

/* ---------- Login page ---------- */

function initLogin() {
  fetch("/api/admin/me", { credentials: "same-origin" })
    .then((r) => r.json())
    .then((d) => { if (d.authenticated) location.href = "/admin"; })
    .catch(() => {});

  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("loginSubmit");
    const errEl = document.getElementById("loginError");
    errEl.hidden = true;
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: {
          username: document.getElementById("username").value,
          password: document.getElementById("password").value
        }
      });
      location.href = "/admin";
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });
}

/* ---------- Dashboard ---------- */

let propertiesCache = [];
let teamCache = [];
let coverField = null;
let galleryField = null;
let teamPhotoField = null;

function renderPropertiesList() {
  const grid = document.getElementById("propertiesList");
  grid.innerHTML = "";
  if (!propertiesCache.length) {
    grid.innerHTML = '<p style="color:var(--a-ivory-muted);">No properties yet — add your first listing.</p>';
    return;
  }
  propertiesCache.forEach((p) => {
    const card = document.createElement("div");
    card.className = "prop-card";
    card.innerHTML = `
      <div class="prop-card__media"><img src="${resolveSrc(p.cover)}" alt="" loading="lazy" /></div>
      <div class="prop-card__body">
        <span class="prop-card__tag">${escapeHtml(p.tag || "")}</span>
        <div class="prop-card__name">${escapeHtml(p.name)}</div>
        <div class="prop-card__loc">${escapeHtml(p.city || "")}</div>
        <div class="prop-card__price">${escapeHtml(p.price || "")}</div>
      </div>
      <div class="prop-card__actions">
        <button class="btn-small" data-edit="${p.id}">Edit</button>
        <button class="btn-danger" data-delete="${p.id}">Delete</button>
      </div>`;
    grid.appendChild(card);
  });
}

function openPropertyModal(property) {
  closeModals();
  const modal = document.getElementById("propertyModal");
  const form = document.getElementById("propertyForm");
  form.reset();
  document.getElementById("propertyModalTitle").textContent = property ? "Edit Property" : "Add Property";
  document.getElementById("pf-id").value = property ? property.id : "";
  document.getElementById("pf-name").value = property?.name || "";
  document.getElementById("pf-tag").value = property?.tag || "";
  document.getElementById("pf-status").value = property?.status || "For Sale";
  document.getElementById("pf-type").value = property?.type || "";
  document.getElementById("pf-country").value = property?.country || "";
  document.getElementById("pf-countryLabel").value = property?.countryLabel || "";
  document.getElementById("pf-city").value = property?.city || "";
  document.getElementById("pf-price").value = property?.price || "";
  document.getElementById("pf-priceSub").value = property?.priceSub || "";
  document.getElementById("pf-beds").value = property?.beds ?? "";
  document.getElementById("pf-baths").value = property?.baths ?? "";
  document.getElementById("pf-area").value = property?.area || "";
  document.getElementById("pf-plot").value = property?.plot || "";
  document.getElementById("pf-year").value = property?.year || "";
  document.getElementById("pf-summary").value = property?.summary || "";
  document.getElementById("pf-description").value = (property?.description || []).join("\n");
  document.getElementById("pf-features").value = (property?.features || []).join("\n");
  document.getElementById("pf-agentName").value = property?.agent?.name || "";
  document.getElementById("pf-agentRole").value = property?.agent?.role || "";
  document.getElementById("pf-agentPhone").value = property?.agent?.phone || "";
  document.getElementById("pf-agentEmail").value = property?.agent?.email || "";

  const coverMount = document.getElementById("pf-cover-field");
  coverMount.innerHTML = "";
  coverField = createImageField({ label: "Cover Photo", value: property?.cover || "", category: "properties" });
  coverMount.appendChild(coverField.el);

  const galleryMount = document.getElementById("pf-gallery-field");
  galleryMount.innerHTML = "";
  galleryField = createGalleryField(property?.gallery || [], "properties");
  galleryMount.appendChild(galleryField.el);

  modal.hidden = false;
}

async function loadProperties() {
  propertiesCache = await fetch("/api/properties", { credentials: "same-origin" }).then((r) => r.json());
  renderPropertiesList();
}

async function deleteProperty(id) {
  if (!confirm("Delete this property? This cannot be undone.")) return;
  try {
    await api(`/api/admin/properties/${id}`, { method: "DELETE" });
    toast("Property deleted");
    await loadProperties();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderTeamList() {
  const grid = document.getElementById("teamList");
  grid.innerHTML = "";
  if (!teamCache.length) {
    grid.innerHTML = '<p style="color:var(--a-ivory-muted);">No team members yet.</p>';
    return;
  }
  teamCache.forEach((t) => {
    const card = document.createElement("div");
    card.className = "team-card-admin";
    card.innerHTML = `
      <div class="team-card-admin__media"><img src="${resolveSrc(t.photo)}" alt="" loading="lazy" /></div>
      <div class="team-card-admin__body">
        <div class="team-card-admin__name">${escapeHtml(t.name)}</div>
        <div class="team-card-admin__role">${escapeHtml(t.role || "")}</div>
      </div>
      <div class="team-card-admin__actions">
        <button class="btn-small" data-edit="${t.id}">Edit</button>
        <button class="btn-danger" data-delete="${t.id}">Delete</button>
      </div>`;
    grid.appendChild(card);
  });
}

function openTeamModal(member) {
  closeModals();
  const modal = document.getElementById("teamModal");
  const form = document.getElementById("teamForm");
  form.reset();
  document.getElementById("teamModalTitle").textContent = member ? "Edit Team Member" : "Add Team Member";
  document.getElementById("tf-id").value = member ? member.id : "";
  document.getElementById("tf-name").value = member?.name || "";
  document.getElementById("tf-role").value = member?.role || "";

  const photoMount = document.getElementById("tf-photo-field");
  photoMount.innerHTML = "";
  teamPhotoField = createImageField({ label: "Photo", value: member?.photo || "", category: "about" });
  photoMount.appendChild(teamPhotoField.el);

  modal.hidden = false;
}

async function loadTeam() {
  teamCache = await fetch("/api/team", { credentials: "same-origin" }).then((r) => r.json());
  renderTeamList();
}

async function deleteTeamMember(id) {
  if (!confirm("Remove this team member?")) return;
  try {
    await api(`/api/admin/team/${id}`, { method: "DELETE" });
    toast("Team member removed");
    await loadTeam();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderSettingsForm(settings) {
  const form = document.getElementById("settingsForm");
  form.innerHTML = "";

  const brandCard = sectionCard("Brand");
  const logoField = createImageField({ label: "Logo", value: settings.brand.logo, category: "icons" });
  const brandNameField = textField("Brand Name", settings.brand.name);
  brandCard.appendChild(logoField.el);
  brandCard.appendChild(brandNameField.el);
  form.appendChild(brandCard);

  const contactCard = sectionCard("Contact");
  const contactGrid = document.createElement("div");
  contactGrid.className = "form-grid";
  const phoneField = textField("Phone / WhatsApp Display", settings.contact.phone, "+971 50 123 4567");
  const waField = textField("WhatsApp Number (digits + country code)", settings.contact.whatsapp, "971501234567");
  const emailField = textField("Email", settings.contact.email);
  const igHandleField = textField("Instagram Handle", settings.contact.instagramHandle);
  const igUrlField = textField("Instagram URL", settings.contact.instagramUrl);
  const liUrlField = textField("LinkedIn URL", settings.contact.linkedinUrl);
  const locField = textField("Locations Short Text (nav)", settings.contact.locationsShort);
  [phoneField, waField, emailField, igHandleField, igUrlField, liUrlField, locField].forEach((f) => contactGrid.appendChild(f.el));
  contactCard.appendChild(contactGrid);
  form.appendChild(contactCard);

  const officesCard = sectionCard("Offices");
  const officesList = document.createElement("div");
  officesCard.appendChild(officesList);
  let offices = (settings.offices || []).map((o) => ({ ...o }));
  let officeGetters = [];

  function renderOffices() {
    officesList.innerHTML = "";
    officeGetters = [];
    offices.forEach((office, idx) => {
      const block = document.createElement("div");
      block.className = "office-block";
      const head = document.createElement("div");
      head.className = "office-block__head";
      const title = document.createElement("span");
      title.textContent = office.name || `Office ${idx + 1}`;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-danger";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => { offices.splice(idx, 1); renderOffices(); });
      head.appendChild(title);
      head.appendChild(removeBtn);
      block.appendChild(head);

      const og = document.createElement("div");
      og.className = "form-grid";
      const f = {
        countryLabel: textField("Country Label", office.countryLabel),
        name: textField("Office Name", office.name),
        address: textField("Address", office.address),
        hours: textField("Hours", office.hours),
        phone: textField("Phone", office.phone),
        shortLabel: textField("Short Label (footer)", office.shortLabel),
        mapQuery: textField("Map Search Query", office.mapQuery, "DIFC,Dubai,UAE")
      };
      Object.values(f).forEach((field) => og.appendChild(field.el));
      block.appendChild(og);
      officesList.appendChild(block);

      officeGetters.push(() => ({
        id: office.id || undefined,
        countryLabel: f.countryLabel.getValue(),
        name: f.name.getValue(),
        address: f.address.getValue(),
        hours: f.hours.getValue(),
        phone: f.phone.getValue(),
        shortLabel: f.shortLabel.getValue(),
        mapQuery: f.mapQuery.getValue()
      }));
    });
  }
  renderOffices();

  const addOfficeBtn = document.createElement("button");
  addOfficeBtn.type = "button";
  addOfficeBtn.className = "btn-outline";
  addOfficeBtn.textContent = "+ Add Office";
  addOfficeBtn.addEventListener("click", () => { offices.push({}); renderOffices(); });
  officesCard.appendChild(addOfficeBtn);
  form.appendChild(officesCard);

  const heroCard = sectionCard("Site Photos");
  const heroLabels = {
    home: "Homepage Hero",
    about: "About Page Hero",
    aboutMeeting: "About Page CTA Banner",
    contact: "Contact Page Hero",
    properties: "Properties Page Hero",
    propertiesCta: "Properties Page CTA Banner",
    ctaHome: "Homepage CTA Banner",
    locationUae: "UAE Location Photo",
    locationIndia: "India Location Photo"
  };
  const heroFields = {};
  Object.keys(heroLabels).forEach((key) => {
    const field = createImageField({ label: heroLabels[key], value: (settings.heroImages || {})[key] || "", category: "hero" });
    heroFields[key] = field;
    heroCard.appendChild(field.el);
  });
  form.appendChild(heroCard);

  form._getPayload = () => ({
    brand: { name: brandNameField.getValue(), logo: logoField.getValue() },
    contact: {
      phone: phoneField.getValue(),
      whatsapp: waField.getValue(),
      email: emailField.getValue(),
      instagramHandle: igHandleField.getValue(),
      instagramUrl: igUrlField.getValue(),
      linkedinUrl: liUrlField.getValue(),
      locationsShort: locField.getValue()
    },
    offices: officeGetters.map((fn) => fn()),
    heroImages: Object.fromEntries(Object.keys(heroLabels).map((k) => [k, heroFields[k].getValue()]))
  });
}

async function loadSettings() {
  const settings = await fetch("/api/settings", { credentials: "same-origin" }).then((r) => r.json());
  renderSettingsForm(settings);
}

function closeModals() {
  document.getElementById("propertyModal").hidden = true;
  document.getElementById("teamModal").hidden = true;
}

function wireNav() {
  document.querySelectorAll(".admin-nav__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav__item").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const view = btn.dataset.view;
      document.querySelectorAll(".admin-view").forEach((v) => { v.hidden = true; });
      document.getElementById(`view-${view}`).hidden = false;
    });
  });
}

function wireModals() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => btn.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModals(); });
  });
}

function wireForms() {
  document.getElementById("addPropertyBtn").addEventListener("click", () => openPropertyModal(null));
  document.getElementById("addTeamBtn").addEventListener("click", () => openTeamModal(null));

  document.getElementById("propertiesList").addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-delete]");
    if (editBtn) openPropertyModal(propertiesCache.find((p) => p.id === editBtn.dataset.edit));
    if (delBtn) deleteProperty(delBtn.dataset.delete);
  });

  document.getElementById("teamList").addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-delete]");
    if (editBtn) openTeamModal(teamCache.find((t) => t.id === editBtn.dataset.edit));
    if (delBtn) deleteTeamMember(delBtn.dataset.delete);
  });

  document.getElementById("propertyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("pf-id").value;
    const payload = {
      name: document.getElementById("pf-name").value.trim(),
      tag: document.getElementById("pf-tag").value.trim(),
      status: document.getElementById("pf-status").value.trim(),
      type: document.getElementById("pf-type").value.trim(),
      country: document.getElementById("pf-country").value.trim(),
      countryLabel: document.getElementById("pf-countryLabel").value.trim(),
      city: document.getElementById("pf-city").value.trim(),
      price: document.getElementById("pf-price").value.trim(),
      priceSub: document.getElementById("pf-priceSub").value.trim(),
      beds: document.getElementById("pf-beds").value,
      baths: document.getElementById("pf-baths").value,
      area: document.getElementById("pf-area").value.trim(),
      plot: document.getElementById("pf-plot").value.trim(),
      year: document.getElementById("pf-year").value.trim(),
      cover: coverField.getValue(),
      gallery: galleryField.getValue(),
      summary: document.getElementById("pf-summary").value.trim(),
      description: document.getElementById("pf-description").value,
      features: document.getElementById("pf-features").value,
      agent: {
        name: document.getElementById("pf-agentName").value.trim(),
        role: document.getElementById("pf-agentRole").value.trim(),
        phone: document.getElementById("pf-agentPhone").value.trim(),
        email: document.getElementById("pf-agentEmail").value.trim()
      }
    };
    try {
      if (id) {
        await api(`/api/admin/properties/${id}`, { method: "PUT", body: payload });
      } else {
        await api("/api/admin/properties", { method: "POST", body: payload });
      }
      closeModals();
      toast("Property saved");
      await loadProperties();
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById("teamForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("tf-id").value;
    const payload = {
      name: document.getElementById("tf-name").value.trim(),
      role: document.getElementById("tf-role").value.trim(),
      photo: teamPhotoField.getValue()
    };
    try {
      if (id) {
        await api(`/api/admin/team/${id}`, { method: "PUT", body: payload });
      } else {
        await api("/api/admin/team", { method: "POST", body: payload });
      }
      closeModals();
      toast("Team member saved");
      await loadTeam();
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
    const form = document.getElementById("settingsForm");
    const payload = form._getPayload();
    try {
      await api("/api/admin/settings", { method: "PUT", body: payload });
      toast("Settings saved");
      await loadSettings();
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch (err) {
      // ignore — redirect regardless
    }
    location.href = "/admin/login.html";
  });
}

async function initDashboard() {
  let me;
  try {
    me = await fetch("/api/admin/me", { credentials: "same-origin" }).then((r) => r.json());
  } catch (err) {
    me = { authenticated: false };
  }
  if (!me.authenticated) {
    location.href = "/admin/login.html";
    return;
  }
  document.getElementById("whoami").textContent = me.username || "";
  document.body.hidden = false;

  wireNav();
  wireModals();
  wireForms();

  await Promise.all([loadProperties(), loadTeam(), loadSettings()]);
}

/* ---------- Bootstrap ---------- */

(function bootstrap() {
  if (document.getElementById("loginForm")) {
    initLogin();
  } else if (document.querySelector(".admin-shell")) {
    initDashboard();
  }
})();
