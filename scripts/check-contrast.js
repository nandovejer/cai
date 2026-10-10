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
import { createResolver, measure, pairsFor } from "../packages/tokens/lib/contrast.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");

const BASE = ["light", "dark", "high-contrast"];

/* The pairs and the maths are in packages/tokens/lib/contrast.js, shared with
   the consumer's `cai-tokens check-contrast` and the docs pages. */

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

/* ---- Run ------------------------------------------------------------------ */

const { debt } = JSON.parse(read("tests/fixtures/red-line-debt.json"));
const registered = (text) => debt.some((e) => e.check === "token-contrast" && text.includes(e.match));

const failures = [];
const known = [];
const advisory = [];
let measured = 0;
for (const theme of THEMES) {
  const resolver = createResolver({ ...primitives, ...themes[theme] });
  const { results, unreadable } = measure(resolver, pairsFor(theme));
  for (const u of unreadable) failures.push(`${theme}: ${u.foreground} on ${u.background} was not measured: ${u.reason}`);
  for (const r of results) {
    measured += 1;
    if (r.ok) continue;
    if (r.advisory) {
      advisory.push(`${theme}: ${r.foreground} on ${r.background} is ${r.ratio.toFixed(2)}:1 (CAI aims for ${r.minimum}:1)`);
      continue;
    }
    const line = `${theme}: ${r.foreground} on ${r.background} is ${r.ratio.toFixed(2)}:1 (needs ${r.minimum}:1)`;
    (registered(line) ? known : failures).push(line);
  }
}

for (const line of advisory) console.warn(`! ${line}`);
for (const line of known) console.warn(`! ${line} — registered in tests/fixtures/red-line-debt.json`);
if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log(`✓ contrast: ${measured} token pairs in ${THEMES.length} themes${known.length ? `, ${known.length} registered as debt` : ""}`);
