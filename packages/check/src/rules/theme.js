/**
 * LUZ check: the theme rules (f5-ai-ready.md 5.5, 5.7; the answers of
 * accessibility-engineer Q4 and "false passes", of security-auditor Q3).
 *
 *   theme/contrast    a pair of the engine under its minimum in a mode
 *   theme/unreadable  a colour the engine cannot read, so a pair never measured
 *   theme/advisory    what the check did not measure or had to guess: colours no
 *                     mode could place, a wide-gamut override in @supports, the
 *                     order of the files, themes past the limit
 *
 * The engine is the one of @luz-ds/tokens (packages/tokens/lib), imported by
 * relative path so the bundle holds the one copy: `analyze()` is
 * `luz-tokens check-contrast` on the same files, a finding for each of its
 * failures and unreadable colours, and `details` is the shape it writes. A
 * colour is echoed only as #rrggbb, and what the file wrote is never echoed
 * for a colour that cannot be read. The pairs are measured against LUZ's own
 * tokens: the project's dist/tokens.css when it is installed, else the
 * snapshot beside the bundle (build-check.js writes it reduced to the colour
 * tokens, by colourTokens() below).
 *
 * A theme file is a stylesheet of the run that declares a --luz-* colour
 * token, or one that --theme or `themes` names. The files are analysed
 * together, in load order: the ones named, in the order given, last; before
 * them the others, in the order of the <link>s of the checked pages, else
 * alphabetical (and then one theme/advisory says so).
 */
import { analyze } from "../../../tokens/lib/check.js";
import { createResolver, formatRatio, parseColor } from "../../../tokens/lib/contrast.js";
import { parseRules, targetsOf } from "../../../tokens/lib/theme.js";
import { finding } from "../report.js";
import { displayPath, echoName } from "../sanitize.js";
import { toHex } from "./shared.js";

/** Custom themes measured in a run: each is four modes of 150 pairs, and a file can name thousands. */
export const MAX_THEMES = 16;

// A feature query that asks about a colour (@supports (color: oklch(0 0 0))): what it guards is wide-gamut
const WIDE = /^@supports\b[\s\S]*(?:^|[\s(:])(?:oklch|oklab|lab|lch|hwb|color|color-mix|light-dark)\(/i;
const REFERENCE = /^var\(--luz-[A-Za-z0-9-]{1,56}\)$/;

/** The rules of a stylesheet as the engine reads them, or null when it cannot (nesting too deep to follow). */
function rulesOf(text) {
  try {
    return parseRules(text);
  } catch {
    return null;
  }
}

/** The names of LUZ's tokens that hold a colour once their var() chain is followed. */
export function colourTokens(rules) {
  const values = {};
  for (const rule of rules) for (const { name, value } of rule.declarations) values[name] = value;
  const resolve = createResolver(values);
  const names = new Set();
  for (const name of Object.keys(values)) {
    try {
      parseColor(resolve(name).value);
      names.add(name);
    } catch {
      // a size, a font, a shadow
    }
  }
  return names;
}

/** Can the engine read this value (a colour, or a reference it follows)? */
function readable(value) {
  if (/^var\(/i.test(value)) return true;
  try {
    parseColor(value);
    return true;
  } catch {
    return false;
  }
}

/** A value of an override as it may be written: #rrggbb, a reference to a LUZ token, or nothing. */
const echoValue = (value) => toHex(value) ?? (REFERENCE.test(value) ? value : null);

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @param {{ files: { path: string, text: string }[], named: string[], linked: string[], tokensFor: (path: string, bundled?: boolean) => { text: string, source: string } | null }} run
 *   `files` the stylesheets of the run; `named` the paths --theme and
 *   `themes` name, in the order given; `linked` the stylesheets the checked
 *   pages link, in the order of the first page that links them; `tokensFor`
 *   LUZ's tokens as the project of that file has them, or, with `bundled`,
 *   the ones of this release (used when the project's file cannot be read)
 * @returns {object[]} findings
 */
export function themeFindings({ files, named, linked, tokensFor }) {
  const found = [];
  const wanted = new Set(named);
  const candidates = [];
  for (const { path, text } of files) {
    if (wanted.has(path) || text.includes("--luz-")) candidates.push({ path, text });
  }
  if (candidates.length === 0) return found;
  let tokens = tokensFor(candidates[0].path);
  let tokenRules = tokens === null ? null : rulesOf(tokens.text);
  if ((tokenRules === null || tokenRules.length === 0) && tokens?.source === "node_modules") {
    tokens = tokensFor(candidates[0].path, true);
    tokenRules = tokens === null ? null : rulesOf(tokens.text);
  }
  if (tokenRules === null || tokenRules.length === 0) return found;
  const colours = colourTokens(tokenRules);

  const themes = [];
  for (const { path, text } of candidates) {
    const rules = rulesOf(text);
    if (rules !== null && (wanted.has(path) || rules.some((rule) => rule.declarations.some((declaration) => colours.has(declaration.name))))) themes.push({ path, rules });
  }
  if (themes.length === 0) return found;

  // Load order
  const given = new Map();
  named.forEach((path, index) => given.has(path) || given.set(path, index));
  const link = new Map();
  linked.forEach((path, index) => link.has(path) || link.set(path, index));
  const rest = themes.filter((theme) => !given.has(theme.path)).sort((a, b) => (link.get(a.path) ?? Infinity) - (link.get(b.path) ?? Infinity) || byText(a.path, b.path));
  const own = themes.filter((theme) => given.has(theme.path)).sort((a, b) => given.get(a.path) - given.get(b.path));
  const ordered = [...rest, ...own];
  const unlinked = rest.find((theme) => !link.has(theme.path));
  if (rest.length > 1 && unlinked !== undefined) found.push(finding("theme/advisory", { file: unlinked.path, vars: { source: "alphabetical" } }));

  // What the engine is given: not the wide-gamut overrides it would count as true, and not the themes past the limit
  const names = targetsOf(ordered.flatMap((theme) => theme.rules)).filter((target) => target.custom && target.mode === null);
  const dropped = new Set(names.slice(MAX_THEMES).map((target) => target.theme));
  let beyond = null;
  const sources = ordered.map((theme) => {
    const rules = [];
    for (const rule of theme.rules) {
      if (dropped.size > 0 && targetsOf([rule]).some((target) => target.custom && dropped.has(target.theme))) {
        beyond ??= theme.path;
        continue;
      }
      if (!rule.conditions.some((condition) => WIDE.test(condition))) {
        rules.push(rule);
        continue;
      }
      const kept = rule.declarations.filter((declaration) => readable(declaration.value));
      for (const declaration of rule.declarations) {
        if (!kept.includes(declaration)) found.push(finding("theme/advisory:wide", { file: theme.path, line: declaration.line, vars: { token: declaration.name } }));
      }
      if (kept.length > 0) rules.push({ ...rule, declarations: kept });
    }
    return { file: theme.path, rules };
  });
  if (beyond !== null) found.push(finding("theme/advisory:limit", { file: beyond, vars: { count: String(dropped.size), limit: String(MAX_THEMES) } }));

  const result = analyze([{ file: "tokens", rules: tokenRules }, ...sources]);
  const first = ordered[0].path;
  const places = (list, withValue) =>
    list.map((o) => {
      const place = { token: echoName(o.token) };
      if (withValue) place.value = echoValue(o.value);
      place.file = displayPath(o.file);
      place.line = o.line;
      return place;
    });

  for (const failure of result.failures) {
    const { mode, foreground, background, ratio, minimum, kind, overrides } = failure;
    // A tint over a surface is written layer by layer down to the page, in the alphabet a message may echo, as the background is: without --luz- and without the kind, to fit
    const layers = background.split(/\s*>\s*/);
    if (layers.length > 1 && layers[layers.length - 1] !== "surface-page") layers.push("surface-page");
    found.push(
      finding(layers.length > 1 ? "theme/contrast:layers" : "theme/contrast", {
        file: overrides[0]?.file ?? first,
        vars: { mode, foreground: layers.length > 1 ? foreground.slice(6) : foreground, background: layers.join("/"), ratio: formatRatio(ratio).slice(0, -2), minimum: String(minimum), kind },
        details: { mode: echoName(mode), foreground, background, ratio, minimum, kind, overrides: places(overrides, true) },
      }),
    );
  }
  for (const bad of result.unreadable) {
    const { mode, foreground, background, overrides } = bad;
    const last = overrides[overrides.length - 1];
    found.push(
      finding("theme/unreadable", {
        file: last?.file ?? first,
        vars: { token: last?.token ?? foreground },
        details: { mode: echoName(mode), foreground, background, overrides: places(overrides, false) },
      }),
    );
  }

  // Colours in a place no mode could place: the engine listed the rule it left out
  const placed = new Map();
  for (const theme of sources) {
    const lines = new Map();
    for (const rule of theme.rules) lines.set(rule.line, [...(lines.get(rule.line) ?? []), rule]);
    placed.set(theme.file, lines);
  }
  for (const item of result.ignored) {
    for (const rule of placed.get(item.file)?.get(item.line) ?? []) {
      if (!rule.selectors.includes(item.selector) && rule.selectors.join(", ") !== item.selector) continue;
      const colour = rule.declarations.find((declaration) => colours.has(declaration.name));
      if (colour !== undefined) found.push(finding("theme/advisory:unplaced", { file: item.file, line: item.line, vars: { token: colour.name } }));
      break;
    }
  }
  return found;
}
