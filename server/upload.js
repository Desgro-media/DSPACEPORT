const crypto = require("crypto");
const multer = require("multer");
const { put } = require("@vercel/blob");

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

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/gif": ".gif"
};
const ALLOWED_MIME = new Set(Object.keys(EXT_BY_MIME));

// Vercel Functions cap request bodies at 4.5MB regardless of this limit, so this
// stays comfortably under that (leaving room for multipart headers/boundaries)
// and fails with a clear message instead of an opaque platform-level 413.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function sanitizeCategory(raw) {
  const c = String(raw || "uploads").toLowerCase().replace(/[^a-z]/g, "");
  return ALLOWED_CATEGORIES.has(c) ? c : "uploads";
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WebP, GIF or SVG images are allowed"));
    }
    cb(null, true);
  }
});

function buildKey(category, originalFilename, mimeType) {
  const ext = EXT_BY_MIME[mimeType] || ".jpg";
  const base = String(originalFilename || "image")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "image";
  const unique = crypto.randomBytes(4).toString("hex");
  return `${category}/${base}-${Date.now()}-${unique}${ext}`;
}

async function uploadImageBuffer({ category, buffer, filename, contentType }) {
  const key = buildKey(category, filename, contentType);
  const blob = await put(key, buffer, { access: "public", contentType, addRandomSuffix: false });
  return blob.url;
}

module.exports = { upload, sanitizeCategory, uploadImageBuffer, MAX_UPLOAD_BYTES };
