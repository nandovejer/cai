/**
 * CAI — the tokens in the W3C Design Tokens Community Group format (DTCG,
 * 2025.10), built from the same sources as the CSS: tokens.json (primitives)
 * and src/semantic.css (semantic, one block per base color mode).
 *
 * One file, two top-level groups, one per Figma collection:
 *   primitives — "CAI primitives", one mode ("Value")
 *   semantic   — "CAI semantic", modes Light, Dark and High contrast (the
 *                three data-theme values). `$value` is the Light value; every
 *                mode is in `$extensions.mode` (the convention Terrazzo and
 *                Tokens Studio read). A semantic token that is a var() of a
 *                primitive in the CSS is an alias of it here: "{primitives.gray.90}".
 *
 * Name rule (no lookup table): drop `--cai-`, the first segment is the group,
 * the rest is the name. --cai-surface-page ↔ surface/page, --cai-space-md ↔
 * space/md, --cai-scrim ↔ scrim. A name that is also a group (--cai-surface,
 * next to --cai-surface-page) is the group's `$root` token.
 *
 * Pure functions, no I/O: scripts/build-tokens.js writes the file and
 * tests/tokens-dtcg.test.js checks it against the CSS.
 */

export const MODES = [
  ["Light", "light"],
  ["Dark", "dark"],
  ["High contrast", "high-contrast"],
];

const TYPES = {
  color: "color",
  dimension: "dimension",
  fontSize: "dimension",
  borderRadius: "dimension",
  fontFamily: "fontFamily",
  shadow: "shadow",
};

/** `--cai-surface-page` → ["surface", "page"]; `--cai-scrim` → ["scrim"]. */
export function pathOf(property) {
  const name = property.replace(/^--cai-/, "");
  const cut = name.indexOf("-");
  return cut === -1 ? [name] : [name.slice(0, cut), name.slice(cut + 1)];
}

const round = (n) => Math.round(n * 1e4) / 1e4;
const hex2 = (n) => n.toString(16).padStart(2, "0");

/** A CSS colour (#rgb, #rrggbb, rgb(), rgba()) → a DTCG sRGB colour object. */
export function color(css) {
  let rgb;
  let alpha = 1;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css);
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(css);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else if (fn) {
    rgb = fn.slice(1, 4).map(Number);
    if (fn[4] !== undefined) alpha = Number(fn[4]);
  } else {
    throw new Error(`tokens-dtcg: unsupported colour "${css}"`);
  }
  return {
    colorSpace: "srgb",
    components: rgb.map((c) => round(c / 255)),
    alpha,
    hex: `#${rgb.map(hex2).join("")}`,
  };
}

/** "16px" → { value: 16, unit: "px" } (DTCG dimension: px or rem). */
export function dimension(css) {
  const m = /^(-?[\d.]+)(px|rem)$/.exec(css);
  if (!m) throw new Error(`tokens-dtcg: unsupported dimension "${css}"`);
  return { value: Number(m[1]), unit: m[2] };
}

/** Split on commas outside parentheses. */
const splitTop = (css) => css.split(/,(?![^(]*\))/).map((s) => s.trim());

/** "system-ui, \"Segoe UI\", sans-serif" → ["system-ui", "Segoe UI", "sans-serif"] */
export const fontFamily = (css) => splitTop(css).map((f) => f.replace(/^["']|["']$/g, ""));

/** "0 1px 2px rgba(…), …" → DTCG shadow objects (an array when there are layers). */
export function shadow(css) {
  const layers = splitTop(css).map((layer) => {
    const colour = /(?:rgba?\([^)]*\)|#[0-9a-f]{3,6})$/i.exec(layer)?.[0];
    const lengths = layer.slice(0, layer.length - (colour?.length ?? 0)).trim().split(/\s+/);
    const [offsetX, offsetY, blur = "0px", spread = "0px"] = lengths.map((l) => (l === "0" ? "0px" : l));
    return {
      color: color(colour ?? "#000"),
      offsetX: dimension(offsetX),
      offsetY: dimension(offsetY),
      blur: dimension(blur),
      spread: dimension(spread),
    };
  });
  return layers.length === 1 ? layers[0] : layers;
}

const VALUE = { color, dimension, fontFamily, shadow };

/** tokens.json group → the CSS custom property prefix build-tokens.js uses. */
function primitiveEntries(tokens) {
  const out = [];
  for (const [family, shades] of Object.entries(tokens.color)) {
    for (const [shade, token] of Object.entries(shades)) out.push([`--cai-${family}-${shade}`, token]);
  }
  for (const [group, prefix] of [["spacing", "space-"], ["control", "control-"], ["typography", ""], ["radius", "radius-"], ["shadow", "shadow-"]]) {
    for (const [key, token] of Object.entries(tokens[group])) out.push([`--cai-${prefix}${key}`, token]);
  }
  return out;
}

/** Set a token at a path, using `$root` when the path is also a group. */
function place(tree, path, token) {
  let node = tree;
  for (const key of path.slice(0, -1)) {
    if (node[key]?.$type) node[key] = { $root: node[key] };
    node = node[key] ??= {};
  }
  const last = path.at(-1);
  if (node[last] && !node[last].$type) node[last].$root = token;
  else node[last] = token;
}

/** The parts of a path as a DTCG reference body, with `$root` where needed. */
function refPath(tree, path) {
  let node = tree;
  for (const key of path) node = node?.[key];
  return node && !node.$type && node.$root ? [...path, "$root"] : path;
}

/**
 * semantic.css → { light: Map(prop → css value), dark: …, "high-contrast": … }.
 * A block belongs to the modes whose `[data-theme="…"]` its selector names.
 */
export function parseSemantic(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const modes = Object.fromEntries(MODES.map(([, theme]) => [theme, new Map()]));
  for (const [, selector, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const themes = MODES.map(([, t]) => t).filter((t) => selector.includes(`[data-theme="${t}"]`));
    for (const [, prop, value] of body.matchAll(/(--cai-[\w-]+)\s*:\s*([^;]+);/g)) {
      for (const t of themes) modes[t].set(prop, value.trim());
    }
  }
  return modes;
}

/** Build the DTCG document. `tokens` is tokens.json, `semanticCss` semantic.css. */
export function buildDtcg(tokens, semanticCss) {
  const primitives = {
    $description: "CAI primitives: one mode (Value). Components never use these directly.",
    $extensions: { "com.cai-ds": { collection: "CAI primitives", modes: ["Value"] } },
  };
  const primitiveNames = new Set();
  for (const [prop, token] of primitiveEntries(tokens)) {
    const $type = TYPES[token.type];
    if (!$type) throw new Error(`tokens-dtcg: no DTCG type for ${prop} (${token.type})`);
    const out = { $type, $value: VALUE[$type](token.value) };
    if (token.description) out.$description = token.description;
    place(primitives, pathOf(prop), out);
    primitiveNames.add(prop);
  }

  const modes = parseSemantic(semanticCss);
  const semantic = {
    $description: "CAI semantic: modes Light, Dark and High contrast, one per data-theme value. Aliases point at primitives, as semantic.css does.",
    $extensions: {
      "com.cai-ds": { collection: "CAI semantic", modes: Object.fromEntries(MODES) },
    },
  };
  const light = modes.light;
  for (const [, theme] of MODES) {
    const missing = [...light.keys()].filter((p) => !modes[theme].has(p));
    const extra = [...modes[theme].keys()].filter((p) => !light.has(p));
    if (missing.length || extra.length) throw new Error(`tokens-dtcg: ${theme} differs from light: ${[...missing, ...extra].join(", ")}`);
  }
  // Place every token first so references can see `$root` groups.
  for (const prop of light.keys()) place(semantic, pathOf(prop), { $type: "color" });
  const tree = { primitives, semantic };
  const valueOf = (css) => {
    const ref = /^var\((--cai-[\w-]+)\)$/.exec(css)?.[1];
    if (!ref) return color(css);
    const collection = primitiveNames.has(ref) ? "primitives" : light.has(ref) ? "semantic" : null;
    if (!collection) throw new Error(`tokens-dtcg: ${css} is not a CAI token`);
    return `{${refPath(tree, [collection, ...pathOf(ref)]).join(".")}}`;
  };
  for (const prop of light.keys()) {
    const mode = Object.fromEntries(MODES.map(([name, theme]) => [name, valueOf(modes[theme].get(prop))]));
    let node = semantic;
    for (const key of pathOf(prop)) node = node[key];
    if (!node.$type) node = node.$root;
    node.$value = mode.Light;
    node.$extensions = { mode };
  }

  return {
    $description:
      "CAI Design System tokens in the DTCG format, generated from @cai-ds/tokens (tokens.json + semantic.css). Do not edit. Name rule: --cai-surface-page ↔ surface/page.",
    ...tree,
  };
}
