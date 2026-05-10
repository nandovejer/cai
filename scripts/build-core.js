/**
 * CAI Design System — Core dist builder
 * Regenerates packages/core/dist assets from packages/core/src.
 *
 * Usage: node scripts/build-core.js (from the repo root)
 *
 * Strategy:
 * - CSS: concatenate all ITCSS layers
 * - JS: bundle with Rollup — utils.js inlined, midi.js as lazy chunk
 * - Themes: copy src/themes/*.css → dist/themes/
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
  existsSync,
} from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { rollup } from "rollup";

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

// --- CSS: concatenate all ITCSS layers ---
const css = cssLayers
  .map((relativePath) => readFileSync(resolve(srcRoot, relativePath), "utf-8"))
  .join("\n\n");

writeFileSync(resolve(distRoot, "cai.css"), css, "utf-8");
console.log(`✓ Core CSS built → ${resolve(distRoot, "cai.css")}`);

// --- JS: bundle with Rollup ---
async function buildJS() {
  try {
    const bundle = await rollup({
      input: resolve(srcRoot, "cai.js"),
      external: [], // Nothing is external — all modules must be resolved
    });

    await bundle.write({
      dir: distRoot,
      format: "es",
      entryFileNames: "cai.js",
      chunkFileNames: "[name].js",
      inlineDynamicImports: false,
    });

    await bundle.close();
    console.log(`✓ Core JS bundled → ${resolve(distRoot, "cai.js")}`);

    // Also check if midi.js was generated as a chunk
    if (existsSync(resolve(distRoot, "midi.js"))) {
      console.log(`✓ MIDI JS chunk → ${resolve(distRoot, "midi.js")}`);
    }
  } catch (error) {
    console.error("❌ JS bundling failed:", error.message);
    process.exit(1);
  }
}

await buildJS();

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
