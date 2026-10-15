/**
 * LUZ docs site — the Vite plugin (`luz-docs-site`). Development tooling only:
 * nothing here ships in a package.
 *
 * - Routes: every page under apps/docs/pages/ is an HTML entry of the build
 *   and a route of the dev server; nothing is listed by hand.
 * - Dev server: a lookup table from route to file. A route without its
 *   trailing slash answers 301, as GitHub Pages does, so a relative URL bug
 *   shows up in dev too. Anything else falls through to Vite.
 * - transformIndexHtml (pre): wraps each page in its layout and expands the
 *   partials (also in the landing, which shares the header).
 * - The landing is one template rendered once per language of
 *   apps/landing/i18n/locales.json: "/" from apps/landing/index.html, and
 *   "/es/", "/ar/"… from virtual files (apps/landing/<code>/index.html,
 *   which never exist on disk) whose source is the same template. Editing a
 *   catalog reloads the browser.
 * - Pages build: asset URLs and links between pages are relative to each
 *   page's own depth, so the site works under /<repo>/; each HTML file is
 *   moved to <route>/index.html. The not-found page (apps/docs/404.html)
 *   becomes /404.html, with every URL starting at the site's path on GitHub
 *   Pages ("/<repo>/"), because it is served at any URL.
 * - The search index (@luz-ds/site search, format version 1) is
 *   generated from the same scan as the A–Z page: served at
 *   /docs/search-index.json in dev, written there by the build.
 * - The color-mode boot script (apps/landing/theme-boot.js, EX-009) is a
 *   classic script, which Vite does not bundle: the build copies it to
 *   /theme-boot.js and points every page at it.
 * - Every internal link is checked: an error in a build, a warning in dev.
 * - Editing a layout, a partial, a page or site.json reloads the browser.
 *
 * Security: .claude/plans/docs-redesign/security.md, SEC-PLG-1…12.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  I18N_DIR,
  NOT_FOUND_ROUTE,
  SEARCH_INDEX_ROUTE,
  buildSearchIndex,
  buildSite,
  landingDocuments,
  parseFrontMatter,
  readInside,
  relativizeLinks,
  renderDocument,
  renderPage,
  rootOf,
  scanSite,
} from "./site.js";
import { SITE_URL } from "./i18n.js";

const LANDING = { route: "/", file: "apps/landing/index.html" };

/** The render-blocking color-mode script: its source and its file in the build. */
const THEME_BOOT = { src: "/apps/landing/theme-boot.js", out: "theme-boot.js" };

/** Output file of a route: "/" → "index.html", "/docs/a/" → "docs/a/index.html", "/404.html" → "404.html". */
const outFileOf = (route) => (route.endsWith(".html") ? route.slice(1) : `${route.slice(1)}index.html`);

/**
 * The path of the site on GitHub Pages: where the not-found page's URLs start.
 * "/" or one folder; a folder never starts with "." (no "/./" or "/../").
 */
export const BASE_PATH = /^\/([A-Za-z0-9_-][A-Za-z0-9._-]*\/)?$/;

/**
 * @param {object} options
 * @param {string} options.repoRoot   absolute path of the repository
 * @param {boolean} options.relative  pages build: relative URLs at any depth
 * @param {string} options.outRoot    build output folder
 * @param {string} [options.pagesBase] pages build: the site's path, "/<repo>/"
 * @param {string} [options.siteUrl]   pages build: the published site's root URL,
 *   for the home pages' absolute canonical and hreflang alternates
 */
export function docsSite({ repoRoot, relative: relativeUrls, outRoot, pagesBase = "/", siteUrl = "" }) {
  // An absolute URL here would make every asset of the 404 page a third-party request (SEC-MISC-3)
  if (!BASE_PATH.test(pagesBase)) throw new Error(`pagesBase must be "/" or "/<name>/", got ${pagesBase}`);
  if (siteUrl && !(SITE_URL.test(siteUrl) && new URL(siteUrl).pathname === pagesBase)) {
    throw new Error(`siteUrl must be an https URL whose path is pagesBase (${pagesBase}), got ${siteUrl}`);
  }
  const docsDir = resolve(repoRoot, "apps/docs");
  const landingAbs = resolve(repoRoot, LANDING.file);
  const toRepo = (abs) => relative(repoRoot, abs).split(sep).join("/");
  let site = null;
  let command = "serve";
  let logger = console;
  let warn = () => {};

  const i18nAbs = resolve(repoRoot, I18N_DIR);
  const scan = () => (site ??= scanSite(docsDir, repoRoot));

  /**
   * The landing in each language: "/" is the template itself; any other
   * language a virtual file next to it (apps/landing/<code>/index.html),
   * which the build and the dev server render from the template.
   */
  const landings = () =>
    landingDocuments(scan(), LANDING.file, "").map(({ route, locale }) => {
      const file = route === LANDING.route ? LANDING.file : `apps/landing${route}index.html`;
      return { route, file, kind: "landing", locale, virtual: file !== LANDING.file };
    });

  /** Every HTML document of the site: route, source file (repo-relative), kind. */
  const documents = () => [
    ...landings(),
    ...scan().pages.map((p) => ({ route: p.route, file: p.file, kind: "page" })),
    ...(scan().notFound ? [{ route: NOT_FOUND_ROUTE, file: scan().notFound.file, kind: "page" }] : []),
  ];
  /** The virtual landing whose absolute path is `id`, if any. */
  const virtualOf = (id) => landings().find((d) => d.virtual && resolve(repoRoot, d.file) === id);
  /** The template, read inside apps/landing (SEC-PLG-1/2). */
  const landingSource = () => readInside(landingAbs, [dirname(landingAbs)]);
  /** {{root}} of a document in the pages build: relative to its depth; the site's path on the 404. */
  const rootFor = (route) => (route === NOT_FOUND_ROUTE ? pagesBase : rootOf(route));
  const routes = () => new Set(documents().map((d) => d.route));

  /** The search index, as the bytes that are published. */
  const searchIndex = () => JSON.stringify(buildSearchIndex(scan()));

  /** Render everything and check it; returns the link problems. */
  const check = () =>
    buildSite(scan(), {
      extra: landingDocuments(scan(), LANDING.file, landingSource()),
    }).problems;

  return {
    name: "luz-docs-site",

    config() {
      const input = Object.fromEntries(
        documents()
          .map((d) => [outFileOf(d.route).replace(/\.html$/, ""), resolve(repoRoot, d.file)])
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      );
      return {
        build: { rollupOptions: { input } },
        ...(relativeUrls
          ? {
              experimental: {
                // Vite makes an HTML file's asset URLs relative to its source
                // path (apps/docs/pages/…); make them relative to its route
                renderBuiltUrl(filename, { hostId, hostType }) {
                  if (hostType !== "html") return undefined;
                  const doc = documents().find((d) => d.file === hostId);
                  return doc ? rootFor(doc.route) + filename : undefined;
                },
              },
            }
          : {}),
      };
    },

    configResolved(config) {
      command = config.command;
      logger = config.logger;
    },

    // The landing of another language: an entry of the build with no file of
    // its own; its source is the template
    resolveId(id) {
      return virtualOf(id) ? id : undefined;
    },

    load(id) {
      const doc = virtualOf(id);
      if (!doc) return undefined;
      if (existsSync(id)) throw new Error(`${doc.file}: the landing of /${doc.locale.code}/ is generated; remove this file`);
      return landingSource();
    },

    buildStart() {
      if (command !== "build") return;
      site = null;
      const problems = check();
      if (problems.length) {
        throw new Error(`Broken links in the docs site:\n  ${problems.join("\n  ")}`);
      }
    },

    configureServer(server) {
      warn = () => {
        try {
          const problems = check();
          if (problems.length) logger.warn(`[luz-docs-site] broken links:\n  ${problems.join("\n  ")}`);
        } catch (error) {
          logger.error(`[luz-docs-site] ${error.message}`);
        }
      };
      warn();
      // A page added or removed changes the route table (handleHotUpdate only sees edits)
      const changed = (file) => {
        if (file.startsWith(join(docsDir, "pages") + sep)) {
          site = null;
          warn();
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("add", changed);
      server.watcher.on("unlink", changed);

      // Route → source file, looked up, never joined from the URL (SEC-PLG-5)
      const table = () => {
        const map = new Map(documents().map((d) => [d.route, `/${d.file}`]));
        map.set("/index.html", `/${LANDING.file}`);
        return map;
      };

      server.middlewares.use((req, res, next) => {
        const [path, query] = (req.url ?? "/").split(/\?(.*)/s);
        let map;
        try {
          map = table();
        } catch (error) {
          logger.error(`[luz-docs-site] ${error.message}`);
          return next();
        }
        // The search index: generated, never a file (SEC-PLG-6)
        if (path === SEARCH_INDEX_ROUTE) {
          try {
            const body = searchIndex();
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            return res.end(body);
          } catch (error) {
            logger.error(`[luz-docs-site] ${error.message}`);
            return next();
          }
        }
        const file = map.get(path);
        // Another language of the landing: rendered from the template, as Vite would a file
        const virtual = file && landings().find((d) => d.virtual && `/${d.file}` === file);
        if (virtual) {
          Promise.resolve()
            .then(() => server.transformIndexHtml(file, landingSource(), req.originalUrl))
            .then((html) => {
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.end(html);
            })
            .catch((error) => {
              logger.error(`[luz-docs-site] ${error.message}`);
              next(error);
            });
          return undefined;
        }
        if (file) {
          req.url = query ? `${file}?${query}` : file;
          return next();
        }
        // The Location is the matched table key, never the raw URL
        const route = path.endsWith("/") ? undefined : [...map.keys()].find((key) => key === `${path}/`);
        if (route) {
          res.statusCode = 301;
          res.setHeader("Location", route);
          return res.end();
        }
        next();
      });
    },

    handleHotUpdate({ file, server }) {
      const inDocs = file.startsWith(docsDir + sep);
      const rel = inDocs ? relative(docsDir, file).split(sep).join("/") : null;
      const generated =
        file === landingAbs ||
        file.startsWith(i18nAbs + sep) ||
        (rel !== null && (rel === "site.json" || /^(_layouts|_partials|pages)\//.test(rel)));
      if (!generated) return undefined;
      // A page's front matter can change every page (later: the sidebar)
      site = null;
      warn();
      server.ws.send({ type: "full-reload" });
      return [];
    },

    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const file = toRepo(ctx.filename);
        const doc = documents().find((d) => d.file === file);
        if (!doc) return html;
        let out = html;
        if (doc.kind === "page") {
          // Render the source Vite read; the scan gives the route and the site
          let scanned = scan().byFile.get(resolve(repoRoot, file));
          if (!scanned) {
            site = null;
            scanned = scan().byFile.get(resolve(repoRoot, file));
          }
          const page = { ...scanned, ...parseFrontMatter(html, file, scan().areas) };
          out = renderPage(page, scan(), { root: relativeUrls ? rootFor(doc.route) : "/", dev: command !== "build" });
        } else if (doc.kind === "landing") {
          // Errors and line numbers point at the template, for every language
          out = renderDocument(html, LANDING.file, doc.route, scan(), { locale: doc.locale, siteUrl: relativeUrls ? siteUrl : "" });
        }
        if (command === "build") {
          const root = relativeUrls ? rootFor(doc.route) : "/";
          // vite-ignore: Vite drops the attribute and does not warn about a classic script
          out = out.replaceAll(`src="${THEME_BOOT.src}"`, `src="${root}${THEME_BOOT.out}" vite-ignore`);
          // The languages' alternates point at pages, not assets: Vite must not resolve them
          out = out.replaceAll('<link rel="alternate" ', '<link rel="alternate" vite-ignore ').replaceAll('<link rel="canonical" ', '<link rel="canonical" vite-ignore ');
        }
        return relativeUrls ? relativizeLinks(out, doc.route, routes(), rootFor(doc.route)) : out;
      },
    },

    generateBundle() {
      // Unhashed, next to the pages: every page points at it from its depth
      this.emitFile({ type: "asset", fileName: SEARCH_INDEX_ROUTE.slice(1), source: searchIndex() });
      // Unhashed too: a classic script, which Vite leaves alone (EX-009)
      this.emitFile({
        type: "asset",
        fileName: THEME_BOOT.out,
        source: readFileSync(resolve(repoRoot, THEME_BOOT.src.slice(1)), "utf-8"),
      });
    },

    closeBundle() {
      // Vite writes each HTML entry at its source path; move it to its route
      const docs = documents();
      if (docs.some((d) => !existsSync(resolve(outRoot, d.file)))) return;
      const realOut = resolve(outRoot);
      for (const doc of docs) {
        const target = resolve(outRoot, outFileOf(doc.route));
        if (!target.startsWith(realOut + sep) || outFileOf(doc.route).split("/").includes("..")) {
          throw new Error(`${doc.file}: ${doc.route} would be written outside the build folder`);
        }
        const html = readFileSync(resolve(outRoot, doc.file), "utf-8");
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, html, "utf-8");
      }
      rmSync(join(outRoot, "apps"), { recursive: true, force: true });

      // GitHub Pages: serve the files as they are, without Jekyll
      if (relativeUrls) writeFileSync(join(outRoot, ".nojekyll"), "", "utf-8");
    },
  };
}
