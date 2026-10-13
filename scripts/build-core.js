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
 * - JS: bundle with Rollup — utils.js inlined, midi.js and table-sort.js as lazy chunks;
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
import { LAYER_ORDER, inCaiLayer } from "./cai-layers.js";

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
    /@import\s+url\(\s*["']?(\.[^"')]+)["']?\s*\)(?:\s+layer\(\s*([\w.-]+)\s*\))?\s*;/g,
    (_, relPath, layer) => {
      const css = inlineCssImports(resolve(dir, relPath), seen);
      return layer ? `@layer ${layer} {\n${css}\n}\n` : css;
    },
  );
}

// The public layers live in scripts/cai-layers.js (container layer `cai`).
// src/index.css is the single source of layer order for the full bundle.

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
const baseCss =
  LAYER_ORDER +
  [
    ["settings/_settings.css", "cai.settings"],
    ["generic/_reset.css", "cai.generic"],
    ["elements/index.css", "cai.elements"],
  ]
    .map(([f, layer]) => `@layer ${layer} {\n${inlineCssImports(resolve(srcRoot, f))}\n}\n`)
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
    inCaiLayer("components", readFileSync(resolve(componentsSrcDir, f), "utf-8")),
  );
}
console.log(`✓ ${componentFiles.length} component CSS files → ${componentsDistDir} (+ min)`);

// --- CSS: print styles on their own, for pages that load components one by one ---
await writeCssWithMin(
  resolve(distRoot, "print.css"),
  inCaiLayer("print", readFileSync(resolve(srcRoot, "print/_print.css"), "utf-8")),
);
console.log("✓ Print CSS built → dist/print.css (+ min)");

// --- CSS: classless layer, a file of its own (scoped by [data-cai-classless]) ---
await writeCssWithMin(
  resolve(distRoot, "classless.css"),
  inCaiLayer("elements", readFileSync(resolve(srcRoot, "classless/_classless.css"), "utf-8")),
);
console.log("✓ Classless CSS built → dist/classless.css (+ min)");

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
    // midi.js and table-sort.js are NOT copied: rollup already emits them as
    // the lazy chunks.
    const jsModules = [
      "utils.js",
      "i18n.js",
      "theme.js",
      "sidebar.js",
      "clipboard.js",
      "modal.js",
      "highlight.js",
      "player.js",
      "tabs.js",
    ];
    for (const f of jsModules) {
      copyFileSync(resolve(srcRoot, f), resolve(distRoot, f));
    }
    console.log(`✓ ${jsModules.length} JS modules copied → dist/`);

    // Minify JS outputs with esbuild. A minified file imports the minified
    // siblings, so cai.min.js lazy-loads midi.min.js and table-sort.min.js,
    // not the unminified chunks (red line 17: the chunk a page loads is the one budgeted).
    const minified = ["cai.js", "midi.js", "table-sort.js", ...jsModules];
    for (const jsFile of minified) {
      const jsPath = resolve(distRoot, jsFile);
      if (!existsSync(jsPath)) continue;
      const src = readFileSync(jsPath, "utf-8");
      const { code } = await esbuild.transform(src, { loader: "js", minify: true });
      const minJs = code.replace(/(["'])\.\/([\w-]+)\.js\1/g, (match, quote, name) =>
        minified.includes(`${name}.js`) ? `${quote}./${name}.min.js${quote}` : match,
      );
      writeFileSync(resolve(distRoot, jsFile.replace(".js", ".min.js")), minJs, "utf-8");
    }
    console.log("✓ JS outputs minified (*.min.js)");
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
  for (const f of readdirSync(themesSrcDir).filter((f) => f.endsWith(".css"))) {
    // The source stays plain (check:contrast reads it); the published file
    // is in the cai.themes layer, so a consumer's `app` layer wins over it
    const src = inCaiLayer("themes", readFileSync(resolve(themesSrcDir, f), "utf-8"));
    writeFileSync(resolve(themesDistDir, f), src, "utf-8");
    console.log(`✓ Theme synced → ${resolve(themesDistDir, f)}`);
    const { code: minCss } = await esbuild.transform(src, { loader: "css", minify: true });
    writeFileSync(resolve(themesDistDir, f.replace(".css", ".min.css")), minCss, "utf-8");
    console.log(`✓ Theme minified → ${f.replace(".css", ".min.css")}`);
  }
}
