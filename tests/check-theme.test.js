/**
 * F5 step 11, the theme rules of @luz-ds/check: theme/contrast,
 * theme/unreadable and theme/advisory (.claude/plans/specs/f5-ai-ready.md
 * 5.3 `--theme` and `details`, 5.5 and 5.7, 5.9, 8 "Parsing cost"; D10-A; the
 * review answers of accessibility-engineer Q4 and "False passes to prevent";
 * of security-auditor Q3; the notes from step 8).
 *
 * What is not here: the CSS warnings are tests/check-rules-css.test.js. The
 * fixtures are read by the runner of tests/helpers/check-fixtures.js, keyed
 * by rule-id prefix, as in steps 9 and 10.
 *
 * The contract, new in this step:
 *
 *   The engine. The contrast engine stays in packages/tokens/lib/
 *       (contrast.js: the colour maths, PAIRS, createResolver, measure;
 *       theme.js: parseRules, targetsOf, valuesFor; check.js: analyze).
 *       packages/check/src/rules/theme.js imports it by relative path
 *       (../../../tokens/lib/check.js, ...), so the bundle holds the one copy:
 *       the metafile of buildCheck() lists those three files, each once, and
 *       none from node_modules, and not the CLI of luz-tokens (lib/cli.js).
 *       Nothing in tests/ imports @luz-ds/check for the engine: the tests
 *       import analyze and the colour maths from tokens.
 *   LUZ's own tokens. data/tokens/tokens.css of the bundled snapshot (what
 *       the build writes beside luz-check.js), or, for a theme file, the
 *       dist/tokens.css of the nearest node_modules/@luz-ds/tokens that has a
 *       package.json naming it (walking up from the theme file's folder,
 *       as the manifests do), which wins when it is there. The snapshot is
 *       reduced to what the engine reads (tests/check-data.test.js keeps the
 *       whole data folder under 56 KiB): analyze() gives the same verdicts
 *       with it as with dist/tokens.css.
 *   A theme file is a stylesheet of the run that declares --luz-* colour
 *       tokens, or one named by --theme or config.themes. The files are
 *       analysed together, in load order: `--theme` and `themes` in the order
 *       given, else the order of the <link rel="stylesheet"> of the checked
 *       pages, else alphabetical, and in that last case, with more than one
 *       theme file, one theme/advisory says so ("alphabetical order is used
 *       for the theme files; use --theme to set the order"). A file that
 *       declares sizes and fonts only is not a theme file: nothing from
 *       theme/ is said about it.
 *   theme/contrast, one finding for each entry of analyze().failures, so the
 *       same pairs and ratios as `luz-tokens check-contrast --json`, severity
 *       block, `file` the file of an override the failure names, line and
 *       column null (the pair is not a place), and
 *         details = { mode, foreground, background, ratio, minimum, kind,
 *                     overrides: [{ token, value, file, line }] }
 *       as the engine writes a failure (foreground "--luz-text-secondary",
 *       background "surface-page" or "color-danger-bg > surface-page"),
 *       with `value` the colour re-serialised as #rrggbb (security-auditor
 *       Q3: a colour is echoed only as that) and `file` the path relative to
 *       the working directory. The message is the template of messages.js:
 *       "<mode>: <foreground> on <background> is <r>:1, needs <min>:1
 *       (<kind>); change one of the two", the ratio as formatRatio prints it,
 *       the composite background written in a way that is echoed (never
 *       "<an unreadable name>").
 *   theme/unreadable, one finding for each entry of analyze().unreadable:
 *       block, `file` the file of the override, line and column null,
 *       message "<token> is set to a colour the check cannot read; write the
 *       sRGB value as #rrggbb" with the token the override sets, and
 *         details = { mode, foreground, background,
 *                     overrides: [{ token, file, line }] }
 *       with no `value` and no `reason`: what the file wrote is never echoed.
 *   theme/advisory, warn: a theme file whose --luz-* colours none of the
 *       modes could place (a class selector, a media query: the engine's
 *       `ignored`), a wide-gamut override in @supports (color: oklch(...)),
 *       which is not measured, and the order note above.
 *   Text mode prints, under each theme/contrast and theme/unreadable line,
 *       one line for each override, indented four spaces:
 *         "    --luz-text-secondary: #999999 is set in theme.css:4"
 *         "    --luz-text-primary is set in theme.css:4"      (no value)
 *   No theme output says a page or a theme is accessible, passes or
 *       conforms; a blocking rule is not switched off by a configuration.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../packages/check/src/cli.js";
import { run as luzTokens } from "../packages/tokens/lib/cli.js";
import { analyze } from "../packages/tokens/lib/check.js";
import { formatRatio, parseColor } from "../packages/tokens/lib/contrast.js";
import { parseRules } from "../packages/tokens/lib/theme.js";
import { builtOnce } from "./helpers/check-build.js";
import { FIXTURES, ROOT, VERSION, builtData, checkCase, checkJson, fixtureCases, installPackages, key, miniSnapshot, passCases, put, removeWorkspaces, workspace } from "./helpers/check-fixtures.js";
import { check, linkTo, links, ofRule, page, wordsOf } from "./helpers/check-run.js";

afterAll(removeWorkspaces);

const PREFIXES = ["theme/"];
const TOKENS_CSS = join(ROOT, "packages/tokens/dist/tokens.css");
const SITE = "https://nandovejer.github.io/luz/";
const UNREADABLE = "<an unreadable name>";
const MODES = ["light", "dark", "high-contrast"];

/* ---- Helpers ---------------------------------------------------------------------------------- */

const fullTokens = () => {
  expect(existsSync(TOKENS_CSS), "packages/tokens/dist/tokens.css exists (pnpm tokens:build)").toBe(true);
  return readFileSync(TOKENS_CSS, "utf-8");
};
const fixture = (path) => readFileSync(join(FIXTURES, path), "utf-8");
const repoFile = (path) => readFileSync(join(ROOT, path), "utf-8");

/** A bundled snapshot with LUZ's tokens in it, in the folder and the name the build writes: for env.data. */
function snapshotWithTokens(options) {
  const dir = miniSnapshot(options);
  put(dir, "tokens/tokens.css", fullTokens());
  return dir;
}

const LOW = ":root {\n  --luz-text-secondary: #999999;\n}\n";
// A theme that keeps every pair in all three modes: `:root` has the same specificity as `[data-theme="dark"]` and
// comes later, so a light value alone also lands on the dark and high-contrast surfaces.
const FINE = [
  ":root {\n  --luz-text-secondary: #404040;\n}",
  '[data-theme="dark"] {\n  --luz-text-secondary: #dddddd;\n}',
  '[data-theme="high-contrast"] {\n  --luz-text-secondary: #000000;\n}',
  "",
].join("\n");
const KNOBS = ":root {\n  --luz-type-base: 1.125rem;\n  --luz-space-unit: 0.25rem;\n  --luz-font-body: system-ui, sans-serif;\n}\n";
const THREE_MODES = [
  ":root { --luz-text-secondary: #999999; }",
  '[data-theme="dark"] { --luz-text-secondary: #333333; }',
  '[data-theme="high-contrast"] { --luz-text-secondary: #777777; }',
  "",
].join("\n");
const NESTED = '@layer luz.themes {\n  html[data-theme="dark"] {\n    --luz-text-primary: #222222;\n  }\n}\n';
const COMPOSITE = ":root { --luz-color-danger: #ff9999; }\n";
const RGB = ":root {\n  --luz-text-secondary: rgb(153, 153, 153);\n}\n";
const CUSTOM_THEME = '[data-theme="brand"] { --luz-text-secondary: #999999; }\n[data-theme="brand"][data-mode="dark"] { --luz-text-secondary: #333333; }\n';
const MIXED = ":root {\n  --luz-text-primary: oklch(0.2 0.02 250);\n  --luz-text-secondary: #999999;\n}\n";

/** One theme file through the CLI, with LUZ's tokens in the snapshot. */
const themeRun = (css, { name = "theme.css", argv = [name], snapshot = snapshotWithTokens() } = {}) => check({ [name]: css }, { argv, snapshot });
const contrastOf = (result) => ofRule(result, "theme/contrast");
const unreadableOf = (result) => ofRule(result, "theme/unreadable");

/* ---- The data the rules read ----------------------------------------------------------------- */

describe("LUZ's tokens in the bundled snapshot", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  it("is written by the build as data/tokens/tokens.css, next to the manifests", () => {
    expect(snapshot.error).toBeNull();
    expect(existsSync(join(snapshot.data, "tokens/tokens.css"))).toBe(true);
  });

  it("makes the engine say what dist/tokens.css makes it say, for LUZ's own tokens and for every theme of these tests", () => {
    expect(snapshot.error).toBeNull();
    const reduced = parseRules(readFileSync(join(snapshot.data, "tokens/tokens.css"), "utf-8"));
    const full = parseRules(fullTokens());
    const themes = [
      "",
      fixture("pass/theme-ok.css"),
      fixture("fail/theme-low.css"),
      fixture("fail/theme-unreadable.css"),
      THREE_MODES,
      NESTED,
      COMPOSITE,
      RGB,
      CUSTOM_THEME,
      MIXED,
      fixture("../theme-brand.css"),
      repoFile("packages/core/src/themes/_template.css"),
    ];
    for (const css of themes) {
      const sources = (tokens) => [{ file: "tokens", rules: tokens }, { file: "theme.css", rules: parseRules(css) }];
      expect(analyze(sources(reduced)), css.slice(0, 60)).toEqual(analyze(sources(full)));
    }
    const own = analyze([{ file: "tokens", rules: reduced }]);
    expect(own.ok).toBe(true);
    expect(own.modes).toEqual(MODES);
    expect(own.checked).toBe(analyze([{ file: "tokens", rules: full }]).checked);
  });

  it("holds the engine once: the bundle lists tokens' contrast, theme and check modules, each once, and not luz-tokens' command line", async () => {
    const built = await builtOnce();
    expect(built.error, "buildCheck({ outdir }) builds the bundle").toBeNull();
    const inputs = Object.keys(built.metafile.inputs);
    for (const file of ["contrast", "theme", "check"]) {
      expect(inputs.filter((input) => input.endsWith(`packages/tokens/lib/${file}.js`)), `packages/tokens/lib/${file}.js`).toHaveLength(1);
    }
    expect(inputs.filter((input) => input.endsWith("packages/tokens/lib/cli.js"))).toEqual([]);
    expect(inputs.filter((input) => input.includes("node_modules"))).toEqual([]);
  });
});

/* ---- The fixtures ------------------------------------------------------------------------------ */

describe("the fixtures: every file makes the theme rules say what its expect comments say", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  const cases = fixtureCases(PREFIXES);

  it("has the files this step needs, each with an expect comment", () => {
    expect(cases.map((c) => c.path).sort()).toEqual(["fail/theme-low.css", "fail/theme-unreadable.css"]);
  });

  it("blocks fail/theme-low.css with theme/contrast, at no position, in the file, and exits 1", () => {
    expect(snapshot.error, "the build writes dist/data (scripts/build-check.js)").toBeNull();
    const entry = cases.find((c) => c.path === "fail/theme-low.css");
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.data, `stdout is JSON (stderr: ${result.stderr})`).not.toBeNull();
    expect([...new Set(result.found.map(key))]).toEqual(["theme/contrast -:-"]);
    for (const found of result.found) {
      expect(found.severity).toBe("block");
      expect(found.file).toBe("fail/theme-low.css");
      expect(found.docs).toMatch(new RegExp(`^${SITE}docs/tokens/contrast/`));
      expect(wordsOf("theme/contrast", found.message), found.message).toBe(true);
    }
    expect(result.code).toBe(1);
  });

  it("blocks fail/theme-unreadable.css with exactly one theme/unreadable, and exits 1", () => {
    expect(snapshot.error).toBeNull();
    const entry = cases.find((c) => c.path === "fail/theme-unreadable.css");
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.found.map(key)).toEqual(["theme/unreadable -:-"]);
    expect(result.found[0].severity).toBe("block");
    expect(result.found[0].file).toBe("fail/theme-unreadable.css");
    expect(wordsOf("theme/unreadable", result.found[0].message), result.found[0].message).toBe(true);
    expect(result.code).toBe(1);
  });

  it.each(passCases().filter((c) => c.name.startsWith("theme-")))("$path: nothing from theme/, exit 0", (entry) => {
    expect(snapshot.error).toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.found.map(key)).toEqual([]);
    expect(result.code).toBe(0);
  });
});

/* ---- theme/contrast ------------------------------------------------------------------------------- */

describe("theme/contrast", () => {
  it("measures light, dark and high-contrast: a file that is too low in each of them blocks in each of them", () => {
    const result = themeRun(THREE_MODES);
    expect(result.code).toBe(1);
    expect(new Set(contrastOf(result).map((f) => f.details.mode))).toEqual(new Set(MODES));
    for (const mode of MODES) expect(contrastOf(result).filter((f) => f.details.mode === mode).length, mode).toBeGreaterThan(0);
  });

  it("is one finding for each pair and mode that fails, in the file, with no position and severity block", () => {
    const result = themeRun(THREE_MODES);
    const found = contrastOf(result);
    expect(found.length).toBeGreaterThan(MODES.length);
    for (const f of found) {
      expect(f.severity).toBe("block");
      expect(f.file).toBe("theme.css");
      expect([f.line, f.column]).toEqual([null, null]);
      expect(f.suggestion).toBeNull();
      expect(f.docs).toMatch(new RegExp(`^${SITE}docs/tokens/contrast/`));
    }
  });

  it("gives `details` the shape of the engine's failure, with the overrides that made it", () => {
    const result = themeRun(LOW);
    const found = contrastOf(result);
    expect(found.length).toBeGreaterThan(0);
    for (const f of found) {
      expect(Object.keys(f.details).sort()).toEqual(["background", "foreground", "kind", "minimum", "mode", "overrides", "ratio"]);
      expect(MODES).toContain(f.details.mode);
      expect(f.details.foreground).toMatch(/^--luz-[a-z0-9-]+$/);
      expect(typeof f.details.background).toBe("string");
      expect(typeof f.details.ratio).toBe("number");
      expect(f.details.ratio).toBeLessThan(f.details.minimum);
      expect([3, 4.5, 7]).toContain(f.details.minimum);
      expect(["text", "disabled-text", "ui"]).toContain(f.details.kind);
      expect(f.details.overrides).toEqual([{ token: "--luz-text-secondary", value: "#999999", file: "theme.css", line: 2 }]);
    }
  });

  it("words the finding with the template: the mode, the pair, the ratio as the docs print it, the minimum and the kind", () => {
    const result = themeRun(THREE_MODES);
    const plain = contrastOf(result).filter((x) => !x.details.background.includes(">"));
    expect(plain.length).toBeGreaterThan(0);
    for (const f of plain) {
      const { mode, foreground, background, ratio, minimum, kind } = f.details;
      expect(wordsOf("theme/contrast", f.message), f.message).toBe(true);
      expect(f.message.startsWith(`${mode}: ${foreground} on `), f.message).toBe(true);
      expect(f.message, f.message).toContain(background);
      expect(f.message).toContain(` is ${formatRatio(ratio)}`);
      expect(f.message).toContain(`needs ${minimum}:1 (${kind})`);
      expect(f.message.length).toBeLessThanOrEqual(120);
    }
  });

  it("names a pair on a translucent tint in words that can be echoed, never as an unreadable name", () => {
    const result = themeRun(COMPOSITE);
    const composite = contrastOf(result).filter((f) => f.details.background.includes(">"));
    expect(composite.length).toBeGreaterThan(0);
    for (const f of composite) {
      expect(f.message, f.message).not.toContain(UNREADABLE);
      expect(f.message).toContain("color-danger-bg");
      expect(f.message).toContain("surface-page");
      expect(wordsOf("theme/contrast", f.message), f.message).toBe(true);
    }
  });

  it("places a rule under @layer and under html[data-theme]: only the dark mode is measured against it", () => {
    const result = themeRun(NESTED);
    const found = contrastOf(result);
    expect(found.length).toBeGreaterThan(0);
    expect(new Set(found.map((f) => f.details.mode))).toEqual(new Set(["dark"]));
    expect(found[0].details.overrides).toEqual([{ token: "--luz-text-primary", value: "#222222", file: "theme.css", line: 3 }]);
  });

  it("measures a custom theme in its default mode and in each data-mode it names or inherits", () => {
    const result = themeRun(CUSTOM_THEME);
    const modes = new Set(contrastOf(result).map((f) => f.details.mode));
    expect(modes).toEqual(new Set(["brand", "brand/light", "brand/high-contrast"]));
    expect(result.code).toBe(1);
  });

  it("echoes a colour only as #rrggbb, whatever way the file wrote it", () => {
    const result = themeRun(RGB);
    const found = contrastOf(result);
    expect(found.length).toBeGreaterThan(0);
    for (const f of found) expect(f.details.overrides).toEqual([{ token: "--luz-text-secondary", value: "#999999", file: "theme.css", line: 2 }]);
    expect(result.stdout).not.toContain("rgb(");
  });

  it("is silent for a theme that keeps the pairs, and for one that sets sizes and fonts only", () => {
    for (const css of [FINE, fixture("pass/theme-ok.css"), KNOBS, "@media print { :root { --luz-type-base: 0.9375rem; } }\n"]) {
      const result = themeRun(css);
      expect(ofRule(result, "theme/"), css.slice(0, 60)).toEqual([]);
      expect(result.code).toBe(0);
    }
  });

  it("goes on to say it in the text report: one line for each override, under the finding", () => {
    const snapshot = snapshotWithTokens();
    const dir = workspace({ "css/theme.css": LOW });
    const result = run(["css/theme.css"], { version: VERSION, cwd: dir, data: snapshot });
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^✗ css\/theme\.css theme\/contrast\s+light: --luz-text-secondary on surface-page is \d\.\d:1, needs 4\.5:1 \(text\)/m);
    expect(result.stdout).toMatch(/^ {4}--luz-text-secondary: #999999 is set in css\/theme\.css:2$/m);
  });
});

/* ---- theme/unreadable ----------------------------------------------------------------------------- */

describe("theme/unreadable", () => {
  // the value the file writes, and a piece of it that must not come back in the output
  const COLOURS = {
    oklch: ["oklch(0.2 0.02 250)", "oklch"],
    "color-mix": ["color-mix(in srgb, #0b5cad 80%, white)", "color-mix"],
    "a named colour": ["rebeccapurple", "rebeccapurple"],
  };

  it.each(Object.entries(COLOURS))("blocks %s: a colour the engine cannot measure is never fine, and the advice is #rrggbb", (name, [value, piece]) => {
    const css = `:root {\n  --luz-text-primary: ${value};\n}\n`;
    const result = themeRun(css);
    expect(result.code).toBe(1);
    const found = unreadableOf(result);
    expect(found.length).toBeGreaterThan(0);
    for (const f of found) {
      expect(f.severity).toBe("block");
      expect(f.file).toBe("theme.css");
      expect([f.line, f.column]).toEqual([null, null]);
      expect(f.message.startsWith("--luz-text-primary "), f.message).toBe(true);
      expect(f.message).toContain("#rrggbb");
      expect(wordsOf("theme/unreadable", f.message), f.message).toBe(true);
      expect(f.details.overrides).toEqual([{ token: "--luz-text-primary", file: "theme.css", line: 2 }]);
      expect(Object.keys(f.details).sort()).toEqual(["background", "foreground", "mode", "overrides"]);
    }
    // what the file wrote is not echoed, in the JSON or in the text
    const text = run(["theme.css"], { version: VERSION, cwd: result.dir, data: snapshotWithTokens() });
    for (const output of [result.stdout, text.stdout]) expect(output).not.toContain(piece);
    expect(text.stdout).toMatch(/^ {4}--luz-text-primary is set in theme\.css:2$/m);
  });

  it("reports an unreadable colour next to a pair that is too low: neither hides the other", () => {
    const result = themeRun(MIXED);
    expect(unreadableOf(result).length).toBeGreaterThan(0);
    expect(contrastOf(result).length).toBeGreaterThan(0);
    expect(result.code).toBe(1);
  });
});

/* ---- Parity with luz-tokens check-contrast ---------------------------------------------------------- */

describe("parity with `luz-tokens check-contrast`: the same pairs, the same ratios, the same verdicts", () => {
  /** luz-tokens on these files, read from memory, in this order. */
  const tokensSays = (files, order) => {
    const result = luzTokens(["check-contrast", ...order, "--json"], { tokensPath: TOKENS_CSS, read: (path) => (Object.hasOwn(files, path) ? files[path] : readFileSync(path, "utf-8")) });
    return { code: result.code, report: JSON.parse(result.stdout) };
  };
  const hexOf = (value) => {
    try {
      const c = parseColor(value);
      if (c.a !== 1) return value;
      const h = (n) => Math.round(n).toString(16).padStart(2, "0");
      return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
    } catch {
      return value;
    }
  };
  const failure = (d, convert) => ({
    mode: d.mode,
    foreground: d.foreground,
    background: d.background,
    ratio: d.ratio,
    minimum: d.minimum,
    kind: d.kind,
    overrides: d.overrides.map((o) => ({ token: o.token, value: convert ? hexOf(o.value) : o.value, file: o.file, line: o.line })),
  });
  const notRead = (d) => ({ mode: d.mode, foreground: d.foreground, background: d.background, overrides: d.overrides.map((o) => ({ token: o.token, file: o.file, line: o.line })) });
  const sort = (list) => list.map((item) => JSON.stringify(item)).sort();

  const CASES = {
    "fail/theme-low.css": fixture("fail/theme-low.css"),
    "fail/theme-unreadable.css": fixture("fail/theme-unreadable.css"),
    "pass/theme-ok.css": fixture("pass/theme-ok.css"),
    "a pair low in each mode": THREE_MODES,
    "a rule under @layer and html[data-theme]": NESTED,
    "a translucent tint": COMPOSITE,
    "a colour written as rgb()": RGB,
    "a custom theme and its data-mode": CUSTOM_THEME,
    "an unreadable colour and a low pair": MIXED,
    "the semantic.css of @luz-ds/tokens": repoFile("packages/tokens/src/semantic.css"),
    "the theme of the Pages docs (theme-brand.css)": fixture("../theme-brand.css"),
    "the template of a theme (_template.css)": repoFile("packages/core/src/themes/_template.css"),
  };

  it.each(Object.entries(CASES))("%s", (name, css) => {
    const files = { "theme.css": css };
    const expected = tokensSays(files, ["theme.css"]);
    const result = themeRun(css);
    expect(sort(contrastOf(result).map((f) => failure(f.details, false)))).toEqual(sort(expected.report.failures.map((d) => failure(d, true))));
    expect(sort(unreadableOf(result).map((f) => notRead(f.details)))).toEqual(sort(expected.report.unreadable.map(notRead)));
    expect(result.code, "the verdict").toBe(expected.code);
  });

  it("loads two files in the order of --theme, as luz-tokens does with its arguments", () => {
    const files = { "a.css": LOW, "b.css": FINE };
    for (const order of [["a.css", "b.css"], ["b.css", "a.css"]]) {
      const expected = tokensSays(files, order);
      const result = check(files, { argv: [".", ...order.flatMap((name) => ["--theme", name])], snapshot: snapshotWithTokens() });
      expect(sort(contrastOf(result).map((f) => failure(f.details, false)))).toEqual(sort(expected.report.failures.map((d) => failure(d, true))));
      expect(result.code, order.join(" ")).toBe(expected.code);
    }
  });
});

/* ---- Which files, and in which order ----------------------------------------------------------------- */

describe("load order of the theme files, and the note that says which one was used", () => {
  const advisoryOf = (result) => ofRule(result, "theme/advisory");
  const withLinks = (...names) => page("  <p>x</p>", links(linkTo("tokens", "luz-tokens.min.css"), linkTo("core", "luz.min.css"), ...names.map((n) => `  <link rel="stylesheet" href="${n}">`)));

  it("takes the order of --theme: the last file wins, and no note is needed", () => {
    const files = { "a.css": LOW, "b.css": FINE };
    const win = check(files, { argv: [".", "--theme", "a.css", "--theme", "b.css"], snapshot: snapshotWithTokens() });
    expect(contrastOf(win)).toEqual([]);
    expect(advisoryOf(win)).toEqual([]);
    const lose = check(files, { argv: [".", "--theme", "b.css", "--theme", "a.css"], snapshot: snapshotWithTokens() });
    expect(contrastOf(lose).length).toBeGreaterThan(0);
    expect(new Set(contrastOf(lose).map((f) => f.file))).toEqual(new Set(["a.css"]));
    expect(advisoryOf(lose)).toEqual([]);
  });

  it("takes the order of `themes` of luz-check.json the same way", () => {
    const files = { "a.css": LOW, "b.css": FINE, "luz-check.json": JSON.stringify({ themes: ["b.css", "a.css"] }) };
    const result = check(files, { argv: ["."], snapshot: snapshotWithTokens() });
    expect(contrastOf(result).length).toBeGreaterThan(0);
    expect(advisoryOf(result)).toEqual([]);
  });

  it("takes the order of the <link>s of a checked page when there is no --theme", () => {
    const aThenB = check({ "a.css": LOW, "b.css": FINE, "index.html": withLinks("a.css", "b.css") }, { argv: ["."], snapshot: snapshotWithTokens() });
    expect(contrastOf(aThenB)).toEqual([]);
    expect(advisoryOf(aThenB)).toEqual([]);
    const bThenA = check({ "a.css": LOW, "b.css": FINE, "index.html": withLinks("b.css", "a.css") }, { argv: ["."], snapshot: snapshotWithTokens() });
    expect(contrastOf(bThenA).length).toBeGreaterThan(0);
    expect(advisoryOf(bThenA)).toEqual([]);
  });

  it("falls back to alphabetical order and says so, once, as a warning that does not fail the run", () => {
    const result = check({ "a.css": LOW, "b.css": FINE }, { argv: ["."], snapshot: snapshotWithTokens() });
    expect(contrastOf(result)).toEqual([]);
    const notes = advisoryOf(result);
    expect(notes).toHaveLength(1);
    expect(notes[0].severity).toBe("warn");
    expect(notes[0].message).toContain("alphabetical");
    expect(notes[0].message).toContain("--theme");
    expect(wordsOf("theme/advisory", notes[0].message), notes[0].message).toBe(true);
    expect(result.code).toBe(0);
  });

  it("says nothing about the order when only one file is a theme: one file has no order", () => {
    for (const files of [{ "a.css": LOW }, { "a.css": LOW, "sizes.css": KNOBS }]) {
      const result = check(files, { argv: ["."], snapshot: snapshotWithTokens() });
      expect(advisoryOf(result)).toEqual([]);
      expect(contrastOf(result).length).toBeGreaterThan(0);
    }
  });

  it("lets the note be switched off, being a warning", () => {
    const files = { "a.css": LOW, "b.css": FINE };
    expect(advisoryOf(check(files, { argv: ["."], snapshot: snapshotWithTokens() }))).toHaveLength(1);
    const off = check({ ...files, "luz-check.json": JSON.stringify({ rules: { "theme/advisory": "off" } }) }, { argv: ["."], snapshot: snapshotWithTokens() });
    expect(advisoryOf(off)).toEqual([]);
    expect(off.data.config.off).toEqual(["theme/advisory"]);
  });

  it("reads a file named by --theme even when it is not among the paths", () => {
    const result = check({ "index.html": withLinks(), "theme.css": LOW }, { argv: ["index.html", "--theme", "theme.css"], snapshot: snapshotWithTokens() });
    expect(contrastOf(result).length).toBeGreaterThan(0);
    expect(result.code).toBe(1);
  });
});

/* ---- What it cannot place or measure ---------------------------------------------------------------- */

describe("theme/advisory: colours that no mode could place, and wide-gamut overrides", () => {
  const advisoryOf = (result) => ofRule(result, "theme/advisory");

  const UNPLACED = {
    "a class selector": ".dark {\n  --luz-text-primary: #ffffff;\n}\n",
    "a media query": "@media (min-width: 60em) {\n  :root {\n    --luz-text-secondary: #999999;\n  }\n}\n",
    "a selector that is not the page": ".promo { --luz-brand-primary: #123456; }\n",
  };

  it.each(Object.entries(UNPLACED))("warns about colours declared in %s, which no mode can place", (name, css) => {
    const result = themeRun(css);
    const notes = advisoryOf(result);
    expect(notes.length, name).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.severity).toBe("warn");
      expect(note.file).toBe("theme.css");
      expect(wordsOf("theme/advisory", note.message), note.message).toBe(true);
    }
    // not measured is not failing: the run's verdict is the blocking rules' (none)
    expect(ofRule(result, "theme/contrast")).toEqual([]);
    expect(result.code).toBe(0);
  });

  it("does not warn about sizes and fonts in a place no mode could place: they are no colours", () => {
    for (const css of ["@media print { :root { --luz-type-base: 0.9375rem; } }\n", ".promo { --luz-space-unit: 0.5rem; }\n"]) {
      expect(ofRule(themeRun(css), "theme/"), css).toEqual([]);
    }
  });

  const WIDE = {
    oklch: "@supports (color: oklch(0 0 0)) {\n  :root {\n    --luz-text-secondary: oklch(0.4 0 0);\n  }\n}\n",
    "display-p3": "@supports (color: color(display-p3 1 1 1)) {\n  :root {\n    --luz-text-secondary: color(display-p3 0.3 0.3 0.3);\n  }\n}\n",
  };

  it.each(Object.entries(WIDE))("does not measure a wide-gamut override in @supports (%s): the sRGB value before it is, and a note says the rest is not", (name, wide) => {
    const result = themeRun(FINE + wide);
    expect(unreadableOf(result), name).toEqual([]);
    expect(contrastOf(result)).toEqual([]);
    expect(advisoryOf(result).length).toBeGreaterThan(0);
    expect(result.code).toBe(0);
  });

  it("still measures the sRGB value that comes before a wide-gamut override", () => {
    const result = themeRun(LOW + "@supports (color: oklch(0 0 0)) {\n  :root {\n    --luz-text-secondary: oklch(0.4 0 0);\n  }\n}\n");
    expect(contrastOf(result).length).toBeGreaterThan(0);
    expect(unreadableOf(result)).toEqual([]);
    expect(result.code).toBe(1);
  });

  it("still blocks the same colour with no @supports around it, and a feature query for something else is measured as written", () => {
    expect(unreadableOf(themeRun(":root { --luz-text-secondary: oklch(0.4 0 0); }\n")).length).toBeGreaterThan(0);
    const grid = themeRun("@supports (display: grid) {\n  :root {\n    --luz-text-secondary: #999999;\n  }\n}\n");
    expect(contrastOf(grid).length).toBeGreaterThan(0);
  });
});

/* ---- Where LUZ's tokens come from ----------------------------------------------------------------------- */

describe("the tokens a theme is measured against", () => {
  it("are the project's own dist/tokens.css when node_modules has them, walking up from the theme file, and not the snapshot", () => {
    const dir = workspace({ "css/theme.css": fixture("pass/theme-ok.css") });
    installPackages(dir, { only: ["tokens"] });
    // The installed release has a page surface the text of the light mode cannot read on
    put(dir, "node_modules/@luz-ds/tokens/dist/tokens.css", `${fullTokens()}\n:root {\n  --luz-surface-page: #404040;\n}\n`);
    const installed = checkJson(["css"], dir, { data: snapshotWithTokens() });
    expect(installed.data, `stdout is JSON (stderr: ${installed.stderr})`).not.toBeNull();
    const found = ofRule({ findings: installed.data.findings }, "theme/contrast");
    expect(found.length).toBeGreaterThan(0);
    expect(found.map((f) => f.details.mode)).toContain("light");
    expect(installed.code).toBe(1);

    const bundled = checkJson(["css"], workspace({ "css/theme.css": fixture("pass/theme-ok.css") }), { data: snapshotWithTokens() });
    expect(ofRule({ findings: bundled.data.findings }, "theme/")).toEqual([]);
    expect(bundled.code).toBe(0);
  });
});

/* ---- Never "accessible" ------------------------------------------------------------------------------------ */

describe("what the theme output claims", () => {
  const CLAIM = /\b(?:accessible|passes|passed|conforms|conformant|compliant|complies)\b/i;

  it("never says a theme or a page is accessible, passes or conforms: the summary says what it read", () => {
    const snapshot = snapshotWithTokens();
    for (const [name, css] of [["pass/theme-ok.css", fixture("pass/theme-ok.css")], ["fail/theme-low.css", fixture("fail/theme-low.css")], ["fail/theme-unreadable.css", fixture("fail/theme-unreadable.css")]]) {
      const dir = workspace({ "theme.css": css });
      const text = run(["theme.css"], { version: VERSION, cwd: dir, data: snapshot });
      const json = checkJson(["theme.css"], dir, { data: snapshot });
      expect(text.stdout, name).not.toMatch(CLAIM);
      expect(json.stdout, name).not.toMatch(CLAIM);
    }
  });
});

/* ---- Cost ---------------------------------------------------------------------------------------------------- */

describe("the theme rules cost one pass: a file of 1 MB is read in under a second", () => {
  const timed = (css) => {
    const snapshot = snapshotWithTokens();
    const start = performance.now();
    const result = themeRun(css, { snapshot });
    return { ms: performance.now() - start, result };
  };
  const BUDGET_MS = 1000;
  const SIZE = 1_000_000;

  it("1 MB of rules on :root", () => {
    const rule = ":root{--luz-text-secondary:#999999}\n";
    const { ms, result } = timed(rule.repeat(Math.ceil(SIZE / rule.length)));
    expect(ms).toBeLessThan(BUDGET_MS);
    expect(result.code).toBe(1);
    expect(contrastOf(result).length).toBeGreaterThan(0);
  });

  it("1 MB of rules for thousands of themes: read in the time, never exit 2, never out of memory", () => {
    let css = "";
    let n = 0;
    while (css.length < SIZE) css += `[data-theme="t${String(n++).padStart(6, "0")}"]{--luz-text-secondary:#999999}\n`;
    const { ms, result } = timed(css);
    expect(ms).toBeLessThan(BUDGET_MS);
    expect(result.stderr).toBe("");
    expect([0, 1]).toContain(result.code);
    expect(result.data.findings.length).toBeLessThanOrEqual(200);
  });
});
