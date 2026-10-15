/**
 * LUZ check: the CSS reader (f5-ai-ready.md 2.1, 5.2, 8 "Parsing cost").
 *
 * Not a general CSS parser: it reads what the manifest and the checker need,
 * which is which classes a stylesheet names, which of them it defines, in
 * which layer, and which custom properties it declares. It never evaluates a
 * value and never keeps one.
 *
 *   readCss(text, file = "<css>", { strict = false } = {})
 *     -> { classes:    [{ name, defined, layer, line, column }],
 *          properties: [{ name, scope, layer, line, column }],
 *          declarations: [start, colon, end, …]  three offsets into `text` for
 *                       each declaration (the name starts at `start`, its
 *                       value runs from `colon + 1` to `end`), in reading
 *                       order, for the CSS warnings of rules/css.js
 *          findings:   [{ rule: "parse/error", line, column, message }] }
 *
 * Strict (the build of the manifests) throws a CssError, `file:line:column`,
 * on an unbalanced brace, parenthesis, bracket or string, an unterminated
 * comment, an at-rule it does not know and a block nested deeper than 64.
 * Lenient (a consumer's file) reports the same conditions as `findings` and
 * reads on; only the depth cap and a hundred findings stop it.
 *
 * What "defined" means: a class is DEFINED by a selector when it is in the one
 * and only compound of a complex selector (`.a`, `.a.b`, `.a:hover`,
 * `:is(.a, .b)`, and `&.b` under a rule that is itself a single compound). A
 * class after another compound (`.a .b`, `:root .b`), inside `:not()` or
 * `:has()`, is KNOWN, not defined: a checker accepts it, and it is not a class
 * to write on its own. A class is listed once per file, in the order it is
 * first seen; `layer` is the layer of the first rule that defines it, else of
 * its first mention. A custom property is `root` scope when declared on
 * `:root`, `html` or a `[data-theme]` selector, `component` scope on any other,
 * and `root` wins when a name is declared in both.
 *
 * Messages are fixed text: a finding never quotes the source (a file is data,
 * not instructions). One pass over the text; no recursion deeper than the cap.
 * A declaration is recorded as offsets, never as text: the value is not kept.
 */
import { lineAt, lineStarts } from "./html.js";

const MAX_DEPTH = 64;
const MAX_FINDINGS = 100;

const CONDITIONAL = new Set(["media", "supports", "container", "scope", "starting-style", "document", "layer"]);
const STATEMENTS = new Set(["import", "charset", "namespace", "layer"]);
const DECLARATIONS = new Set(["font-face", "property", "counter-style", "page", "font-feature-values", "font-palette-values", "view-transition", "position-try", "color-profile"]);
const MARGIN_BOX = /^(?:top|bottom|left|right)-/;
const TRANSPARENT = new Set(["is", "where", "matches", "any"]);

/** A problem at a position of a stylesheet, thrown in strict mode. */
export class CssError extends Error {
  constructor(file, line, column, message) {
    super(`${file}:${line}:${column}: ${message}`);
    this.name = "CssError";
    this.file = file;
    this.line = line;
    this.column = column;
  }
}

/** Stops reading in lenient mode: too deep, or too many findings. Never leaves readCss. */
class Halt extends Error {}

// Character codes, so the loops compare numbers
const TAB = 9;
const LF = 10;
const FF = 12;
const CR = 13;
const SPACE = 32;
const QUOTE2 = 34;
const QUOTE1 = 39;
const OPEN_PAREN = 40;
const CLOSE_PAREN = 41;
const STAR = 42;
const PLUS = 43;
const COMMA = 44;
const MINUS = 45;
const DOT = 46;
const SLASH = 47;
const COLON = 58;
const SEMI = 59;
const GT = 62;
const AT = 64;
const OPEN_BRACKET = 91;
const BACKSLASH = 92;
const CLOSE_BRACKET = 93;
const UNDERSCORE = 95;
const OPEN_BRACE = 123;
const PIPE = 124;
const CLOSE_BRACE = 125;
const TILDE = 126;
const AMP = 38;
const HASH = 35;

const isDigit = (c) => c >= 48 && c <= 57;
const isHex = (c) => isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
const isIdent = (c) => (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || isDigit(c) || c === MINUS || c === UNDERSCORE || c >= 0x80;
const isSpace = (c) => c === SPACE || c === TAB || c === LF || c === CR || c === FF;

const UNESCAPE = /\\([0-9a-fA-F]{1,6})(?:\r\n|[ \t\n\r\f])?|\\([\s\S])/g;
function unescapeCss(text) {
  return text.replace(UNESCAPE, (_, hex, other) => {
    if (other !== undefined) return other;
    const code = parseInt(hex, 16);
    return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? "�" : String.fromCodePoint(code);
  });
}

export function readCss(text, file = "<css>", { strict = false } = {}) {
  const starts = lineStarts(text);
  const length = text.length;
  const classes = new Map();
  const properties = new Map();
  const findings = [];
  const declarations = [];
  const HALT = new Halt();
  const DECLS = { kind: "decls", layer: null, sel: null };
  let pos = 0;
  let depth = 0;
  let eofReported = false;

  // ---- problems ----

  function report(index, message) {
    const line = lineAt(starts, index);
    const column = index - starts[line - 1] + 1;
    if (strict) throw new CssError(file, line, column, message);
    findings.push({ rule: "parse/error", line, column, message });
    if (findings.length >= MAX_FINDINGS) throw HALT;
  }

  function fatal(index, message) {
    report(index, message);
    throw HALT;
  }

  // ---- tokens ----

  /** After a comment that starts at `p`. */
  function skipComment(p) {
    const close = text.indexOf("*/", p + 2);
    if (close === -1) {
      report(p, "comment is never closed");
      return length;
    }
    return close + 2;
  }

  /** After a string that starts at `p`; a bad string ends at its newline. */
  function skipString(p) {
    const quote = text.charCodeAt(p);
    for (let i = p + 1; i < length; i++) {
      const c = text.charCodeAt(i);
      if (c === BACKSLASH) {
        if (text.charCodeAt(i + 1) === CR && text.charCodeAt(i + 2) === LF) i += 2;
        else i++;
      } else if (c === quote) return i + 1;
      else if (c === LF || c === CR || c === FF) {
        report(p, "string is never closed");
        return i;
      }
    }
    report(p, "string is never closed");
    return length;
  }

  /** The end of the identifier that starts at `p` (escapes included). */
  function identEnd(p) {
    let i = p;
    while (i < length) {
      const c = text.charCodeAt(i);
      if (c === BACKSLASH) {
        const next = text.charCodeAt(i + 1);
        if (Number.isNaN(next) || next === LF || next === CR || next === FF) break;
        i++;
        if (isHex(next)) {
          let n = 1;
          while (n < 6 && isHex(text.charCodeAt(i + 1))) {
            i++;
            n++;
          }
          i++;
          if (text.charCodeAt(i) === CR && text.charCodeAt(i + 1) === LF) i++;
          if (isSpace(text.charCodeAt(i))) i++;
        } else i++;
      } else if (isIdent(c)) i++;
      else break;
    }
    return i;
  }

  const identText = (a, b) => {
    const raw = text.slice(a, b);
    return raw.includes("\\") ? unescapeCss(raw) : raw;
  };

  /** Is the `(` at `p` the one of an unquoted url(…)? */
  function isRawUrl(p) {
    if (p < 3) return false;
    if ((text.charCodeAt(p - 1) | 32) !== 108 || (text.charCodeAt(p - 2) | 32) !== 114 || (text.charCodeAt(p - 3) | 32) !== 117) return false;
    if (p > 3 && isIdent(text.charCodeAt(p - 4))) return false;
    let i = p + 1;
    while (i < length && isSpace(text.charCodeAt(i))) i++;
    const c = text.charCodeAt(i);
    return c !== QUOTE1 && c !== QUOTE2;
  }

  /** After the `)` of the raw url( that opens at `p`. */
  function skipRawUrl(p) {
    for (let i = p + 1; i < length; i++) {
      const c = text.charCodeAt(i);
      if (c === BACKSLASH) i++;
      else if (c === CLOSE_PAREN) return i + 1;
    }
    report(p, "parenthesis is never closed");
    return length;
  }

  /**
   * Scan a prelude or a declaration from `from`. Leaves `pos` at the first
   * `{`, `;` or `}` outside parentheses and brackets, without consuming it,
   * and returns its code (-1 at the end of the text). With `braces` (a custom
   * property's value, where a block is part of the value) `{ }` pair up and
   * only `;` and an unmatched `}` stop it.
   */
  function scanUntil(from, braces) {
    const closers = [];
    const opened = [];
    const open = (closer, at) => {
      if (closers.length >= MAX_DEPTH) fatal(at, "brackets are nested too deep");
      closers.push(closer);
      opened.push(at);
    };
    const unclosed = () => {
      const closer = closers[closers.length - 1];
      const what = closer === CLOSE_PAREN ? "parenthesis" : closer === CLOSE_BRACKET ? "bracket" : "brace";
      report(opened[opened.length - 1], `${what} is never closed`);
      closers.length = 0;
      opened.length = 0;
    };
    let p = from;
    while (p < length) {
      const c = text.charCodeAt(p);
      switch (c) {
        case SLASH:
          p = text.charCodeAt(p + 1) === STAR ? skipComment(p) : p + 1;
          break;
        case QUOTE1:
        case QUOTE2:
          p = skipString(p);
          break;
        case BACKSLASH:
          p += 2;
          break;
        case OPEN_PAREN:
          if (isRawUrl(p)) p = skipRawUrl(p);
          else {
            open(CLOSE_PAREN, p);
            p++;
          }
          break;
        case OPEN_BRACKET:
          open(CLOSE_BRACKET, p);
          p++;
          break;
        case CLOSE_PAREN:
        case CLOSE_BRACKET:
          if (closers.length && closers[closers.length - 1] === c) {
            closers.pop();
            opened.pop();
          } else report(p, c === CLOSE_PAREN ? "unmatched closing parenthesis" : "unmatched closing bracket");
          p++;
          break;
        case OPEN_BRACE:
          if (braces) {
            open(CLOSE_BRACE, p);
            p++;
            break;
          }
          if (closers.length) unclosed();
          pos = p;
          return c;
        case CLOSE_BRACE:
          if (braces && closers.length && closers[closers.length - 1] === CLOSE_BRACE) {
            closers.pop();
            opened.pop();
            p++;
            break;
          }
          if (closers.length) unclosed();
          pos = p;
          return c;
        case SEMI:
          if (closers.length === 0) {
            pos = p;
            return c;
          }
          p++;
          break;
        default:
          p++;
      }
    }
    if (closers.length) unclosed();
    pos = length;
    return -1;
  }

  // ---- selectors ----

  /**
   * Read the selector list in text[p, to). `inParen` stops at the `)` that
   * ends a functional pseudo-class. Returns { list, next } where each complex
   * selector is { compounds, amp, root, items: [{ name, index, ok }] }: `ok`
   * is false for a class in a position that cannot define it (inside :not(),
   * :has(), or an :is() whose own selector has more than one compound).
   */
  function readList(from, to, inParen) {
    const list = [];
    let p = from;
    for (;;) {
      const complex = readComplex(p, to, inParen);
      list.push(complex.value);
      p = complex.next;
      if (p < to && text.charCodeAt(p) === COMMA) {
        p++;
        continue;
      }
      return { list, next: p };
    }
  }

  function readComplex(from, to, inParen) {
    const items = [];
    let compounds = 0;
    let inCompound = false;
    let amp = false;
    let mark = false;
    let plain = true; // no class and no id in it
    let p = from;
    while (p < to) {
      const c = text.charCodeAt(p);
      if (c === COMMA) break;
      if (c === CLOSE_PAREN) {
        if (inParen) break;
        p++;
        continue;
      }
      if (isSpace(c)) {
        inCompound = false;
        p++;
        continue;
      }
      if (c === GT || c === PLUS || c === TILDE) {
        inCompound = false;
        p++;
        continue;
      }
      if (c === PIPE && text.charCodeAt(p + 1) === PIPE) {
        inCompound = false;
        p += 2;
        continue;
      }
      if (c === SLASH && text.charCodeAt(p + 1) === STAR) {
        const close = text.indexOf("*/", p + 2);
        p = close === -1 || close + 2 > to ? to : close + 2;
        continue;
      }
      if (!inCompound) {
        compounds++;
        inCompound = true;
      }
      if (c === DOT) {
        const end = identEnd(p + 1);
        if (end > p + 1) items.push({ name: identText(p + 1, end), index: p, ok: true });
        plain = false;
        p = Math.max(end, p + 1);
      } else if (c === HASH) {
        plain = false;
        p = Math.max(identEnd(p + 1), p + 1);
      } else if (c === OPEN_BRACKET) {
        const end = identEnd(p + 1);
        if (text.startsWith("data-theme", p + 1) && end - (p + 1) >= 10) mark = true;
        p = skipBracket(p, to);
      } else if (c === COLON) {
        p++;
        if (text.charCodeAt(p) === COLON) p++;
        const end = identEnd(p);
        const name = text.slice(p, end).toLowerCase().replace(/^-(?:webkit|moz)-/, "");
        p = Math.max(end, p);
        if (text.charCodeAt(p) === OPEN_PAREN && p < to) {
          const inner = readList(p + 1, to, true);
          p = inner.next;
          if (text.charCodeAt(p) === CLOSE_PAREN) p++;
          const through = TRANSPARENT.has(name);
          for (const complex of inner.list) {
            for (const item of complex.items) items.push({ name: item.name, index: item.index, ok: through && item.ok && complex.compounds <= 1 });
          }
        } else if (name === "root") mark = true;
      } else if (c === OPEN_PAREN) {
        // A bare group, as in `@scope (.card) to (.x)`: known, never defined
        const inner = readList(p + 1, to, true);
        p = inner.next;
        if (text.charCodeAt(p) === CLOSE_PAREN) p++;
        for (const complex of inner.list) for (const item of complex.items) items.push({ name: item.name, index: item.index, ok: false });
      } else if (c === AMP) {
        amp = true;
        p++;
      } else if (c === QUOTE1 || c === QUOTE2) {
        p = skipQuoted(p, to);
      } else if (isIdent(c) || c === BACKSLASH) {
        const end = identEnd(p);
        if (end > p && text.slice(p, end).toLowerCase() === "html") mark = true;
        p = Math.max(end, p + 1);
      } else p++;
    }
    return { value: { compounds, amp, root: mark && plain && compounds === 1, items }, next: p };
  }

  /** After the `]` of the attribute selector that opens at `p`. */
  function skipBracket(p, to) {
    for (let i = p + 1; i < to; i++) {
      const c = text.charCodeAt(i);
      if (c === BACKSLASH) i++;
      else if (c === QUOTE1 || c === QUOTE2) i = skipQuoted(i, to) - 1;
      else if (c === CLOSE_BRACKET) return i + 1;
    }
    return to;
  }

  /** After the string that opens at `p`, without reporting (the scan did). */
  function skipQuoted(p, to) {
    const quote = text.charCodeAt(p);
    for (let i = p + 1; i < to; i++) {
      const c = text.charCodeAt(i);
      if (c === BACKSLASH) i++;
      else if (c === quote) return i + 1;
    }
    return to;
  }

  // ---- what it finds ----

  function addClass(name, index, defined, layer) {
    const known = classes.get(name);
    if (known === undefined) {
      const line = lineAt(starts, index);
      classes.set(name, { name, defined, layer, line, column: index - starts[line - 1] + 1 });
    } else if (defined && !known.defined) {
      known.defined = true;
      known.layer = layer;
    }
  }

  function addProperty(name, index, ctx) {
    const scope = ctx.sel !== null && ctx.sel.root ? "root" : "component";
    const known = properties.get(name);
    if (known === undefined || (scope === "root" && known.scope !== "root")) {
      const line = lineAt(starts, index);
      properties.set(name, { name, scope, layer: ctx.layer, line, column: index - starts[line - 1] + 1 });
    }
  }

  /** The style rule whose selector is text[from, to): register its classes. Returns the context of its block. */
  function styleRule(ctx, from, to) {
    const { list } = readList(from, to, false);
    const nested = ctx.kind === "style";
    let single = false;
    let root = false;
    for (const complex of list) {
      const own = nested ? complex.compounds === 1 && complex.amp && ctx.sel.single : complex.compounds === 1;
      if (own) single = true;
      if (complex.root || (nested && complex.amp && complex.compounds === 1 && ctx.sel.root)) root = true;
      for (const item of complex.items) addClass(item.name, item.index, own && item.ok, ctx.layer);
    }
    return { kind: "style", layer: ctx.layer, sel: { single, root } };
  }

  // ---- blocks and statements ----

  function skipTrivia() {
    while (pos < length) {
      const c = text.charCodeAt(pos);
      if (isSpace(c) || c === 0xfeff) pos++;
      else if (c === SLASH && text.charCodeAt(pos + 1) === STAR) pos = skipComment(pos);
      else break;
    }
  }

  function enterBlock(braceAt, ctx) {
    if (depth >= MAX_DEPTH) fatal(braceAt, "blocks are nested too deep");
    depth++;
    const closed = readItems(ctx);
    depth--;
    if (!closed && !eofReported) {
      eofReported = true;
      report(braceAt, "block is never closed");
    }
  }

  /** Is there a custom property declaration (`--x:`) at `pos`? */
  function startsCustomProperty() {
    if (text.charCodeAt(pos) !== MINUS || text.charCodeAt(pos + 1) !== MINUS) return false;
    let i = identEnd(pos);
    while (i < length && isSpace(text.charCodeAt(i))) i++;
    return text.charCodeAt(i) === COLON;
  }

  /** Record the declaration text[from, to): offsets of its name, its colon and its end. */
  function declare(from, to) {
    for (let i = from; i < to; i++) {
      if (text.charCodeAt(i) === COLON) {
        declarations.push(from, i, to);
        return;
      }
    }
  }

  function customProperty(ctx) {
    const start = pos;
    const end = identEnd(pos);
    addProperty(identText(start, end), start, ctx);
    pos = end;
    const term = scanUntil(end, true);
    declare(start, pos);
    if (term === SEMI) pos++;
  }

  function atRule(ctx) {
    const at = pos;
    const nameEnd = identEnd(pos + 1);
    const name = text.slice(pos + 1, nameEnd).toLowerCase().replace(/^-[a-z]+-/, "");
    const preludeStart = nameEnd;
    const term = scanUntil(nameEnd, false);
    if (term !== OPEN_BRACE) {
      if (term === SEMI) pos++;
      if (ctx.kind !== "decls" && !STATEMENTS.has(name) && !CONDITIONAL.has(name) && !DECLARATIONS.has(name)) report(at, "unknown at-rule");
      return;
    }
    const braceAt = pos;
    pos++;
    let child = DECLS;
    if (ctx.kind === "decls") child = DECLS;
    else if (name === "layer" || CONDITIONAL.has(name)) {
      const kind = ctx.kind === "style" ? "style" : "rules";
      let layer = ctx.layer;
      if (name === "layer") {
        const written = text.slice(preludeStart, braceAt).replace(/\/\*[\s\S]*?\*\//g, "").trim();
        if (/^[\w.-]+$/.test(written)) layer = ctx.layer ? `${ctx.layer}.${written}` : written;
      } else if (name === "scope") {
        for (const complex of readList(preludeStart, braceAt, false).list) for (const item of complex.items) addClass(item.name, item.index, false, ctx.layer);
      }
      child = { kind, layer, sel: ctx.sel };
    } else if (name === "keyframes") child = { kind: "keyframes", layer: ctx.layer, sel: null };
    else if (!DECLARATIONS.has(name) && !MARGIN_BOX.test(name)) report(at, "unknown at-rule");
    enterBlock(braceAt, child);
  }

  function statement(ctx) {
    const start = pos;
    const term = scanUntil(pos, false);
    if (term !== OPEN_BRACE) {
      if (ctx.kind !== "rules") declare(start, pos);
      if (term === SEMI) pos++;
      return;
    }
    const braceAt = pos;
    pos++;
    enterBlock(braceAt, ctx.kind === "rules" || ctx.kind === "style" ? styleRule(ctx, start, braceAt) : DECLS);
  }

  /** The items of a block, up to its `}` (consumed: true) or the end of the text (false). */
  function readItems(ctx) {
    for (;;) {
      skipTrivia();
      if (pos >= length) return false;
      const c = text.charCodeAt(pos);
      if (c === CLOSE_BRACE) {
        pos++;
        if (depth === 0) {
          report(pos - 1, "unmatched closing brace");
          continue;
        }
        return true;
      }
      if (c === SEMI) pos++;
      else if (c === AT) atRule(ctx);
      else if (ctx.kind === "style" && startsCustomProperty()) customProperty(ctx);
      else statement(ctx);
    }
  }

  try {
    readItems({ kind: "rules", layer: null, sel: null });
  } catch (error) {
    if (error !== HALT) throw error;
  }
  return { classes: [...classes.values()], properties: [...properties.values()], declarations, findings };
}
