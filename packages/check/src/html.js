/**
 * LUZ check: the HTML tokenizer, the one copy (f5-ai-ready.md 5.2, D12).
 *
 * It started as the tokenizer of the docs generator (scripts/docs-site/html.js
 * imports it from here and keeps `readHtml`). Not a general parser: it splits
 * a document into tags, in order, and says where each one is.
 *
 *   tags(html, file, { lenient })   start and end tags, strict by default: it
 *       throws an HtmlError with `file:line` on anything a browser would have
 *       to repair, which is what the generator wants of its own sources. With
 *       `lenient: true` a consumer's file is never thrown at: a duplicate
 *       attribute keeps the first value and is listed in `tag.problems`, and
 *       an unclosed comment, start tag or raw-text element ends the stream
 *       with one { type: "error", line, column, message } token.
 *   scan(html, file)                the records the rules read: lenient, each
 *       element with its attributes (value, line, column) and its open
 *       ancestors; a <style> and a <script> with their text as written.
 *   decodeEntities(text)            the character references a source uses.
 *
 * One pass, no quadratic spot: the text after a raw-text start tag is searched
 * with one sticky-position regexp per element name, never by lowercasing the
 * document once per <script>. No dependencies, no Node built-ins: it also
 * runs where the docs generator does.
 */

/** Elements that have no end tag and no content. */
export const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// Their content is text up to the matching end tag, never markup. The regexps
// are global so a search can start at `lastIndex`: one per name, not per tag.
const RAW_TEXT_END = {
  script: /<\/script/gi,
  style: /<\/style/gi,
  textarea: /<\/textarea/gi,
  title: /<\/title/gi,
};
// Foreign content: `/>` closes the element, and its children are not HTML
const FOREIGN = new Set(["svg", "math"]);
// How many open ancestors scan() remembers. A best-effort stack must not cost
// more than a document is long: past this depth elements are not pushed.
const MAX_DEPTH = 256;

const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
const NO_PROBLEMS = Object.freeze([]);

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

/** Offsets of the first character of each line, in order (shared with css.js). */
export function lineStarts(html) {
  const starts = [0];
  for (let i = html.indexOf("\n"); i !== -1; i = html.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

/** The 1-based line of an offset, by binary search over `starts`. */
export function lineAt(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/**
 * The tokenizer. `lenient` turns each throw into an error token; `detail`
 * (scan() only) makes `attrs` a Map of name -> { value, line, column } and
 * gives a raw-text start tag its `text`.
 */
function* tokenize(html, file, lenient, detail) {
  const starts = lineStarts(html);
  const length = html.length;
  let i = 0;

  /** Throw (strict) or build the error token (lenient) for a problem at `index`. */
  const problem = (index, message) => {
    const line = lineAt(starts, index);
    if (!lenient) throw new HtmlError(file, line, message);
    return { type: "error", line, column: index - starts[line - 1] + 1, message };
  };

  while (i < length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) return;
    if (html.startsWith("<!--", lt)) {
      const close = html.indexOf("-->", lt + 4);
      if (close === -1) {
        yield problem(lt, "comment is never closed");
        return;
      }
      i = close + 3;
      continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") {
      const close = html.indexOf(">", lt);
      i = close === -1 ? length : close + 1;
      continue;
    }
    const line = lineAt(starts, lt);
    const column = lt - starts[line - 1] + 1;
    const endTag = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/.exec(html.slice(lt, lt + 80));
    if (endTag) {
      const end = lt + endTag[0].length;
      yield { type: "end", name: endTag[1].toLowerCase(), attrs: new Map(), selfClosing: false, line, column, index: lt, end };
      i = end;
      continue;
    }
    const open = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(lt, lt + 80));
    if (!open) {
      i = lt + 1; // a literal "<" in text
      continue;
    }
    // Find the closing ">" of the start tag, skipping quoted attribute values
    const nameEnd = lt + open[0].length;
    let j = nameEnd;
    let quote = null;
    for (; j < length; j++) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (j >= length) {
      yield problem(lt, `<${open[1]}> start tag is never closed with ">"`);
      return;
    }
    const inside = html.slice(nameEnd, j);
    const selfClosing = /\/\s*$/.test(inside);
    const attrs = new Map();
    let problems = NO_PROBLEMS;
    for (const m of inside.replace(/\/\s*$/, "").matchAll(ATTR)) {
      const attrName = m[1].toLowerCase();
      const at = detail || lenient ? nameEnd + m.index : 0;
      if (attrs.has(attrName)) {
        if (!lenient) throw new HtmlError(file, line, `<${open[1]}> has the attribute "${attrName}" twice`);
        const dupLine = lineAt(starts, at);
        if (problems === NO_PROBLEMS) problems = [];
        problems.push({ code: "duplicate-attribute", name: attrName, line: dupLine, column: at - starts[dupLine - 1] + 1 });
        continue;
      }
      const value = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
      if (detail) {
        const attrLine = lineAt(starts, at);
        attrs.set(attrName, { value, line: attrLine, column: at - starts[attrLine - 1] + 1 });
      } else attrs.set(attrName, value);
    }
    const name = open[1].toLowerCase();
    const token = { type: "start", name, written: open[1], attrs, selfClosing, line, column, index: lt, end: j + 1 };
    if (lenient) token.problems = problems;
    i = j + 1;
    if (RAW_TEXT_END[name] && !selfClosing) {
      const re = RAW_TEXT_END[name];
      re.lastIndex = i;
      const found = re.exec(html);
      if (detail) token.text = html.slice(i, found ? found.index : length);
      yield token;
      if (!found) {
        yield problem(lt, `<${name}> is never closed`);
        return;
      }
      i = found.index;
      continue;
    }
    yield token;
  }
}

/**
 * Split `html` into tags. Yields { type: "start" | "end", name, written (a
 * start tag: the name as the file spells it), attrs (Map of
 * name -> value), selfClosing, line, column, index, end }. Text, comments and
 * the doctype are skipped; raw-text elements (script, style, textarea, title)
 * are skipped to their end tag. A start tag has `problems` in lenient mode.
 *
 * Strict (the default) throws an HtmlError on a comment, start tag or raw-text
 * element that is never closed and on a duplicate attribute. Lenient yields a
 * { type: "error", line, column, message } token for the first of those and
 * stops, and keeps the first of a duplicate attribute.
 */
export function* tags(html, file = "<html>", { lenient = false } = {}) {
  yield* tokenize(html, file, lenient === true, false);
}

/**
 * The records the rules read, in document order, lenient. Yields
 *   { type: "element", name, written, attrs, parentChain, parent, inert, selfClosing, line, column, problems, text? }
 * for each start tag (`attrs`: Map of name -> { value, line, column }, the
 * first of a duplicate wins; `written`: the name as the file spells it, `name`
 * being lowercase; `parentChain`: the names of the open ancestors, outermost
 * first; `parent`: the record of the nearest one, or null, so a rule walks the
 * ancestors without a copy; `inert`: the element or an ancestor has the
 * `inert` attribute; `text`: the content of a raw-text element, as written), and
 * finally { type: "error", line, column, message } when the file stops making
 * sense. The ancestor stack is best effort: an end tag pops to its element, a
 * stray end tag is ignored, implied end tags (<li>, <p>) are not modelled.
 */
export function* scan(html, file = "<html>") {
  const stack = [];
  const owners = []; // the record of each name in `stack`
  let foreign = 0;
  for (const token of tokenize(html, file, true, true)) {
    if (token.type === "error") {
      yield { type: "error", line: token.line, column: token.column, message: token.message };
      return;
    }
    const { name } = token;
    if (token.type === "start") {
      const parent = owners.length > 0 ? owners[owners.length - 1] : null;
      const record = {
        type: "element",
        name,
        written: token.written,
        attrs: token.attrs,
        parentChain: stack.slice(),
        parent,
        inert: token.attrs.has("inert") || (parent !== null && parent.inert),
        selfClosing: token.selfClosing,
        line: token.line,
        column: token.column,
        problems: token.problems,
      };
      if (token.text !== undefined) record.text = token.text;
      yield record;
      if (VOID.has(name) || stack.length >= MAX_DEPTH) continue;
      if (token.selfClosing && (foreign > 0 || FOREIGN.has(name))) continue;
      stack.push(name);
      owners.push(record);
      if (FOREIGN.has(name)) foreign++;
    } else {
      const at = stack.lastIndexOf(name);
      if (at === -1) continue;
      owners.length = at;
      while (stack.length > at) if (FOREIGN.has(stack.pop())) foreign--;
    }
  }
}
