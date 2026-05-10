/**
 * CAI Platform — Dist builder
 * Regenerates packages/platform/dist assets from packages/platform/src.
 *
 * Usage: node scripts/build-platform.js (from the repo root)
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const platformRoot = resolve(repoRoot, "packages/platform");
const srcRoot = resolve(platformRoot, "src");
const distRoot = resolve(platformRoot, "dist");

const cssLayers = [
  "components/_components.css",
];

mkdirSync(distRoot, { recursive: true });

const header = readFileSync(resolve(srcRoot, "index.css"), "utf-8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("@import "))
  .join("\n")
  .trimEnd();

const css = [
  header,
  ...cssLayers.map((relativePath) => readFileSync(resolve(srcRoot, relativePath), "utf-8")),
].join("\n\n");

writeFileSync(resolve(distRoot, "platform.css"), `${css}\n`, "utf-8");
writeFileSync(
  resolve(distRoot, "platform.js"),
  readFileSync(resolve(srcRoot, "platform.js"), "utf-8"),
  "utf-8",
);

console.log(`✓ Platform CSS built → ${resolve(distRoot, "platform.css")}`);
console.log(`✓ Platform JS synced → ${resolve(distRoot, "platform.js")}`);