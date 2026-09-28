const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

function sanitizeCategory(raw) {
  const c = String(raw || "uploads").toLowerCase().replace(/[^a-z]/g, "");
  return ALLOWED_CATEGORIES.has(c) ? c : "uploads";
}

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

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

// Returns a short-lived presigned PUT URL so the browser uploads the file
// directly to S3 — Vercel serverless functions cap request bodies at 4.5MB
// (non-configurable), so proxying photo uploads through the function would
// fail on any real listing photo over that size.
async function createPresignedUpload({ category, filename, contentType }) {
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error("Only JPEG, PNG, WebP, GIF or SVG images are allowed");
  }
  const bucket = process.env.AWS_S3_BUCKET;
  const key = buildKey(category, filename, contentType);
  const client = getS3Client();
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 60 }
  );
  const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { uploadUrl, publicUrl };
}

module.exports = { sanitizeCategory, ALLOWED_CATEGORIES, createPresignedUpload };
