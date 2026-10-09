/**
 * CAI docs site — the Vite plugin (`cai-docs-site`). Development tooling only:
 * nothing here ships in a package.
 *
 * - Routes: every page under apps/docs/pages/ is an HTML entry of the build
 *   and a route of the dev server; nothing is listed by hand.
 * - Dev server: a lookup table from route to file. A route without its
 *   trailing slash answers 301, as GitHub Pages does, so a relative URL bug
 *   shows up in dev too. Anything else falls through to Vite.
 * - transformIndexHtml (pre): wraps each page in its layout and expands the
 *   partials (also in the landing, which shares the header).
 * - Pages build: asset URLs and links between pages are relative to each
 *   page's own depth, so the site works under /<repo>/; each HTML file is
 *   moved to <route>/index.html.
 * - Every internal link is checked: an error in a build, a warning in dev.
 * - Editing a layout, a partial, a page or site.json reloads the browser.
 *
 * Security: .claude/plans/docs-redesign/security.md, SEC-PLG-1…12.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { buildSite, parseFrontMatter, readInside, relativizeLinks, renderDocument, renderPage, rootOf, scanSite } from "./site.js";

const LANDING = { route: "/", file: "apps/landing/index.html" };

/** Output file of a route: "/" → "index.html", "/docs/a/" → "docs/a/index.html". */
const outFileOf = (route) => `${route.slice(1)}index.html`;

/**
 * @param {object} options
 * @param {string} options.repoRoot   absolute path of the repository
 * @param {boolean} options.relative  pages build: relative URLs at any depth
 * @param {string} options.outRoot    build output folder
 */
export function docsSite({ repoRoot, relative: relativeUrls, outRoot }) {
  const docsDir = resolve(repoRoot, "apps/docs");
  const landingAbs = resolve(repoRoot, LANDING.file);
  const toRepo = (abs) => relative(repoRoot, abs).split(sep).join("/");
  let site = null;
  let command = "serve";
  let logger = console;
  let warn = () => {};

  const scan = () => (site ??= scanSite(docsDir, repoRoot));

  /** Every HTML document of the site: route, source file (repo-relative), kind. */
  const documents = () => [
    { ...LANDING, kind: "landing" },
    ...scan().pages.map((p) => ({ route: p.route, file: p.file, kind: "page" })),
  ];
  const routes = () => new Set(documents().map((d) => d.route));

  /** Render everything and check it; returns the link problems. */
  const check = () =>
    buildSite(scan(), {
      extra: [{ ...LANDING, html: readInside(landingAbs, [dirname(landingAbs)]) }],
    }).problems;

  return {
    name: "cai-docs-site",

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
                  return doc ? rootOf(doc.route) + filename : undefined;
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
          if (problems.length) logger.warn(`[cai-docs-site] broken links:\n  ${problems.join("\n  ")}`);
        } catch (error) {
          logger.error(`[cai-docs-site] ${error.message}`);
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
          logger.error(`[cai-docs-site] ${error.message}`);
          return next();
        }
        const file = map.get(path);
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
          out = renderPage(page, scan(), { root: relativeUrls ? rootOf(doc.route) : "/" });
        } else if (doc.kind === "landing") {
          out = renderDocument(html, file, doc.route, scan());
        }
        return relativeUrls ? relativizeLinks(out, doc.route, routes()) : out;
      },
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
