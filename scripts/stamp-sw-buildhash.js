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
const regex = new RegExp('const CACHE_NAME = ' + String.fromCharCode(96) + 'telemon-v\\$\\{self\\.__BUILD_HASH \\|\\| \\x27latest\\x27\\}' + String.fromCharCode(96));
const replacement = 'const CACHE_NAME = ' + String.fromCharCode(96) + 'telemon-v' + buildId + String.fromCharCode(96);
const stamped = sw.replace(regex, replacement);

if (stamped === sw) {
  console.warn("stamp-sw-buildhash: CACHE_NAME pattern not found — could not stamp");
}

fs.writeFileSync(swPath, stamped);
console.log("stamp-sw-buildhash: CACHE_NAME -> telemon-v" + buildId);
