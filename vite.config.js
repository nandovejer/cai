import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { resolve, sep } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { docsSite } from "./scripts/docs-site/plugin.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distRoot = resolve(__dirname, "dist");
// `vite build --mode pages` builds the GitHub Pages site into docs/.
// LUZ_PAGES_OUT builds it elsewhere: scripts/check-generated.js compares
// that fresh build with the committed docs/ (red line 14).
const pagesRoot = resolve(__dirname, process.env.LUZ_PAGES_OUT ?? "docs");
// emptyOutDir wipes pagesRoot: allow only docs/ or a folder inside the OS temp dir
const insideTmp = pagesRoot.startsWith(resolve(tmpdir()) + sep);
if (pagesRoot !== resolve(__dirname, "docs") && !insideTmp) {
  throw new Error(`LUZ_PAGES_OUT must be docs/ or a folder inside ${tmpdir()}, got ${pagesRoot}`);
}

/**
 * The site's path on GitHub Pages (https://<user>.github.io/luz/). Only the
 * not-found page uses it, as its <base href>: GitHub Pages serves /404.html
 * at whatever URL was missing, so its relative URLs need a fixed base. A fork
 * or a custom domain changes it ("/" for a domain of its own); if it is wrong,
 * the 404 page is still readable, only unstyled.
 */
export const PAGES_BASE = "/luz/";

/**
 * The published site's root URL: GitHub Pages of the repository
 * github.com/nandovejer/luz (the git remote), at PAGES_BASE. The pages build
 * writes the home pages' canonical and hreflang alternates with it, absolute
 * as search engines ask; the dev server keeps them root-absolute. A fork or a
 * custom domain changes it with PAGES_BASE.
 */
export const SITE_URL = `https://nandovejer.github.io${PAGES_BASE}`;

/**
 * Content-Security-Policy for the published GitHub Pages site. Pages cannot
 * send headers, so it goes in a <meta>; only the pages build gets it (the
 * dev server needs its own websocket and client). Scripts come only from
 * the site itself; inline styles stay allowed for the demos' style
 * attributes and the HTML elements page's <style> example.
 */
export const PAGES_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  // srcdoc frames need no data:; the pages build never inlines assets
  "frame-src 'self'",
  // The HTML elements page demonstrates <object> and <embed> with its own files
  "object-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function pagesCsp() {
  return {
    name: "pages-csp",
    transformIndexHtml: {
      order: "post",
      handler: (html) =>
        html.replace(/(<meta charset="[^"]*">)/i, `$1\n  <meta http-equiv="Content-Security-Policy" content="${PAGES_CSP}">`),
    },
  };
}

/**
 * packages/core/src/i18n.js names each language file by a literal
 * (`import("./i18n-es.js")`, SEC-CHUNK-1), and the build writes that file from
 * src/i18n/<code>.json: it is not in src/. A page that imports the source in
 * dev (tests/player.spec.js) gets the module from the JSON, as the build would.
 */
function coreLanguages() {
  const prefix = "\0luz-core-language:";
  return {
    name: "core-languages",
    apply: "serve",
    resolveId(source, importer) {
      const code = /^\.\/i18n-([a-z]{2,3})\.js$/.exec(source)?.[1];
      if (code && importer?.replaceAll("\\", "/").endsWith("/packages/core/src/i18n.js")) return prefix + code;
    },
    load(id) {
      if (!id.startsWith(prefix)) return;
      const strings = JSON.parse(readFileSync(resolve(__dirname, "packages/core/src/i18n", `${id.slice(prefix.length)}.json`), "utf-8"));
      delete strings.$header;
      return `export default ${JSON.stringify(strings)};`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const pages = mode === "pages";
  const outRoot = pages ? pagesRoot : distRoot;

  return {
    root: __dirname,
    // Relative URLs so the Pages site works under /<repo>/ and on a custom domain
    base: pages ? "./" : "/",
    publicDir: false,
    // The site's routes, dev server, layouts and partials, link check and the
    // move of each HTML file to its route: scripts/docs-site/plugin.js
    plugins: [coreLanguages(), docsSite({ repoRoot: __dirname, relative: pages, outRoot, pagesBase: PAGES_BASE, siteUrl: SITE_URL, csp: PAGES_CSP }), ...(pages ? [pagesCsp()] : [])],
    server: {
      open: "/",
      fs: {
        allow: [__dirname],
      },
    },
    build: {
      outDir: outRoot,
      emptyOutDir: true,
      // Pages: every asset is a file, never a data: URI, so the CSP can keep
      // media-src and connect-src at 'self' (the MIDI demo fetches its file)
      ...(pages ? { assetsInlineLimit: 0 } : {}),
      // Pages: no module-preload polyfill. It is Vite's code (MIT, VoidZero Inc. and
      // Vite contributors) and would be served in docs/assets with no notice (RL-13);
      // the browsers LUZ supports have <link rel="modulepreload">
      ...(pages ? { modulePreload: false } : {}),
      // rollupOptions.input: one entry per route, from the docs-site plugin
    },
  };
});
