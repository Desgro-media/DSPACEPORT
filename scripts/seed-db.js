// One-time setup script: creates the tables this app needs and seeds them if
// they're empty. Safe to re-run — it only inserts when a table has no rows.
//
// Usage: node scripts/seed-db.js
// Requires DATABASE_URL (and, to seed a non-default admin password,
// ADMIN_USERNAME + ADMIN_PASSWORD_HASH) in the environment or a local .env.

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool } = require("../server/db");

const DEFAULT_ADMIN_USERNAME = "dspaceadmin";
const DEFAULT_ADMIN_PASSWORD_HASH = "$2a$12$7jss2OVlqQOEdn1fKMBu/uLJdn..fRvQU7OOUc4pZRb0D90dcBrQ6"; // "desgromedia"

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_data (
      id smallint PRIMARY KEY DEFAULT 1,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      username text PRIMARY KEY,
      password_hash text NOT NULL
    )
  `);

  const { rows: siteRows } = await pool.query("SELECT 1 FROM site_data WHERE id = 1");
  if (!siteRows.length) {
    const seedPath = path.join(__dirname, "..", "data", "db.json");
    const seedData = JSON.parse(fs.readFileSync(seedPath, "utf8"));
    await pool.query("INSERT INTO site_data (id, data) VALUES (1, $1)", [seedData]);
    console.log("Seeded site_data from data/db.json");
  } else {
    console.log("site_data already has a row, skipping seed");
  }

  const { rows: adminRows } = await pool.query("SELECT 1 FROM admin_credentials LIMIT 1");
  if (!adminRows.length) {
    const username = process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH;
    await pool.query(
      "INSERT INTO admin_credentials (username, password_hash) VALUES ($1, $2)",
      [username, passwordHash]
    );
    console.log(`Seeded admin_credentials for username "${username}"`);
  } else {
    console.log("admin_credentials already has a row, skipping seed");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
