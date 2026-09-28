const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Neon (and most managed Postgres) require TLS; rejectUnauthorized:false matches
// Neon's own connection examples since it uses a publicly-trusted cert chain
// that the default Node CA bundle doesn't always resolve in serverless runtimes.
// Hard timeouts so a stalled connection or query fails fast with a clear
// Postgres/pg error instead of silently hanging until Vercel's own function
// timeout kills the request with an opaque 504.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
  statement_timeout: 8000,
  query_timeout: 8000
});

module.exports = { pool };
