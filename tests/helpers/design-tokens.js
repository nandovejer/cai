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
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { formatRatio as format, over, parseColor as parse, ratio } from "../../packages/tokens/lib/contrast.js";

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

/** A background written "a > b" (token a over token b), opaque, over the page. */
function surface(mode, spec) {
  let result = parse(resolveColor(mode, "surface-page"));
  for (const layer of spec.split(">").map((s) => parse(resolveColor(mode, s.trim()))).reverse()) result = over(layer, result);
  return result;
}

/** The contrast ratio of a foreground token on a background spec, in a mode. */
export function contrast(mode, fg, bg) {
  const back = surface(mode, bg);
  return ratio(over(parse(resolveColor(mode, fg)), back), back);
}

/** A ratio as the pages print it: rounded down to one decimal, so a printed "4.5" always passes 4.5. */
export const formatRatio = format;

/* ---- The tokens a component reads ---------------------------------------- */

/** The CSS of a page and, for a site or landing pattern, the classes that are its own. */
function sourceOf(page) {
  if (page.meta.area === "components") {
    return { css: page.meta.files.split(";").map((f) => read(`packages/core/src/${f.trim()}`)).join("\n"), classes: null };
  }
  if (page.meta.module === "search.js") return { css: read("packages/site/src/components/search.css"), classes: null };
  const classes = page.meta.files.split(",").map((f) => f.trim()).filter((f) => f.startsWith(".")).map((f) => f.slice(1));
  // A package for one kind of site: every file of its components folder
  if (page.meta.area === "landing") {
    const dir = "packages/landing/src/components";
    return { css: readdirSync(`${repo}${dir}`).filter((f) => f.endsWith(".css")).sort().map((f) => read(`${dir}/${f}`)).join("\n"), classes };
  }
  // The shell patterns, and the patterns with a file of their own (the language switcher, the site header)
  const files = ["_components.css", "lang-switcher.css", "site-header.css"].map((f) => read(`packages/site/src/components/${f}`));
  return { css: files.join("\n"), classes };
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
  // --cai-site-* and --cai-landing-* are properties a pattern sets for its own parts, not design tokens
  return [...used].filter((t) => !local.has(t) && !/^--cai-(?:site|landing)-/.test(t)).sort();
}

/* ---- Token families and their pages --------------------------------------- */

const FAMILIES = [
  ["Color", "/docs/tokens/color/", (t) => colorTokens().includes(t)],
  ["Spacing and sizing", "/docs/tokens/spacing/", (t) => /^--cai-(space|control)-/.test(t)],
  ["Typography", "/docs/tokens/typography/", (t) => /^--cai-(font-|text-(xs|sm|base|md|lg|xl|2xl|3xl|4xl|control)$|leading-|weight-)/.test(t)],
  ["Radius", "/docs/tokens/radius/", (t) => t.startsWith("--cai-radius-")],
  ["Shadows", "/docs/tokens/shadows/", (t) => t.startsWith("--cai-shadow-")],
  ["Motion", "/docs/tokens/motion/", (t) => /^--cai-(duration|easing)-/.test(t)],
  ["Layers", "/docs/tokens/layers/", (t) => t.startsWith("--cai-z-")],
  ["Layout and breakpoints", "/docs/tokens/layout/", (t) => /^--cai-(mq-|content-max|sidebar-width|scrollbar-size)/.test(t)],
];

/** The family of a token: [label, route] of the token page that documents it. */
export function familyOf(token) {
  const family = FAMILIES.find(([, , test]) => test(token));
  if (!family) throw new Error(`${token} belongs to no token page`);
  return family.slice(0, 2);
}

export const FAMILY_ORDER = FAMILIES.map(([label]) => label);
