// Stamps public/sw.js's CACHE_NAME with the current Next.js build ID so every
// deploy gets a distinct cache name. Without this, self.__BUILD_HASH is never
// set by anything, so CACHE_NAME stays "telemon-vlatest" forever — the service
// worker never invalidates its cache across deploys, serving stale JS chunks
// alongside fresh HTML and causing mismatched/blank UI after a deploy.
const fs = require("fs");
const path = require("path");

const buildIdPath = path.join(__dirname, "..", ".next", "BUILD_ID");
const swPath = path.join(__dirname, "..", "public", "sw.js");

const buildId = fs.readFileSync(buildIdPath, "utf8").trim();
const sw = fs.readFileSync(swPath, "utf8");

const stamped = sw.replace(
  /const CACHE_NAME = `telemon-v\$\{self\.__BUILD_HASH \|\| 'latest'\}`;/,
  `const CACHE_NAME = \`telemon-v${buildId}\`;`,
);

if (stamped === sw) {
  throw new Error("stamp-sw-buildhash: CACHE_NAME pattern not found in public/sw.js — refusing to leave it unstamped");
}

fs.writeFileSync(swPath, stamped);
console.log(`stamp-sw-buildhash: CACHE_NAME -> telemon-v${buildId}`);
