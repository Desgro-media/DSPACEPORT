const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const cookie = require("cookie");
const { pool } = require("./db");

const SECRET_PATH = path.join(__dirname, ".session-secret");
const COOKIE_NAME = "dspace.sid";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours

// A hash of a password nobody has, so a lookup for a nonexistent username still
// runs bcrypt.compare and takes the same time as a real one (no user-enumeration
// timing leak via "unknown username" returning instantly).
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeOFVMlYVc9cVqYs5Q9L3v3n0v3l3q3l3q.";

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.VERCEL) {
    throw new Error("SESSION_SECRET environment variable is required on Vercel");
  }
  // Local-dev convenience only: Vercel's filesystem is read-only/ephemeral, so
  // this fallback would mint a new secret (invalidating every session) on every
  // cold start there — hence it's gated to non-Vercel environments above.
  if (fs.existsSync(SECRET_PATH)) return fs.readFileSync(SECRET_PATH, "utf8").trim();
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(SECRET_PATH, secret, "utf8");
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function createSessionCookie(username) {
  const payload = base64url(JSON.stringify({ u: username, exp: Date.now() + SESSION_MAX_AGE_MS }));
  const token = `${payload}.${sign(payload)}`;
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/"
  });
}

function clearSessionCookie() {
  return cookie.serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

function readSession(req) {
  const raw = cookie.parse(req.headers.cookie || "")[COOKIE_NAME];
  if (!raw) return null;
  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex < 0) return null;
  const payload = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!session.exp || Date.now() > session.exp) return null;
  return session;
}

// SHA-256 first so both sides are always a fixed 32-byte digest — timingSafeEqual
// requires equal-length buffers, and an arbitrary-length username (attacker input)
// would otherwise throw instead of just failing the check.
function timingSafeStringEqual(a, b) {
  const digestA = crypto.createHash("sha256").update(String(a)).digest();
  const digestB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

async function verifyCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const { rows } = await pool.query(
    "SELECT username, password_hash FROM admin_credentials WHERE username = $1",
    [username]
  );
  if (!rows.length) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  const userOk = timingSafeStringEqual(username, rows[0].username);
  const passOk = await bcrypt.compare(password, rows[0].password_hash);
  return userOk && passOk;
}

function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  req.adminUsername = session.u;
  next();
}

module.exports = {
  verifyCredentials,
  requireAuth,
  createSessionCookie,
  clearSessionCookie,
  readSession,
  COOKIE_NAME
};
