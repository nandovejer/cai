/**
 * LUZ docs site: the files written for an AI agent, from the same pages a
 * person reads (RL-19). Pure, development tooling (nothing here ships):
 *
 *   renderLlmsTxt(site, { siteUrl })   llms.txt: an index of every page, as
 *       llmstxt.org shapes it (H1, blockquote, H2 lists of links).
 *   renderLlmsFull(site, { siteUrl })  llms-full.txt: the curated text of the
 *       pages (what an agent needs to write LUZ markup), over a fixed ceiling
 *       it throws, so the build fails before `pnpm check:size`.
 *   htmlToText(fragment, { file })     a page fragment as Markdown-ish text;
 *       it throws `file:line` on an element it does not know, so a new element
 *       on a docs page is a decision, never a silent loss.
 *   exampleDocuments(site, { csp, versions })  one standalone page per docs
 *       page with a `#markup` section: its `html` blocks as live markup,
 *       styled by LUZ from relative files beside it (`../dist/<pkg>/<file>`).
 *   exampleAssets(root), manifestAssets(root)  the files those documents load
 *       and the manifests of every package, copied to /examples/dist/ and
 *       /manifests/ by the build: [{ route, from }], `from` relative to root.
 *
 * `siteUrl` is the site's root URL with its trailing slash (SITE_URL in the
 * pages build) or "" (root-absolute links, as in dev): the URL of a page is
 * siteUrl + route.slice(1), or the route itself without it.
 *
 * What goes into llms-full.txt, by the kind of page (f5-ai-ready.md 1.3):
 *   - a component or pattern page (it has `#markup`): its summary, files and
 *     package, "Known issues", then by id the sections a person reads; never
 *     the demo, the computed tables (`#contrast`, `#tokens`) or the stages of
 *     "Do and don't" (only their captions).
 *   - a page of templates (`/templates/`): its summary and a pointer to it.
 *   - a tokens page: its prose; the tables of values are `tokens.json`'s
 *     (the Figma import page, a workflow outside markup: summary and pointer).
 *   - an HTML elements page: its summary and the outline of its headings.
 *   - every other page: all of it, outside the demos.
 * Never: [data-docs-specimen], [inert], [aria-hidden="true"], <dialog>,
 * <template>, <script>, <style>, <svg>, the copy buttons, the tab row.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, PACKAGES, SITE_KINDS } from "../luz-packages.js";
import { HtmlError, VOID, decodeEntities, tags } from "./html.js";
import { readingOrder } from "./site.js";
import { FILES } from "./snippets.js";

/** The routes of the AI files at the Pages root. */
export const AI_ROUTES = { llms: "/llms.txt", llmsFull: "/llms-full.txt", examples: "/examples/", manifests: "/manifests/" };

/** The ceiling of llms-full.txt in bytes, fixed once and never raised (RL-17). */
export const LLMS_FULL_MAX = 448 * 1024;

const bytes = (text) => Buffer.byteLength(text, "utf-8");

/* ---- The parts of the two files, from constants ---------------------------- */

const SUMMARY_FALLBACK = "LUZ is a vanilla CSS and JavaScript design system for plain HTML.";
const SUMMARY_TAIL = "MIT licence. In beta: any release may break anything, and the changelog says how to migrate.";
const list = (names) => `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
const DETAILS =
  `Packages, in load order: ${BASE.map((n) => `@luz-ds/${n}`).join(", ")}, then one for your kind of site ` +
  `(${list(SITE_KINDS.map((n) => `@luz-ds/${n}`))}). Use only the classes listed in each package's classes.json. ` +
  "After you write HTML or CSS, run `npx @luz-ds/check` on the files and fix what it reports; it reads source, so it does not replace testing in a browser.";

/** The package a page of these areas documents; the other areas name none. */
const PACKAGE_OF_AREA = { components: "core", site: "site", landing: "landing", cms: "cms", app: "app" };

/** The pages the A-Z index lists (indexData() keeps exactly these). */
const listed = (page) => page.meta.search !== "false";

const urlOf = (route, siteUrl) => (siteUrl ? `${siteUrl}${route.slice(1)}` : route);

/** A page with a "Copy the markup" section has an example document (its h3 has the id `markup`). */
const MARKUP_HEADING = /<h3\b[^>]*\bid="markup"/;
const hasMarkup = (page) => MARKUP_HEADING.test(page.body);

/** `/docs/<area>/<slug>/` is `/examples/<area>/<slug>.html` (D2-A). */
const exampleRouteOf = (page) => page.route.replace(/^\/docs\//, "/examples/").replace(/\/$/, ".html");

const summaryOf = (site) => `> ${site.byRoute.get("/docs/")?.meta.description ?? SUMMARY_FALLBACK} ${SUMMARY_TAIL}`;

/**
 * The pages of the site as the reading order shows them, by area, then the
 * pages of no area (the hub's home). [{ title, pages }].
 */
function sectionsOfSite(site) {
  const order = readingOrder(site);
  const sections = [];
  for (const area of site.areas) {
    const pages = order.filter((p) => p.meta.area === area.id && listed(p));
    if (pages.length) sections.push({ area, title: area.label, pages });
  }
  const hub = site.pages.filter((p) => !site.areas.some((a) => a.id === p.meta.area) && listed(p));
  if (hub.length) sections.push({ area: null, title: "Documentation", pages: hub });
  return sections;
}

/* ---- llms.txt --------------------------------------------------------------- */

/**
 * llms.txt: `# LUZ`, a summary, one details paragraph, one `##` per area in
 * site.json order (each page, in the reading order of Previous / Next, as
 * `- [title](url): description`), the hub's home under `## Documentation`,
 * and `## Optional`.
 */
export function renderLlmsTxt(site, { siteUrl = "" } = {}) {
  const out = ["# LUZ", "", summaryOf(site), "", DETAILS, ""];
  for (const { title, pages } of sectionsOfSite(site)) {
    out.push(`## ${title}`);
    for (const page of pages) out.push(`- [${page.meta.title}](${urlOf(page.route, siteUrl)}): ${page.meta.description}`);
    out.push("");
  }
  out.push("## Optional");
  out.push(`- [Full documentation for agents](${urlOf(AI_ROUTES.llmsFull, siteUrl)}): The same pages, as text: markup, variants, when to use, keyboard.`);
  const sample = site.byRoute.get("/docs/components/button/") ?? site.pages.find(hasMarkup);
  if (sample && hasMarkup(sample)) {
    out.push(`- [Markup example: ${sample.meta.title}](${urlOf(exampleRouteOf(sample), siteUrl)}): A page of the markup of ${sample.meta.title}, styled by LUZ; every component and pattern page has one under /examples/.`);
  }
  out.push(`- [Classes of @luz-ds/core](${urlOf(`${AI_ROUTES.manifests}core/classes.json`, siteUrl)}): Every class, element and custom property of the package; each package has its own folder under /manifests/.`);
  out.push(`- [Elements of @luz-ds/site](${urlOf(`${AI_ROUTES.manifests}site/custom-elements.json`, siteUrl)}): The custom elements the package defines or declares, with their attributes; core has one too, in its own folder.`);
  out.push("");
  return out.join("\n");
}

/* ---- htmlToText: the converter ---------------------------------------------- */

// Never in the text, nothing inside is read (so an unknown element there is fine)
const DROPPED = new Set(["script", "style", "dialog", "template", "noscript", "svg", "math"]);
// Inline: part of a line of text
const INLINE_PLAIN = new Set(["span", "abbr", "small", "mark", "cite", "q", "s", "time", "var", "samp", "sub", "sup", "dfn", "u", "data", "bdi", "bdo", "del", "ins"]);
// Block containers that say nothing of their own: their children are the text
const CONTAINERS = new Set(["div", "section", "article", "header", "footer", "nav", "main", "aside", "figure", "hgroup", "search", "address"]);
const HEADINGS = /^h([1-6])$/;
const TABLE_PARTS = new Set(["thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col"]);

/** Docs-only furniture that is not content: the copy bar of a snippet, the tab row, the cross-link to the other tab. */
function isChrome(node) {
  const cls = node.attrs.get("class") ?? "";
  if (/(?:^|\s)(?:docs-snippet__bar|docs-view-tabs|docs-view__xref)(?:\s|$)/.test(cls)) return true;
  if (/(?:^|\s)docs-demo__stage(?:\s|$)/.test(cls) || node.attrs.has("data-contrast-tool")) return true;
  return node.name === "button" && (node.attrs.has("data-copy-from") || node.attrs.has("data-copy") || /(?:^|\s)luz-copy-btn(?:\s|$)/.test(cls));
}

/** The lists and tables a tokens page draws to show values: `tokens.json` has them. */
function isValues(node) {
  return node.name === "table" || /(?:^|\s)docs-(?:scale|token|token-grid|swatches?)(?:\s|$)/.test(node.attrs.get("class") ?? "");
}

/** True for an element whose subtree is left out. */
function isLeftOut(node, ctx) {
  const { name, attrs } = node;
  if (DROPPED.has(name) || attrs.has("data-docs-specimen") || attrs.has("inert") || attrs.get("aria-hidden") === "true" || isChrome(node)) return true;
  return ctx?.values === false && isValues(node);
}

/** A tree of elements and text from a fragment (tolerant of a fragment cut mid-element). */
function parse(fragment, file, line) {
  const html = "\n".repeat(line - 1) + fragment;
  const root = { type: "root", name: "#root", attrs: new Map(), line: 1, children: [] };
  const stack = [root];
  let at = 0;
  const text = (to) => {
    const raw = html.slice(at, to).replace(/<!--[\s\S]*?-->/g, "");
    if (raw) stack.at(-1).children.push({ type: "text", text: raw });
  };
  for (const tag of tags(html, file)) {
    text(tag.index);
    at = tag.end;
    if (tag.type === "start") {
      const node = { type: "el", name: tag.name, attrs: tag.attrs, line: tag.line, children: [] };
      stack.at(-1).children.push(node);
      if (!VOID.has(tag.name) && !tag.selfClosing) stack.push(node);
    } else {
      const i = stack.findLastIndex((n, k) => k > 0 && n.name === tag.name);
      if (i > 0) stack.length = i;
    }
  }
  text(html.length);
  return root;
}

const collapse = (text) => text.replace(/\s+/g, " ").trim();

/** The text of a subtree with no markup at all, entities decoded once. */
function plain(nodes) {
  let raw = "";
  const walk = (list) => {
    for (const n of list) {
      if (n.type === "text") raw += n.text;
      else if (!DROPPED.has(n.name) && n.attrs.get("aria-hidden") !== "true") walk(n.children);
    }
  };
  walk(nodes);
  return collapse(decodeEntities(raw));
}

const codeSpan = (text) => {
  if (!text) return "";
  const ticks = text.includes("`") ? "``" : "`";
  return `${ticks}${text}${ticks}`;
};

class Context {
  constructor({ file, shift = 0, siteUrl = "", base = "", values = true }) {
    Object.assign(this, { file, shift, siteUrl, base, values });
  }

  unknown(node) {
    throw new HtmlError(
      this.file,
      node.line,
      `<${node.name}> is not an element docs-site/ai.js can write as text; put it in a demo ([data-docs-specimen]) or teach ai.js what it means`,
    );
  }

  href(value) {
    if (value.startsWith("#")) return this.base ? `${this.base}${value}` : value;
    if (value.startsWith("/") && !value.startsWith("//") && this.siteUrl) return `${this.siteUrl}${value.slice(1)}`;
    return value;
  }
}

/** A run of text and inline elements, as one line. */
function inline(nodes, ctx) {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text") {
      out += decodeEntities(n.text);
      continue;
    }
    if (isLeftOut(n, ctx)) continue;
    const { name } = n;
    if (name === "code" || name === "kbd") {
      out += codeSpan(plain(n.children));
    } else if (name === "a") {
      const label = collapse(inline(n.children, ctx));
      const href = n.attrs.get("href");
      out += label && href ? `[${label}](${ctx.href(href)})` : label;
    } else if (name === "strong" || name === "b") {
      const t = collapse(inline(n.children, ctx));
      out += t ? `**${t}**` : "";
    } else if (name === "em" || name === "i") {
      const t = collapse(inline(n.children, ctx));
      out += t ? `*${t}*` : "";
    } else if (name === "br") {
      out += " ";
    } else if (name === "wbr") {
      // a break opportunity, no text
    } else if (INLINE_PLAIN.has(name)) {
      out += inline(n.children, ctx);
    } else {
      // a block inside a link or a cell: its text, on the line
      out += ` ${blocksOf([n], ctx).join(" ")} `;
    }
  }
  return out.replace(/\s+/g, " ");
}

const INLINE_ELEMENTS = new Set(["code", "kbd", "a", "strong", "b", "em", "i", "br", "wbr", ...INLINE_PLAIN]);

/** The blocks of a list of nodes: an array of strings, one per paragraph, list, table, code block. */
function blocksOf(nodes, ctx) {
  const out = [];
  let run = [];
  const flush = () => {
    const text = collapse(inline(run, ctx));
    if (text) out.push(text);
    run = [];
  };
  for (const n of nodes) {
    if (n.type === "text" || (!isLeftOut(n, ctx) && INLINE_ELEMENTS.has(n.name))) {
      run.push(n);
      continue;
    }
    if (n.type === "el" && isLeftOut(n, ctx)) continue;
    flush();
    block(n, ctx, out);
  }
  flush();
  return out;
}

function headingLevel(level, shift) {
  return Math.min(6, Math.max(3, level + shift));
}

function block(n, ctx, out) {
  const { name } = n;
  const heading = HEADINGS.exec(name);
  if (heading) {
    const text = plain(n.children);
    if (text) out.push(`${"#".repeat(headingLevel(Number(heading[1]), ctx.shift))} ${/[<>]/.test(text) ? codeSpan(text) : text}`);
  } else if (name === "p" || name === "figcaption" || name === "caption") {
    const text = collapse(inline(n.children, ctx));
    if (text) out.push(text);
  } else if (name === "summary") {
    const text = collapse(inline(n.children, ctx));
    if (text) out.push(`**${text}**`);
  } else if (name === "ul" || name === "ol") {
    const lines = listLines(n, ctx);
    if (lines) out.push(lines);
  } else if (name === "li") {
    out.push(...blocksOf(n.children, ctx));
  } else if (name === "pre") {
    out.push(codeBlock(n));
  } else if (name === "table") {
    tableBlock(n, ctx, out);
  } else if (name === "dl") {
    out.push(...definitions(n, ctx));
  } else if (name === "blockquote") {
    const inner = blocksOf(n.children, ctx).join("\n\n");
    if (inner) out.push(inner.replace(/^/gm, "> "));
  } else if (name === "hr") {
    // a rule says nothing as text
  } else if (name === "details" || CONTAINERS.has(name)) {
    out.push(...blocksOf(n.children, ctx));
  } else if (TABLE_PARTS.has(name) || name === "dt" || name === "dd") {
    // a stray part outside its table or list: its text
    const text = collapse(inline(n.children, ctx));
    if (text) out.push(text);
  } else {
    ctx.unknown(n);
  }
}

/** An ul or ol as lines, nested lists indented. */
function listLines(list, ctx) {
  const ordered = list.name === "ol";
  let count = 1;
  const lines = [];
  for (const item of list.children) {
    if (item.type !== "el" || isLeftOut(item, ctx)) continue;
    if (item.name !== "li") ctx.unknown(item);
    const marker = ordered ? `${count}. ` : "- ";
    count += 1;
    const body = blocksOf(item.children, ctx).join("\n");
    if (!body) continue;
    const indent = " ".repeat(marker.length);
    lines.push(`${marker}${body.split("\n").join(`\n${indent}`)}`);
  }
  return lines.join("\n");
}

/** A dl as `- term: description` lines. */
function definitions(dl, ctx) {
  const lines = [];
  let term = "";
  for (const n of dl.children) {
    if (n.type !== "el" || isLeftOut(n, ctx)) continue;
    const text = collapse(inline(n.children, ctx));
    if (n.name === "dt") term = text;
    else if (n.name === "dd") lines.push(term ? `- ${term}: ${text}` : `- ${text}`);
    else if (!CONTAINERS.has(n.name)) ctx.unknown(n);
    else {
      // a div wrapping dt and dd, as the HTML spec allows
      lines.push(...definitions(n, ctx).join("\n").split("\n").filter(Boolean));
    }
  }
  return lines.length ? [lines.join("\n")] : [];
}

/** A pre as a fenced block, its aria-label the line before it, entities decoded once. */
function codeBlock(pre) {
  const raw = (nodes) => nodes.map((n) => (n.type === "text" ? n.text : raw(n.children))).join("");
  const code = decodeEntities(raw(pre.children)).replace(/^\s*\n/, "").replace(/\s+$/, "");
  if (!code) return "";
  const longest = Math.max(0, ...[...code.matchAll(/^(`{3,})/gm)].map((m) => m[1].length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  const caption = pre.attrs.get("aria-label");
  const lang = pre.attrs.get("data-lang") ?? "";
  return `${caption ? `${collapse(caption)}\n` : ""}${fence}${lang}\n${code}\n${fence}`;
}

/** A table as `- first cell: other cells` per row; the header row is left out. */
function tableBlock(table, ctx, out) {
  const rows = [];
  const walk = (nodes, inHead) => {
    for (const n of nodes) {
      if (n.type !== "el" || isLeftOut(n, ctx)) continue;
      if (n.name === "caption") {
        const text = collapse(inline(n.children, ctx));
        if (text) out.push(text);
      } else if (n.name === "thead") walk(n.children, true);
      else if (n.name === "tbody" || n.name === "tfoot") walk(n.children, false);
      else if (n.name === "tr") {
        if (!inHead) rows.push(n);
      } else if (n.name !== "colgroup" && n.name !== "col") ctx.unknown(n);
    }
  };
  walk(table.children, false);
  const lines = [];
  for (const [i, row] of rows.entries()) {
    const cells = row.children.filter((c) => c.type === "el" && !isLeftOut(c, ctx));
    for (const c of cells) if (c.name !== "td" && c.name !== "th") ctx.unknown(c);
    // a header row written in the body: all th, and the first row
    if (i === 0 && cells.length && cells.every((c) => c.name === "th") && rows.length > 1) continue;
    const texts = cells.map((c) => cellText(c, ctx)).filter(Boolean);
    if (!texts.length) continue;
    const [first, ...rest] = texts;
    lines.push(rest.length ? `- ${first}: ${rest.join(": ")}` : `- ${first}`);
  }
  if (lines.length) out.push(lines.join("\n"));
}

/** A cell as one line: its blocks one after another, its list items apart by `;`. */
function cellText(cell, ctx) {
  return blocksOf(cell.children, ctx)
    .map((b) =>
      b
        .split("\n")
        .map((l) => l.replace(/^\s*(?:-|\d+\.)\s+/, ""))
        .join("; "),
    )
    .join(" ");
}

/**
 * A page fragment as text. Blocks are apart by a blank line; `p` is a
 * paragraph, `ul`/`ol` list items, a table row `- first cell: other cells`, a
 * `pre` a fenced block (its aria-label on the line before), `code`, `a`,
 * `strong` and `em` as Markdown, h3 and h4 as `###` and `####`.
 *
 * Left out, whatever is inside: script, style, dialog, template, svg, the
 * demos ([data-docs-specimen]) and what is [inert] or [aria-hidden="true"],
 * and the docs' own furniture. It throws `file:line` on any other element it
 * has no sentence for.
 *
 * @param {string} fragment
 * @param {object} options
 * @param {string} options.file     for the error
 * @param {number} [options.line]   the line of the fragment's first character in `file`
 * @param {number} [options.shift]  added to the level of a heading (a page's h2 is `###` with 1)
 * @param {string} [options.siteUrl] makes a link that starts with "/" absolute
 * @param {string} [options.base]    the page's URL, for a link that starts with "#"
 * @param {boolean} [options.values] false leaves out the tables and lists of values (the tokens pages)
 */
export function htmlToText(fragment, { file = "<html>", line = 1, ...options } = {}) {
  return convert(fragment, { file, line, ...options }).text;
}

function convert(fragment, { file, line = 1, ...options }) {
  const ctx = new Context({ file, ...options });
  const tree = parse(fragment, file, line);
  return { text: blocksOf(tree.children, ctx).join("\n\n"), tree };
}

/* ---- llms-full.txt ---------------------------------------------------------- */

// The sections of a component or pattern page a person reads, by id, in page order
const GUIDED = new Set(["known-issues", "markup", "variants", "how", "no-js", "keyboard", "when", "when-not", "do-dont", "content"]);

/**
 * The headings of a page body outside the demos, with where their text ends:
 * [{ level, id, text, line, start (of the tag), end (after the closing tag),
 * endLine }], offsets in `body`.
 */
function outline(body, bodyLine, file) {
  const pad = "\n".repeat(bodyLine - 1);
  const stack = [];
  let hidden = 0;
  let open = null;
  const found = [];
  for (const tag of tags(pad + body, file)) {
    if (tag.type === "start") {
      if (VOID.has(tag.name) || tag.selfClosing) continue;
      const left = tag.attrs.has("data-docs-specimen") || tag.attrs.has("inert") || tag.attrs.get("aria-hidden") === "true" || tag.name === "dialog";
      stack.push({ name: tag.name, left });
      if (left) hidden += 1;
      const level = HEADINGS.exec(tag.name)?.[1];
      if (level && !open && hidden === 0) open = { level: Number(level), id: tag.attrs.get("id") ?? null, line: tag.line, start: tag.index - pad.length, textStart: tag.end - pad.length };
    } else {
      const i = stack.findLastIndex((s) => s.name === tag.name);
      if (i === -1) continue;
      for (const s of stack.splice(i)) if (s.left) hidden -= 1;
      if (open && tag.name === `h${open.level}`) {
        const raw = body.slice(open.textStart, tag.index - pad.length);
        found.push({ ...open, text: collapse(decodeEntities(raw.replace(/<[^>]*>/g, ""))), end: tag.end - pad.length, endLine: tag.line });
        open = null;
      }
    }
  }
  return found;
}

/** The captions of "Do and don't": the verdict and the reason, one list item each. */
function captions(fragment, ctx, file, line) {
  const { tree } = convert(fragment, { file, line, siteUrl: ctx.siteUrl, base: ctx.base });
  const items = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.type !== "el" || isLeftOut(n, ctx)) continue;
      if (n.name === "figcaption") {
        const text = collapse(inline(n.children, ctx));
        if (text) items.push(`- ${text}`);
      } else walk(n.children);
    }
  };
  walk(tree.children);
  return items.join("\n");
}

const filesOf = (page, packageName) => {
  const files = page.meta.files
    .split(";")
    .map((f) => f.trim())
    .filter(Boolean)
    .join(", ");
  if (!files) return null;
  return packageName ? `Files: ${files} · Package: @luz-ds/${packageName}` : `Files: ${files}`;
};

// A page of whole-page templates (landing, cms, app): llms.txt lists it, an entry points at it. Its
// markup is the longest text of the site (about 35 kB for three pages) and an agent opens the one it needs.
const TEMPLATES_ROUTE = /\/templates\/$/;
const TEMPLATES_POINTER = "This page is a library of whole-page templates: open its URL for the markup of each.";

// A page about a workflow outside the markup (importing the tokens file into a design tool), whose steps
// an agent that writes HTML does not need: its summary, its files and a pointer, so the file keeps its ideal.
const SUMMARY_POINTERS = new Map([
  ["/docs/tokens/figma/", "This page explains how to import the tokens file into Figma and other design tools, step by step: open its URL for the steps."],
]);

const TOKENS_POINTER =
  "The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.";

/** The text of a page's body, by the kind of page. */
function bodyOf(page, options) {
  const { siteUrl, base } = options;
  const file = page.file;
  const area = page.meta.area;
  const headings = outline(page.body, page.bodyLine, file);
  const lineOf = (offset) => page.bodyLine + (page.body.slice(0, offset).match(/\n/g) ?? []).length;

  if (PACKAGE_OF_AREA[area] && TEMPLATES_ROUTE.test(page.route)) return TEMPLATES_POINTER;
  if (SUMMARY_POINTERS.has(page.route)) return SUMMARY_POINTERS.get(page.route);

  if (area === "html") {
    const items = headings.filter((h) => h.level === 2 && h.text).map((h) => `- ${/[<>]/.test(h.text) ? codeSpan(h.text) : h.text}`);
    return items.join("\n");
  }

  if (headings.some((h) => h.id === "markup")) {
    const boundaries = headings.filter((h) => h.level <= 3);
    const sections = [];
    for (const [i, h] of boundaries.entries()) {
      if (!GUIDED.has(h.id)) continue;
      const to = boundaries[i + 1]?.start ?? page.body.length;
      const fragment = page.body.slice(h.end, to);
      const line = h.endLine;
      let text;
      if (h.id === "do-dont") {
        const ctx = new Context({ file, siteUrl, base });
        text = captions(fragment, ctx, file, line);
      } else {
        text = convert(fragment, { file, line, siteUrl, base }).text;
      }
      if (text) sections.push(`### ${h.text}\n${text}`);
    }
    return sections.join("\n\n");
  }

  const tokens = area === "tokens";
  const { text } = convert(page.body, { file, line: lineOf(0), shift: 1, siteUrl, base, values: !tokens });
  // the lead of a page that brings its own is its description: once is enough
  const rest = text.startsWith(page.meta.description) ? text.slice(page.meta.description.length).replace(/^\s+/, "") : text;
  return tokens ? [rest, TOKENS_POINTER].filter(Boolean).join("\n\n") : rest;
}

/**
 * llms-full.txt: `# LUZ`, then one entry per page of every area but the hub,
 * in the order of llms.txt: `## title`, `URL:`, `Example:` (a page with
 * markup), `Files:` and package, the description, and the page's sections as text. Throws over LLMS_FULL_MAX.
 */
export function renderLlmsFull(site, { siteUrl = "" } = {}) {
  const out = ["# LUZ", "", summaryOf(site), "", DETAILS, "", "One entry per page of the documentation, in reading order. The markup of an entry shows its classes and elements; the `classes.json` of each package lists them all.", ""];
  for (const { area, pages } of sectionsOfSite(site)) {
    if (!area) continue;
    const packageName = PACKAGE_OF_AREA[area.id] ?? null;
    for (const page of pages) {
      const url = urlOf(page.route, siteUrl);
      const header = [`## ${page.meta.title}`, `URL: ${url}`];
      if (hasMarkup(page)) header.push(`Example: ${urlOf(exampleRouteOf(page), siteUrl)}`);
      const files = filesOf(page, packageName);
      if (files) header.push(files);
      out.push(header.join("\n"), "", page.meta.description, "");
      const body = bodyOf(page, { siteUrl, base: url });
      if (body) out.push(body, "");
    }
  }
  const text = `${out.join("\n").trimEnd()}\n`;
  if (bytes(text) > LLMS_FULL_MAX) {
    throw new Error(
      `llms-full.txt is ${bytes(text)} bytes, over its ceiling of ${LLMS_FULL_MAX}: trim what a page contributes (scripts/docs-site/ai.js), never raise the ceiling`,
    );
  }
  return text;
}

/* ---- examples/ and manifests/ ----------------------------------------------- */

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * What an example loads from each package: the stylesheet (the tokens one is
 * `tokens.min.css`, which has no @font-face, so no font is copied and none
 * needs its licence beside it), the entry script and the chunks it imports by
 * name, beside it.
 */
const exampleFilesOf = (pkg) => [pkg === "tokens" ? "tokens.min.css" : FILES[pkg].css, FILES[pkg].js, ...FILES[pkg].chunks].filter(Boolean);
const exampleCssOf = (pkg) => exampleFilesOf(pkg)[0];
const exampleJsOf = (pkg) => FILES[pkg].js;

const missing = (from) => new Error(`${from} is missing: run pnpm build`);

/**
 * The files an example loads, beside the examples (D1-A): one per css, js and
 * chunk of FILES, flat at `/examples/dist/<pkg>/<file>`, so a chunk is beside
 * the entry that imports it by name. [{ route, from }], `from` relative to
 * `root`; throws, naming the file, when a package is not built.
 */
export function exampleAssets(root) {
  const assets = [];
  for (const pkg of PACKAGES) {
    for (const file of exampleFilesOf(pkg)) {
      const from = `packages/${pkg}/dist/${file}`;
      if (!existsSync(join(root, from))) throw missing(from);
      assets.push({ route: `${AI_ROUTES.examples}dist/${pkg}/${file}`, from });
    }
  }
  return assets;
}

/**
 * The manifests of every package, copied to `/manifests/<pkg>/` (D4-A): the
 * `classes.json` of each, and the `custom-elements.json` of the packages that
 * have one. Byte for byte the files the package ships.
 */
export function manifestAssets(root) {
  const assets = [];
  for (const pkg of PACKAGES) {
    for (const file of ["classes.json", "custom-elements.json"]) {
      const from = `packages/${pkg}/dist/${file}`;
      if (!existsSync(join(root, from))) {
        if (file === "classes.json") throw missing(from);
        continue;
      }
      assets.push({ route: `${AI_ROUTES.manifests}${pkg}/${file}`, from });
    }
  }
  return assets;
}

const PRE_HTML = /<pre\b([^>]*\bdata-lang="html"[^>]*)>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g;

/**
 * The `html` blocks of a page's `#markup` section, in page order: { kept,
 * skipped }, each [{ label (the pre's aria-label), code (decoded once, trimmed) }].
 * A block with a <script> or an on*= attribute is skipped: the example has
 * no inline script and its policy says `script-src 'self'`.
 */
function markupBlocks(page) {
  const start = page.body.search(MARKUP_HEADING);
  const rest = page.body.slice(start + 1);
  const end = rest.search(/<h[23]\b/);
  const section = rest.slice(0, end === -1 ? undefined : end);
  const kept = [];
  const skipped = [];
  for (const [, attrs, code] of section.matchAll(PRE_HTML)) {
    const label = collapse(decodeEntities(/\baria-label="([^"]*)"/.exec(attrs)?.[1] ?? ""));
    const block = { label, code: decodeEntities(code).trim() };
    (/<script\b/i.test(block.code) || /\son[a-z]+\s*=/i.test(block.code) ? skipped : kept).push(block);
  }
  return { kept, skipped };
}

const KIND_AREAS = new Set(SITE_KINDS);

/** The tags of the elements `@luz-ds/site` declares, from the manifest it ships. */
function siteElements(root) {
  const file = join(root, "packages/site/dist/custom-elements.json");
  if (!existsSync(file)) throw missing("packages/site/dist/custom-elements.json");
  const modules = JSON.parse(readFileSync(file, "utf-8")).modules ?? [];
  return modules
    .flatMap((m) => m.declarations ?? [])
    .map((d) => d.tagName)
    .filter((tag) => typeof tag === "string" && /^[a-z][a-z0-9-]*$/.test(tag));
}

const escText = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (text) => escText(text).replace(/"/g, "&quot;");
/** Text for a comment: `--` would end it. */
const inComment = (text) => text.replace(/-{2,}/g, "-");

/**
 * One document: the shell of f5-ai-ready.md 1.4 around the kept blocks.
 * `packages` are the stylesheets to link (load order); `site` adds its script.
 */
function exampleDocument(page, { csp, versions, packages }) {
  const { kept, skipped } = markupBlocks(page);
  const title = page.meta.title;
  const route = exampleRouteOf(page);
  // `../dist/` and `../../docs/`: the document is at /examples/<area>/<slug>.html
  const docsUrl = `../..${page.route}#markup`;
  const snippetUrl = "../../docs/get-started/snippet/";
  const links = packages.map((pkg) => `  <link rel="stylesheet" href="../dist/${pkg}/${exampleCssOf(pkg)}">`);
  const scripts = ["core", ...packages.filter((pkg) => pkg === "site")].map((pkg) => `  <script type="module" src="../dist/${pkg}/${exampleJsOf(pkg)}"></script>`);
  const sections = kept.map(
    (block, i) =>
      `    <section class="o-stack" aria-labelledby="ex-${i + 1}">\n      <h2 id="ex-${i + 1}">${escText(block.label)}</h2>\n${block.code}\n    </section>`,
  );
  const lines = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    `  <meta http-equiv="Content-Security-Policy" content="${escAttr(csp)}">`,
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escText(title)}: markup examples – LUZ</title>`,
    `  <!-- Generated from ${docsUrl} by scripts/docs-site/ai.js. Do not edit. MIT licence, github.com/nandovejer/luz.`,
    `       Loads LUZ ${versions.core} from ../dist/, copied from the packages: the tokens file with no web font, so text uses the system serif.`,
    "       Links in the markup are placeholders. For npm or a CDN, with integrity hashes, see " + `${snippetUrl} -->`,
    ...links,
    "</head>",
    "<body>",
    '  <main class="o-container o-stack">',
    `    <h1>${escText(title)}</h1>`,
    `    <p>Markup copied from <a href="${docsUrl}">${escText(title)} in the LUZ documentation</a>.</p>`,
    ...sections,
    "  </main>",
  ];
  if (skipped.length) {
    lines.push(
      `  <!-- Left out, because the block has a script or an event handler and the policy of this page is script-src 'self': ${skipped
        .map((b) => inComment(b.label))
        .join("; ")}. Copy them from ${docsUrl} -->`,
    );
  }
  lines.push(...scripts, "</body>", "</html>", "");
  return { route, page, html: lines.join("\n") };
}

/**
 * One standalone document per page that has a `#markup` section, whatever its
 * area (48 today), at `/examples/<area>/<slug>.html`. `csp` is the string of
 * its CSP <meta>; `versions` maps each package to its version.
 *
 * The packages an example links, in load order: tokens, core, site when the
 * page's area is site or a kept block names a <luz-*> element that site's
 * custom-elements.json declares, then the kind's when the area is one.
 */
export function exampleDocuments(site, { csp, versions, root = REPO_ROOT }) {
  if (typeof csp !== "string" || !csp) throw new Error("exampleDocuments needs the csp of the pages build");
  if (typeof versions?.core !== "string") throw new Error("exampleDocuments needs versions.core");
  const tags = siteElements(root).map((tag) => new RegExp(`<${tag}[\\s>/]`));
  const documents = [];
  for (const page of site.pages) {
    if (!hasMarkup(page)) continue;
    const area = page.route.split("/")[2];
    const { kept } = markupBlocks(page);
    const withSite = area === "site" || kept.some((b) => tags.some((tag) => tag.test(b.code)));
    const packages = ["tokens", "core", ...(withSite ? ["site"] : []), ...(KIND_AREAS.has(area) ? [area] : [])];
    documents.push(exampleDocument(page, { csp, versions, packages }));
  }
  return documents;
}
