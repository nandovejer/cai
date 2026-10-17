/**
 * LUZ check: the rules of loading (f5-ai-ready.md 5.5 and 5.6): what a page
 * links, and in which order.
 *
 *   load/tokens-missing   core, site or a kind is linked and tokens is not
 *   load/package-missing  a class or tag of a package whose stylesheet is not linked
 *   load/layer-statement  a <style> declares the layers, luz among them, after the first LUZ link
 *   load/order            the LUZ stylesheets are linked out of order (a warning)
 *   load/no-stylesheet    the run links or imports no LUZ stylesheet at all (a warning; see cli.js)
 *
 * A LUZ stylesheet is something a document names, by `<link rel="stylesheet">`
 * or by an `@import` in a <style>, and its package is read from the URL:
 * `@luz-ds/<pkg>` or `/packages/<pkg>/` anywhere in it, else a file name of
 * luz.css, luz.min.css (core) or luz-tokens(.min).css (tokens). `site`,
 * `landing`, `cms`, `app` and `docs` as a bare file name may be the project's own: a
 * `copy`, which keeps load/package-missing silent for that package and is
 * never a reason to block. A URL a template computes may be anything: while a
 * page has one, load/tokens-missing and load/package-missing are silent. A
 * stylesheet of the run that a <link> names counts as the imports it makes.
 */
import { posix } from "node:path";
import { finding } from "../report.js";
import { classAttribute, classTokens } from "./shared.js";

const TEMPLATE = /\{\{|<%|\$\{/;
const IN_URL = /@luz-ds\/(tokens|core|site|landing|cms|app|docs)(?![\w-])/;
const IN_DEV = /\/packages\/(tokens|core|site|landing|cms|app|docs)\//;
// luz.css and luz-tokens.css are LUZ's; a bare site.css, landing.css, cms.css, app.css or docs.css may be the project's own
const FILE = /^(?:luz(-tokens)?|(site|landing|cms|app|docs))(?:\.min)?\.css$/;
const IMPORT = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/g;
const LAYER = /@layer\s+([^;{}@]{0,512})([;{}])/g;
export const STYLESHEET = /(?:^|\s)stylesheet(?:\s|$)/i;
const REMOTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
// tokens, then core, then site, then the kinds in any order
const ORDER = ["tokens", "core", "site"];

/** What a URL names: { pkg, copy } for LUZ's, "template" for a computed one, null for anything else. */
function classify(url) {
  if (TEMPLATE.test(url)) return "template";
  const named = IN_URL.exec(url) ?? IN_DEV.exec(url);
  if (named !== null) return { pkg: named[1], copy: false };
  const file = FILE.exec(url.split(/[?#]/)[0].split("/").pop().toLowerCase());
  if (file === null) return null;
  return { pkg: file[2] ?? (file[1] ? "tokens" : "core"), copy: file[2] !== undefined };
}

/** The text without its comments, in one pass. */
export function withoutComments(text) {
  let out = "";
  for (let from = 0; ; ) {
    const open = text.indexOf("/*", from);
    const close = open === -1 ? -1 : text.indexOf("*/", open + 2);
    if (close === -1) return out + (open === -1 ? text.slice(from) : "");
    out += text.slice(from, open);
    from = close + 2;
  }
}

/** The URLs a stylesheet's text `@import`s. */
export function importsOf(css) {
  return css.includes("@import") ? [...withoutComments(css).matchAll(IMPORT)].map((m) => m[1]) : [];
}

/** The path in the run a URL written in `from` points at, or null (a remote one, or none). */
export function runPath(from, url) {
  const target = url.split(/[?#]/)[0];
  if (target === "" || REMOTE.test(target)) return null;
  return posix.normalize(target.startsWith("/") ? target.slice(1) : posix.join(posix.dirname(from), target));
}

/**
 * Walk the stylesheets of the run that `url` (written in `from`) leads to, in
 * the order the browser would take them, and call `visit(url)` for each URL
 * that is not a file of the run. A file is read once.
 */
function follow(url, from, imports, visit) {
  const seen = new Set([from]);
  const work = [[url, from]];
  while (work.length > 0) {
    const [current, base] = work.pop();
    if (visit(current) !== false) continue;
    const next = runPath(base, current);
    if (next === null || seen.has(next)) continue;
    seen.add(next);
    const list = imports.get(next) ?? [];
    for (let i = list.length - 1; i >= 0; i--) work.push([list[i], next]);
  }
}

/** Does a stylesheet of the run, through what it imports, reach a LUZ stylesheet (or a computed one)? */
export function reachesLuz(path, imports) {
  let reached = false;
  for (const url of imports.get(path) ?? []) {
    follow(url, path, imports, (current) => {
      const known = classify(current);
      if (known !== null) reached = true;
      return known !== null;
    });
    if (reached) return true;
  }
  return false;
}

/**
 * What a markup file links, from its records:
 *   entries  [{ pkg, copy, record, n }] in document order, one per LUZ
 *            stylesheet: a <link>, an @import of a <style>, or an @import of a
 *            stylesheet of the run that a <link> names (`record` is the tag)
 *   styles   [{ record, n }] the <style> elements that declare layers with luz
 *            among them
 *   dynamic  a stylesheet is named by a template expression
 *   bundled  a <script type="module" src> is where the CSS may come from
 *   inline   a <style> writes the `luz` layer: the CSS may be inlined
 *   page     the file is a document (it has <html> or <head>), not a fragment
 * @param {Map<string, string[]>} imports the @import URLs of each stylesheet of the run
 */
export function documentOf(records, path, imports) {
  const doc = { entries: [], styles: [], dynamic: false, bundled: false, inline: false, page: false };
  const add = (url, record, n) =>
    follow(url, path, imports, (current) => {
      const known = classify(current);
      if (known === null) return false;
      if (known === "template") doc.dynamic = true;
      else doc.entries.push({ pkg: known.pkg, copy: known.copy, record, n });
      return true;
    });
  records.forEach((record, n) => {
    const { name, attrs } = record;
    if (name === "link") {
      const rel = attrs.get("rel");
      const href = attrs.get("href");
      if (rel !== undefined && href !== undefined && STYLESHEET.test(rel.value)) add(href.value, record, n);
    } else if (name === "style" && record.text) {
      for (const url of importsOf(record.text)) add(url, record, n);
      if (!record.text.includes("@layer")) return;
      for (const [, prelude, end] of withoutComments(record.text).matchAll(LAYER)) {
        const layers = prelude.split(",").map((layer) => layer.trim());
        if (layers.some((layer) => layer === "luz" || layer.startsWith("luz."))) doc.inline = true;
        if (end === ";" && layers.includes("luz")) doc.styles.push({ record, n });
      }
    } else if (name === "html" || name === "head") doc.page = true;
    else if (name === "script" && attrs.has("src") && (attrs.get("type")?.value.trim().toLowerCase() ?? "") === "module") doc.bundled = true;
  });
  return doc;
}

/** The findings of the rules of loading for one markup file. */
export function loadRules(ctx) {
  const { file, records, world, doc, template } = ctx;
  const { entries } = doc;
  const found = [];
  const at = (record) => ({ file, line: record.line, column: record.column });

  if (!doc.dynamic && entries.length > 0) {
    if (!entries.some((entry) => entry.pkg === "tokens")) {
      const first = entries.find((entry) => !entry.copy);
      if (first !== undefined) found.push(finding("load/tokens-missing", { ...at(first.record), vars: { package: first.pkg } }));
    }

    // The first use of each package that is not linked: a tag, then a class of its element
    const loaded = new Set(entries.map((entry) => entry.pkg));
    const missing = new Set();
    for (const record of records) {
      const owner = record.name.startsWith("luz-") ? world.tags.get(record.name)?.package : undefined;
      if (owner !== undefined && !loaded.has(owner) && !missing.has(owner)) {
        missing.add(owner);
        found.push(finding("load/package-missing:tag", { ...at(record), vars: { tag: record.name, package: owner } }));
      }
      const attribute = classAttribute(record, template);
      if (attribute === undefined) continue;
      for (const token of classTokens(attribute.value, template)) {
        const entry = world.info.get(token);
        if (entry === undefined || entry.kind === "state" || entry.defined === false || token.startsWith("is-")) continue;
        if (loaded.has(entry.package) || missing.has(entry.package)) continue;
        missing.add(entry.package);
        found.push(finding("load/package-missing", { ...at(attribute), vars: { name: token, package: entry.package } }));
      }
    }
  }

  // Layers declared after the first LUZ stylesheet put `luz` before the project's own
  const first = entries.find((entry) => !entry.copy);
  if (first !== undefined && !doc.styles.some((style) => style.n < first.n)) {
    for (const style of doc.styles) if (style.n > first.n) found.push(finding("load/layer-statement", { ...at(style.record), vars: { tag: "style" } }));
  }

  // The first stylesheet that comes after one it needs to follow
  let top = null;
  for (const entry of entries) {
    if (entry.copy) continue;
    const rank = ORDER.includes(entry.pkg) ? ORDER.indexOf(entry.pkg) : 3;
    if (top !== null && rank < top.rank) {
      found.push(finding("load/order", { file, vars: { first: top.pkg, second: entry.pkg } }));
      break;
    }
    if (top === null || rank > top.rank) top = { rank, pkg: entry.pkg };
  }
  return found;
}
