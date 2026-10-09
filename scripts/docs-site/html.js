/**
 * CAI docs site — a small, strict HTML tokenizer for our own sources.
 *
 * Not a general parser: the sources are ours, so instead of repairing bad
 * markup the way a browser does, it fails with `file:line` on anything a
 * browser would have to repair (a mis-nested or unclosed tag, a block inside
 * a <p>, a self-closing non-void HTML element). What it returns is what the
 * generator needs: the ids, the links and the headings of a document.
 *
 * No dependencies; no Vite. Used by site.js and by the unit tests.
 */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// Their content is text up to the matching end tag, never markup
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
// Inside these, `/>` closes the element (foreign content)
const FOREIGN = new Set(["svg", "math"]);
// A start tag of one of these closes an open <p> in a browser: in our
// sources that is a nesting mistake, so it fails
const CLOSES_P = new Set([
  "address", "article", "aside", "blockquote", "details", "dialog", "div", "dl", "fieldset", "figcaption",
  "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "menu",
  "nav", "ol", "p", "pre", "search", "section", "table", "ul",
]);

const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Decode the character references our sources use (named basics and numeric). */
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, ref) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

/** An error that points at a line of a source file. */
export class HtmlError extends Error {
  constructor(file, line, message) {
    super(`${file}:${line}: ${message}`);
    this.name = "HtmlError";
    this.file = file;
    this.line = line;
  }
}

function lineCounter(html) {
  const starts = [0];
  for (let i = html.indexOf("\n"); i !== -1; i = html.indexOf("\n", i + 1)) starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * Split `html` into tags. Yields { type: "start" | "end", name, attrs (Map),
 * selfClosing, line, index, end }. Text, comments and the doctype are skipped;
 * raw-text elements (script, style, textarea, title) are skipped to their end tag.
 */
export function* tags(html, file = "<html>") {
  const lineOf = lineCounter(html);
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) return;
    if (html.startsWith("<!--", lt)) {
      const close = html.indexOf("-->", lt + 4);
      if (close === -1) throw new HtmlError(file, lineOf(lt), "comment is never closed");
      i = close + 3;
      continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") {
      const close = html.indexOf(">", lt);
      i = close === -1 ? html.length : close + 1;
      continue;
    }
    const endTag = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/.exec(html.slice(lt, lt + 80));
    if (endTag) {
      yield { type: "end", name: endTag[1].toLowerCase(), attrs: new Map(), selfClosing: false, line: lineOf(lt), index: lt, end: lt + endTag[0].length };
      i = lt + endTag[0].length;
      continue;
    }
    const open = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(lt, lt + 80));
    if (!open) {
      i = lt + 1; // a literal "<" in text
      continue;
    }
    // Find the closing ">" of the start tag, skipping quoted attribute values
    let j = lt + open[0].length;
    let quote = null;
    for (; j < html.length; j++) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (j >= html.length) throw new HtmlError(file, lineOf(lt), `<${open[1]}> start tag is never closed with ">"`);
    const inside = html.slice(lt + open[0].length, j);
    const selfClosing = /\/\s*$/.test(inside);
    const attrs = new Map();
    for (const m of inside.replace(/\/\s*$/, "").matchAll(ATTR)) {
      const name = m[1].toLowerCase();
      if (attrs.has(name)) throw new HtmlError(file, lineOf(lt), `<${open[1]}> has the attribute "${name}" twice`);
      attrs.set(name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ""));
    }
    const name = open[1].toLowerCase();
    yield { type: "start", name, attrs, selfClosing, line: lineOf(lt), index: lt, end: j + 1 };
    i = j + 1;
    if (RAW_TEXT.has(name) && !selfClosing) {
      const close = html.toLowerCase().indexOf(`</${name}`, i);
      if (close === -1) throw new HtmlError(file, lineOf(lt), `<${name}> is never closed`);
      i = close;
    }
  }
}

/**
 * Read a document or fragment: check its nesting and collect what the
 * generator needs. Throws an HtmlError on the first nesting problem.
 *
 * Returns {
 *   ids: Map<id, line>,                 every id (duplicates throw)
 *   links: [{ href, line }],            every <a href> and <area href>
 *   headings: [{ level, id, text, line, specimen }],
 *   elements: Set<tag name>,            every element used
 * }
 * `specimen` is true for a heading inside [data-docs-specimen] (a demo).
 */
export function readHtml(html, file = "<html>") {
  const stack = [];
  const ids = new Map();
  const links = [];
  const headings = [];
  const elements = new Set();
  let heading = null;
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
      }

      if (VOID.has(name)) continue;
      if (tag.selfClosing) {
        if (foreign) continue;
        throw new HtmlError(file, line, `<${name}/> is not a void element: write <${name}></${name}>`);
      }
      stack.push({ name, line, foreign: FOREIGN.has(name), specimen: attrs.has("data-docs-specimen") });
      if (FOREIGN.has(name)) foreign++;
      if (attrs.has("data-docs-specimen")) specimen++;
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
  return { ids, links, headings, elements };
}
