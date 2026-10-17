/**
 * LUZ docs site — the page generator, without Vite.
 *
 * apps/docs/pages/ holds one HTML fragment per page, with its front matter in
 * a leading `<!-- luz:page … -->` comment. This module scans that folder,
 * works out each page's route, renders it inside its layout with the shared
 * partials, and checks every internal link. plugin.js wires it into Vite;
 * the unit tests (tests/docs-site.test.js) call it directly, so the build
 * and the tests read the same route table.
 *
 * What the generator writes around each page, from the front matter of all
 * of them (one data source, so they never disagree): the sidebar (the areas,
 * only the current one expanded), the breadcrumb, the page title and lead,
 * "On this page", "Keep going" and Previous / Next, the galleries of the area index pages and
 * the A–Z index. apps/docs/404.html is the not-found page: its URLs start at
 * the site's path, because GitHub Pages serves it at any URL.
 *
 * Template syntax, on purpose only these:
 *   <!-- luz:include name -->   a file of _partials/ or of apps/site/_partials (name: [a-z0-9-]+)
 *   {{key}}                      a fixed set of values (the landing, layouts and partials)
 *   {{t:key}} / {{html:key}}     a string of the page's language catalog
 *                                (apps/landing/i18n/, see i18n.js)
 * No loops, no conditionals. Anything unknown fails the build.
 *
 * The home page is one template rendered once per language of
 * apps/landing/i18n/locales.json ("/", "/es/", "/ar/"); the documentation
 * is English only and renders the shared partials with the default catalog.
 *
 * Security (.claude/plans/docs-redesign/security.md, SEC-PLG-*): files are
 * read only inside apps/docs/ (and the landing page), after checking the real
 * path; no symlinks; route segments use a strict alphabet; expansion is a
 * single pass, so text a substitution produced is never expanded again.
 */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { HtmlError, readHtml, tags } from "./html.js";
import { SITE_KINDS } from "../luz-packages.js";
import { fillAiMarkers } from "./ai.js";
import { renderSnippets, snippetData } from "./snippets.js";
import { assertInlineHtml, loadLocales, lookup, markDocsLinks, renderAlternates, renderLangLinks, renderSwitcher, unusedKeys } from "./i18n.js";

/** Where the docs pages are published. */
export const DOCS_ROUTE = "/docs/";
/** The not-found page: a file at the site root, served by GitHub Pages for any missing URL. */
export const NOT_FOUND_ROUTE = "/404.html";
export const NOT_FOUND_FILE = "404.html";
/** The last part of every page title, and the whole title of the hub. */
export const SITE_TITLE = "LUZ documentation";

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
const NAME = /^[a-z0-9-]+$/;
const MAX_INCLUDE_DEPTH = 3;
/** Links of an area's "Keep going" list (site.json `essentials`). */
export const MAX_ESSENTIALS = 3;

/** Front matter keys: required, or the default when missing. */
const FRONT_MATTER = {
  title: { required: true },
  description: { required: true },
  area: { required: true },
  order: { default: "1000" },
  // Other names for the page, comma-separated ("navbar" for Site header): the search finds the
  // page by them, after its area, and the A–Z index lists them as "Another name for"
  keywords: { default: "" },
  layout: { default: "page" },
  nav: { default: "true" },
  search: { default: "true" },
  toc: { default: "h2" },
  // A group of the area (site.json): a heading of its gallery, or a labelled
  // sub-list of the sidebar
  group: { default: "" },
  // Shown next to the h1: the CSS files and the JS module of a component
  files: { default: "" },
  module: { default: "" },
  // "false" when the page's content starts with its own lead paragraph
  lead: { default: "true" },
  // A block the generator writes after the content: "gallery", "a-z" or "snippets"; "ai" writes
  // its tables where the content has `<!-- luz:ai files -->` and `<!-- luz:ai rules -->`
  generate: { default: "" },
};

/** The values a layout or partial may use as {{key}}. */
const PLACEHOLDERS = new Set([
  "title", "doctitle", "description", "root", "content", "nav", "pagehead", "toc", "endnav", "generated",
  // The page's language (i18n.js): its code and direction, its home page, the
  // <link rel="alternate"> of every language, the language switcher
  "lang", "dir", "home", "alternates", "langswitch", "langlinks",
  // The version the packages share (packages/core/package.json): the CDN snippets and the footer of the home
  "version",
]);
/** Values inserted as HTML, not escaped. Only the generator produces them. */
const RAW_VALUES = new Set(["content", "nav", "pagehead", "toc", "endnav", "generated", "alternates", "langswitch", "langlinks"]);

/** Where the home page's languages live, from the repository root. */
export const I18N_DIR = "apps/landing/i18n";

/** Partials whose links to the current page and its parents get aria-current. */
const CURRENT_PARTIALS = new Set(["header", "site-links"]);

/** The area id of the documentation home page and the A–Z index (not a sidebar area). */
export const HUB_AREA = "hub";

/**
 * Headings every component page has: not listed in the A–Z index, which
 * names what is specific to a page.
 */
const TEMPLATE_HEADINGS = new Set([
  "Example", "Known issues", "Code", "Design", "Copy the markup", "Variants and options", "How it works",
  "Without JavaScript", "Keyboard and ARIA", "When to use", "When not to use", "Do and don't",
  "Writing the content", "Contrast and focus", "Tokens it uses",
]);

/**
 * The areas that document a package of patterns built on core: one per
 * package, named as the package, except docs, whose area is `documentation`
 * (/docs/docs/ would read as a typo).
 */
const AREA_OF_PACKAGE = { docs: "documentation" };
const PACKAGE_AREAS = new Set(["site", ...SITE_KINDS.map((name) => AREA_OF_PACKAGE[name] ?? name)]);

/** What an A–Z entry is, by the area of its page. */
const AREA_KIND = {
  "get-started": "Get started",
  components: "Component",
  tokens: "Token page",
  site: "Site pattern",
  landing: "Landing pattern",
  cms: "CMS pattern",
  app: "App pattern",
  documentation: "Documentation pattern",
  html: "HTML elements",
  accessibility: "Accessibility",
  hub: "Documentation",
};

/* ---- Small pure helpers ------------------------------------------------ */

/** Escape a value for an attribute or text context. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Folders between a route and the site root: "/" → 0, "/docs/a/" → 2, "/404.html" → 0. */
export function depthOf(route) {
  return route.split("/").filter((part) => part && !part.endsWith(".html")).length;
}

/** Relative path from a route back to the site root: "./", "../", "../../". */
export function rootOf(route) {
  return "../".repeat(depthOf(route)) || "./";
}

/**
 * Route of a page from its path inside pages/ (posix separators):
 * "index.html" → "/docs/", "tokens/index.html" → "/docs/tokens/",
 * "components/button.html" → "/docs/components/button/".
 */
export function routeOfPage(path, file = path) {
  const parts = path.split("/");
  const last = parts.pop();
  if (!last.endsWith(".html")) throw new Error(`${file}: a page is an .html file`);
  const name = last.slice(0, -".html".length);
  for (const segment of [...parts, name]) {
    if (!SEGMENT.test(segment)) {
      throw new Error(`${file}: "${segment}" is not a valid route segment (lowercase letters, digits and "-", not starting with "-")`);
    }
  }
  if (name !== "index") parts.push(name);
  return DOCS_ROUTE + parts.map((p) => `${p}/`).join("");
}

/**
 * The site links that are current on a route, with their aria-current
 * value: "page" for the link to the route itself, "true" for its parents.
 * Home on "/" (and on each home page of `homes`, "/es/"…); Docs on every
 * docs page ("page" only on the hub); Components on the gallery ("page") and
 * on every page of the Components area ("true").
 */
export function currentOf(route, homes = ["/"]) {
  const marks = new Map();
  if (route === "/" || homes.includes(route)) marks.set(route, "page");
  if (route.startsWith(DOCS_ROUTE)) {
    marks.set(DOCS_ROUTE, route === DOCS_ROUTE ? "page" : "true");
    const components = `${DOCS_ROUTE}components/`;
    if (route.startsWith(components)) marks.set(components, route === components ? "page" : "true");
  }
  return marks;
}

/**
 * Read the front matter of a page source. Returns { meta, body, bodyLine }:
 * `body` is the fragment after the comment (leading blank lines and the final
 * newline removed), `bodyLine` the line of the source where it starts.
 */
export function parseFrontMatter(source, file, areas = null) {
  const match = /^<!-- luz:page\n([\s\S]*?)\n-->\n/.exec(source);
  if (!match) throw new Error(`${file}:1: a page starts with a <!-- luz:page … --> front matter comment`);
  const meta = {};
  match[1].split("\n").forEach((line, i) => {
    const where = `${file}:${i + 2}`;
    if (!line.trim()) return;
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`${where}: front matter lines are "key: value"`);
    const [, key, value] = kv;
    if (!(key in FRONT_MATTER)) throw new Error(`${where}: unknown front matter key "${key}"`);
    if (key in meta) throw new Error(`${where}: "${key}" is set twice`);
    meta[key] = value.trim();
  });
  for (const [key, rule] of Object.entries(FRONT_MATTER)) {
    if (meta[key] === undefined || meta[key] === "") {
      if (rule.required) throw new Error(`${file}: front matter needs "${key}"`);
      meta[key] = rule.default;
    }
  }
  if (!NAME.test(meta.layout)) throw new Error(`${file}: layout "${meta.layout}" is not a valid name`);
  if (!/^\d+$/.test(meta.order)) throw new Error(`${file}: order "${meta.order}" is not a whole number`);
  for (const key of ["nav", "search", "lead"]) {
    if (!["true", "false"].includes(meta[key])) throw new Error(`${file}: ${key} is "true" or "false"`);
  }
  if (!["h2", "h2,h3", "false"].includes(meta.toc)) throw new Error(`${file}: toc is "h2", "h2,h3" or "false"`);
  if (!["", "gallery", "a-z", "snippets", "ai"].includes(meta.generate)) throw new Error(`${file}: generate is "gallery", "a-z", "snippets" or "ai"`);
  if (meta.group && !NAME.test(meta.group)) throw new Error(`${file}: group "${meta.group}" is not a valid name`);
  if (areas && meta.area !== HUB_AREA) {
    const area = areas.find((a) => a.id === meta.area);
    if (!area) throw new Error(`${file}: unknown area "${meta.area}" (site.json has ${areas.map((a) => a.id).join(", ")})`);
    if (meta.group && !(area.groups ?? []).some((g) => g.id === meta.group)) {
      throw new Error(`${file}: area "${meta.area}" has no group "${meta.group}" in site.json`);
    }
  }

  const rest = source.slice(match[0].length);
  const leading = /^(?:[ \t]*\n)*/.exec(rest)[0];
  const bodyLine = source.slice(0, match[0].length + leading.length).split("\n").length;
  const body = rest.slice(leading.length).replace(/\n$/, "");
  return { meta, body, bodyLine };
}

/* ---- Reading files safely ---------------------------------------------- */

/**
 * Read a file only if it is a regular file (not a symlink) whose real path is
 * inside one of `roots` (SEC-PLG-1, SEC-PLG-2). A root that is itself a
 * symlink is refused: its real path would follow the link, and anything
 * behind it would count as inside.
 */
export function readInside(path, roots) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) throw new Error(`${path}: not found`);
  if (stat.isSymbolicLink()) throw new Error(`${path}: symlinks are not allowed in the docs sources`);
  if (!stat.isFile()) throw new Error(`${path}: not a file`);
  const real = realpathSync(path);
  const inside = roots.some((root) => {
    if (lstatSync(root).isSymbolicLink()) throw new Error(`${root}: symlinks are not allowed in the docs sources`);
    const realRoot = realpathSync(root);
    return real === realRoot || real.startsWith(realRoot + sep);
  });
  if (!inside) throw new Error(`${path}: outside the docs sources`);
  return readFileSync(real, "utf-8");
}

/* ---- Scanning the site ------------------------------------------------- */

/**
 * Scan apps/docs: site.json, every page under pages/ and the not-found page
 * (404.html, optional). Files and folders whose name starts with "_" are not
 * pages. Returns { docsDir, repoRoot, areas, pages: [{ file, abs, route,
 * depth, meta, body, bodyLine }], notFound (or null), byRoute: Map, byFile:
 * Map (absolute path → page) }, pages sorted by route.
 */
export function scanSite(docsDir, repoRoot = resolve(docsDir, "../..")) {
  const rel = (p) => relative(repoRoot, p).split(sep).join("/");
  const roots = [docsDir];
  const { areas } = JSON.parse(readInside(join(docsDir, "site.json"), roots));
  const validGroups = (groups) =>
    groups === undefined || (Array.isArray(groups) && groups.every((g) => NAME.test(g?.id ?? "") && typeof g.label === "string"));
  if (!Array.isArray(areas) || areas.some((a) => !NAME.test(a?.id ?? "") || typeof a.label !== "string" || !NAME.test(a.slug ?? "") || !validGroups(a.groups))) {
    throw new Error(`${rel(join(docsDir, "site.json"))}: "areas" is a list of { id, label, slug, groups?, essentials? }`);
  }

  const pagesDir = join(docsDir, "pages");
  const pages = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const abs = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`${rel(abs)}: symlinks are not allowed in the docs sources`);
      if (entry.name.startsWith("_")) continue;
      if (entry.isDirectory()) {
        if (!SEGMENT.test(entry.name)) throw new Error(`${rel(abs)}: "${entry.name}" is not a valid route segment`);
        walk(abs, `${prefix}${entry.name}/`);
      } else if (entry.isFile()) {
        const file = rel(abs);
        const route = routeOfPage(`${prefix}${entry.name}`, file);
        const { meta, body, bodyLine } = parseFrontMatter(readInside(abs, roots), file, areas);
        pages.push({ file, abs, route, depth: depthOf(route), meta, body, bodyLine });
      } else {
        throw new Error(`${rel(abs)}: only .html files and folders belong in pages/`);
      }
    }
  };
  walk(pagesDir, "");

  const byRoute = new Map();
  for (const page of pages) {
    const other = byRoute.get(page.route);
    if (other) throw new Error(`${page.file} and ${other.file} both make ${page.route}: keep one`);
    byRoute.set(page.route, page);
  }
  // "Keep going" of each area: up to MAX_ESSENTIALS pages of the site, data not code
  for (const area of areas) {
    const where = `${rel(join(docsDir, "site.json"))}: area "${area.id}"`;
    const list = area.essentials ?? [];
    if (!Array.isArray(list) || list.length > MAX_ESSENTIALS) throw new Error(`${where}: "essentials" is a list of up to ${MAX_ESSENTIALS} { href, label? }`);
    for (const item of list) {
      if (typeof item?.href !== "string" || (item.label !== undefined && (typeof item.label !== "string" || !item.label.trim()))) {
        throw new Error(`${where}: an essential is { href, label? }`);
      }
      if (!byRoute.has(item.href)) throw new Error(`${where}: essential ${item.href} is not a page of the site`);
    }
    if (new Set(list.map((item) => item.href)).size !== list.length) throw new Error(`${where}: an essential is listed twice`);
  }
  pages.sort((a, b) => (a.route < b.route ? -1 : a.route > b.route ? 1 : 0));

  let notFound = null;
  const notFoundAbs = join(docsDir, NOT_FOUND_FILE);
  if (lstatSync(notFoundAbs, { throwIfNoEntry: false })) {
    const file = rel(notFoundAbs);
    const { meta, body, bodyLine } = parseFrontMatter(readInside(notFoundAbs, roots), file, areas);
    notFound = { file, abs: notFoundAbs, route: NOT_FOUND_ROUTE, depth: 0, meta, body, bodyLine };
  }

  // The home page's languages (i18n.js), read only inside their folder
  const i18nDir = join(repoRoot, I18N_DIR);
  const i18n = loadLocales(i18nDir, repoRoot, (abs) => readInside(abs, [i18nDir]));

  // The partials shared with the home page: a symlink or a name in both folders fails here
  sharedPartials(docsDir, repoRoot);

  const all = notFound ? [...pages, notFound] : pages;
  return { docsDir, repoRoot, areas, pages, notFound, byRoute, byFile: new Map(all.map((p) => [p.abs, p])), i18n };
}

/** The routes of the home page, one per language ("/" alone without a registry). */
export const homesOf = (site) => site.i18n?.locales.map((l) => l.route) ?? ["/"];

/* ---- The site's structure, from the front matter ------------------------ */

const byOrder = (a, b) => Number(a.meta.order) - Number(b.meta.order) || a.meta.title.localeCompare(b.meta.title, "en");

/** The area of a page, or null for the hub area. */
export function areaOf(site, page) {
  return site.areas.find((a) => a.id === page.meta.area) ?? null;
}

/** The route of an area's index page. */
export const areaRoute = (area) => `${DOCS_ROUTE}${area.slug}/`;

/** The index page of an area, or null while it has none. */
export function indexOf(site, area) {
  return site.byRoute.get(areaRoute(area)) ?? null;
}

/**
 * The pages of an area under its index, in sidebar order: the pages without a
 * sidebar group first, then each group marked `sidebar: true` in site.json.
 * Returns [{ group (null or a site.json group), pages }].
 */
export function sectionsOf(site, area) {
  const index = areaRoute(area);
  const pages = site.pages
    .filter((p) => p.meta.area === area.id && p.route !== index && p.meta.nav !== "false")
    .sort(byOrder);
  const sidebarGroups = (area.groups ?? []).filter((g) => g.sidebar);
  const inGroup = (p, g) => p.meta.group === g.id;
  return [
    { group: null, pages: pages.filter((p) => !sidebarGroups.some((g) => inGroup(p, g))) },
    ...sidebarGroups.map((g) => ({ group: g, pages: pages.filter((p) => inGroup(p, g)) })),
  ].filter((s) => s.pages.length);
}

/** The pages of an area under its index in sidebar order, flat. */
const flatPagesOf = (site, area) => sectionsOf(site, area).flatMap((s) => s.pages);

/**
 * The reading order of Previous / Next: the sidebar order across the areas,
 * each area's index first. The hub area (the home, the A–Z index) and the
 * not-found page are not in it. Cached on the site.
 */
export function readingOrder(site) {
  site.readingOrder ??= site.areas.flatMap((area) => [indexOf(site, area), ...flatPagesOf(site, area)].filter(Boolean));
  return site.readingOrder;
}

/** The pages before and after a page in the reading order: { prev, next } (null at the ends), or null when it is not in it. */
export function neighboursOf(site, page) {
  const order = readingOrder(site);
  const i = order.findIndex((p) => p.route === page.route);
  if (i === -1) return null;
  return { prev: order[i - 1] ?? null, next: order[i + 1] ?? null };
}

/**
 * The "Keep going" links of a page: its area's `essentials` (site.json), in
 * that order, without the page itself and without its Previous / Next (the
 * pager below already links them). [{ route, label }].
 */
export function essentialsOf(site, page) {
  const area = areaOf(site, page);
  if (!area) return [];
  const { prev, next } = neighboursOf(site, page) ?? {};
  const skip = new Set([page.route, prev?.route, next?.route]);
  return (area.essentials ?? [])
    .filter((item) => !skip.has(item.href))
    .map((item) => ({ route: item.href, label: item.label ?? site.byRoute.get(item.href).meta.title }));
}

/** The text of <title>: "<h1> – <Area> – LUZ documentation", shorter on the hub and area indexes. */
export function docTitleOf(site, page) {
  if (page.route === DOCS_ROUTE || page.meta.title === SITE_TITLE) return SITE_TITLE;
  const area = areaOf(site, page);
  if (!area || page.meta.title === area.label) return `${page.meta.title} – ${SITE_TITLE}`;
  return `${page.meta.title} – ${area.label} – ${SITE_TITLE}`;
}

/** The headings of a page's own content (cached): readHtml() of its body. */
function contentOf(page) {
  page.parsed ??= readHtml("\n".repeat(page.bodyLine - 1) + page.body, page.file);
  return page.parsed;
}

/* ---- Generated blocks --------------------------------------------------- */

const link = (href, text, attrs = "") => `<a${attrs} href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;

/**
 * The sidebar: the areas of site.json, and the pages of the current area only.
 * aria-current="page" on the current page (the area link on an area index),
 * "true" on its area link. No .is-active: that is the scroll spy's mark.
 */
export function renderNav(site, page) {
  const current = areaOf(site, page);
  const items = site.areas.map((area) => {
    const route = areaRoute(area);
    const here = current?.id === area.id;
    const mark = !here ? "" : page.route === route ? ' aria-current="page"' : ' aria-current="true"';
    const href = indexOf(site, area) ? route : area.fallback ?? route;
    const head = link(href, area.label, ` class="luz-sidebar__link docs-nav__area"${mark}`);
    if (!here) return `      <li>${head}</li>`;
    const item = (p) =>
      `<li>${link(p.route, p.meta.title, ` class="luz-sidebar__link"${p.route === page.route ? ' aria-current="page"' : ""}`)}</li>`;
    const children = sectionsOf(site, area).flatMap(({ group, pages }) =>
      group
        ? [
            `<li class="docs-nav__group"><span class="luz-sidebar__section-label" id="nav-${group.id}">${escapeHtml(group.label)}</span>`,
            `  <ul class="docs-nav__pages" aria-labelledby="nav-${group.id}">`,
            ...pages.map((p) => `    ${item(p)}`),
            "  </ul>",
            "</li>",
          ]
        : pages.map(item),
    );
    if (!children.length) return `      <li>${head}</li>`;
    const body = ['<ul class="docs-nav__pages">', ...children.map((c) => `  ${c}`), "</ul>"].join("\n        ");
    return `      <li>${head}\n        ${body}\n      </li>`;
  });
  return `    <ul class="docs-nav">\n${items.join("\n")}\n    </ul>`;
}

/**
 * The breadcrumb: Docs › Area › Page, as the APG pattern has it (a labelled
 * nav, an ordered list, aria-current="page" on the last item). None on the
 * hub and the not-found page.
 */
export function renderBreadcrumb(site, page) {
  if (page.route === DOCS_ROUTE || page.route === NOT_FOUND_ROUTE) return "";
  const area = areaOf(site, page);
  const trail = [link(DOCS_ROUTE, "Docs", ' class="luz-breadcrumb__item"')];
  if (area && page.route !== areaRoute(area) && indexOf(site, area)) {
    trail.push(link(areaRoute(area), area.label, ' class="luz-breadcrumb__item"'));
  }
  trail.push(`<span class="luz-breadcrumb__item" aria-current="page">${escapeHtml(page.meta.title)}</span>`);
  const items = trail.map((item) => `        <li>${item}</li>`).join("\n");
  return `    <nav class="docs-breadcrumb" aria-label="Breadcrumb">\n      <ol class="luz-breadcrumb">\n${items}\n      </ol>\n    </nav>`;
}

/** Breadcrumb, h1 (with the component's files and JS module), and the lead. */
export function renderPageHead(site, page) {
  const meta = [
    ...page.meta.files.split(",").map((f) => f.trim()).filter(Boolean).map((f) => `<code class="docs-demo__file">${escapeHtml(f)}</code>`),
    ...(page.meta.module ? [`<span class="luz-tag luz-tag--purple">JS: ${escapeHtml(page.meta.module)}</span>`] : []),
  ];
  const title = meta.length
    ? `    <div class="docs-title-row">\n      <h1 class="docs-title">${escapeHtml(page.meta.title)}</h1>\n      ${meta.join("\n      ")}\n    </div>`
    : `    <h1 class="docs-title">${escapeHtml(page.meta.title)}</h1>`;
  const lead = page.meta.lead === "true" ? `\n    <p class="docs-lead">${escapeHtml(page.meta.description)}</p>` : "";
  const crumb = renderBreadcrumb(site, page);
  return `  <div class="luz-docs-page-head">\n${crumb ? `${crumb}\n` : ""}${title}${lead}\n  </div>`;
}

/**
 * "On this page": the h2 (or h2 and h3) of the content that have an id,
 * outside demos. Only on a page with three or more h2. Each h3 is listed
 * under its h2, in a nested list (on a component page: the sections of the
 * Code and of the Design tab, both, whichever tab is open; core's tabs.js
 * opens the tab of a section a link points at). A closed <details> on narrow
 * screens; the docs script opens it as a rail on wide ones and marks the
 * section in view (core's initSidebar).
 */
export function renderToc(page, html) {
  if (page.meta.toc === "false") return "";
  const levels = page.meta.toc === "h2,h3" ? [2, 3] : [2];
  const headings = readHtml(html, page.file).headings.filter((h) => levels.includes(h.level) && !h.specimen);
  if (headings.filter((h) => h.level === 2).length < 3) return "";
  const missing = headings.find((h) => !h.id);
  if (missing) throw new Error(`${page.file}: the heading "${missing.text}" belongs in "On this page" and needs an id`);
  if (headings[0].level !== 2) throw new Error(`${page.file}: the h3 "${headings[0].text}" comes before any h2`);
  const item = (h) => link(`#${h.id}`, h.text, ' class="luz-sidebar__link luz-docs-rail__link"');
  const lines = [];
  headings.forEach((h, i) => {
    const next = headings[i + 1];
    if (h.level === 2) {
      lines.push(next?.level === 3 ? `        <li>${item(h)}\n          <ul class="luz-docs-rail__sub">` : `        <li>${item(h)}</li>`);
      return;
    }
    lines.push(`            <li>${item(h)}</li>`);
    if (next?.level !== 3) lines.push("          </ul>\n        </li>");
  });
  return `  <nav class="luz-docs-rail__onpage" aria-labelledby="docs-rail-title">\n    <details class="luz-docs-rail__fold">\n      <summary class="luz-docs-rail__title" id="docs-rail-title">On this page</summary>\n      <ul class="luz-docs-rail__list">\n${lines.join("\n")}\n      </ul>\n    </details>\n  </nav>`;
}

/**
 * The end of a page: "Keep going", a labelled nav with the area's essential
 * links, then Previous / Next in the reading order (across areas: an area's
 * index leads to its first page, its last page to the next area's index).
 * Each pager link is one block, a small "Previous" / "Next" above the page's
 * title; its name is "Previous: <title>", an aria-label that starts with
 * the visible text (from the two lines alone Chrome makes "Previous
 * Breadcrumb"). Nothing on the hub area and the not-found page.
 */
export function renderEndNav(site, page) {
  const around = neighboursOf(site, page);
  const essentials = essentialsOf(site, page);
  if (!around && !essentials.length) return "";
  const lines = ['  <nav class="docs-end" aria-labelledby="docs-end-title">', '    <h2 class="docs-end__title" id="docs-end-title">Keep going</h2>'];
  if (essentials.length) {
    lines.push('    <ul class="docs-end__links">', ...essentials.map((e) => `      <li>${link(e.route, e.label)}</li>`), "    </ul>");
  }
  const pager = [];
  for (const [key, label, rel] of [["prev", "Previous", "prev"], ["next", "Next", "next"]]) {
    const target = around?.[key];
    if (!target) continue;
    pager.push(
      `      <li class="luz-docs-pager__${key}"><a class="luz-docs-pager__link" rel="${rel}" href="${escapeHtml(target.route)}" aria-label="${label}: ${escapeHtml(target.meta.title)}">` +
        `<span class="luz-docs-pager__label">${label}</span> ` +
        `<span class="luz-docs-pager__title">${escapeHtml(target.meta.title)}</span></a></li>`,
    );
  }
  if (pager.length) lines.push('    <ul class="luz-docs-pager">', ...pager, "    </ul>");
  lines.push("  </nav>");
  return lines.join("\n");
}

/**
 * The gallery of an area index: one h2 per group of site.json (in its
 * order), a card per page with its name as the one link and its
 * description; a group marked `list: true` is a plain list.
 */
export function renderGallery(site, page) {
  const area = areaOf(site, page);
  if (!area) return "";
  const pages = site.pages
    .filter((p) => p.meta.area === area.id && p.route !== areaRoute(area) && p.meta.nav !== "false")
    .sort(byOrder);
  const groups = [...(area.groups ?? []), { id: "", label: "" }];
  const card = (p) =>
    `      <li class="luz-card docs-card">\n        <h3 class="luz-card__title docs-card__title">${link(p.route, p.meta.title)}</h3>\n        <p class="luz-card__body docs-card__desc">${escapeHtml(p.meta.description)}</p>\n      </li>`;
  const row = (p) => `      <li>${link(p.route, p.meta.title)} <span class="docs-gallery__desc">${escapeHtml(p.meta.description)}</span></li>`;
  return groups
    .map((group) => {
      const members = pages.filter((p) => p.meta.group === group.id);
      if (!members.length) return "";
      const list = group.list
        ? `    <ul class="docs-gallery__rows">\n${members.map(row).join("\n")}\n    </ul>`
        : `    <ul class="docs-gallery__cards">\n${members.map(card).join("\n")}\n    </ul>`;
      if (!group.label) return `  <div class="docs-gallery">\n${list}\n  </div>`;
      return `  <section class="docs-gallery" aria-labelledby="group-${group.id}">\n    <h2 id="group-${group.id}">${escapeHtml(group.label)}</h2>\n${list}\n  </section>`;
    })
    .filter(Boolean)
    .join("\n");
}

/** The h2 of a component page's tab panels: its h3 belong to that tab. */
const VIEW_HEADINGS = new Set(["code", "design"]);

/** A class a page names in <code>, with its dot: `.luz-btn--primary`, `.o-container`, `.u-hidden`. */
const CLASS_NAME = /^\.(?:luz|o|u)-[a-z0-9]+(?:(?:-{1,2}|__)[a-z0-9]+)*$/;
/** A token a page names in <code>: `--luz-brand-primary`. */
const TOKEN_NAME = /^--luz-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The classes and tokens a page names in its own text (not in a demo, not in
 * a code sample), each with the section it is named in: the one that names
 * it most, the first on a tie; or the element that carries its own id (a
 * token card, `id="luz-brand-primary"`). `defined` says a card or a table of
 * classes (a cell labelled "Class…") names it. [{ text, id, tab, count, defined, token }]
 * in document order; `id` is null before the page's first heading.
 */
function namesOf(page, byId) {
  const found = new Map();
  for (const code of contentOf(page).codes) {
    const token = TOKEN_NAME.test(code.text);
    if (code.specimen || !(token || CLASS_NAME.test(code.text))) continue;
    // A card with the name for its id (a token), or the cell of a table of classes
    const own = code.own === code.text.replace(/^[.-]+/, "");
    const id = own ? code.own : code.heading;
    const where = found.get(code.text) ?? found.set(code.text, { token, named: true, targets: new Map() }).get(code.text);
    const target = where.targets.get(id) ?? where.targets.set(id, { id, tab: byId.get(code.heading)?.tab ?? null, count: 0, defined: false }).get(id);
    target.count++;
    target.defined ||= own || /^class/i.test(code.cell ?? "");
  }
  // A colour drawn as a swatch and named nowhere in a <code> (a primitive of the palette): the
  // label of its scale, where the page defines it
  const { swatches, ids } = contentOf(page);
  for (const { token: text, heading, own } of swatches) {
    if (!TOKEN_NAME.test(text)) continue;
    const id = ids.has(own) ? own : heading;
    const where = found.get(text) ?? found.set(text, { token: true, targets: new Map() }).get(text);
    if (where.named) continue;
    const target = where.targets.get(id) ?? where.targets.set(id, { id, tab: byId.get(heading)?.tab ?? null, count: 0, defined: true }).get(id);
    target.count++;
  }
  return [...found].map(([text, { token, targets }]) => {
    const all = [...targets.values()];
    // Where it is defined, then where it is named most; Map keeps insertion order, so a tie is the first
    const best = all.reduce((a, b) => (Number(b.defined) - Number(a.defined) || b.count - a.count) > 0 ? b : a);
    return { text, id: best.id, tab: best.tab, count: all.reduce((n, t) => n + t.count, 0), defined: best.defined, token };
  });
}

/**
 * What the A–Z index and the search index are both made of, so the two never
 * disagree: every page that is not marked `search: false`, with its headings
 * (the levels of its "On this page", outside demos), its HTML element
 * cards (the h2 `el-<name>-title`), its keywords (other names for the page)
 * and the classes and tokens it names.
 * Returns [{ page, title, route, area (label or null), kind, keywords,
 * sections: [{ text, id, tab (label of its tab or null), template }],
 * elements: [{ text, id }], names: [{ text, id, tab }] }] in route order.
 * `template` marks a heading every component page has ("When to use"): it
 * names nothing on its own. A class or a token is listed once, on the page
 * that documents it: where a card or a table of classes defines it, then a
 * page of the tokens area, then the one that names it most.
 */
export function indexData(site) {
  const data = site.pages
    .filter((page) => page.meta.search !== "false")
    .map((page) => {
      const area = areaOf(site, page);
      // The index of a package's area is the package ("Site", "Landing", "CMS"), not one of its patterns
      const kind = PACKAGE_AREAS.has(area?.id) && page.route === areaRoute(area) ? area.label : AREA_KIND[page.meta.area] ?? "Page";
      // The levels "On this page" lists: on a component page, the h3 of its tabs too
      const sectionLevels = page.meta.toc === "h2,h3" ? [2, 3] : [2];
      const sections = [];
      const elements = [];
      let tab = null;
      for (const h of contentOf(page).headings) {
        if (h.specimen || !h.id) continue;
        if (h.level === 2) tab = VIEW_HEADINGS.has(h.id) ? h.text : null;
        const element = /^el-(.+)-title$/.exec(h.id);
        if (element && h.level === 2) {
          elements.push({ text: `${h.text} element`, id: `el-${element[1]}` });
        } else if (sectionLevels.includes(h.level) && h.text !== page.meta.title) {
          sections.push({ text: h.text, id: h.id, tab: h.level > 2 ? tab : null, template: TEMPLATE_HEADINGS.has(h.text) });
        }
      }
      const keywords = page.meta.keywords.split(",").map((k) => k.trim()).filter(Boolean);
      // An area index only introduces: what it names, a page of its area names for real
      const candidates = area && page.route === areaRoute(area) ? [] : namesOf(page, new Map(sections.map((s) => [s.id, s])));
      return { page, title: page.meta.title, route: page.route, area: area?.label ?? null, kind, keywords, sections, elements, names: [], candidates };
    });
  // Each name goes to one page. Tokens: a page of the tokens area. Then the page that names most of
  // its family (`.luz-btn` with `.luz-btn--primary`, `--luz-space` with `--luz-space-md`), where it
  // is defined, the page named after it (`.luz-select`, Select), and the page that names it most.
  const block = (c) => (c.token ? c.text.split("-").slice(0, 4).join("-") : c.text.split(/--|__/)[0]);
  for (const entry of data) {
    const family = new Map();
    for (const c of entry.candidates) family.set(block(c), (family.get(block(c)) ?? 0) + 1);
    entry.family = family;
  }
  const score = (entry, c) =>
    [c.token && entry.page.meta.area === "tokens", entry.family.get(block(c)), c.defined, c.text.includes(entry.route.split("/").at(-2)), c.count].map(Number);
  const beats = (a, b) => {
    const i = a.findIndex((v, k) => v !== b[k]);
    return i > -1 && a[i] > b[i];
  };
  const owner = new Map();
  for (const entry of data) {
    for (const c of entry.candidates) {
      const best = owner.get(c.text);
      if (!best || beats(score(entry, c), score(best.entry, best.c))) owner.set(c.text, { entry, c });
    }
  }
  for (const entry of data) {
    entry.names = entry.candidates.filter((c) => owner.get(c.text).entry === entry).map(({ text, id, tab }) => ({ text, id, tab }));
    delete entry.candidates;
    delete entry.family;
  }
  return data;
}

/**
 * Every entry of the A–Z index: each page, each other name of a page (its
 * `keywords`), each heading specific to a page (template headings left out),
 * and each HTML element card. The search index has all of these and more:
 * the template headings, and the classes and tokens (about 300 names, which
 * would take the page past its size ceiling).
 * Returns [{ name, href, kind }] sorted by name.
 */
export function indexEntries(site) {
  const entries = [];
  for (const { title, route, kind, keywords, sections, elements } of indexData(site)) {
    entries.push({ name: title, href: route, kind });
    for (const k of aliasesOf(title, keywords)) entries.push({ name: k, href: route, kind: `Another name for ${title}` });
    for (const s of sections) if (!s.template) entries.push({ name: s.text, href: `${route}#${s.id}`, kind: `Section of ${title}` });
    for (const e of elements) entries.push({ name: e.text, href: `${route}#${e.id}`, kind: `HTML element, ${title}` });
  }
  const key = (e) => e.name.replace(/^[^\p{L}\p{N}]+/u, "");
  return entries.sort((a, b) => key(a).localeCompare(key(b), "en", { sensitivity: "base" }) || a.href.localeCompare(b.href));
}

/** The keywords of a page that its title does not already say. */
const aliasesOf = (title, keywords) => {
  const said = ` ${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return keywords.filter((k) => !said.includes(` ${k.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `));
};

/** Where the search index is published, next to the pages it points at. */
export const SEARCH_INDEX_ROUTE = `${DOCS_ROUTE}search-index.json`;

/** Template headings the search leaves out: the page itself, or its tab row. */
const NOT_SEARCHED = new Set(["example", "code", "design"]);

/**
 * The search index of @luz-ds/site's search (format version 1, the
 * public contract documented on /docs/site/search/), from the same data
 * as the A–Z index: three lists of [text, url, meta?]. URLs are relative to
 * the JSON file, so the site works under any path; a section's URL carries
 * its page and its fragment, since "#how" exists on many pages. A section
 * names its page (and tab) in its meta, ["When to use", url, "Button ›
 * Design"], read after it, so it makes sense alone (a11y.md SRCH-19) and is
 * found by the page's name (the search reads the meta too); that is why
 * template headings are kept here. An element names its page in its text.
 * A class or a token is a section too: [".luz-btn--primary", url, "Button ›
 * Code"], at the part of the page that names it. A page's other names (its
 * `keywords`) follow its area in the meta of the page. Plain data for
 * JSON.stringify (SEC-PLG-9).
 */
export function buildSearchIndex(site) {
  const url = (route, id = "") => (route.slice(DOCS_ROUTE.length) || "./") + (id && `#${id}`);
  const index = { version: 1, pages: [], sections: [], elements: [] };
  for (const { title, route, area, keywords, sections, elements, names } of indexData(site)) {
    const meta = [area, aliasesOf(title, keywords).join(", ")].filter(Boolean).join(" · ");
    index.pages.push(meta ? [title, url(route), meta] : [title, url(route)]);
    for (const s of sections) {
      if (!NOT_SEARCHED.has(s.id)) index.sections.push([s.text, url(route, s.id), `${title}${s.tab ? ` › ${s.tab}` : ""}`]);
    }
    for (const n of names) index.sections.push([n.text, url(route, n.id ?? ""), `${title}${n.tab ? ` › ${n.tab}` : ""}`]);
    for (const e of elements) index.elements.push([`${e.text}, ${title}`, url(route, e.id)]);
  }
  return index;
}

/**
 * The A–Z index is two pages, so neither passes the ceiling of a docs page
 * (RL-17): the first holds the letters A–L, the second M–Z and then "Other"
 * (a name that starts with neither). Each lists its own half of the same
 * indexEntries(), so the two never disagree and every entry is on one page.
 */
export const AZ_PAGES = [
  { route: `${DOCS_ROUTE}a-z/`, label: "A–L", letters: [..."ABCDEFGHIJKL"] },
  { route: `${DOCS_ROUTE}a-z/m-z/`, label: "M–Z", letters: [..."MNOPQRSTUVWXYZ", "#"] },
];

/** The letter an entry is filed under: its first letter or digit, A–Z, else "#" (Other). */
const azLetterOf = (name) => {
  const first = name.replace(/^[^\p{L}\p{N}]+/u, "")[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
};
const azIdOf = (letter) => (letter === "#" ? "az-other" : `az-${letter.toLowerCase()}`);

/**
 * One page of the A–Z index (`page` is the one being rendered; the first half
 * when it is not one of AZ_PAGES): a nav to the two halves, the row of letters
 * (a letter of the other half links to its section there), then one h2 and one
 * list per letter of this half that has entries.
 */
export function renderAZ(site, page) {
  const groups = new Map();
  for (const entry of indexEntries(site)) {
    const letter = azLetterOf(entry.name);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(entry);
  }
  const half = AZ_PAGES.find((p) => p.route === page?.route) ?? AZ_PAGES[0];
  const halves = AZ_PAGES.map((p) => `<li>${link(p.route, p.label, p === half ? ' aria-current="page"' : "")}</li>`).join("");
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  const jump = letters
    .map((l) => {
      if (!groups.has(l)) return `<li><span>${l}</span></li>`;
      const there = AZ_PAGES.find((p) => p.letters.includes(l));
      return `<li>${link(there === half ? `#${azIdOf(l)}` : `${there.route}#${azIdOf(l)}`, l)}</li>`;
    })
    .join("");
  const sections = half.letters
    .filter((l) => groups.has(l))
    .map((l) => {
      const id = azIdOf(l);
      const heading = l === "#" ? "Other" : l;
      const items = groups
        .get(l)
        .map((e) => `      <li>${link(e.href, e.name)} <span class="docs-az__kind">${escapeHtml(e.kind)}</span></li>`)
        .join("\n");
      return `  <section class="docs-az__letter" aria-labelledby="${id}">\n    <h2 id="${id}">${heading}</h2>\n    <ul class="docs-az__list">\n${items}\n    </ul>\n  </section>`;
    });
  return `  <nav class="docs-az__halves" aria-label="Parts of the index">\n    <ul>${halves}</ul>\n  </nav>\n  <nav class="docs-az__letters" aria-label="Letters">\n    <ul>${jump}</ul>\n  </nav>\n${sections.join("\n")}`;
}

/* ---- Rendering --------------------------------------------------------- */

/**
 * Add aria-current to every link inside a <nav> (or a site links list) whose
 * href is a key of `marks` (Map href → "page" | "true"). The brand link,
 * outside the nav, is not a navigation item.
 */
export function markCurrent(html, marks) {
  if (!marks?.size) return html;
  return html.replace(/<(nav|ul)\b[\s\S]*?<\/\1>/g, (list) =>
    list.replace(/<a\b([^>]*?)\shref="([^"]*)"([^>]*)>/g, (whole, before, value, after) =>
      marks.has(value) && !/\saria-current=/.test(before + after) ? `<a${before} href="${value}"${after} aria-current="${marks.get(value)}">` : whole,
    ),
  );
}

/**
 * Reject markup a fragment or partial must never carry: it would override the
 * page's CSP or base URL, or run a script (SEC-PLG-12, D5). Layouts own them.
 */
export function assertFragmentSafe(html, file) {
  for (const tag of tags(html, file)) {
    if (tag.type !== "start") continue;
    if (tag.name === "script" || tag.name === "base" || (tag.name === "meta" && tag.attrs.has("http-equiv"))) {
      throw new HtmlError(file, tag.line, `<${tag.name}> belongs in a layout, not in a page or partial`);
    }
  }
}

/**
 * Expand includes and placeholders in `template`, in one pass: the text a
 * substitution produces is never scanned again (SEC-PLG-7). The source of an
 * included partial is expanded the same way, up to MAX_INCLUDE_DEPTH, with a
 * cycle check (SEC-PLG-3). An include on a line of its own is indented to
 * that line, so partials are written without a base indentation.
 *
 * ctx: { file, partial(name) → { text, file }, values, current, placeholders,
 * stack, locale (a language of i18n.js, for {{t:…}} and {{html:…}}), used (a
 * Set of the catalog keys used), firstLine (the line of the file `template`
 * starts at) }
 */
export function expand(template, ctx) {
  const stack = ctx.stack ?? [];
  const lineAt = (offset) => (ctx.firstLine ?? 1) + (template.slice(0, offset).match(/\n/g)?.length ?? 0);
  return template.replace(/^([ \t]*)<!-- luz:include ([^\s>]*) -->|<!-- luz:include ([^\s>]*) -->|\{\{([^{}]*)\}\}/gm, (whole, indent, lineName, inlineName, key, offset) => {
    const name = lineName ?? inlineName;
    if (name !== undefined) {
      if (!NAME.test(name)) throw new Error(`${ctx.file}: include name "${name}" is not valid ([a-z0-9-]+)`);
      if (stack.includes(name)) throw new Error(`${ctx.file}: include cycle ${[...stack, name].join(" → ")}`);
      if (stack.length >= MAX_INCLUDE_DEPTH) throw new Error(`${ctx.file}: includes nest deeper than ${MAX_INCLUDE_DEPTH}`);
      const partial = ctx.partial(name);
      let text = expand(partial.text.replace(/\s+$/, ""), { ...ctx, file: partial.file, firstLine: 1, stack: [...stack, name] });
      if (CURRENT_PARTIALS.has(name)) text = markCurrent(text, ctx.current);
      if (indent) text = indent + text.replace(/\n(?=[^\n])/g, `\n${indent}`);
      return text;
    }
    // A string of the catalog: escaped text, or trusted inline HTML
    const string = /^(t|html):(.*)$/.exec(key);
    if (string) {
      const where = `${ctx.file}:${lineAt(offset)}`;
      if (!ctx.locale) {
        if (!ctx.placeholders) return whole;
        throw new Error(`${where}: {{${key}}} needs a language catalog (${I18N_DIR}/locales.json)`);
      }
      const text = lookup(ctx.locale, string[2], where, ctx.used);
      return string[1] === "t" ? escapeHtml(text) : assertInlineHtml(text, `${ctx.locale.file} "${string[2]}"`);
    }
    if (!ctx.placeholders) return whole;
    if (!PLACEHOLDERS.has(key)) throw new Error(`${ctx.file}: unknown placeholder {{${key}}}`);
    if (!(key in ctx.values)) throw new Error(`${ctx.file}: {{${key}}} has no value here`);
    return RAW_VALUES.has(key) ? ctx.values[key] : escapeHtml(ctx.values[key]);
  });
}

/** The partials the docs share with the home page (F2): the header, the site links, the footer. */
export const SHARED_PARTIALS_DIR = "apps/site/_partials";

/**
 * The shared partials folder of a repository, checked: null when there is
 * none; an error when it, or apps/site, is a symlink (SEC-PLG-1/2), or when a
 * name is in it and in apps/docs/_partials as well (one partial, one file).
 */
export function sharedPartials(docsDir, repoRoot) {
  const rel = (p) => relative(repoRoot, p).split(sep).join("/");
  const dir = join(repoRoot, SHARED_PARTIALS_DIR);
  for (const path of [dirname(dir), dir]) {
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (!stat) return null;
    if (stat.isSymbolicLink()) throw new Error(`${rel(path)}: symlinks are not allowed in the docs sources`);
    if (!stat.isDirectory()) throw new Error(`${rel(path)}: not a folder`);
  }
  const names = (folder) =>
    lstatSync(folder, { throwIfNoEntry: false })?.isDirectory() ? readdirSync(folder).filter((n) => n.endsWith(".html")) : [];
  const docsPartials = join(docsDir, "_partials");
  const both = names(dir).filter((n) => names(docsPartials).includes(n));
  if (both.length) {
    throw new Error(both.map((n) => `${rel(join(dir, n))} and ${rel(join(docsPartials, n))}: the partial "${n.slice(0, -5)}" is in both folders; keep one`).join("\n"));
  }
  return dir;
}

/**
 * A reader of partials and layouts (SEC-PLG-1/2/3). Layouts are read inside
 * apps/docs; a partial from apps/docs/_partials, else from apps/site/_partials
 * (the ones the home page shares), never from both. The roots are apps/docs
 * and apps/site/_partials, each refused if it is a symlink, so a read never
 * follows a link out of the repository.
 */
export function sourceReader(site) {
  const rel = (p) => relative(site.repoRoot, p).split(sep).join("/");
  const check = (folder, name) => {
    if (!NAME.test(name)) throw new Error(`"${name}" is not a valid ${folder.slice(1, -1)} name`);
  };
  const layout = (name) => {
    check("_layouts", name);
    const abs = join(site.docsDir, "_layouts", `${name}.html`);
    return { text: readInside(abs, [site.docsDir]), file: rel(abs) };
  };
  // A partial never carries a script, a <base> or a CSP (SEC-PLG-12): refused as it is read, with its file
  const safe = (found) => (assertFragmentSafe(found.text, found.file), found);
  const partial = (name) => safe(find(name));
  const find = (name) => {
    check("_partials", name);
    const own = join(site.docsDir, "_partials", `${name}.html`);
    const shared = sharedPartials(site.docsDir, site.repoRoot);
    if (shared) {
      const abs = join(shared, `${name}.html`);
      if (lstatSync(abs, { throwIfNoEntry: false })) return { text: readInside(abs, [shared]), file: rel(abs) };
    }
    return { text: readInside(own, [site.docsDir]), file: rel(own) };
  };
  return { partial, layout };
}

/**
 * The block a page's `generate` front matter asks for, written after its content.
 * "snippets" reads the dist/ files of the packages (snippets.js), so a missing
 * file fails the build and only warns in dev (`options.dev`).
 */
function renderGenerated(page, site, options) {
  switch (page.meta.generate) {
    case "gallery":
      return renderGallery(site, page);
    case "a-z":
      return renderAZ(site, page);
    case "snippets":
      return renderSnippets(snippetData({ root: site.repoRoot, readFile: readFileSync, dev: options.dev === true }));
    default:
      return "";
  }
}

/**
 * Render a page: its layout, with the partials, the generated blocks and the
 * page fragment. `options.root` is the {{root}} value (relative in the pages
 * build, the site's path on the not-found page).
 */
export function renderPage(page, site, options = {}) {
  const reader = options.reader ?? sourceReader(site);
  const current = currentOf(page.route);
  // The documentation is English only: the default catalog, no switcher
  const locale = site.i18n?.default;
  const strings = { locale, used: options.used };
  const expanded = expand(page.body, { file: page.file, firstLine: page.bodyLine, partial: reader.partial, current, placeholders: false, ...strings });
  // "ai" is written inside the content, at its two markers, so it is known to the table of contents
  const content = page.meta.generate === "ai" ? fillAiMarkers(expanded, site, { file: page.file }) : expanded;
  const generated = renderGenerated(page, site, options);
  const layout = reader.layout(page.meta.layout);
  return expand(layout.text, {
    file: layout.file,
    partial: reader.partial,
    current,
    placeholders: true,
    ...strings,
    values: {
      ...languageValues(site, locale),
      title: page.meta.title,
      doctitle: docTitleOf(site, page),
      description: page.meta.description,
      root: options.root ?? "/",
      content,
      nav: renderNav(site, page),
      pagehead: renderPageHead(site, page),
      toc: renderToc(page, `${content}\n${generated}`),
      endnav: renderEndNav(site, page),
      generated,
    },
  });
}

/**
 * The language values of a template: {{lang}}, {{dir}}, {{home}} and, on a
 * home page (`home: true`), {{alternates}} and {{langswitch}}; both are
 * empty on the documentation, which has one language.
 */
function languageValues(site, locale, { home = false, siteUrl = "" } = {}) {
  const i18n = site.i18n;
  const translated = home && i18n && locale;
  const values = {
    lang: locale?.code ?? "en",
    dir: locale?.dir ?? "ltr",
    home: locale?.route ?? "/",
    alternates: translated ? renderAlternates(i18n, locale, siteUrl) : "",
    langswitch: translated ? renderSwitcher(i18n, locale, lookup(locale, "lang.label", `${I18N_DIR}/${locale.code}.json`, null)) : "",
    langlinks: translated ? renderLangLinks(i18n, locale) : "",
  };
  // A repository without the packages (a fixture) has no {{version}}: a template that uses it fails
  const version = sharedVersion(site.repoRoot);
  if (version) values.version = version;
  return values;
}

/** The version of packages/core/package.json (tokens, core and site share it), or null. */
function sharedVersion(repoRoot) {
  const manifest = join(repoRoot ?? "", "packages/core/package.json");
  if (!repoRoot || !existsSync(manifest)) return null;
  const { version } = JSON.parse(readFileSync(manifest, "utf-8"));
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version)) throw new Error(`packages/core/package.json: "version" is not a version`);
  return version;
}

/**
 * Render a full document that is not a page (the landing): includes, the
 * language values and the strings of `options.locale` (a language of
 * site.i18n; the default one when not given). Links to the documentation
 * from a page in another language say hreflang="en". `options.siteUrl`
 * (the pages build) makes the canonical and alternate URLs absolute.
 */
export function renderDocument(html, file, route, site, options = {}) {
  const reader = options.reader ?? sourceReader(site);
  const locale = options.locale ?? site.i18n?.default;
  // The switcher's label is a catalog key like any other
  if (site.i18n && locale) options.used?.add("lang.label");
  const out = expand(html, {
    file,
    partial: reader.partial,
    current: currentOf(route, homesOf(site)),
    placeholders: true,
    locale,
    used: options.used,
    values: languageValues(site, locale, { home: true, siteUrl: options.siteUrl }),
  });
  return locale && site.i18n && locale !== site.i18n.default ? markDocsLinks(out, DOCS_ROUTE, site.i18n.default.code) : out;
}

/**
 * The home page in every language of the registry, as `extra` documents of
 * buildSite(): [{ route, file, html, locale }]; one, at "/", without one.
 */
export function landingDocuments(site, file, html) {
  if (!site.i18n) return [{ route: "/", file, html }];
  return site.i18n.locales.map((locale) => ({ route: locale.route, file, html, locale }));
}

/**
 * Pages build: make every root-absolute link to a known route relative to
 * `route`, so the site works under any sub-path (https://<user>.github.io/<repo>/).
 * `href="/docs/#x"` on /docs/a/ becomes `href="../../docs/#x"`. On the
 * not-found page `root` is the site's path: "/docs/" becomes "/luz/docs/".
 */
export function relativizeLinks(html, route, routes, root = rootOf(route)) {
  return html
    .replace(/href="\/([^"#?]*)(#[^"]*)?"/g, (whole, path, hash = "") =>
      routes.has(`/${path}`) ? `href="${root}${path}${hash}"` : whole,
    )
    .replaceAll(`data-luz-search-src="${SEARCH_INDEX_ROUTE}"`, `data-luz-search-src="${root}${SEARCH_INDEX_ROUTE.slice(1)}"`);
}

/* ---- Checking ---------------------------------------------------------- */

const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/**
 * Check the internal links of rendered documents.
 * docs:  [{ route, ids: Set, links: [{ href, file, line }] }]
 * known: Map route → Set of ids (or null when its ids are not checked)
 * Returns a list of problems, each "file:line: message". Rules: a link to
 * "#x" needs an element with that id on the same page; a root-absolute link
 * to a page needs a known route, with its trailing slash, and its #fragment
 * must exist on that page. Links to files (with an extension) are assets.
 */
export function checkLinks(docs, known) {
  const problems = [];
  for (const doc of docs) {
    for (const { href, file, line } of doc.links) {
      const where = `${file}:${line}`;
      if (href.startsWith("#")) {
        if (href.length > 1 && !doc.ids.has(decode(href.slice(1)))) problems.push(`${where}: ${href} is not an id on ${doc.route}`);
        continue;
      }
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const [beforeHash, hash = ""] = href.split(/#(.*)/s);
      const path = beforeHash.split("?")[0];
      if (/\.[a-z0-9]+$/i.test(path)) continue;
      if (!known.has(path)) {
        problems.push(known.has(`${path}/`) ? `${where}: ${href} needs a trailing slash (${path}/)` : `${where}: ${href} is not a page of the site`);
        continue;
      }
      const ids = known.get(path);
      if (hash && ids && !ids.has(decode(hash))) problems.push(`${where}: ${href}: #${hash} is not an id on ${path}`);
    }
  }
  return problems;
}

/** Read a source fragment with its real line numbers (offset by `firstLine`). */
function readSourceHtml(text, file, firstLine = 1) {
  return readHtml("\n".repeat(firstLine - 1) + text, file);
}

/**
 * Render and check the whole site: the nesting of every source, the fragments'
 * safety, duplicate ids on each rendered page, and every internal link
 * (the generated ones too: sidebar, breadcrumb, end of page, galleries, A–Z).
 * `extra` are full documents outside apps/docs/pages (the landing, once per
 * language: landingDocuments()): [{ route, file, html, locale? }].
 * `unchecked` are routes known to exist whose ids are not checked.
 * When the landing is rendered in every language, a catalog key that no
 * template used is a problem too.
 * Returns { rendered: Map route → html, problems: [string] }. Throws on a
 * malformed source and on a missing catalog key (never a warning).
 */
export function buildSite(site, { extra = [], unchecked = [], root } = {}) {
  const reader = sourceReader(site);
  const used = new Set();
  const sourceLinks = (text, file, firstLine, fragment) => {
    if (fragment) assertFragmentSafe(text, file);
    return readSourceHtml(text, file, firstLine).links.map((l) => ({ ...l, file }));
  };
  // Links of every partial a source includes, at any depth; each partial is
  // checked once. Called after rendering, which already refused include cycles.
  const partials = new Map();
  const partialLinks = (html) =>
    [...html.matchAll(/<!-- luz:include ([a-z0-9-]+) -->/g)].flatMap(([, name]) => {
      if (!partials.has(name)) {
        const partial = reader.partial(name);
        partials.set(name, [...sourceLinks(partial.text, partial.file, 1, true), ...partialLinks(partial.text)]);
      }
      return partials.get(name);
    });

  const rendered = new Map();
  const docs = [];
  for (const page of site.notFound ? [...site.pages, site.notFound] : site.pages) {
    const html = renderPage(page, site, { reader, root, used });
    const layout = reader.layout(page.meta.layout);
    const { ids, links: renderedLinks } = readHtml(html, `${page.file} (rendered as ${page.route})`);
    // Links the generator wrote (sidebar, breadcrumb, end of page, galleries, A–Z)
    const sourceHrefs = new Set();
    const links = [
      ...sourceLinks(page.body, page.file, page.bodyLine, true),
      ...partialLinks(page.body),
      ...sourceLinks(layout.text, layout.file, 1, false),
      ...partialLinks(layout.text),
    ];
    for (const l of links) sourceHrefs.add(l.href);
    for (const l of renderedLinks) if (!sourceHrefs.has(l.href)) links.push({ ...l, file: `${page.file} (generated)`, line: 1 });
    rendered.set(page.route, html);
    docs.push({ route: page.route, ids: new Set(ids.keys()), links });
  }
  for (const doc of extra) {
    const html = renderDocument(doc.html, doc.file, doc.route, site, { reader, locale: doc.locale, used });
    const links = [...sourceLinks(doc.html, doc.file, 1, false), ...partialLinks(doc.html)];
    const { ids, links: renderedLinks } = readHtml(html, `${doc.file} (rendered as ${doc.route})`);
    // Links written by the generator or a catalog: the language's home, the switcher, links inside a string
    const sourceHrefs = new Set(links.map((l) => l.href));
    for (const l of renderedLinks) if (!sourceHrefs.has(l.href)) links.push({ ...l, file: `${doc.file} (rendered as ${doc.route})`, line: l.line });
    rendered.set(doc.route, html);
    docs.push({ route: doc.route, ids: new Set(ids.keys()), links });
  }

  const known = new Map([...docs.map((d) => [d.route, d.ids]), ...unchecked.map((route) => [route, null])]);
  const seen = new Set();
  const problems = checkLinks(docs, known).filter((p) => !seen.has(p) && seen.add(p));
  // Every key is used somewhere, once the home page has been rendered in every language
  const everyLanguage = site.i18n && site.i18n.locales.every((l) => extra.some((d) => d.locale === l));
  if (everyLanguage) problems.push(...unusedKeys(site.i18n, used));
  return { rendered, problems };
}
