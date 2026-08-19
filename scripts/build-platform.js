/**
 * CAI Platform — Dist builder
 * Regenerates packages/platform/dist assets from packages/platform/src.
 *
 * Usage: node scripts/build-platform.js (from the repo root)
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const platformRoot = resolve(repoRoot, "packages/platform");
const srcRoot = resolve(platformRoot, "src");
const distRoot = resolve(platformRoot, "dist");

mkdirSync(distRoot, { recursive: true });

/**
 * Recursively inline the local @import graph of a CSS file.
 * src/index.css is the single source of truth for layer order.
 */
function inlineCssImports(filePath, seen = new Set()) {
  if (seen.has(filePath)) return "";
  seen.add(filePath);
  const dir = dirname(filePath);
  return readFileSync(filePath, "utf-8").replace(
    /@import\s+url\(\s*["']?(\.[^"')]+)["']?\s*\)\s*;/g,
    (_, relPath) => inlineCssImports(resolve(dir, relPath), seen),
  );
}

const platformCss = inlineCssImports(resolve(srcRoot, "index.css"));
const platformJs = readFileSync(resolve(srcRoot, "platform.js"), "utf-8");

writeFileSync(resolve(distRoot, "platform.css"), platformCss, "utf-8");
writeFileSync(resolve(distRoot, "platform.js"), platformJs, "utf-8");
console.log(`✓ Platform CSS built → ${resolve(distRoot, "platform.css")}`);
console.log(`✓ Platform JS synced → ${resolve(distRoot, "platform.js")}`);

const { code: minCss } = await esbuild.transform(platformCss, { loader: "css", minify: true });
writeFileSync(resolve(distRoot, "platform.min.css"), minCss, "utf-8");
console.log(`✓ Platform CSS minified → ${resolve(distRoot, "platform.min.css")}`);

const { code: minJs } = await esbuild.transform(platformJs, { loader: "js", minify: true });
writeFileSync(resolve(distRoot, "platform.min.js"), minJs, "utf-8");
console.log(`✓ Platform JS minified → ${resolve(distRoot, "platform.min.js")}`);