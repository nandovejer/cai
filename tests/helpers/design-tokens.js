/**
 * The facts the Design tab of a component or pattern page states about
 * tokens, computed from the sources so the pages cannot drift from them
 * (a11y.md HUB-8: every ratio and value shown is computed by script, never
 * typed by hand):
 *   - resolveColor(mode, token): a semantic colour in light, dark or
 *     high-contrast, from packages/tokens (semantic.css over tokens.json);
 *   - contrast(mode, fg, bg): the WCAG 2.x ratio, translucent layers
 *     composited over the page as in check-contrast.js;
 *   - tokensUsedBy(page): the --cai-* tokens the component's own CSS reads;
 *   - familyOf(token): the token page that documents it.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(`${repo}${path}`, "utf-8");

export const MODES = ["light", "dark", "high-contrast"];

/* ---- Colour values per mode ---------------------------------------------- */

const primitives = {};
for (const [family, steps] of Object.entries(JSON.parse(read("packages/tokens/tokens.json")).color)) {
  for (const [step, { value }] of Object.entries(steps)) primitives[`--cai-${family}-${step}`] = value;
}

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
/** Innermost "selector { body }" blocks (the selector of a rule inside @media is its own). */
const rules = (css) => [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));

const declared = {};
for (const { selector, body } of rules(read("packages/tokens/src/semantic.css"))) {
  for (const s of selector.split(",").map((x) => x.trim())) {
    const mode = s === ":root" ? "light" : s.match(/^\[data-theme="([\w-]+)"\]$/)?.[1];
    if (!MODES.includes(mode)) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) (declared[mode] ??= {})[name] = value.trim();
  }
}
const scope = Object.fromEntries(MODES.map((m) => [m, { ...declared.light, ...declared[m] }]));

/** The literal value of a colour token in a mode (#rrggbb, rgba(…)). */
export function resolveColor(mode, token) {
  const name = token.startsWith("--") ? token : `--cai-${token}`;
  const raw = scope[mode][name] ?? primitives[name];
  if (raw === undefined) throw new Error(`${mode}: ${name} is not a colour token`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/)?.[1];
  return ref ? resolveColor(mode, ref) : raw;
}

/** The token a semantic colour points at in a mode (a primitive, or null for a literal). */
export function aliasOf(mode, token) {
  const name = token.startsWith("--") ? token : `--cai-${token}`;
  const ref = (scope[mode][name] ?? "").match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!ref) return null;
  return ref in primitives ? ref : aliasOf(mode, ref) ?? ref;
}

/** Every semantic colour token, in source order. */
export const colorTokens = () => Object.keys(declared.light);

function parse(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: 1 };
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/)?.[1];
  if (rgb) {
    const [r, g, b, a = 1] = rgb.split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  }
  throw new Error(`cannot read the colour "${value}"`);
}

const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});
const luminance = ({ r, g, b }) => {
  const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};

/** A background written "a > b" (token a over token b), opaque, over the page. */
function surface(mode, spec) {
  let result = parse(resolveColor(mode, "surface-page"));
  for (const layer of spec.split(">").map((s) => parse(resolveColor(mode, s.trim()))).reverse()) result = over(layer, result);
  return result;
}

/** The contrast ratio of a foreground token on a background spec, in a mode. */
export function contrast(mode, fg, bg) {
  const back = surface(mode, bg);
  const [a, b] = [luminance(over(parse(resolveColor(mode, fg)), back)), luminance(back)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A ratio as the pages print it: rounded down to one decimal, so a printed "4.5" always passes 4.5. */
export const formatRatio = (value) => `${(Math.floor(value * 10 + 1e-9) / 10).toFixed(1)}:1`;

/* ---- The tokens a component reads ---------------------------------------- */

/** The CSS of a page and, for a platform pattern, the classes that are its own. */
function sourceOf(page) {
  if (page.meta.area === "components") {
    return { css: page.meta.files.split(";").map((f) => read(`packages/core/src/${f.trim()}`)).join("\n"), classes: null };
  }
  if (page.meta.module === "search.js") return { css: read("packages/platform/src/components/search.css"), classes: null };
  const classes = page.meta.files.split(",").map((f) => f.trim()).filter((f) => f.startsWith(".")).map((f) => f.slice(1));
  return { css: read("packages/platform/src/components/_components.css"), classes };
}

/** The --cai-* tokens the component's CSS reads with var(), minus the ones it declares itself. */
export function tokensUsedBy(page) {
  const { css, classes } = sourceOf(page);
  const own = classes && new RegExp(`\\.(?:${classes.join("|")})(?:(?:--|__)[\\w-]+)?(?![\\w-])`);
  const used = new Set();
  const local = new Set();
  for (const { selector, body } of rules(css)) {
    if (own && !own.test(selector)) continue;
    for (const [, name] of body.matchAll(/(--cai-[\w-]+)\s*:/g)) local.add(name);
    for (const [, name] of body.matchAll(/var\(\s*(--cai-[\w-]+)/g)) used.add(name);
  }
  return [...used].filter((t) => !local.has(t)).sort();
}

/* ---- Token families and their pages --------------------------------------- */

const FAMILIES = [
  ["Color", "/docs/tokens/color/", (t) => colorTokens().includes(t)],
  ["Spacing and sizing", "/docs/tokens/spacing/", (t) => /^--cai-(space|control)-/.test(t)],
  ["Typography", "/docs/tokens/typography/", (t) => /^--cai-(font-|text-(xs|sm|base|md|lg|xl|2xl|3xl|4xl|control)$|leading-|weight-)/.test(t)],
  ["Radius", "/docs/tokens/radius/", (t) => t.startsWith("--cai-radius-")],
  ["Shadows", "/docs/tokens/shadows/", (t) => t.startsWith("--cai-shadow-")],
  ["Motion", "/docs/tokens/motion/", (t) => /^--cai-(duration|easing)-/.test(t)],
  ["Layers and breakpoints", "/docs/tokens/layout/", (t) => /^--cai-(z-|bp-|content-max|sidebar-width|scrollbar-size)/.test(t)],
];

/** The family of a token: [label, route] of the token page that documents it. */
export function familyOf(token) {
  const family = FAMILIES.find(([, , test]) => test(token));
  if (!family) throw new Error(`${token} belongs to no token page`);
  return family.slice(0, 2);
}

export const FAMILY_ORDER = FAMILIES.map(([label]) => label);
