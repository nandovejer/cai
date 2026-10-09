/**
 * CAI — primitive colour palette.
 * Computes every `color` primitive in packages/tokens/tokens.json from a few
 * numbers, in OKLCH, and writes them back. The palette is CAI's own: no value
 * is copied from another design system (tests/palette.test.js checks it).
 *
 * Method, the same for every family:
 *   - Lightness: one curve shared by every family, so a step number means the
 *     same lightness, and the same contrast, in blue, red or gray. Step 10 is
 *     the lightest, step 100 the darkest; between them L follows a cubic
 *     Bézier ease (LIGHTNESS), steeper in the middle steps where text and
 *     surfaces meet. A family may place a step elsewhere on the curve
 *     (yellow-60 sits at 65: a dark amber that reads as text on the light
 *     surfaces).
 *   - Chroma: a bell over the same curve, peaking at the family's `peak`
 *     step, softer towards white and black, then reduced, keeping hue and
 *     lightness, until the colour fits the sRGB gamut.
 *   - Hue: each family's own, drifting slightly from its light end to its
 *     dark end (blue leans sky when light and ink when dark, yellow turns
 *     amber, red turns brick).
 *
 * The step names (10–100) are kept: they are a plain lightness scale and every
 * semantic token, theme and consumer already speaks it.
 *
 * Plain Node, no dependency (red line 1).
 *
 * Usage: node scripts/build-palette.js           write tokens.json
 *        node scripts/build-palette.js --check   fail if tokens.json is stale
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const tokensPath = resolve(dirname(fileURLToPath(import.meta.url)), "../packages/tokens/tokens.json");

/* ---- The numbers that define the palette --------------------------------- */

/** Lightness of step 10 and step 100, and the Bézier control values between. */
export const LIGHTNESS = { light: 0.985, dark: 0.165, ease: [0.06, 0.9] };

/**
 * Per family: hue at the light end and at the dark end (degrees), chroma at
 * the peak, the step where chroma peaks, how quickly it falls away (higher is
 * narrower), and the steps it ships (name → position on the lightness curve).
 */
const STEPS_ALL = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const FAMILIES = {
  blue: { hue: [244, 266], chroma: 0.205, peak: 62, width: 0.9, steps: STEPS_ALL, default: 60 },
  gray: { hue: [250, 256], chroma: 0.016, peak: 55, width: 0.6, steps: STEPS_ALL },
  green: { hue: [160, 156], chroma: 0.15, peak: 50, width: 0.8, steps: [10, 20, 30, 40, 50, 60, 70] },
  red: { hue: [18, 31], chroma: 0.2, peak: 58, width: 0.8, steps: [10, 20, 30, 40, 50, 60, 70] },
  yellow: { hue: [96, 54], chroma: 0.15, peak: 32, width: 1, steps: [10, 20, 30, 40, 50, [60, 65]] },
  teal: { hue: [176, 184], chroma: 0.105, peak: 48, width: 0.8, steps: [10, 20, 40, 50, 60, 70] },
  purple: { hue: [308, 300], chroma: 0.21, peak: 62, width: 0.85, steps: [10, 20, 40, 50, 60, 70] },
};

/* ---- Curves -------------------------------------------------------------- */

/** Position on the scale (10–100) → 0–1. */
const unit = (position) => (position - 10) / 90;

/** Cubic Bézier ease from 0 to 1 with control values c1, c2. */
function ease(t, [c1, c2]) {
  const u = 1 - t;
  return 3 * u * u * t * c1 + 3 * u * t * t * c2 + t ** 3;
}

export function lightness(position) {
  const { light, dark, ease: controls } = LIGHTNESS;
  return light - (light - dark) * ease(unit(position), controls);
}

/** Bell rising to 1 at the peak step, from a floor at both ends. */
function bell(position, peak, width) {
  const t = unit(position);
  const p = unit(peak);
  const u = t <= p ? 0.5 * (t / p) : 0.5 + 0.5 * ((t - p) / (1 - p));
  const floor = 0.16 + 0.24 * t; // dark steps keep some colour: navy, not black
  return floor + (1 - floor) * Math.sin(Math.PI * u) ** width;
}

/* ---- OKLCH → sRGB (Björn Ottosson's OKLab) ------------------------------- */

function oklchToLinearSrgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

const encode = (v) => {
  const x = Math.min(1, Math.max(0, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

function toHex(rgb) {
  return `#${rgb.map((v) => Math.round(encode(v) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/** The colour at L, C, H, with chroma reduced until it is inside sRGB. */
export function oklchToHex(L, C, H) {
  if (inGamut(oklchToLinearSrgb(L, C, H))) return toHex(oklchToLinearSrgb(L, C, H));
  let [low, high] = [0, C];
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToLinearSrgb(L, mid, H))) low = mid;
    else high = mid;
  }
  return toHex(oklchToLinearSrgb(L, low, H));
}

/* ---- The palette ---------------------------------------------------------- */

/** { family: { step: { value, type[, default] } } }, in tokens.json order. */
export function palette() {
  const result = {};
  for (const [family, spec] of Object.entries(FAMILIES)) {
    result[family] = {};
    for (const entry of spec.steps) {
      const [step, position] = Array.isArray(entry) ? entry : [entry, entry];
      const t = unit(position);
      const hue = spec.hue[0] + (spec.hue[1] - spec.hue[0]) * t;
      const chroma = spec.chroma * bell(position, spec.peak, spec.width);
      const token = { value: oklchToHex(lightness(position), chroma, hue), type: "color" };
      if (spec.default === step) token.default = true;
      result[family][String(step)] = token;
    }
  }
  return result;
}

/** tokens.json with its `color` block replaced, keeping the file's layout. */
export function render(source) {
  const lines = ['  "color": {'];
  const families = Object.entries(palette());
  families.forEach(([family, steps], f) => {
    lines.push(`    "${family}": {`);
    const entries = Object.entries(steps);
    entries.forEach(([step, token], i) => {
      const extra = token.default ? ', "default": true' : "";
      const comma = i < entries.length - 1 ? "," : "";
      lines.push(`      "${step}": { "value": "${token.value}", "type": "color"${extra} }${comma}`);
    });
    lines.push(`    }${f < families.length - 1 ? "," : ""}`);
  });
  lines.push("  },");
  const block = /^ {2}"color": \{\n[\s\S]*?\n {2}\},\n/m;
  if (!block.test(source)) throw new Error("tokens.json: no top-level \"color\" block found");
  return source.replace(block, `${lines.join("\n")}\n`);
}

/* ---- Run ------------------------------------------------------------------ */

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const source = readFileSync(tokensPath, "utf-8");
  const next = render(source);
  if (process.argv.includes("--check")) {
    if (next !== source) {
      console.error("✗ tokens.json colours differ from scripts/build-palette.js: run node scripts/build-palette.js");
      process.exit(1);
    }
    console.log("✓ palette: tokens.json matches scripts/build-palette.js");
  } else {
    writeFileSync(tokensPath, next);
    for (const [family, steps] of Object.entries(palette())) {
      console.log(`${family.padEnd(7)} ${Object.entries(steps).map(([s, t]) => `${s}:${t.value}`).join(" ")}`);
    }
  }
}
