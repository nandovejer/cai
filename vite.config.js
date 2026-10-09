import { defineConfig } from "vite";
import { resolve, sep } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { docsSite } from "./scripts/docs-site/plugin.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distRoot = resolve(__dirname, "dist");
// `vite build --mode pages` builds the GitHub Pages site into docs/.
// CAI_PAGES_OUT builds it elsewhere: scripts/check-generated.js compares
// that fresh build with the committed docs/ (red line 14).
const pagesRoot = resolve(__dirname, process.env.CAI_PAGES_OUT ?? "docs");
// emptyOutDir wipes pagesRoot: allow only docs/ or a folder inside the OS temp dir
const insideTmp = pagesRoot.startsWith(resolve(tmpdir()) + sep);
if (pagesRoot !== resolve(__dirname, "docs") && !insideTmp) {
  throw new Error(`CAI_PAGES_OUT must be docs/ or a folder inside ${tmpdir()}, got ${pagesRoot}`);
}

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
  "frame-src 'self' data:",
  // The HTML elements page demonstrates <object> and <embed> with its own files
  "object-src 'self' data:",
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
    plugins: [docsSite({ repoRoot: __dirname, relative: pages, outRoot }), ...(pages ? [pagesCsp()] : [])],
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
      // rollupOptions.input: one entry per route, from the docs-site plugin
    },
  };
});
