import { defineConfig } from "vite";
import { dirname, resolve, sep } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const docsRoot = resolve(__dirname, "apps/docs");
const landingRoot = resolve(__dirname, "apps/landing");
const platformDocsRoot = resolve(__dirname, "apps/platform-docs");
const htmlElementsRoot = resolve(__dirname, "apps/html-elements");
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

// Public routes of the four apps. `up` is the path back to the site root.
const ROUTES = [
  { built: "apps/landing/index.html", out: "index.html", up: "./" },
  { built: "apps/docs/index.html", out: "docs/index.html", up: "../" },
  { built: "apps/platform-docs/index.html", out: "platform/index.html", up: "../" },
  { built: "apps/html-elements/index.html", out: "html/index.html", up: "../" },
];

/**
 * Vite emits each HTML entry at its source path (apps/<app>/index.html).
 * Move them to their public routes. With a relative base (pages mode) the
 * URLs inside each page are rewritten for its new depth, including the
 * root-absolute links between the four apps, so the site works from any
 * sub-path (https://<user>.github.io/<repo>/).
 */
function normalizeAppEntryRoutes(outRoot, relative) {
  return {
    name: "normalize-app-entry-routes",
    closeBundle() {
      if (ROUTES.some((r) => !existsSync(resolve(outRoot, r.built)))) return;

      for (const { built, out, up } of ROUTES) {
        let html = readFileSync(resolve(outRoot, built), "utf-8");
        if (relative) {
          html = html
            // assets: emitted relative to apps/<app>/, i.e. two levels deep,
            // at the start of an attribute or of each srcset candidate
            .replace(/("|,\s*)\.\.\/\.\.\//g, (_, before) => `${before}${up}`)
            // links between apps: "/", "/docs/", "/platform/", "/html/"
            .replace(/href="\/(docs\/|platform\/|html\/)?(#[^"]*)?"/g, (_, route = "", hash = "") =>
              `href="${up}${route}${hash}"`,
            );
        }
        const target = resolve(outRoot, out);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, html, "utf-8");
      }
      rmSync(resolve(outRoot, "apps"), { recursive: true, force: true });

      // GitHub Pages: serve the files as they are, without Jekyll
      if (relative) writeFileSync(resolve(outRoot, ".nojekyll"), "", "utf-8");
    },
  };
}

function devRouteRewrite() {
  return {
    name: "dev-route-rewrite",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Strip query string for matching
        const url = (req.url ?? "/").split("?")[0];

        if (url === "/" || url === "/index.html") {
          req.url = "/apps/landing/index.html";
        } else if (url === "/docs" || url === "/docs/") {
          req.url = "/apps/docs/index.html";
        } else if (url === "/platform" || url === "/platform/") {
          req.url = "/apps/platform-docs/index.html";
        } else if (url === "/html" || url === "/html/") {
          req.url = "/apps/html-elements/index.html";
        } else if (url === "/apps/html-elements" || url === "/apps/html-elements/") {
          req.url = "/apps/html-elements/index.html";
        } else if (url === "/apps/landing" || url === "/apps/landing/") {
          req.url = "/apps/landing/index.html";
        } else if (url === "/apps/docs" || url === "/apps/docs/") {
          req.url = "/apps/docs/index.html";
        } else if (
          url === "/apps/platform" ||
          url === "/apps/platform/" ||
          url === "/apps/platform-docs" ||
          url === "/apps/platform-docs/"
        ) {
          req.url = "/apps/platform-docs/index.html";
        }

        next();
      });
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
    plugins: [devRouteRewrite(), normalizeAppEntryRoutes(outRoot, pages)],
    server: {
      open: "/",
      fs: {
        allow: [__dirname],
      },
    },
    build: {
      outDir: outRoot,
      emptyOutDir: true,
      // Pages: every asset is a file, never a data: URI, so a CSP can keep
      // media-src and connect-src at 'self' (the MIDI demo fetches its file)
      ...(pages ? { assetsInlineLimit: 0 } : {}),
      rollupOptions: {
        input: {
          index: resolve(landingRoot, "index.html"),
          "docs/index": resolve(docsRoot, "index.html"),
          "platform/index": resolve(platformDocsRoot, "index.html"),
          "html/index": resolve(htmlElementsRoot, "index.html"),
        },
      },
    },
  };
});
