/**
 * The BEM-style blocks a stylesheet defines, read from its source text.
 *
 * A block is the name a package ships and owns: a custom-element tag
 * (`luz-search`), a component class (`.luz-card` of `.luz-card__title`) or
 * an object (`.o-stack`). A selector names a block it only *refines* when
 * the block is not first in the selector (`.luz-landing-header luz-lang-switch`
 * defines landing's header and merely styles site's tag), so only the
 * leftmost compound of each selector counts, with `:where()` / `:is()`
 * unwrapped and every other functional pseudo-class (`:has()`, `:not()`)
 * ignored.
 */

/** Selector preludes of every style rule, at any depth of @media, @supports, @layer or @container. */
export function selectorsOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      const prelude = text.slice(start, i).trim();
      if (prelude && !prelude.startsWith("@")) out.push(prelude);
      start = i + 1;
    } else if (c === "}" || c === ";") start = i + 1;
  }
  return out;
}

/** Split `text` at `separator` characters that sit outside parentheses and brackets. */
function splitTop(text, separator) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && separator.test(c)) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts;
}

/** `:where(a b)` and `:is(a b)` at the top level become `a b`; the rest of the selector is kept. */
function unwrap(selector) {
  let out = "";
  let i = 0;
  while (i < selector.length) {
    const m = /^:(?:where|is)\(/.exec(selector.slice(i));
    if (!m) {
      out += selector[i++];
      continue;
    }
    let depth = 1;
    let j = i + m[0].length;
    for (; j < selector.length && depth > 0; j++) {
      if (selector[j] === "(") depth++;
      else if (selector[j] === ")") depth--;
    }
    out += selector.slice(i + m[0].length, j - 1);
    i = j;
  }
  return out;
}

/** Remove `:name(...)` functional pseudo-classes and pseudo-elements, with their arguments. */
function withoutFunctions(compound) {
  let out = "";
  let i = 0;
  while (i < compound.length) {
    if (compound[i] === ":" && /^::?[\w-]+\(/.test(compound.slice(i))) {
      let depth = 0;
      let j = compound.indexOf("(", i);
      for (; j < compound.length; j++) {
        if (compound[j] === "(") depth++;
        else if (compound[j] === ")" && --depth === 0) break;
      }
      i = j + 1;
    } else out += compound[i++];
  }
  return out;
}

/** The block of a class or tag name: `luz-card__title--x` and `luz-card` are both `luz-card`. */
export const blockOfName = (name) => name.replace(/(?:__|--).*$/, "");

/** The blocks (tags and `.luz-*` / `.o-*` classes) that the leftmost compound of a selector list defines. */
export function blocksOfSelector(selectorList) {
  const blocks = new Set();
  for (const selector of splitTop(selectorList, /,/)) {
    const flat = unwrap(selector.trim());
    const leftmost = withoutFunctions(splitTop(flat.trim(), /[\s>+~]/)[0] ?? "");
    for (const [, name] of leftmost.matchAll(/\.((?:luz|o)-[a-z0-9_-]+)/g)) blocks.add(blockOfName(name));
    const tag = /^(luz-[a-z0-9-]+)/.exec(leftmost);
    if (tag) blocks.add(tag[1]);
  }
  return blocks;
}

/** Every block a stylesheet defines. */
export function blocksOfCss(css) {
  const blocks = new Set();
  for (const selector of selectorsOf(css)) for (const block of blocksOfSelector(selector)) blocks.add(block);
  return blocks;
}
