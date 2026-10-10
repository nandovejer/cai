/**
 * CAI — reading token overrides from CSS, for the contrast checker.
 *
 * Reads the --cai-* declarations of one or more stylesheets and answers what
 * each colour mode would have, with a small model of the cascade: later rules
 * win over earlier ones of the same specificity, and a more specific selector
 * wins over a later one. The model covers what a theme file really contains:
 *
 *   :root, html, :root[data-theme="dark"], [data-theme="dark"],
 *   [data-theme="brand"], [data-theme="brand"][data-mode="dark"],
 *   @media (prefers-color-scheme: dark), @layer and @supports (taken as true).
 *
 * Anything else (a class, a combinator, :has(), another media query) is left
 * out and listed in `ignored`, so a rule that was not understood is visible.
 * Not modelled: the order of @layer blocks, and :is() selectors.
 * No dependency, no file access, no DOM.
 */

export const BASE_MODES = ["light", "dark", "high-contrast"];

/** Replace comments by spaces of the same length, so line numbers stay true. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/**
 * The --cai-* declarations of a stylesheet as flat rules, in source order:
 * { selectors, conditions, declarations: [{ name, value, line }], line }.
 * `conditions` are the preludes of the at-rules around the rule.
 */
export function parseRules(css) {
  const text = stripComments(css);
  const rules = [];
  let i = 0;
  let line = 1;

  /** Read up to the next top-level `{`, `;` or `}`; returns { prelude, end, line }. */
  function readPrelude() {
    let depth = 0;
    let quote = "";
    let start = i;
    let startLine = line;
    // Skip leading space for a true start line
    while (i < text.length && /\s/.test(text[i])) {
      if (text[i] === "\n") line++;
      i++;
    }
    start = i;
    startLine = line;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === "\n") line++;
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (depth <= 0 && (c === "{" || c === ";" || c === "}")) break;
    }
    return { prelude: text.slice(start, i).trim(), stop: text[i], line: startLine };
  }

  /** A block body: declarations and nested blocks, until the closing brace. */
  function readBlock(conditions, selectors, atLine) {
    const declarations = [];
    while (i < text.length) {
      const { prelude, stop, line: startLine } = readPrelude();
      if (stop === "{") {
        i++;
        if (prelude.startsWith("@")) {
          readBlockInto(prelude, conditions, selectors);
        } else {
          const inner = readBlock(conditions, prelude.split(",").map((s) => s.trim()).filter(Boolean), startLine);
          void inner;
        }
      } else {
        // ";" or "}" or the end: a declaration, or an at-rule statement
        const colon = prelude.indexOf(":");
        if (prelude && !prelude.startsWith("@") && colon > 0) {
          const name = prelude.slice(0, colon).trim();
          if (name.startsWith("--cai-")) declarations.push({ name, value: prelude.slice(colon + 1).trim(), line: startLine });
        }
        if (stop === "}") {
          i++;
          break;
        }
        if (stop === ";") i++;
        else break;
      }
    }
    if (selectors && declarations.length) rules.push({ selectors, conditions, declarations, line: atLine });
    return declarations;
  }

  function readBlockInto(atPrelude, conditions, selectors) {
    // At-rule blocks hold rules (@media, @layer, @supports) or declarations
    // (@font-face, @page), which carry no --cai- token for us either way
    readBlock([...conditions, atPrelude], selectors ?? null, line);
  }

  readBlock([], null, 1);
  return rules;
}

/* ---- Selectors ------------------------------------------------------------ */

/**
 * What a selector says about the html element: { theme, mode, specificity }
 * (theme/mode null when it says nothing), or null when it is not a plain
 * compound of html, :root and [data-theme]/[data-mode] attributes.
 */
function readSelector(selector) {
  const compound = selector.trim().replace(/\s+/g, "");
  let rest = compound;
  let theme = null;
  let mode = null;
  let attrs = 0;
  let types = 0;
  if (/^html/i.test(rest)) {
    rest = rest.slice(4);
    types = 1;
  } else if (rest.startsWith("*")) rest = rest.slice(1);
  for (;;) {
    if (rest.startsWith(":root")) {
      rest = rest.slice(5);
      attrs++;
      continue;
    }
    const attr = rest.match(/^\[(data-theme|data-mode)=(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\]/);
    if (attr) {
      const value = attr[2] ?? attr[3] ?? attr[4];
      if (attr[1] === "data-theme") theme = value;
      else mode = value;
      rest = rest.slice(attr[0].length);
      attrs++;
      continue;
    }
    break;
  }
  if (rest !== "") return null;
  return { theme, mode, specificity: attrs * 100 + types };
}

/** The colour scheme a prefers-color-scheme condition asks for, or null. */
const schemeOf = (prelude) => prelude.match(/^@media\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/i)?.[1].toLowerCase() ?? null;

/** Whether a condition is one we take as true without evaluating. */
const transparent = (prelude) => /^@(layer|supports)\b/i.test(prelude);

/**
 * Targets a stylesheet speaks about: the three base modes, and every custom
 * theme named by a [data-theme] selector, as "name" (default mode) and
 * "name/light", "name/dark", "name/high-contrast".
 */
export function targetsOf(rules) {
  const themes = new Set();
  for (const { selectors } of rules) {
    for (const s of selectors) {
      const read = readSelector(s);
      if (read?.theme && !BASE_MODES.includes(read.theme)) themes.add(read.theme);
    }
  }
  const targets = BASE_MODES.map((name) => ({ name, theme: name, mode: null, scheme: name === "high-contrast" ? null : name }));
  for (const theme of [...themes].sort()) {
    targets.push({ name: theme, theme, mode: null, scheme: "light", custom: true });
    for (const mode of BASE_MODES) targets.push({ name: `${theme}/${mode}`, theme, mode, scheme: mode === "high-contrast" ? null : mode, custom: true });
  }
  return targets;
}

/**
 * The effective value of every --cai-* token in a target: later rules win,
 * a more specific selector wins over a later one.
 * `sources` is a list of { file, rules }, in load order (CAI's tokens first).
 * Returns { values, origin, ignored }: name → raw value, name → { file, line }
 * of the declaration that won, and the selectors and conditions left out.
 */
export function valuesFor(target, sources) {
  const values = {};
  const origin = {};
  const rank = {};
  const ignored = [];
  let order = 0;
  for (const { file, rules } of sources) {
    for (const rule of rules) {
      order++;
      let scheme = "any";
      let skip = null;
      for (const condition of rule.conditions) {
        const wanted = schemeOf(condition);
        if (wanted) scheme = wanted;
        else if (!transparent(condition)) skip = condition;
      }
      if (skip) {
        ignored.push({ file, line: rule.line, selector: rule.selectors.join(", "), reason: `${skip} is not evaluated` });
        continue;
      }
      if (scheme !== "any" && scheme !== target.scheme) continue;
      for (const selector of rule.selectors) {
        const read = readSelector(selector);
        if (!read) {
          // CAI's own no-JS path (:root:has(...)) is not a consumer's rule
          if (file !== "tokens") ignored.push({ file, line: rule.line, selector, reason: "only html, :root, [data-theme] and [data-mode] selectors are read" });
          continue;
        }
        const themeOk = read.theme === null || read.theme === target.theme;
        const modeOk = read.mode === null ? true : read.mode === target.mode;
        // A custom theme's own [data-theme] block is its default mode; a base
        // mode never matches a selector that asks for a data-mode
        if (!themeOk || !modeOk) continue;
        for (const { name, value, line } of rule.declarations) {
          const key = read.specificity * 1e6 + order;
          if (rank[name] !== undefined && rank[name] > key) continue;
          rank[name] = key;
          values[name] = value;
          origin[name] = { file, line };
        }
      }
    }
  }
  return { values, origin, ignored };
}
