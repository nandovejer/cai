/**
 * LUZ check: the warnings about a stylesheet (f5-ai-ready.md 5.6).
 *
 *   css/literal-colour  a colour written out in a declaration that is not a
 *                       custom property (a custom property is where one belongs)
 *   css/literal-size    a px or rem length in font-size, margin, padding, gap
 *                       or border-radius
 *   css/knob-in-px      --luz-type-base or --luz-space-unit written in px
 *   css/important       !important, in a custom property too
 *   css/private-token   a --luz-* property that a component sets for itself,
 *                       set or read
 *   css/unknown-token   a --luz-* property no manifest declares, set or read
 *
 * One pass over the declarations the reader of css.js recorded as offsets; a
 * finding points at the first character of the property name. Comments,
 * strings and url() are taken out of a value before it is read. A colour is
 * written in a message only as #rrggbb, and a colour with no such form is not
 * written at all (security-auditor Q3). The two token rules need the
 * properties of the manifests, which `world()` loads on the first need: a file
 * with no --luz-* reads none.
 */
import { lineAt, lineStarts } from "../html.js";
import { finding } from "../report.js";
import { closest } from "../suggest.js";
import { isEcho, toHex } from "./shared.js";
import { withoutComments } from "./load.js";

const NOISE = /"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*'|url\([^)]*\)/gi;
const COLOUR = /#[0-9a-f]{3,8}(?![\w-])|(?<![\w-])(?:(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color(?:-mix)?)\(|(?:white|black)(?![\w-]))/i;
const SIZE_PROPERTY = /^(?:font-size|(?:row-|column-)?gap|border-radius|(?:margin|padding)(?:-[a-z-]+)?)$/;
const LENGTH = /(?<![\w.-])[-+]?(?:\d+\.?\d*|\.\d+)(?:px|rem)(?![\w-])/gi;
const PIXELS = /(?<![\w.-])(?:\d+\.?\d*|\.\d+)px(?![\w-])/i;
const IMPORTANT = /!\s*important(?![\w-])/i;
const READ = /var\(\s*(--luz-[\w-]*)/g;
const KNOBS = new Set(["--luz-type-base", "--luz-space-unit"]);

// The token a literal colour is told to become, by what the property paints
const textual = /^(?:color|fill|stroke|caret-color|text-decoration-color)$/;
const lines = /^(?:border|outline)/;
const tokenFor = (property) => (textual.test(property) ? "--luz-text-primary" : lines.test(property) ? "--luz-outline" : property.startsWith("box-shadow") ? "--luz-shadow-sm" : "--luz-surface");

/** The colour function that starts at `index`, up to its closing parenthesis. */
function functionAt(value, index) {
  let depth = 0;
  for (let i = value.indexOf("(", index); i !== -1 && i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 40) depth++;
    else if (c === 41 && --depth === 0) return value.slice(index, i + 1);
  }
  return null;
}

/**
 * @param {{ file: string, css: object, text: string, world: () => object | null, take: (rule: string) => boolean }} ctx
 *   `css` is what readCss read of `text`; `world()` is the facts of the
 *   manifests (null when there are none), asked for only when a --luz-*
 *   property is named
 */
export function cssRules({ file, css, text, world, take }) {
  const { declarations } = css;
  const found = [];
  if (declarations.length === 0) return found;
  const starts = lineStarts(text);
  const hexes = new Map(); // a literal -> its #rrggbb, or null: a file repeats its colours
  let facts; // undefined until a token is looked up
  for (let at = 0; at < declarations.length; at += 3) {
    const start = declarations[at];
    const name = text.slice(start, declarations[at + 1]).trim();
    const custom = name.startsWith("--");
    let value = text.slice(declarations[at + 1] + 1, declarations[at + 2]);
    if (value.includes("/*")) value = withoutComments(value);
    value = value.replace(NOISE, " ");
    const line = lineAt(starts, start);
    const where = { file, line, column: start - starts[line - 1] + 1 };
    const property = custom ? name : name.toLowerCase();

    if (IMPORTANT.test(value)) found.push(finding("css/important", { ...where, vars: { property } }));
    if (custom) {
      if (KNOBS.has(property) && PIXELS.test(value)) found.push(finding("css/knob-in-px", { ...where, vars: { property } }));
    } else {
      const colour = property.startsWith("font") ? null : COLOUR.exec(value);
      if (colour !== null) {
        const literal = colour[0].endsWith("(") ? functionAt(value, colour.index) : colour[0];
        let hex = literal === null ? null : hexes.get(literal);
        if (hex === undefined) hexes.set(literal, (hex = toHex(literal)));
        const vars = { property, token: tokenFor(property) };
        found.push(hex === null ? finding("css/literal-colour:none", { ...where, vars }) : finding("css/literal-colour", { ...where, vars: { ...vars, value: hex } }));
      }
      if (SIZE_PROPERTY.test(property)) {
        for (const match of value.matchAll(LENGTH)) {
          if (Number.parseFloat(match[0]) === 0) continue;
          found.push(finding("css/literal-size", { ...where, vars: { property, value: match[0] } }));
          break;
        }
      }
    }

    // The names this declaration sets or reads, each once
    if (!value.includes("--luz-") && !property.startsWith("--luz-")) continue;
    const names = new Set(property.startsWith("--luz-") ? [property] : []);
    for (const match of value.matchAll(READ)) names.add(match[1]);
    for (const token of names) {
      facts ??= world();
      if (facts === null) return found;
      const scope = facts.properties.get(token);
      if (scope === "root") continue;
      if (scope === "component") {
        found.push(finding("css/private-token", { ...where, vars: { token } }));
        continue;
      }
      const near = isEcho(token) && take("css/unknown-token") ? closest(token, facts.publicNames) : null;
      found.push(near === null ? finding("css/unknown-token:none", { ...where, vars: { token } }) : finding("css/unknown-token", { ...where, vars: { token, closest: near }, suggestion: near }));
    }
  }
  return found;
}
