/**
 * CAI Design System — Core dist builder
 * Regenerates packages/core/dist assets from packages/core/src.
 *
 * Usage: node scripts/build-core.js (from the repo root)
 */

import { mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const coreRoot = resolve(repoRoot, "packages/core");
const srcRoot = resolve(coreRoot, "src");
const distRoot = resolve(coreRoot, "dist");

const cssLayers = [
  "settings/_settings.css",
  "generic/_reset.css",
  "elements/_elements.css",
  "objects/_objects.css",
  "components/_components.css",
  "utilities/_utilities.css",
];

mkdirSync(distRoot, { recursive: true });

const css = cssLayers
  .map((relativePath) => readFileSync(resolve(srcRoot, relativePath), "utf-8"))
  .join("\n\n");

writeFileSync(resolve(distRoot, "cai.css"), css, "utf-8");
writeFileSync(
  resolve(distRoot, "cai.js"),
  readFileSync(resolve(srcRoot, "cai.js"), "utf-8"),
  "utf-8",
);
writeFileSync(
  resolve(distRoot, "midi.js"),
  readFileSync(resolve(srcRoot, "midi.js"), "utf-8"),
  "utf-8",
);
writeFileSync(
  resolve(distRoot, "utils.js"),
  readFileSync(resolve(srcRoot, "utils.js"), "utf-8"),
  "utf-8",
);

console.log(`✓ Core CSS built → ${resolve(distRoot, "cai.css")}`);
console.log(`✓ Core JS synced → ${resolve(distRoot, "cai.js")}`);
console.log(`✓ MIDI JS synced → ${resolve(distRoot, "midi.js")}`);
console.log(`✓ Utils JS synced → ${resolve(distRoot, "utils.js")}`);

// --- Themes: copy src/themes/*.css → dist/themes/ ---
const themesSrcDir = resolve(srcRoot, "themes");
const themesDistDir = resolve(distRoot, "themes");
if (existsSync(themesSrcDir)) {
  mkdirSync(themesDistDir, { recursive: true });
  readdirSync(themesSrcDir)
    .filter((f) => f.endsWith(".css"))
    .forEach((f) => {
      copyFileSync(resolve(themesSrcDir, f), resolve(themesDistDir, f));
      console.log(`✓ Theme synced → ${resolve(themesDistDir, f)}`);
    });
}