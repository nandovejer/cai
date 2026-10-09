/**
 * CAI — token contrast (PRINCIPLES.md §1, red lines 5 and 7).
 * Resolves the semantic tokens of the three base modes (light, dark,
 * high-contrast) and of every custom theme in packages/core/src/themes, in
 * its default mode and in each data-mode, to their real values and measures the pairs the components
 * draw: text on its surfaces at 4.5:1, focus ring and borders at 3:1 (icons use
 * the text tokens, so they meet 4.5:1).
 * Translucent tokens are composited over the surface below, as in the page.
 * WCAG 2.x relative luminance.
 *
 * The browser checks (axe, tests/red-lines.spec.js) measure what the demos
 * render; this one covers every pair a consumer can build from the tokens.
 *
 * Usage: node scripts/check-contrast.js
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");

const BASE = ["light", "dark", "high-contrast"];

/* ---- Pairs: [foreground tokens, background tokens, minimum] --------------
   A background written "a > b" is token a composited over token b. */
const SURFACES = ["surface-page", "surface", "surface-hover", "surface-muted", "input-bg"];
const STATUS = ["success", "danger", "warning", "info", "teal", "purple"];
const CODE = ["comment", "keyword", "name", "property", "string", "literal"].map((t) => `code-${t}`);
const PAIRS = [
  // Text and links on the surfaces they sit on
  [["text-primary", "text-secondary", "brand-primary", "brand-hover"], SURFACES, 4.5],
  [["text-primary", "text-secondary"], ["surface-strong", "surface-pressed"], 4.5],
  [["text-muted"], ["input-bg", "surface-page", "surface"], 4.5],
  [["text-disabled"], ["surface-page", "surface", "input-bg", "surface-muted", "surface-strong"], 3],
  // Text on solid fills
  [["text-on-fill"], ["brand-fill", "brand-fill-hover", "brand-fill-active", "color-danger-fill"], 4.5],
  // Sidebar
  [["sidebar-text", "sidebar-label", "sidebar-text-hover"], ["sidebar-bg"], 4.5],
  [["sidebar-text-hover"], ["sidebar-hover"], 4.5],
  [["sidebar-active-text"], ["sidebar-active-bg"], 4.5],
  // Status text on its tint (alerts, tags), also on a hovered row
  ...STATUS.map((s) => [
    [`color-${s}`],
    [`color-${s}-bg > surface-page`, `color-${s}-bg > surface`, `color-${s}-bg > surface-hover`],
    4.5,
  ]),
  [["color-code"], ["surface-page", "surface", "surface-muted"], 4.5],
  // Non-text: focus ring, field boundaries, outlines (WCAG 1.4.11)
  [["focus-ring"], [...SURFACES, "surface-strong"], 3],
  [["input-border"], ["input-bg"], 3],
  [["outline"], ["surface-page", "surface"], 3],
];

/* Also on the strong surface (tooltip, toast, table header) and as plain text on
   every surface: status and code colours and their tints keep 4.5:1 there too.
   Measured for every theme and mode. */
const THEME_PAIRS = [
  ...STATUS.map((s) => [[`color-${s}`], [`color-${s}-bg > surface-strong`, "surface-page", "surface", "surface-hover", "surface-muted", "surface-strong"], 4.5]),
  [["color-code"], ["surface-strong"], 4.5],
  // Syntax colours on the code block (.cai-code-block sits on surface-muted)
  [CODE, ["surface-muted"], 4.5],
  // The field border on every surface a field can sit on (WCAG 1.4.11)
  [["input-border"], [...SURFACES, "surface-strong"], 3],
  // .cai-badge--gray: white text on the outline colour
  [["text-on-fill"], ["outline"], 4.5],
];

/* CAI's own high-contrast mode goes beyond AA where it can: the syntax
   colours keep 7:1 (WCAG 1.4.6, AAA) on the code block. */
const HC_PAIRS = [[CODE, ["surface-muted"], 7]];

/* ---- Token values ------------------------------------------------------- */

const tokens = JSON.parse(read("packages/tokens/tokens.json"));
const primitives = {};
for (const [family, steps] of Object.entries(tokens.color)) {
  for (const [step, { value }] of Object.entries(steps)) primitives[`--cai-${family}-${step}`] = value;
}

/** Every "selector { --custom: value; }" block of a stylesheet. */
function blocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@font-face\s*\{[^}]*\}/g, "");
  return [...clean.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => ({
    selectors: selector.split(",").map((x) => x.trim()),
    props: Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])),
  }));
}

// Base color modes: data-theme="light" (also :root), "dark", "high-contrast"
const base = {};
for (const { selectors, props } of blocks(read("packages/tokens/src/semantic.css"))) {
  for (const selector of selectors) {
    const name = selector.match(/^\[data-theme="([\w-]+)"\]$/)?.[1];
    if (BASE.includes(name)) base[name] = { ...base[name], ...props };
  }
}

// Custom themes (packages/core/src/themes): the theme block sets its default
// mode; each [data-mode] block layers on top of it. Anything a theme does not
// define falls back to the :root (light) value, as in the browser.
const themes = {};
for (const name of BASE) themes[name] = { ...base.light, ...base[name] };
const MODES = ["light", "dark", "high-contrast"];
const themesDir = resolve(root, "packages/core/src/themes");
for (const file of readdirSync(themesDir).filter((f) => /^cai-theme-.+\.css$/.test(f))) {
  const custom = {};
  for (const { selectors, props } of blocks(read(`packages/core/src/themes/${file}`))) {
    for (const selector of selectors) {
      const m = selector.match(/^\[data-theme="([\w-]+)"\](?:\[data-mode="([\w-]+)"\])?$/);
      if (!m) continue;
      const key = m[2] ?? "default";
      custom[m[1]] ??= {};
      custom[m[1]][key] = { ...custom[m[1]][key], ...props };
    }
  }
  for (const [name, modes] of Object.entries(custom)) {
    const missing = MODES.filter((mode) => !modes[mode]);
    if (!modes.default || missing.length) {
      console.error(`✗ ${file}: theme "${name}" needs a [data-theme] block and the modes ${MODES.join(", ")} (missing: ${["default", ...missing].filter((k) => !modes[k]).join(", ")})`);
      process.exit(1);
    }
    themes[name] = { ...base.light, ...modes.default };
    for (const mode of MODES) themes[`${name}/${mode}`] = { ...base.light, ...modes.default, ...modes[mode] };
  }
}
const THEMES = Object.keys(themes);

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

function value(theme, name) {
  // Each theme map already holds the :root (light) defaults under its own
  // values, so a var() resolves in the theme that uses it, as in the page
  const raw = themes[theme][name] ?? primitives[name];
  if (raw === undefined) throw new Error(`${theme}: ${name} is not defined`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/)?.[1];
  return ref ? value(theme, ref) : raw;
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
const ratio = (x, y) => {
  const [a, b] = [luminance(x), luminance(y)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/** A background spec ("a > b > …") as an opaque colour, over the page. */
function surface(theme, spec) {
  const layers = spec.split(">").map((s) => parse(value(theme, `--cai-${s.trim()}`)));
  let result = parse(value(theme, "--cai-surface-page"));
  for (const layer of layers.reverse()) result = over(layer, result);
  return result;
}

/* ---- Run ------------------------------------------------------------------ */

const { debt } = JSON.parse(read("tests/fixtures/red-line-debt.json"));
const registered = (text) => debt.some((e) => e.check === "token-contrast" && text.includes(e.match));

const failures = [];
const known = [];
let measured = 0;
for (const theme of THEMES) {
  for (const [foregrounds, backgrounds, minimum] of [...PAIRS, ...THEME_PAIRS, ...(theme === "high-contrast" ? HC_PAIRS : [])]) {
    for (const fg of foregrounds) {
      for (const bg of backgrounds) {
        const back = surface(theme, bg);
        const result = ratio(over(parse(value(theme, `--cai-${fg}`)), back), back);
        measured += 1;
        if (result + 1e-9 >= minimum) continue;
        const line = `${theme}: --cai-${fg} on ${bg} is ${result.toFixed(2)}:1 (needs ${minimum}:1)`;
        (registered(line) ? known : failures).push(line);
      }
    }
  }
}

for (const line of known) console.warn(`! ${line} — registered in tests/fixtures/red-line-debt.json`);
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✓ contrast: ${measured} token pairs in ${THEMES.length} themes${known.length ? `, ${known.length} registered as debt` : ""}`);
