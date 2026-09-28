const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Neon (and most managed Postgres) require TLS; rejectUnauthorized:false matches
// Neon's own connection examples since it uses a publicly-trusted cert chain
// that the default Node CA bundle doesn't always resolve in serverless runtimes.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = { pool };
