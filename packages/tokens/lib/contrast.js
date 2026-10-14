/**
 * LUZ — contrast engine (PRINCIPLES.md §1, red lines 5 and 7).
 *
 * One place for the colour maths and for the list of token pairs the system
 * promises to keep readable. Three things use it, so they cannot disagree:
 *   - bin/luz-tokens.js, `check-contrast`, for a consumer's own overrides;
 *   - scripts/check-contrast.js, the check of LUZ's shipped themes;
 *   - tests/helpers/design-tokens.js, the ratios the docs pages print.
 *
 * WCAG 2.x relative luminance only. APCA is not normative and is not used.
 * No dependency, no file access and no DOM: it runs in Node and in a browser.
 */

/* ---- Colours ------------------------------------------------------------ */

const NAMED = { transparent: [0, 0, 0, 0], white: [255, 255, 255, 1], black: [0, 0, 0, 1] };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/**
 * A colour as { r, g, b, a } (0–255, alpha 0–1). Reads #rgb, #rgba, #rrggbb,
 * #rrggbbaa, rgb()/rgba() and hsl()/hsla() in the comma and the space syntax,
 * and white, black and transparent. Anything else (a named colour, color-mix(),
 * oklch()…) throws: a pair that cannot be measured is never reported as fine.
 */
export function parseColor(value) {
  const text = String(value).trim().toLowerCase();
  if (text in NAMED) {
    const [r, g, b, a] = NAMED[text];
    return { r, g, b, a };
  }
  const hex = text.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    const byte = (i) => parseInt(full.slice(i, i + 2), 16);
    return { r: byte(0), g: byte(2), b: byte(4), a: full.length === 8 ? byte(6) / 255 : 1 };
  }
  const fn = text.match(/^(rgba?|hsla?)\(([^)]+)\)$/);
  if (fn) {
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
    const number = (p, scale = 1) => (p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p));
    if (parts.length >= 3 && parts.length <= 4 && parts.every((p) => !Number.isNaN(parseFloat(p)))) {
      const a = parts[3] === undefined ? 1 : clamp(number(parts[3], 1), 0, 1);
      if (fn[1].startsWith("rgb")) {
        const [r, g, b] = parts.slice(0, 3).map((p) => clamp(number(p, 255), 0, 255));
        return { r, g, b, a };
      }
      const [r, g, b] = hslToRgb(((parseFloat(parts[0]) % 360) + 360) % 360, clamp(number(parts[1], 1), 0, 1), clamp(number(parts[2], 1), 0, 1));
      return { r, g, b, a };
    }
  }
  throw new Error(`cannot read the colour "${value}": write it as #rrggbb, rgb(), rgba(), hsl() or hsla()`);
}

/** `top` over `bottom`, opaque. */
export const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

export const luminance = ({ r, g, b }) => {
  const c = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};

/** The WCAG ratio of two opaque colours. */
export const ratio = (x, y) => {
  const [a, b] = [luminance(x), luminance(y)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/** A ratio as the docs print it: rounded down to one decimal, so a printed "4.5" always passes 4.5. */
export const formatRatio = (value) => `${(Math.floor(value * 10 + 1e-9) / 10).toFixed(1)}:1`;

/* ---- The pairs ------------------------------------------------------------
   { fg: [tokens], bg: [specs], min, kind }. A background written "a > b" is
   token a composited over token b, over the page. kind says what the minimum
   protects: "text" (WCAG 1.4.3), "disabled-text" (LUZ keeps 3:1, red line 7)
   or "ui" (focus ring, field borders and icons, WCAG 1.4.11). An advisory
   pair is an aim LUZ sets itself, stricter than WCAG: it is reported and
   never fails the check. */

const SURFACES = ["surface-page", "surface", "surface-hover", "surface-muted", "input-bg"];
const STATUS = ["success", "danger", "warning", "info", "teal", "purple"];
const CODE = ["comment", "keyword", "name", "property", "string", "literal"].map((t) => `code-${t}`);

export const PAIRS = [
  // Text and links on the surfaces they sit on
  { fg: ["text-primary", "text-secondary", "brand-primary", "brand-hover"], bg: SURFACES, min: 4.5, kind: "text" },
  { fg: ["text-primary", "text-secondary"], bg: ["surface-strong", "surface-pressed"], min: 4.5, kind: "text" },
  { fg: ["text-muted"], bg: ["input-bg", "surface-page", "surface"], min: 4.5, kind: "text" },
  { fg: ["text-disabled"], bg: ["surface-page", "surface", "input-bg", "surface-muted", "surface-strong"], min: 3, kind: "disabled-text" },
  // Text on solid fills
  { fg: ["text-on-fill"], bg: ["brand-fill", "brand-fill-hover", "brand-fill-active", "color-danger-fill"], min: 4.5, kind: "text" },
  // Sidebar
  { fg: ["sidebar-text", "sidebar-label", "sidebar-text-hover"], bg: ["sidebar-bg"], min: 4.5, kind: "text" },
  { fg: ["sidebar-text-hover"], bg: ["sidebar-hover"], min: 4.5, kind: "text" },
  { fg: ["sidebar-active-text"], bg: ["sidebar-active-bg"], min: 4.5, kind: "text" },
  // Status text on its tint (alerts, tags), also on a hovered row
  ...STATUS.map((s) => ({
    fg: [`color-${s}`],
    bg: [`color-${s}-bg > surface-page`, `color-${s}-bg > surface`, `color-${s}-bg > surface-hover`],
    min: 4.5,
    kind: "text",
  })),
  { fg: ["color-code"], bg: ["surface-page", "surface", "surface-muted"], min: 4.5, kind: "text" },
  // Non-text: focus ring, field boundaries, outlines (WCAG 1.4.11)
  { fg: ["focus-ring"], bg: [...SURFACES, "surface-strong"], min: 3, kind: "ui" },
  { fg: ["input-border"], bg: ["input-bg"], min: 3, kind: "ui" },
  { fg: ["outline"], bg: ["surface-page", "surface"], min: 3, kind: "ui" },
  // Progress and player seek bars: the fill on the track (surface-muted) and the
  // played part on the buffered part (surface-pressed)
  { fg: ["brand-primary"], bg: ["surface-muted", "surface-pressed"], min: 3, kind: "ui" },
  // Also on the strong surface (tooltip, toast, table header) and as plain text
  // on every surface: status and code colours and their tints keep 4.5:1 there
  ...STATUS.map((s) => ({
    fg: [`color-${s}`],
    bg: [`color-${s}-bg > surface-strong`, "surface-page", "surface", "surface-hover", "surface-muted", "surface-strong"],
    min: 4.5,
    kind: "text",
  })),
  { fg: ["color-code"], bg: ["surface-strong"], min: 4.5, kind: "text" },
  // Syntax colours on the code block (.luz-code-block sits on surface-muted)
  { fg: CODE, bg: ["surface-muted"], min: 4.5, kind: "text" },
  // The field border on every surface a field can sit on (WCAG 1.4.11)
  { fg: ["input-border"], bg: [...SURFACES, "surface-strong"], min: 3, kind: "ui" },
  // .luz-badge--gray: white text on the outline colour
  { fg: ["text-on-fill"], bg: ["outline"], min: 4.5, kind: "text" },
  // The error mark of a form field, on the field itself (select, input)
  { fg: ["color-danger"], bg: ["input-bg"], min: 3, kind: "ui" },
  // What the component pages print and no row above covers: the body text of
  // an alert on its tint, a link or an avatar on the brand tint, the checked
  // box and the active sidebar entry as shapes, text on a video
  { fg: ["text-primary", "text-secondary"], bg: STATUS.map((s) => `color-${s}-bg > surface-page`), min: 4.5, kind: "text" },
  { fg: ["text-primary", "text-secondary", "brand-primary"], bg: ["brand-subtle > surface-page"], min: 4.5, kind: "text" },
  // A primary button and a focus ring on the brand tint (a band, a hovered
  // outline button): 1.4.11, strict. In dark mode the fill is the thinnest
  // pair of the system, so a change to the tint or the fill fails here first
  { fg: ["brand-fill", "focus-ring"], bg: ["brand-subtle > surface-page"], min: 3, kind: "ui" },
  // A checked box and a switch track are told apart by their mark and their
  // border, so their fill on the page is a stricter aim than WCAG 1.4.11
  // needs: reported, never failing
  { fg: ["brand-fill"], bg: ["surface-page", "surface"], min: 3, kind: "ui", advisory: true },
  { fg: ["brand-primary"], bg: ["surface-strong"], min: 3, kind: "ui" },
  { fg: ["sidebar-active-bg"], bg: ["sidebar-bg"], min: 3, kind: "ui" },
  { fg: ["text-on-fill"], bg: ["surface-media"], min: 4.5, kind: "text" },
  // Site's bands (notice, cookie banner): a link and a focus ring on the
  // warning notice, a primary button's edge on the muted band, and the edge
  // of a checkbox on its field surface
  { fg: ["brand-primary"], bg: ["color-warning-bg > surface-page"], min: 4.5, kind: "text" },
  { fg: ["focus-ring"], bg: ["color-warning-bg > surface-page"], min: 3, kind: "ui" },
  { fg: ["brand-fill"], bg: ["surface-muted"], min: 3, kind: "ui" },
  { fg: ["outline"], bg: ["input-bg"], min: 3, kind: "ui" },
];

/** LUZ's own high-contrast mode goes beyond AA where it can: syntax colours keep 7:1 (WCAG 1.4.6). */
export const HIGH_CONTRAST_PAIRS = [{ fg: CODE, bg: ["surface-muted"], min: 7, kind: "text" }];

/** The pairs to measure in a mode; `mode` is "high-contrast" for LUZ's own mode only. */
export const pairsFor = (mode) => (mode === "high-contrast" ? [...PAIRS, ...HIGH_CONTRAST_PAIRS] : PAIRS);

/** The same list, one entry per foreground and background. */
export function expandPairs(pairs) {
  const out = [];
  for (const { fg, bg, min, kind, advisory = false } of pairs) for (const f of fg) for (const b of bg) out.push({ fg: f, bg: b, min, kind, advisory });
  return out;
}

/* ---- Token values ------------------------------------------------------- */

const VAR = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/;

/**
 * A resolver over a map of custom-property names to raw values: follows var()
 * chains (with their fallbacks) to a literal, and lists the names it passed
 * through. Throws for a name that is not defined anywhere.
 */
export function createResolver(values) {
  /** @returns {{ value: string, chain: string[] }} */
  function resolve(name, chain = []) {
    if (chain.includes(name)) throw new Error(`${name} refers to itself`);
    const raw = values[name];
    if (raw === undefined) throw new Error(`${name} is not defined`);
    const ref = raw.match(VAR);
    if (!ref) return { value: raw, chain: [...chain, name] };
    if (values[ref[1]] === undefined && ref[2]) return { value: ref[2].trim(), chain: [...chain, name] };
    return resolve(ref[1], [...chain, name]);
  }
  return resolve;
}

/**
 * Measure `pairs` with a resolver. `token(name)` returns the resolver's result
 * for `--luz-<name>`. A background spec "a > b" is a over b over the page.
 * Returns { results, unreadable }: one result per pair, and the pairs that
 * could not be measured with the reason.
 */
export function measure(resolve, pairs) {
  const results = [];
  const unreadable = [];
  const colour = (name) => {
    const { value, chain } = resolve(`--luz-${name}`);
    try {
      return { colour: parseColor(value), chain };
    } catch (error) {
      error.tokens = chain;
      throw error;
    }
  };
  const surface = (spec) => {
    const layers = spec.split(">").map((s) => s.trim());
    let result = colour("surface-page").colour;
    const chain = [];
    for (const layer of layers.reverse()) {
      const c = colour(layer);
      chain.push(...c.chain);
      result = over(c.colour, result);
    }
    return { colour: result, chain };
  };
  for (const { fg, bg, min, kind, advisory } of expandPairs(pairs)) {
    try {
      const back = surface(bg);
      const front = colour(fg);
      const value = ratio(over(front.colour, back.colour), back.colour);
      results.push({ foreground: `--luz-${fg}`, background: bg, ratio: value, minimum: min, kind, advisory, ok: value + 1e-9 >= min, tokens: [...front.chain, ...back.chain] });
    } catch (error) {
      unreadable.push({ foreground: `--luz-${fg}`, background: bg, reason: error.message, tokens: error.tokens ?? [] });
    }
  }
  return { results, unreadable };
}
