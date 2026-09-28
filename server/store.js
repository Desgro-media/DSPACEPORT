const { pool } = require("./db");

async function getData() {
  const { rows } = await pool.query("SELECT data FROM site_data WHERE id = 1");
  if (!rows.length) throw new Error("site_data row missing — run the seed script");
  return rows[0].data;
}

// Runs the read-modify-write as one transaction with a row lock so two admins
// saving at the same time (or two overlapping requests to the same serverless
// function) can't clobber each other's changes to the shared JSON blob.
async function save(mutator) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT data FROM site_data WHERE id = 1 FOR UPDATE");
    if (!rows.length) throw new Error("site_data row missing — run the seed script");
    const data = rows[0].data;
    mutator(data);
    await client.query("UPDATE site_data SET data = $1, updated_at = now() WHERE id = 1", [data]);
    await client.query("COMMIT");
    return data;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getData, save };
