const fs = require("fs");
const path = require("path");

const buildIdPath = path.join(__dirname, "..", ".next", "BUILD_ID");
const swPath = path.join(__dirname, "..", "public", "sw.js");

let buildId;
try {
  buildId = fs.readFileSync(buildIdPath, "utf8").trim();
} catch {
  console.warn("stamp-sw-buildhash: BUILD_ID not found — skipping");
  buildId = "latest";
}

const sw = fs.readFileSync(swPath, "utf8");
// Updated regex to match the current format in sw.js
const regex = /const CACHE_NAME = `telemon-v[a-zA-Z0-9_-]+`;/;
const replacement = `const CACHE_NAME = \`telemon-v${buildId}\`;`;

if (!sw.match(regex)) {
  console.warn("stamp-sw-buildhash: CACHE_NAME pattern not found — could not stamp");
} else {
  const stamped = sw.replace(regex, replacement);
  fs.writeFileSync(swPath, stamped);
  console.log("stamp-sw-buildhash: CACHE_NAME -> telemon-v" + buildId);
}