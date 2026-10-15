/**
 * LUZ — the shared dist builder of the packages that build on core:
 * `site` and the packages for one kind of site (`landing`, later `cms`).
 * Each has a thin script (scripts/build-<name>.js) that calls
 * buildPackage() with what it ships; tokens and core keep their own.
 *
 * What it does, in order:
 *   1. empties packages/<name>/dist, so removed sources never linger;
 *   2. inlines the local @import graph of src/index.css (the one source of
 *      the file order), rebasing relative url()s to src/, which dist/
 *      mirrors for assets, so the same URL works from npm and from a CDN;
 *   3. wraps the result in its public layer, luz.<layer> (scripts/luz-layers.js);
 *   4. copies the asset folders and fails on a url() that points nowhere;
 *   5. writes dist/<name>.css and dist/<name>.min.css;
 *   6. writes dist/components/<file>.css and .min.css for each
 *      src/components/<file>.css whose name does not start with `_`, in the
 *      same layer and with the same rebased url()s, so a page can load one
 *      component (as core's dist/components/); a src/components/_print.css
 *      becomes dist/print.css (+ min);
 *   7. copies each JS module as it is and bundles each one with esbuild
 *      into <module>.min.js (its own relative imports inlined, nothing else);
 *   8. copies each lazy chunk as it is and bundles it alone into
 *      <chunk>.min.js. An entry's dynamic import("./<chunk>.js") stays an
 *      import, of "./<chunk>.min.js" in the entry's .min.js, so the chunk is
 *      never inlined and never split (no esbuild `splitting`): each file is
 *      what one <script> or one integrity hash covers (SEC-CHUNK-2);
 *   9. writes dist/classes.json, the class manifest read back from the CSS
 *      just written (scripts/ai-manifests.js).
 *
 * Usage: import { buildPackage } from "./build-package.js";
 *        await buildPackage({ name: "landing" });
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";
import { writeManifests } from "./ai-manifests.js";
import { inLuzLayer } from "./luz-layers.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Build packages/<name>/dist from packages/<name>/src.
 * @param {object} options
 * @param {string} options.name     the package folder, and the base name of its CSS (dist/<name>.css)
 * @param {string} [options.layer]  the public layer, without `luz.` (default: the name)
 * @param {string} [options.label]  the name in the log lines (default: the name, capitalised)
 * @param {string[]} [options.js]   JS modules in src/, copied and bundled (default: none)
 * @param {string[]} [options.chunks] JS modules in src/ that an entry loads lazily, each
 *   copied and bundled alone; the entries' dynamic imports of them stay imports (default: none)
 * @param {string[]} [options.assets] folders of src/ copied to dist/ as they are (default: none)
 */
export async function buildPackage({ name, layer = name, label = name[0].toUpperCase() + name.slice(1), js = [], chunks = [], assets = [] }) {
  const pkgRoot = resolve(repoRoot, "packages", name);
  const srcRoot = resolve(pkgRoot, "src");
  const distRoot = resolve(pkgRoot, "dist");

  rmSync(distRoot, { recursive: true, force: true });
  mkdirSync(distRoot, { recursive: true });

  const assetUrls = new Set();
  function inlineCssImports(filePath, seen = new Set()) {
    if (seen.has(filePath)) return "";
    seen.add(filePath);
    const dir = dirname(filePath);
    return readFileSync(filePath, "utf-8")
      .replace(/(?<!@import\s*)url\(\s*(["']?)(?![a-z]+:|\/|#)([^"')]+)\1\s*\)/g, (_, quote, relPath) => {
        const rebased = relative(srcRoot, resolve(dir, relPath)).split("\\").join("/");
        assetUrls.add(rebased);
        return `url(${quote}${rebased}${quote})`;
      })
      .replace(
        /@import\s+url\(\s*["']?(\.[^"')]+)["']?\s*\)\s*;/g,
        (_, relPath) => inlineCssImports(resolve(dir, relPath), seen),
      );
  }

  const css = inLuzLayer(layer, inlineCssImports(resolve(srcRoot, "index.css")));

  // One stylesheet per component, and the print rules on their own: each
  // file is the text the bundle inlines for it, in the same layer
  const componentsSrc = resolve(srcRoot, "components");
  const sheets = new Map();
  if (existsSync(componentsSrc)) {
    for (const file of readdirSync(componentsSrc).sort()) {
      if (!file.endsWith(".css")) continue;
      const out = file === "_print.css" ? "print.css" : file.startsWith("_") ? null : `components/${file}`;
      if (out) sheets.set(out, inLuzLayer(layer, inlineCssImports(resolve(componentsSrc, file))));
    }
  }

  // Assets are committed in src/, so the build only copies them
  for (const folder of assets) {
    cpSync(resolve(srcRoot, folder), resolve(distRoot, folder), { recursive: true });
    console.log(`✓ ${label} ${folder} copied → ${resolve(distRoot, folder)}`);
  }
  const missing = [...assetUrls].filter((url) => !existsSync(resolve(distRoot, url)));
  if (missing.length) {
    console.error(`✗ ${name}.css points at files that do not exist:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }

  writeFileSync(resolve(distRoot, `${name}.css`), css, "utf-8");
  console.log(`✓ ${label} CSS built → ${resolve(distRoot, `${name}.css`)}`);
  // Unminified modules are copied as they are: they import each other by relative path
  const modules = [...js, ...chunks];
  for (const file of modules) cpSync(resolve(srcRoot, file), resolve(distRoot, file));
  if (modules.length) console.log(`✓ ${label} JS synced → ${modules.join(", ")}`);

  const { code: minCss } = await esbuild.transform(css, { loader: "css", minify: true });
  writeFileSync(resolve(distRoot, `${name}.min.css`), minCss, "utf-8");
  console.log(`✓ ${label} CSS minified → ${resolve(distRoot, `${name}.min.css`)}`);

  if (sheets.size) mkdirSync(resolve(distRoot, "components"), { recursive: true });
  for (const [out, text] of sheets) {
    writeFileSync(resolve(distRoot, out), text, "utf-8");
    const { code } = await esbuild.transform(text, { loader: "css", minify: true });
    writeFileSync(resolve(distRoot, out.replace(/\.css$/, ".min.css")), code, "utf-8");
  }
  if (sheets.size) console.log(`✓ ${label} ${sheets.size} stylesheets on their own → ${[...sheets.keys()].join(", ")} (+ min)`);

  // A dynamic import of a chunk stays an import, of the chunk's .min.js
  const lazyChunks = {
    name: "luz-lazy-chunks",
    setup(build) {
      build.onResolve({ filter: /^\.\/[\w-]+\.js$/ }, ({ path, kind }) =>
        kind === "dynamic-import" && chunks.includes(path.slice(2)) ? { path: path.replace(/\.js$/, ".min.js"), external: true } : undefined,
      );
    },
  };

  // Each <module>.min.js is one file with its relative imports inside, so
  // its budget measures everything a <script> of it loads; a chunk is its
  // own file, with its own budget
  for (const file of modules) {
    await esbuild.build({
      entryPoints: [resolve(srcRoot, file)],
      outfile: resolve(distRoot, file.replace(/\.js$/, ".min.js")),
      bundle: true,
      // Bundle our own relative files only: a bare import (another package,
      // a third-party module) stays an import, which check-size then rejects,
      // instead of being inlined silently into a published file (RL-1;
      // security.md, phase 4 review, answer 5a)
      packages: "external",
      // The sideEffects field of package.json lists dist/ only (src/ is not
      // published), so esbuild would read a src/ module as pure and drop an
      // import made for its side effect (a module imported only to define
      // its element)
      ignoreAnnotations: true,
      plugins: [lazyChunks],
      format: "esm",
      minify: true,
      target: "es2022",
      legalComments: "none",
      logLevel: "warning",
    });
  }
  if (modules.length) console.log(`✓ ${label} JS bundled and minified → ${modules.map((f) => f.replace(/\.js$/, ".min.js")).join(", ")}`);
  const manifest = writeManifests(name);
  console.log(`✓ ${label} classes.json → ${manifest.classes.length} classes, ${manifest.properties.length} properties`);
}
