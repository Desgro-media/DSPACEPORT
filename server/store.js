const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

let cache = null;
let writeChain = Promise.resolve();

function load() {
  if (!cache) {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    cache = JSON.parse(raw);
  }
  return cache;
}

function getData() {
  return load();
}

// Serializes writes so concurrent admin requests can't clobber each other,
// and writes to a temp file + rename so a crash mid-write can't corrupt db.json.
function save(mutator) {
  writeChain = writeChain.then(() => {
    const data = load();
    mutator(data);
    const tmpPath = DB_PATH + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpPath, DB_PATH);
    cache = data;
    return data;
  });
  return writeChain;
}

module.exports = { getData, save };
