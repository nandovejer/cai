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
import * as esbuild from "esbuild";

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

const { code: minCss } = await esbuild.transform(css, { loader: "css", minify: true });
writeFileSync(resolve(distRoot, "cai.min.css"), minCss, "utf-8");
console.log(`✓ Core CSS minified → ${resolve(distRoot, "cai.min.css")}`);

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

    // Minify JS outputs with esbuild
    for (const jsFile of ["cai.js", "midi.js"]) {
      const jsPath = resolve(distRoot, jsFile);
      if (!existsSync(jsPath)) continue;
      const src = readFileSync(jsPath, "utf-8");
      const { code: minJs } = await esbuild.transform(src, { loader: "js", minify: true });
      writeFileSync(resolve(distRoot, jsFile.replace(".js", ".min.js")), minJs, "utf-8");
      console.log(`✓ ${jsFile} minified → ${jsFile.replace(".js", ".min.js")}`);
    }
  } catch (error) {
    console.error("❌ JS bundling failed:", error.message);
    process.exit(1);
  }
}

await buildJS();

// --- Copy custom-faces fonts from tokens for theme usage ---
const tokensFontsSrc = resolve(repoRoot, "packages/tokens/fonts/custom-faces");
const tokensFontsDest = resolve(distRoot, "fonts/custom-faces");
if (existsSync(tokensFontsSrc)) {
  mkdirSync(tokensFontsDest, { recursive: true });
  readdirSync(tokensFontsSrc).forEach((f) => {
    copyFileSync(
      resolve(tokensFontsSrc, f),
      resolve(tokensFontsDest, f)
    );
  });
  console.log(`✓ Custom-faces fonts copied → ${tokensFontsDest}`);
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
