/**
 * CAI Design System — Core dist builder
 * Regenerates packages/core/dist assets from packages/core/src.
 *
 * Usage: node scripts/build-core.js (from the repo root)
 *
 * Strategy:
 * - CSS: inline the @import graph of src/index.css (single source of truth)
 *   into dist/cai.css, plus one dist/components/<name>.css per component
 *   and dist/base.css (settings + reset + elements) as their prerequisite
 * - JS: bundle with Rollup — utils.js inlined, midi.js as lazy chunk;
 *   individual modules copied verbatim (browser-native ESM)
 * - Themes: copy src/themes/*.css → dist/themes/
 */

import {
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  copyFileSync,
  existsSync,
} from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { rollup } from "rollup";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const coreRoot = resolve(repoRoot, "packages/core");
const srcRoot = resolve(coreRoot, "src");
const distRoot = resolve(coreRoot, "dist");

// Start from a clean dist so removed sources never linger in the tarball
rmSync(distRoot, { recursive: true, force: true });
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

async function writeCssWithMin(outPath, css) {
  writeFileSync(outPath, css, "utf-8");
  const { code } = await esbuild.transform(css, { loader: "css", minify: true });
  writeFileSync(outPath.replace(/\.css$/, ".min.css"), code, "utf-8");
}

// --- CSS: full bundle from the src/index.css import graph ---
const css = inlineCssImports(resolve(srcRoot, "index.css"));
await writeCssWithMin(resolve(distRoot, "cai.css"), css);
console.log(`✓ Core CSS built → ${resolve(distRoot, "cai.css")} (+ min)`);

// --- CSS: base layer required by per-component files ---
const baseCss = ["settings/_settings.css", "generic/_reset.css", "elements/_elements.css"]
  .map((f) => readFileSync(resolve(srcRoot, f), "utf-8"))
  .join("\n");
await writeCssWithMin(resolve(distRoot, "base.css"), baseCss);
console.log(`✓ Base CSS built → ${resolve(distRoot, "base.css")} (+ min)`);

// --- CSS: per-component files for standalone consumption ---
const componentsSrcDir = resolve(srcRoot, "components");
const componentsDistDir = resolve(distRoot, "components");
mkdirSync(componentsDistDir, { recursive: true });
const componentFiles = readdirSync(componentsSrcDir).filter(
  (f) => f.endsWith(".css") && f !== "index.css",
);
for (const f of componentFiles) {
  await writeCssWithMin(
    resolve(componentsDistDir, f),
    readFileSync(resolve(componentsSrcDir, f), "utf-8"),
  );
}
console.log(`✓ ${componentFiles.length} component CSS files → ${componentsDistDir} (+ min)`);

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

    // Individual modules: the source IS the artifact (browser-native ESM
    // with relative imports only) — copy verbatim next to the bundle.
    // midi.js is NOT copied: rollup already emits it as the lazy chunk.
    const jsModules = [
      "utils.js",
      "theme.js",
      "sidebar.js",
      "clipboard.js",
      "modal.js",
      "highlight.js",
      "player.js",
      "tabs.js",
      "toggle.js",
    ];
    for (const f of jsModules) {
      copyFileSync(resolve(srcRoot, f), resolve(distRoot, f));
    }
    console.log(`✓ ${jsModules.length} JS modules copied → dist/`);

    // Minify JS outputs with esbuild
    for (const jsFile of ["cai.js", "midi.js", ...jsModules]) {
      const jsPath = resolve(distRoot, jsFile);
      if (!existsSync(jsPath)) continue;
      const src = readFileSync(jsPath, "utf-8");
      const { code: minJs } = await esbuild.transform(src, { loader: "js", minify: true });
      writeFileSync(resolve(distRoot, jsFile.replace(".js", ".min.js")), minJs, "utf-8");
    }
    console.log("✓ JS outputs minified (*.min.js)");
  } catch (error) {
    console.error("❌ JS bundling failed:", error.message);
    process.exit(1);
  }
}

await buildJS();

// --- Copy custom-faces fonts (+ their licence texts) for theme usage ---
const themeFontsSrc = resolve(coreRoot, "fonts/custom-faces");
const themeFontsDest = resolve(distRoot, "fonts/custom-faces");
if (existsSync(themeFontsSrc)) {
  mkdirSync(themeFontsDest, { recursive: true });
  readdirSync(themeFontsSrc).forEach((f) => {
    copyFileSync(
      resolve(themeFontsSrc, f),
      resolve(themeFontsDest, f)
    );
  });
  console.log(`✓ Custom-faces fonts copied → ${themeFontsDest}`);
}

// --- Themes: copy src/themes/*.css → dist/themes/ ---
const themesSrcDir = resolve(srcRoot, "themes");
const themesDistDir = resolve(distRoot, "themes");
if (existsSync(themesSrcDir)) {
  mkdirSync(themesDistDir, { recursive: true });
  for (const f of readdirSync(themesSrcDir).filter((f) => f.endsWith(".css"))) {
    copyFileSync(resolve(themesSrcDir, f), resolve(themesDistDir, f));
    console.log(`✓ Theme synced → ${resolve(themesDistDir, f)}`);
    const src = readFileSync(resolve(themesSrcDir, f), "utf-8");
    const { code: minCss } = await esbuild.transform(src, { loader: "css", minify: true });
    writeFileSync(resolve(themesDistDir, f.replace(".css", ".min.css")), minCss, "utf-8");
    console.log(`✓ Theme minified → ${f.replace(".css", ".min.css")}`);
  }
}
