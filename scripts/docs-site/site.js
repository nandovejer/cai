/**
 * CAI docs site — the page generator, without Vite.
 *
 * apps/docs/pages/ holds one HTML fragment per page, with its front matter in
 * a leading `<!-- cai:page … -->` comment. This module scans that folder,
 * works out each page's route, renders it inside its layout with the shared
 * partials, and checks every internal link. plugin.js wires it into Vite;
 * the unit tests (tests/docs-site.test.js) call it directly, so the build
 * and the tests read the same route table.
 *
 * Template syntax, on purpose only two things:
 *   <!-- cai:include name -->   a file of _partials/ (name: [a-z0-9-]+)
 *   {{key}}                      a fixed set of values, escaped (layouts and partials only)
 * No loops, no conditionals. Anything unknown fails the build.
 *
 * Security (.claude/plans/docs-redesign/security.md, SEC-PLG-*): files are
 * read only inside apps/docs/ (and the landing page), after checking the real
 * path; no symlinks; route segments use a strict alphabet; expansion is a
 * single pass, so text a substitution produced is never expanded again.
 */
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { HtmlError, readHtml, tags } from "./html.js";

/** Where the docs pages are published. */
export const DOCS_ROUTE = "/docs/";

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
const NAME = /^[a-z0-9-]+$/;
const MAX_INCLUDE_DEPTH = 3;

/** Front matter keys: required, or the default when missing. */
const FRONT_MATTER = {
  title: { required: true },
  description: { required: true },
  area: { required: true },
  order: { default: "1000" },
  keywords: { default: "" },
  layout: { default: "page" },
  nav: { default: "true" },
  search: { default: "true" },
  toc: { default: "h2" },
};

/** The values a layout or partial may use as {{key}}. */
const PLACEHOLDERS = new Set(["title", "description", "root", "content"]);
/** Values inserted as HTML, not escaped. Only the generator produces them. */
const RAW_VALUES = new Set(["content"]);

/** Partials whose link to the current page gets aria-current="page". */
const CURRENT_PARTIALS = new Set(["header", "site-links"]);

/** The area id of the documentation home page (not a sidebar area). */
export const HUB_AREA = "hub";

/* ---- Small pure helpers ------------------------------------------------ */

/** Escape a value for an attribute or text context. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Folders between a route and the site root: "/" → 0, "/docs/a/" → 2. */
export function depthOf(route) {
  return route.split("/").filter(Boolean).length;
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

/** The site header link that is current on a route ("/" or the docs). */
export function currentOf(route) {
  if (route === "/") return "/";
  if (route.startsWith(DOCS_ROUTE)) return DOCS_ROUTE;
  return null;
}

/**
 * Read the front matter of a page source. Returns { meta, body, bodyLine }:
 * `body` is the fragment after the comment (leading blank lines and the final
 * newline removed), `bodyLine` the line of the source where it starts.
 */
export function parseFrontMatter(source, file, areas = null) {
  const match = /^<!-- cai:page\n([\s\S]*?)\n-->\n/.exec(source);
  if (!match) throw new Error(`${file}:1: a page starts with a <!-- cai:page … --> front matter comment`);
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
  for (const key of ["nav", "search"]) {
    if (!["true", "false"].includes(meta[key])) throw new Error(`${file}: ${key} is "true" or "false"`);
  }
  if (!["h2", "h2,h3", "false"].includes(meta.toc)) throw new Error(`${file}: toc is "h2", "h2,h3" or "false"`);
  if (areas && meta.area !== HUB_AREA && !areas.some((a) => a.id === meta.area)) {
    throw new Error(`${file}: unknown area "${meta.area}" (site.json has ${areas.map((a) => a.id).join(", ")})`);
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
 * inside one of `roots` (SEC-PLG-1, SEC-PLG-2).
 */
export function readInside(path, roots) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) throw new Error(`${path}: not found`);
  if (stat.isSymbolicLink()) throw new Error(`${path}: symlinks are not allowed in the docs sources`);
  if (!stat.isFile()) throw new Error(`${path}: not a file`);
  const real = realpathSync(path);
  const inside = roots.some((root) => {
    const realRoot = realpathSync(root);
    return real === realRoot || real.startsWith(realRoot + sep);
  });
  if (!inside) throw new Error(`${path}: outside the docs sources`);
  return readFileSync(real, "utf-8");
}

/* ---- Scanning the site ------------------------------------------------- */

/**
 * Scan apps/docs: site.json and every page under pages/. Files and folders
 * whose name starts with "_" are not pages. Returns
 * { docsDir, repoRoot, areas, pages: [{ file, abs, route, depth, meta, body, bodyLine }],
 *   byRoute: Map, byFile: Map (absolute path → page) }, pages sorted by route.
 */
export function scanSite(docsDir, repoRoot = resolve(docsDir, "../..")) {
  const rel = (p) => relative(repoRoot, p).split(sep).join("/");
  const roots = [docsDir];
  const { areas } = JSON.parse(readInside(join(docsDir, "site.json"), roots));
  if (!Array.isArray(areas) || areas.some((a) => !NAME.test(a?.id ?? "") || typeof a.label !== "string")) {
    throw new Error(`${rel(join(docsDir, "site.json"))}: "areas" is a list of { id, label, slug }`);
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
  pages.sort((a, b) => (a.route < b.route ? -1 : a.route > b.route ? 1 : 0));
  return { docsDir, repoRoot, areas, pages, byRoute, byFile: new Map(pages.map((p) => [p.abs, p])) };
}

/* ---- Rendering --------------------------------------------------------- */

/**
 * Add aria-current="page" to every link inside a <nav> whose href is exactly
 * `href` (the brand link outside the nav is not a navigation item).
 */
export function markCurrent(html, href) {
  if (!href) return html;
  return html.replace(/<nav\b[\s\S]*?<\/nav>/g, (nav) =>
    nav.replace(/<a\b([^>]*?)\shref="([^"]*)"([^>]*)>/g, (whole, before, value, after) =>
      value === href && !/\saria-current=/.test(before + after) ? `<a${before} href="${value}"${after} aria-current="page">` : whole,
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
 * ctx: { file, partial(name) → { text, file }, values, current, placeholders, stack }
 */
export function expand(template, ctx) {
  const stack = ctx.stack ?? [];
  return template.replace(/^([ \t]*)<!-- cai:include ([^\s>]*) -->|<!-- cai:include ([^\s>]*) -->|\{\{([^{}]*)\}\}/gm, (whole, indent, lineName, inlineName, key) => {
    const name = lineName ?? inlineName;
    if (name !== undefined) {
      if (!NAME.test(name)) throw new Error(`${ctx.file}: include name "${name}" is not valid ([a-z0-9-]+)`);
      if (stack.includes(name)) throw new Error(`${ctx.file}: include cycle ${[...stack, name].join(" → ")}`);
      if (stack.length >= MAX_INCLUDE_DEPTH) throw new Error(`${ctx.file}: includes nest deeper than ${MAX_INCLUDE_DEPTH}`);
      const partial = ctx.partial(name);
      let text = expand(partial.text.replace(/\s+$/, ""), { ...ctx, file: partial.file, stack: [...stack, name] });
      if (CURRENT_PARTIALS.has(name)) text = markCurrent(text, ctx.current);
      if (indent) text = indent + text.replace(/\n(?=[^\n])/g, `\n${indent}`);
      return text;
    }
    if (!ctx.placeholders) return whole;
    if (!PLACEHOLDERS.has(key)) throw new Error(`${ctx.file}: unknown placeholder {{${key}}}`);
    if (!(key in ctx.values)) throw new Error(`${ctx.file}: {{${key}}} has no value here`);
    return RAW_VALUES.has(key) ? ctx.values[key] : escapeHtml(ctx.values[key]);
  });
}

/** A reader of partials and layouts inside apps/docs (SEC-PLG-1/2/3). */
export function sourceReader(site) {
  const rel = (p) => relative(site.repoRoot, p).split(sep).join("/");
  const read = (folder, name) => {
    if (!NAME.test(name)) throw new Error(`"${name}" is not a valid ${folder.slice(1, -1)} name`);
    const abs = join(site.docsDir, folder, `${name}.html`);
    return { text: readInside(abs, [join(site.docsDir, folder)]), file: rel(abs) };
  };
  return { partial: (name) => read("_partials", name), layout: (name) => read("_layouts", name) };
}

/**
 * Render a page: its layout, with the partials and the page fragment.
 * `options.root` is the {{root}} value (relative in the pages build).
 */
export function renderPage(page, site, options = {}) {
  const reader = options.reader ?? sourceReader(site);
  const current = currentOf(page.route);
  const content = expand(page.body, { file: page.file, partial: reader.partial, current, placeholders: false });
  const layout = reader.layout(page.meta.layout);
  return expand(layout.text, {
    file: layout.file,
    partial: reader.partial,
    current,
    placeholders: true,
    values: {
      title: page.meta.title,
      description: page.meta.description,
      root: options.root ?? "/",
      content,
    },
  });
}

/** Render a full document that is not a page (the landing): includes only. */
export function renderDocument(html, file, route, site, options = {}) {
  const reader = options.reader ?? sourceReader(site);
  return expand(html, { file, partial: reader.partial, current: currentOf(route), placeholders: false });
}

/**
 * Pages build: make every root-absolute link to a known route relative to
 * `route`, so the site works under any sub-path (https://<user>.github.io/<repo>/).
 * `href="/docs/#x"` on /docs/a/ becomes `href="../../docs/#x"`.
 */
export function relativizeLinks(html, route, routes) {
  const root = rootOf(route);
  return html.replace(/href="\/([^"#?]*)(#[^"]*)?"/g, (whole, path, hash = "") =>
    routes.has(`/${path}`) ? `href="${root}${path}${hash}"` : whole,
  );
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
 * safety, duplicate ids on each rendered page, and every internal link.
 * `extra` are full documents outside apps/docs/pages (the landing):
 * [{ route, file, html }]. `unchecked` are routes known to exist whose ids are not checked.
 * Returns { rendered: Map route → html, problems: [string] }. Throws on a
 * malformed source (that is never a warning).
 */
export function buildSite(site, { extra = [], unchecked = [], root } = {}) {
  const reader = sourceReader(site);
  const sourceLinks = (text, file, firstLine, fragment) => {
    if (fragment) assertFragmentSafe(text, file);
    return readSourceHtml(text, file, firstLine).links.map((l) => ({ ...l, file }));
  };
  // Links of every partial a source includes, at any depth; each partial is
  // checked once. Called after rendering, which already refused include cycles.
  const partials = new Map();
  const partialLinks = (html) =>
    [...html.matchAll(/<!-- cai:include ([a-z0-9-]+) -->/g)].flatMap(([, name]) => {
      if (!partials.has(name)) {
        const partial = reader.partial(name);
        partials.set(name, [...sourceLinks(partial.text, partial.file, 1, true), ...partialLinks(partial.text)]);
      }
      return partials.get(name);
    });

  const rendered = new Map();
  const docs = [];
  for (const page of site.pages) {
    const html = renderPage(page, site, { reader, root });
    const layout = reader.layout(page.meta.layout);
    const links = [
      ...sourceLinks(page.body, page.file, page.bodyLine, true),
      ...partialLinks(page.body),
      ...sourceLinks(layout.text, layout.file, 1, false),
      ...partialLinks(layout.text),
    ];
    const { ids } = readHtml(html, `${page.file} (rendered as ${page.route})`);
    rendered.set(page.route, html);
    docs.push({ route: page.route, ids: new Set(ids.keys()), links });
  }
  for (const doc of extra) {
    const html = renderDocument(doc.html, doc.file, doc.route, site, { reader });
    const links = [...sourceLinks(doc.html, doc.file, 1, false), ...partialLinks(doc.html)];
    const { ids } = readHtml(html, `${doc.file} (rendered as ${doc.route})`);
    rendered.set(doc.route, html);
    docs.push({ route: doc.route, ids: new Set(ids.keys()), links });
  }

  const known = new Map([...docs.map((d) => [d.route, d.ids]), ...unchecked.map((route) => [route, null])]);
  const seen = new Set();
  const problems = checkLinks(docs, known).filter((p) => !seen.has(p) && seen.add(p));
  return { rendered, problems };
}
