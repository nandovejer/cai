/**
 * What a test of a docs page reads from it: the page without its front
 * matter, its h2 sections, its tables, its short <code> names and its links.
 * The page is a fragment (apps/docs/pages): the generator writes the h1 and
 * the lead around it, so everything here is the hand-written content.
 *
 * The root is the repository the test file lives in (tests/..), so the
 * helper and the page are read from the same checkout.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeEntities, readHtml } from "../../scripts/docs-site/html.js";

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const FRONT_MATTER = /^\s*<!--\s*luz:page\b[\s\S]*?-->/;

/** The page `pages/<rel>` (e.g. "get-started/bundler.html"): its file name, front matter and body. */
export function readPage(rel) {
  const file = join(repo, "apps/docs/pages", rel);
  if (!existsSync(file)) throw new Error(`${rel}: the page does not exist`);
  const source = readFileSync(file, "utf-8");
  return { file, rel, source, body: source.replace(FRONT_MATTER, "") };
}

/** Strict read of the markup (the generator's own tokenizer): its h2 ids, in order, outside demos. */
export function h2Ids(page) {
  return readHtml(page.body, page.rel).headings.filter((h) => h.level === 2 && !h.specimen).map((h) => h.id);
}

/** Text of a piece of markup: tags out, references decoded, white space collapsed. */
export const textOf = (html) => decodeEntities(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** Sentences of a text (a full stop, "!" or "?" followed by a space ends one; dots inside names do not). */
export const sentencesOf = (text) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

/**
 * The h2 sections of a body: id of the h2 -> { title, html }, `html` from the
 * h2 tag up to the next h2 (or the end). A section wrapper `<section>` around
 * it may or may not exist; the h2 is what is looked for.
 */
export function sectionsOf(body) {
  const heads = [...body.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g)];
  const out = new Map();
  heads.forEach((m, i) => {
    const id = /\bid="([^"]+)"/.exec(m[1])?.[1];
    if (!id) return;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
    out.set(id, { title: textOf(m[2]), html: body.slice(m.index, end) });
  });
  return out;
}

/** The short names in <code> outside <pre>, decoded. */
export function codesOf(html) {
  const outsidePre = html.replace(/<pre\b[\s\S]*?<\/pre>/g, " ");
  return [...outsidePre.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)].map((m) => textOf(m[1]));
}

/** The text of every <pre> (code blocks), decoded. */
export function preOf(html) {
  return [...html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map((m) => decodeEntities(m[1].replace(/<[^>]*>/g, "")));
}

/** Every link: { href, text }. */
export function linksOf(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .map((m) => ({ href: decodeEntities(/\bhref="([^"]*)"/.exec(m[1])?.[1] ?? ""), text: textOf(m[2]) }))
    .filter((l) => l.href);
}

/** Every table: { caption, headers: string[], rows: [{ cells: [{ html, text, links, codes }] }] }. */
export function tablesOf(html) {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)].map((t) => {
    const inner = t[1];
    const caption = textOf(/<caption\b[^>]*>([\s\S]*?)<\/caption>/.exec(inner)?.[1] ?? "");
    const trs = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
    const cellsOf = (tr) =>
      [...tr.matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((c) => ({ tag: c[1], html: c[2], text: textOf(c[2]), links: linksOf(c[2]), codes: codesOf(c[2]) }));
    const head = trs.map(cellsOf).find((cells) => cells.length && cells.every((c) => c.tag === "th"));
    const rows = trs.map(cellsOf).filter((cells) => cells.length && !cells.every((c) => c.tag === "th"));
    return { caption, headers: (head ?? []).map((c) => c.text), rows: rows.map((cells) => ({ cells })) };
  });
}

/** Index of the header that matches `re`, or -1. */
export const columnOf = (table, re) => table.headers.findIndex((h) => re.test(h));

/* ---- The source the pages are held against ------------------------------- */

const SKIP_DIRS = new Set(["node_modules", "dist"]);

/** Every file under `dir` (relative to the repo) whose name ends with one of `exts`, skipping node_modules and dist. */
export function filesUnder(dir, exts) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (SKIP_DIRS.has(name)) continue;
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (exts.some((e) => name.endsWith(e))) out.push(path);
    }
  };
  if (existsSync(join(repo, dir))) walk(join(repo, dir));
  return out;
}

/** The sources of every package (css and js under packages/<name>/src), as { path, text }. */
export function packageSources(exts = [".css", ".js"]) {
  const out = [];
  for (const pkg of readdirSync(join(repo, "packages"))) {
    for (const path of filesUnder(`packages/${pkg}/src`, exts)) out.push({ path, text: readFileSync(path, "utf-8") });
  }
  return out;
}

export const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The lines of a package's pack-files.txt. */
export const packFiles = (pkg) =>
  readFileSync(join(repo, "packages", pkg, "pack-files.txt"), "utf-8").split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * Every --luz-* custom property that is declared: the built token file
 * (tokens.json becomes the scales, the knobs and the primitives there), the
 * semantic colours and the settings of core.
 */
export function declaredTokens() {
  const built = join(repo, "packages/tokens/dist/luz-tokens.css");
  if (!existsSync(built)) throw new Error("packages/tokens/dist/luz-tokens.css is missing: run pnpm tokens:build");
  const sources = [built, join(repo, "packages/tokens/src/semantic.css"), join(repo, "packages/core/src/settings/_settings.css")];
  const out = new Set();
  for (const file of sources) {
    for (const m of stripCssComments(readFileSync(file, "utf-8")).matchAll(/(--luz-[\w-]+)\s*:/g)) out.add(m[1]);
  }
  return out;
}
