const path = require("path");
const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");

const store = require("./store");
const { upload, sanitizeCategory } = require("./upload");
const { getSessionSecret, verifyCredentials, requireAuth, ADMIN_USERNAME } = require("./auth");

const ROOT = path.join(__dirname, "..");
const ADMIN_DIR = path.join(ROOT, "admin");
const PORT = process.env.PORT || 3000;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({ limit: "2mb" }));

app.use(
  session({
    name: "dspace.sid",
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8 // 8 hours
    }
  })
);

// Lightweight CSRF guard: browsers cannot attach this custom header from a
// cross-site <form> submission or plain cross-origin fetch, so requiring it
// on every state-changing admin call blocks simple CSRF without a token flow.
function requireFetchHeader(req, res, next) {
  if (req.get("X-Requested-With") !== "dspace-admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/* ---------------------------------------------------------------------- */
/* Dynamic, DB-backed replacements for the static data scripts.            */
/* Registered before express.static so they always win over any file on   */
/* disk at the same path.                                                  */
/* ---------------------------------------------------------------------- */

app.get("/assets/js/properties-data.js", (req, res) => {
  const { properties } = store.getData();
  res.type("application/javascript").send(
    `const PROPERTIES = ${JSON.stringify(properties, null, 2)};\n\n` +
      `if (typeof module !== "undefined") {\n  module.exports = PROPERTIES;\n}\n`
  );
});

app.get("/assets/js/site-settings.js", (req, res) => {
  const { settings, team } = store.getData();
  res.type("application/javascript").send(
    `const SITE_SETTINGS = ${JSON.stringify(settings, null, 2)};\n` +
      `const TEAM = ${JSON.stringify(team, null, 2)};\n`
  );
});

/* ---------------------------------------------------------------------- */
/* Auth                                                                     */
/* ---------------------------------------------------------------------- */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!verifyCredentials(username, password)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Login failed" });
    req.session.isAdmin = true;
    req.session.username = ADMIN_USERNAME;
    res.json({ ok: true, username: ADMIN_USERNAME });
  });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("dspace.sid");
    res.json({ ok: true });
  });
});

app.get("/api/admin/me", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  res.json({ authenticated: false });
});

/* ---------------------------------------------------------------------- */
/* Public read API (used by the storefront pages)                          */
/* ---------------------------------------------------------------------- */

app.get("/api/properties", (req, res) => {
  res.json(store.getData().properties);
});

app.get("/api/properties/:id", (req, res) => {
  const p = store.getData().properties.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

app.get("/api/settings", (req, res) => {
  res.json(store.getData().settings);
});

app.get("/api/team", (req, res) => {
  res.json(store.getData().team);
});

/* ---------------------------------------------------------------------- */
/* Admin write API                                                         */
/* ---------------------------------------------------------------------- */

const adminApi = express.Router();
adminApi.use(requireAuth);
adminApi.use(requireFetchHeader);

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function uniqueId(base, existingIds) {
  let id = base || "item";
  let n = 2;
  while (existingIds.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function asStringArray(v) {
  if (Array.isArray(v)) return v.map((s) => String(s)).filter((s) => s.trim().length);
  if (typeof v === "string") return v.split("\n").map((s) => s.trim()).filter(Boolean);
  return [];
}

function sanitizeProperty(input, existing) {
  const p = existing ? { ...existing } : {};
  const fields = [
    "name", "tag", "status", "type", "country", "countryLabel", "city",
    "price", "priceSub", "area", "plot", "year", "cover", "summary"
  ];
  for (const f of fields) {
    if (input[f] !== undefined) p[f] = String(input[f]);
  }
  if (input.beds !== undefined) p.beds = Number(input.beds) || 0;
  if (input.baths !== undefined) p.baths = Number(input.baths) || 0;
  if (input.gallery !== undefined) p.gallery = asStringArray(input.gallery);
  if (input.description !== undefined) p.description = asStringArray(input.description);
  if (input.features !== undefined) p.features = asStringArray(input.features);
  if (input.agent !== undefined) {
    p.agent = {
      name: String((input.agent && input.agent.name) || (existing && existing.agent && existing.agent.name) || ""),
      role: String((input.agent && input.agent.role) || (existing && existing.agent && existing.agent.role) || ""),
      phone: String((input.agent && input.agent.phone) || (existing && existing.agent && existing.agent.phone) || ""),
      email: String((input.agent && input.agent.email) || (existing && existing.agent && existing.agent.email) || "")
    };
  }
  if (!p.gallery) p.gallery = p.cover ? [p.cover] : [];
  if (!p.description) p.description = [];
  if (!p.features) p.features = [];
  if (!p.agent) p.agent = { name: "", role: "", phone: "", email: "" };
  return p;
}

adminApi.post("/properties", async (req, res) => {
  const input = req.body || {};
  if (!input.name || !String(input.name).trim()) {
    return res.status(400).json({ error: "Property name is required" });
  }
  const property = sanitizeProperty(input, null);
  const data = await store.save((d) => {
    const existingIds = new Set(d.properties.map((p) => p.id));
    property.id = uniqueId(slugify(input.name), existingIds);
    d.properties.push(property);
  });
  res.status(201).json(data.properties.find((p) => p.id === property.id));
});

adminApi.put("/properties/:id", async (req, res) => {
  const { id } = req.params;
  const data0 = store.getData();
  const existing = data0.properties.find((p) => p.id === id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = sanitizeProperty(req.body || {}, existing);
  updated.id = existing.id;
  const data = await store.save((d) => {
    const idx = d.properties.findIndex((p) => p.id === id);
    d.properties[idx] = updated;
  });
  res.json(data.properties.find((p) => p.id === id));
});

adminApi.delete("/properties/:id", async (req, res) => {
  const { id } = req.params;
  const exists = store.getData().properties.some((p) => p.id === id);
  if (!exists) return res.status(404).json({ error: "Not found" });
  await store.save((d) => {
    d.properties = d.properties.filter((p) => p.id !== id);
  });
  res.json({ ok: true });
});

adminApi.put("/settings", async (req, res) => {
  const input = req.body || {};
  const data = await store.save((d) => {
    d.settings = {
      brand: { ...d.settings.brand, ...(input.brand || {}) },
      contact: { ...d.settings.contact, ...(input.contact || {}) },
      offices: Array.isArray(input.offices) ? input.offices : d.settings.offices,
      heroImages: { ...d.settings.heroImages, ...(input.heroImages || {}) }
    };
  });
  res.json(data.settings);
});

adminApi.post("/team", async (req, res) => {
  const input = req.body || {};
  if (!input.name || !String(input.name).trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const member = {
    name: String(input.name),
    role: String(input.role || ""),
    photo: String(input.photo || "")
  };
  const data = await store.save((d) => {
    const existingIds = new Set(d.team.map((t) => t.id));
    member.id = uniqueId(slugify(input.name), existingIds);
    d.team.push(member);
  });
  res.status(201).json(data.team.find((t) => t.id === member.id));
});

adminApi.put("/team/:id", async (req, res) => {
  const { id } = req.params;
  const exists = store.getData().team.some((t) => t.id === id);
  if (!exists) return res.status(404).json({ error: "Not found" });
  const input = req.body || {};
  const data = await store.save((d) => {
    const idx = d.team.findIndex((t) => t.id === id);
    const existing = d.team[idx];
    d.team[idx] = {
      id,
      name: input.name !== undefined ? String(input.name) : existing.name,
      role: input.role !== undefined ? String(input.role) : existing.role,
      photo: input.photo !== undefined ? String(input.photo) : existing.photo
    };
  });
  res.json(data.team.find((t) => t.id === id));
});

adminApi.delete("/team/:id", async (req, res) => {
  const { id } = req.params;
  const exists = store.getData().team.some((t) => t.id === id);
  if (!exists) return res.status(404).json({ error: "Not found" });
  await store.save((d) => {
    d.team = d.team.filter((t) => t.id !== id);
  });
  res.json({ ok: true });
});

adminApi.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const category = req._uploadCategory || sanitizeCategory(req.query.category);
    const url = `assets/images/${category}/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

app.use("/api/admin", adminApi);

/* ---------------------------------------------------------------------- */
/* Static assets & pages                                                   */
/* ---------------------------------------------------------------------- */

app.use("/assets", express.static(path.join(ROOT, "assets")));

// no-store on admin assets: this panel is edited far more often than it's
// requested, and a stale cached admin.js after a fix is a worse failure mode
// than the tiny extra cost of refetching it every load.
app.use("/admin", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.get("/admin", (req, res) => res.sendFile(path.join(ADMIN_DIR, "index.html")));
app.use("/admin", express.static(ADMIN_DIR));

const PAGES = ["index.html", "about.html", "contact.html", "properties.html", "property-detail.html"];
for (const page of PAGES) {
  app.get(`/${page}`, (req, res) => res.sendFile(path.join(ROOT, page)));
}
app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));

app.use((req, res) => res.status(404).send("Not found"));

app.listen(PORT, () => {
  console.log(`DSPACE server running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin`);
});
