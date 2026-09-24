const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const SECRET_PATH = path.join(__dirname, ".session-secret");

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (fs.existsSync(SECRET_PATH)) return fs.readFileSync(SECRET_PATH, "utf8").trim();
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(SECRET_PATH, secret, "utf8");
  return secret;
}

// Defaults can be overridden with ADMIN_USERNAME / ADMIN_PASSWORD_HASH env vars
// (see README) — recommended before deploying anywhere reachable by the public.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "dspaceadmin";
const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  "$2a$12$7jss2OVlqQOEdn1fKMBu/uLJdn..fRvQU7OOUc4pZRb0D90dcBrQ6";

// SHA-256 first so both sides are always a fixed 32-byte digest — timingSafeEqual
// requires equal-length buffers, and an arbitrary-length username (attacker input)
// would otherwise throw instead of just failing the check.
function timingSafeStringEqual(a, b) {
  const digestA = crypto.createHash("sha256").update(String(a)).digest();
  const digestB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function verifyCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const userOk = timingSafeStringEqual(username, ADMIN_USERNAME);
  const passOk = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  return userOk && passOk;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

module.exports = { getSessionSecret, verifyCredentials, requireAuth, ADMIN_USERNAME };
