/**
 * LUZ docs site — a small, strict HTML tokenizer for our own sources.
 *
 * Not a general parser: the sources are ours, so instead of repairing bad
 * markup the way a browser does, it fails with `file:line` on anything a
 * browser would have to repair (a mis-nested or unclosed tag, a block inside
 * a <p>, a self-closing non-void HTML element). What it returns is what the
 * generator needs: the ids, the links, the headings and the `<code>` names
 * of a document.
 *
 * The tokenizer itself (`tags`, `decodeEntities`, `HtmlError`) is
 * packages/check/src/html.js; this file re-exports it and adds `readHtml`.
 *
 * No dependencies; no Vite. Used by site.js and by the unit tests.
 */

import { HtmlError, VOID, decodeEntities, tags } from "../../packages/check/src/html.js";

// Inside these, `/>` closes the element (foreign content)
const FOREIGN = new Set(["svg", "math"]);
// A start tag of one of these closes an open <p> in a browser: in our
// sources that is a nesting mistake, so it fails
const CLOSES_P = new Set([
  "address", "article", "aside", "blockquote", "details", "dialog", "div", "dl", "fieldset", "figcaption",
  "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "menu",
  "nav", "ol", "p", "pre", "search", "section", "table", "ul",
]);

// The tokenizer lives in @luz-ds/check, once: the docs generator reads it
// strict (its own sources) and the checker reads it lenient (a consumer's)
export { HtmlError, VOID, decodeEntities, tags };

/**
 * Read a document or fragment: check its nesting and collect what the
 * generator needs. Throws an HtmlError on the first nesting problem.
 *
 * Returns {
 *   ids: Map<id, line>,                 every id (duplicates throw)
 *   links: [{ href, line }],            every <a href> and <area href>
 *   headings: [{ level, id, text, line, specimen }],
 *   codes: [{ text, line, heading, own, cell, specimen }],
 *   swatches: [{ token, line, heading, own }],
 *   elements: Set<tag name>,            every element used
 * }
 * `specimen` is true for a heading inside a demo: [data-docs-specimen],
 * [aria-hidden="true"], [inert] or a <dialog> (a demo is not the outline).
 * `codes` are the short <code> texts outside <pre> (a class, a token): the
 * id of the last heading before it (outside demos), of its nearest ancestor
 * that has one, and the data-label of the table cell it is in.
 * `swatches` are the colours a page draws without naming them in a <code>:
 * an element of class `docs-swatch` whose style says `--v: var(--luz-…)` (the
 * primitive scales of the palette). `own` is where to link: the id of the
 * label the swatch's list is named by (`aria-labelledby`), else of its
 * nearest ancestor that has one.
 */
export function readHtml(html, file = "<html>") {
  const stack = [];
  const ids = new Map();
  const links = [];
  const headings = [];
  const codes = [];
  const swatches = [];
  const elements = new Set();
  let heading = null;
  let section = null;
  let code = null;
  let foreign = 0;
  let specimen = 0;

  for (const tag of tags(html, file)) {
    if (tag.type === "start") {
      const { name, attrs, line } = tag;
      elements.add(name);
      if (!foreign && CLOSES_P.has(name) && stack.some((t) => t.name === "p")) {
        throw new HtmlError(file, line, `<${name}> inside an open <p> (opened at line ${stack.findLast((t) => t.name === "p").line}); a browser would close the <p> here`);
      }
      const id = attrs.get("id");
      if (id !== undefined) {
        if (id === "" || /\s/.test(id)) throw new HtmlError(file, line, `invalid id "${id}"`);
        if (ids.has(id)) throw new HtmlError(file, line, `duplicate id "${id}" (first at line ${ids.get(id)})`);
        ids.set(id, line);
      }
      if ((name === "a" || name === "area") && attrs.has("href")) links.push({ href: attrs.get("href"), line });
      if (/^h[1-6]$/.test(name) && !foreign) {
        heading = { level: Number(name[1]), id: id ?? null, text: "", line, specimen: specimen > 0, start: tag.end };
        if (id && !specimen) section = id;
      }
      if (name === "code" && !foreign && !code && !stack.some((t) => t.name === "pre")) {
        code = { line, heading: section, own: stack.findLast((t) => t.id)?.id ?? null, cell: stack.findLast((t) => t.label !== undefined)?.label ?? null, specimen: specimen > 0, start: tag.end };
      }

      const swatch = /(?:^|;)\s*--v\s*:\s*var\(\s*(--luz-[\w-]+)\s*\)/.exec(attrs.get("style") ?? "");
      if (swatch && /(?:^|\s)docs-swatch(?:\s|$)/.test(attrs.get("class") ?? "")) {
        const labelled = stack.findLast((t) => t.labelledby)?.labelledby;
        swatches.push({ token: swatch[1], line, heading: section, own: labelled ?? stack.findLast((t) => t.id)?.id ?? null });
      }

      if (VOID.has(name)) continue;
      if (tag.selfClosing) {
        if (foreign) continue;
        throw new HtmlError(file, line, `<${name}/> is not a void element: write <${name}></${name}>`);
      }
      const isSpecimen = attrs.has("data-docs-specimen") || attrs.get("aria-hidden") === "true" || attrs.has("inert") || name === "dialog";
      stack.push({ name, line, id, label: attrs.get("data-label"), labelledby: attrs.get("aria-labelledby"), foreign: FOREIGN.has(name), specimen: isSpecimen });
      if (FOREIGN.has(name)) foreign++;
      if (isSpecimen) specimen++;
    } else {
      const { name, line } = tag;
      if (VOID.has(name)) throw new HtmlError(file, line, `</${name}> closes a void element`);
      const top = stack.pop();
      if (!top) throw new HtmlError(file, line, `</${name}> has no open element`);
      if (top.name !== name) {
        throw new HtmlError(file, line, `</${name}> closes <${top.name}> (opened at line ${top.line})`);
      }
      if (top.foreign) foreign--;
      if (top.specimen) specimen--;
      if (code && name === "code") {
        const { start, ...rest } = code;
        // Only a short name: a class or a token, not a code sample
        if (tag.index - start < 80) codes.push({ text: decodeEntities(html.slice(start, tag.index).replace(/<[^>]*>/g, "")).trim(), ...rest });
        code = null;
      }
      if (heading && name === `h${heading.level}`) {
        const raw = html.slice(heading.start, tag.index);
        heading.text = decodeEntities(raw.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
        delete heading.start;
        headings.push(heading);
        heading = null;
      }
    }
  }
  if (stack.length) {
    const top = stack.at(-1);
    throw new HtmlError(file, top.line, `<${top.name}> is never closed`);
  }
  return { ids, links, headings, codes, swatches, elements };
}
