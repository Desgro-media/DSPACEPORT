const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const IMAGES_ROOT = path.join(__dirname, "..", "assets", "images");

const ALLOWED_CATEGORIES = new Set([
  "properties",
  "interiors",
  "hero",
  "about",
  "locations",
  "services",
  "values",
  "icons",
  "uploads"
]);

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"]);
const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/gif": ".gif"
};

function sanitizeCategory(raw) {
  const c = String(raw || "uploads").toLowerCase().replace(/[^a-z]/g, "");
  return ALLOWED_CATEGORIES.has(c) ? c : "uploads";
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const category = sanitizeCategory(req.query.category || req.body.category);
    const dir = path.join(IMAGES_ROOT, category);
    fs.mkdirSync(dir, { recursive: true });
    req._uploadCategory = category;
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".jpg";
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "image";
    const unique = crypto.randomBytes(4).toString("hex");
    cb(null, `${base}-${Date.now()}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WebP, GIF or SVG images are allowed"));
    }
    cb(null, true);
  }
});

module.exports = { upload, sanitizeCategory };
