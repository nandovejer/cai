/**
 * F5 step 11, the CSS warnings of @luz-ds/check: css/literal-colour,
 * css/literal-size, css/knob-in-px, css/important, css/private-token and
 * css/unknown-token (.claude/plans/specs/f5-ai-ready.md 5.6 "Rules that warn"
 * and "What public is" (F-5, D14), 5.9 warn/literals.css and
 * warn/tokens.css, 8 "Parsing cost"; the review answers of ux-designer
 * "Message rule" and of security-auditor Q3 and Q5).
 *
 * What is not here: the theme rules are tests/check-theme.test.js; the rules
 * of names, loading and misuse are steps 9 and 10. The fixtures are read by
 * the runner of tests/helpers/check-fixtures.js, keyed by rule-id prefix.
 *
 * The contract, new in this step:
 *
 *   Where they run. On every .css file of the run (and on --theme files),
 *       whether or not it names a LUZ class: a stylesheet of the project's
 *       own is the point. A file that names nothing of LUZ's (no `luz-`
 *       class, no --luz-* property) reads no manifest: with no manifest
 *       anywhere the literal, size, knob and important rules still say
 *       their warnings and `manifests` is []. Only the two token rules need
 *       the properties of the manifests.
 *   Where they point. At the declaration: the first character of the
 *       property name (6:3 in warn/literals.css), for a read or a set, in
 *       minified CSS too, and inside @media, @layer and @supports. Severity
 *       warn, exit 0; with --strict the run fails.
 *   css/literal-colour. A declaration that is not a custom property and has
 *       a hex colour, rgb(), rgba(), hsl(), hsla(), color-mix(), oklch(),
 *       white or black in its value. One finding for a declaration. `var()`,
 *       transparent, currentColor, inherit, a string and a url() are not
 *       colours. The value is echoed only as #rrggbb (security-auditor Q3);
 *       a colour that has no #rrggbb form is not echoed at all.
 *   css/literal-size. A non-zero px or rem value in font-size, margin,
 *       margin-*, padding, padding-*, gap or border-radius. One finding for
 *       a declaration, the first such value echoed ("padding is 12px; ...").
 *   css/knob-in-px. --luz-type-base or --luz-space-unit written in px.
 *   css/important. `!important` in a declaration (spaces and case as CSS
 *       allows), custom properties included; never one in a comment or a
 *       string.
 *   css/private-token, css/unknown-token. "Public" is what a manifest
 *       declares at root scope (properties[].scope "root", read from the
 *       installed packages first, as for classes); a --luz-* property that a
 *       manifest declares at component scope is private, one that no
 *       manifest declares is unknown. A property is looked at where the file
 *       sets it and where it reads it (var()). The suggestion of an unknown
 *       token is the nearest public one, as for classes (closest of
 *       suggest.js, null when none: the `:none` variant).
 *   Cost. One pass over the file: 1 MB of declarations, of unknown tokens,
 *       of `(` and of `{` read in under a second; findings are capped as
 *       report.js says and the totals are complete.
 */
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtData, checkCase, fixtureCases, key, passCases, removeWorkspaces, where, workspace } from "./helpers/check-fixtures.js";
import { check, ofRule, rulesOf, wordsOf } from "./helpers/check-run.js";

afterAll(removeWorkspaces);

const PREFIXES = ["css/"];

/* ---- Helpers ---------------------------------------------------------------------------------- */

// LUZ's tokens as the small world knows them, with the property a component sets for itself
const ROOT_TOKENS = [
  "--luz-type-base",
  "--luz-type-ratio",
  "--luz-space-unit",
  "--luz-font-body",
  "--luz-text-3",
  "--luz-space-3",
  "--luz-space-4",
  "--luz-radius-md",
  "--luz-outline",
  "--luz-focus-ring",
];
const WORLD = { overrides: { core: { properties: [...ROOT_TOKENS, { name: "--luz-seek", scope: "component" }] } } };

/** One stylesheet through the CLI, against the small world. */
const sheet = (text, options = {}) => check({ "styles.css": text }, { argv: ["styles.css", ...(options.argv ?? [])], snapshot: WORLD, ...options.run });
const rule = (result, id) => ofRule(result, id);
/** "rule line:column" of each finding of a rule. */
const positions = (result, id) => rule(result, id).map((f) => key(f));

/* ---- The fixtures ------------------------------------------------------------------------------ */

describe("the fixtures: every file makes the CSS warnings say what its expect comments say", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  const cases = fixtureCases(PREFIXES);

  it("has the files this step needs, each with an expect comment", () => {
    expect(cases.map((c) => c.path).sort()).toEqual(["warn/literals.css", "warn/tokens.css"]);
  });

  it.each(cases)("$path: exactly its expected findings of css/, at the line and column it names, as warnings", (entry) => {
    expect(snapshot.error, "the build writes dist/data (scripts/build-check.js)").toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.data, `stdout is JSON (stderr: ${result.stderr})`).not.toBeNull();
    expect(result.found.map(key)).toEqual(result.expected.map(key));
    for (const found of result.found) {
      expect(found.severity, key(found)).toBe("warn");
      expect(found.file, key(found)).toBe(entry.path);
      expect(wordsOf(found.rule, found.message), `${key(found)}: ${found.message}`).toBe(true);
    }
    expect(result.code, "a warning never fails").toBe(0);
  });

  it("names the token that is private and the one that is unknown, with the nearest public one when there is one", () => {
    expect(snapshot.error).toBeNull();
    const literals = checkCase(cases.find((c) => c.path === "warn/literals.css"), PREFIXES, { data: snapshot.data });
    expect(literals.found.map((f) => f.rule)).toContain("css/private-token");
    expect(literals.found.find((f) => f.rule === "css/private-token").message).toMatch(/^--luz-seek /);
    const tokens = checkCase(cases.find((c) => c.path === "warn/tokens.css"), PREFIXES, { data: snapshot.data });
    expect(tokens.found.map((f) => f.rule)).toEqual(["css/knob-in-px", "css/unknown-token"]);
    expect(tokens.found.find((f) => f.rule === "css/knob-in-px").message).toMatch(/^--luz-type-base /);
    expect(tokens.found.find((f) => f.rule === "css/unknown-token").message).toMatch(/^--luz-colour-brand /);
  });

  it.each(passCases())("$path: nothing from css/ (a size knob, the body font and a mode's token are not mistakes)", (entry) => {
    expect(snapshot.error).toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.found.map(key)).toEqual([]);
  });
});

/* ---- css/literal-colour ------------------------------------------------------------------------------ */

describe("css/literal-colour", () => {
  const LITERALS = {
    "a 6-digit hex": ["color: #1a5fb4", "color", "#1a5fb4"],
    "a 3-digit hex": ["color: #fff", "color", null],
    "an 8-digit hex": ["background: #1a5fb480", "background", null],
    "rgb()": ["background: rgb(0 0 0 / 50%)", "background", null],
    "rgba()": ["background: rgba(0, 0, 0, 0.5)", "background", null],
    "hsl()": ["border-color: hsl(210 50% 40%)", "border-color", null],
    "oklch()": ["color: oklch(0.5 0.1 250)", "color", null],
    "color-mix()": ["background: color-mix(in srgb, red, blue)", "background", null],
    white: ["color: white", "color", null],
    black: ["fill: black", "fill", null],
    "a hex inside a shorthand": ["border: 1px solid #ccc", "border", null],
    "a hex inside a shadow": ["box-shadow: 0 1px 2px #00000033", "box-shadow", null],
  };

  it.each(Object.entries(LITERALS))("warns about %s, at the declaration, once", (name, [declaration, property, hex]) => {
    const text = `.promo {\n  ${declaration};\n}\n`;
    const result = sheet(text);
    expect(positions(result, "css/literal-colour")).toEqual(["css/literal-colour 2:3"]);
    expect(rulesOf(result, "css/")).toEqual(["css/literal-colour"]);
    const [found] = rule(result, "css/literal-colour");
    expect(found.severity).toBe("warn");
    expect(found.file).toBe("styles.css");
    expect(found.message.startsWith(`${property} is set to `), found.message).toBe(true);
    expect(found.message).toContain("var(--luz-");
    expect(wordsOf("css/literal-colour", found.message), found.message).toBe(true);
    expect(found.message.length).toBeLessThanOrEqual(120);
    if (hex !== null) expect(found.message).toContain(`${property} is set to ${hex};`);
    // what the file wrote is not echoed, unless it is a #rrggbb
    expect(found.message).not.toMatch(/(?:rgba?|hsla?|oklch|color-mix)\(/);
    expect(result.code, "a warning never fails").toBe(0);
  });

  const NOT_LITERALS = [
    "color: var(--luz-text-primary)",
    "color: inherit",
    "color: currentColor",
    "background: transparent",
    "--promo-bg: #1a5fb4",
    "--promo-fg: rgb(0 0 0)",
    "--luz-brand-fill: #0b5cad",
    'content: "#fff"',
    'background: url("logo.svg#fff")',
    "animation: whiteout 1s",
    "border: 1px solid var(--luz-outline)",
  ];

  it.each(NOT_LITERALS)("does not warn about `%s`: a custom property is where a literal belongs, and the rest is no colour", (declaration) => {
    const result = sheet(`.promo {\n  ${declaration};\n}\n`);
    expect(rule(result, "css/literal-colour")).toEqual([]);
  });

  it("points at the property in minified CSS, and inside @media, @layer and @supports", () => {
    const min = ".promo{color:#fff;margin:0;background:#000}\n";
    const first = where(min, "color:#fff");
    const second = where(min, "background:#000");
    expect(positions(sheet(min), "css/literal-colour")).toEqual([`css/literal-colour ${first.line}:${first.column}`, `css/literal-colour ${second.line}:${second.column}`]);
    const nested = "@layer components {\n  @media (min-width: 40em) {\n    @supports (display: grid) {\n      .promo {\n        color: #123456;\n      }\n    }\n  }\n}\n";
    expect(positions(sheet(nested), "css/literal-colour")).toEqual(["css/literal-colour 5:9"]);
  });

  it("is one warning for each declaration, in reading order, and says nothing of a colour in a comment", () => {
    const text = ["/* color: #000; */", ".a {", "  color: #111111;", "  background: #222222;", "}", ".b {", "  border-color: #333333;", "}", ""].join("\n");
    expect(positions(sheet(text), "css/literal-colour")).toEqual(["css/literal-colour 3:3", "css/literal-colour 4:3", "css/literal-colour 7:3"]);
  });
});

/* ---- css/literal-size -------------------------------------------------------------------------------- */

describe("css/literal-size", () => {
  const SIZES = {
    "px in padding": ["padding: 12px", "padding", "12px"],
    "rem in margin-top": ["margin-top: 1rem", "margin-top", "1rem"],
    "px in gap": ["gap: 8px", "gap", "8px"],
    "px in border-radius": ["border-radius: 4px", "border-radius", "4px"],
    "px in font-size": ["font-size: 14px", "font-size", "14px"],
    "rem in font-size": ["font-size: 1rem", "font-size", "1rem"],
    "a logical margin": ["margin-inline: 1.5rem", "margin-inline", "1.5rem"],
    "a logical padding": ["padding-block-start: 8px", "padding-block-start", "8px"],
    "one literal among zeros": ["padding: 0 12px", "padding", "12px"],
    "a decimal": ["margin: 0.5rem", "margin", "0.5rem"],
  };

  it.each(Object.entries(SIZES))("warns about %s, at the declaration, once, naming the literal", (name, [declaration, property, literal]) => {
    const result = sheet(`.promo {\n  ${declaration};\n}\n`);
    expect(positions(result, "css/literal-size")).toEqual(["css/literal-size 2:3"]);
    const [found] = rule(result, "css/literal-size");
    expect(found.severity).toBe("warn");
    expect(found.message.startsWith(`${property} is ${literal};`), found.message).toBe(true);
    expect(wordsOf("css/literal-size", found.message), found.message).toBe(true);
    expect(result.code).toBe(0);
  });

  const NOT_SIZES = [
    "margin: 0",
    "padding: 0px",
    "margin: 0 auto",
    "margin: auto",
    "font-size: var(--luz-text-3)",
    "gap: var(--luz-space-3)",
    "padding: var(--luz-space-3) var(--luz-space-4)",
    "margin: calc(var(--luz-space-4) * 2)",
    "font-size: 1em",
    "font-size: 100%",
    "padding: 0.5em",
    "border-radius: 50%",
    "border-radius: var(--luz-radius-md)",
    "width: 12px",
    "line-height: 20px",
    "border: 1px solid var(--luz-outline)",
    "--promo-gap: 12px",
  ];

  it.each(NOT_SIZES)("does not warn about `%s`", (declaration) => {
    expect(rule(sheet(`.promo {\n  ${declaration};\n}\n`), "css/literal-size")).toEqual([]);
  });

  it("is not css/knob-in-px's: a custom property in px is never a literal size", () => {
    const result = sheet(":root {\n  --luz-type-base: 16px;\n  --promo-gap: 12px;\n}\n");
    expect(rule(result, "css/literal-size")).toEqual([]);
  });
});

/* ---- css/knob-in-px ----------------------------------------------------------------------------------- */

describe("css/knob-in-px", () => {
  it.each(["--luz-type-base: 16px", "--luz-space-unit: 4px", "--luz-type-base: 1.0px"])("warns about `%s`, at the declaration, naming the knob", (declaration) => {
    const result = sheet(`:root {\n  ${declaration};\n}\n`);
    expect(positions(result, "css/knob-in-px")).toEqual(["css/knob-in-px 2:3"]);
    const [found] = rule(result, "css/knob-in-px");
    expect(found.severity).toBe("warn");
    expect(found.message.startsWith(`${declaration.split(":")[0]} is in px`), found.message).toBe(true);
    expect(wordsOf("css/knob-in-px", found.message), found.message).toBe(true);
    expect(rulesOf(result, "css/")).toEqual(["css/knob-in-px"]);
    expect(result.code).toBe(0);
  });

  it("warns inside @media print, as the page's size is the reader's wherever the knob is set", () => {
    expect(positions(sheet("@media print {\n  :root {\n    --luz-type-base: 15px;\n  }\n}\n"), "css/knob-in-px")).toEqual(["css/knob-in-px 3:5"]);
  });

  it.each(["--luz-type-base: 1rem", "--luz-type-base: 100%", "--luz-type-ratio: 1.25", "--luz-space-unit: 0.25rem", "--luz-font-body: system-ui"])("does not warn about `%s`", (declaration) => {
    expect(rule(sheet(`:root {\n  ${declaration};\n}\n`), "css/knob-in-px")).toEqual([]);
  });
});

/* ---- css/important ------------------------------------------------------------------------------------ */

describe("css/important", () => {
  const FORMS = {
    "after a space": ["color: var(--luz-text-primary) !important", "color"],
    "with no space": ["margin:0!important", "margin"],
    "with a space after the bang": ["padding: 0 ! important", "padding"],
    "in capitals": ["display: block !IMPORTANT", "display"],
    "on a custom property": ["--luz-brand-fill: #123456 !important", "--luz-brand-fill"],
  };

  it.each(Object.entries(FORMS))("warns about !important %s, at the declaration, once", (name, [declaration, property]) => {
    const result = sheet(`.promo {\n  ${declaration};\n}\n`);
    expect(positions(result, "css/important")).toEqual(["css/important 2:3"]);
    const [found] = rule(result, "css/important");
    expect(found.severity).toBe("warn");
    expect(found.message.startsWith(`${property} is set with !important;`), found.message).toBe(true);
    expect(wordsOf("css/important", found.message), found.message).toBe(true);
    expect(result.code).toBe(0);
  });

  it("says nothing about the word in a comment or a string", () => {
    const text = '/* a !important here is a note */\n.promo {\n  content: "!important";\n  color: var(--luz-text-primary);\n}\n';
    expect(rule(sheet(text), "css/important")).toEqual([]);
  });

  it("is a rule of its own next to a literal colour on the same declaration", () => {
    const result = sheet(".promo {\n  color: #123456 !important;\n}\n");
    expect(rulesOf(result, "css/").sort()).toEqual(["css/important", "css/literal-colour"]);
  });
});

/* ---- css/private-token and css/unknown-token ------------------------------------------------------------ */

describe("css/private-token", () => {
  it("warns about a property a component sets for itself, read or set, at the declaration", () => {
    const read = sheet(".promo {\n  width: var(--luz-seek);\n}\n");
    expect(positions(read, "css/private-token")).toEqual(["css/private-token 2:3"]);
    expect(read.findings.find((f) => f.rule === "css/private-token").message).toMatch(/^--luz-seek belongs to one component;/);
    const set = sheet(".promo {\n  --luz-seek: 40%;\n}\n");
    expect(positions(set, "css/private-token")).toEqual(["css/private-token 2:3"]);
    for (const result of [read, set]) {
      expect(rulesOf(result, "css/")).toEqual(["css/private-token"]);
      expect(rule(result, "css/private-token")[0].severity).toBe("warn");
      expect(wordsOf("css/private-token", rule(result, "css/private-token")[0].message)).toBe(true);
      expect(result.code).toBe(0);
    }
  });

  it("does not warn about a token declared at root scope: the knobs, the body font and the colours", () => {
    const text = ":root {\n  --luz-type-base: 1.125rem;\n  --luz-font-body: system-ui, sans-serif;\n  --luz-brand-fill: #0b5cad;\n}\n.promo {\n  color: var(--luz-text-primary);\n  gap: var(--luz-space-3);\n}\n";
    const result = sheet(text);
    expect(rule(result, "css/private-token")).toEqual([]);
    expect(rule(result, "css/unknown-token")).toEqual([]);
  });

  it("reads the scope from the installed packages first: what the project's core says wins over the snapshot", () => {
    const installed = { overrides: { core: { properties: [...ROOT_TOKENS, { name: "--luz-seek", scope: "root" }] } } };
    const files = { "styles.css": ".promo {\n  width: var(--luz-seek);\n}\n" };
    expect(rule(check(files, { argv: ["styles.css"], snapshot: WORLD }), "css/private-token")).toHaveLength(1);
    const result = check(files, { argv: ["styles.css"], snapshot: WORLD, installed });
    expect(result.data.manifests.map((m) => m.source)).toContain("node_modules");
    expect(rule(result, "css/private-token")).toEqual([]);
    expect(rule(result, "css/unknown-token")).toEqual([]);
  });
});

describe("css/unknown-token", () => {
  it("warns about a token no manifest declares, read, with the nearest public one", () => {
    const result = sheet(".promo {\n  background: var(--luz-brand-fil);\n}\n");
    expect(positions(result, "css/unknown-token")).toEqual(["css/unknown-token 2:3"]);
    const [found] = rule(result, "css/unknown-token");
    expect(found.severity).toBe("warn");
    expect(found.suggestion).toBe("--luz-brand-fill");
    expect(found.message).toBe("--luz-brand-fil is not a LUZ token; the closest is --luz-brand-fill");
    expect(wordsOf("css/unknown-token", found.message)).toBe(true);
  });

  it("warns about a token no manifest declares, set: a typo in a theme does nothing, and says nothing without a warning", () => {
    const result = sheet(":root {\n  --luz-brand-fil: #123456;\n}\n");
    expect(positions(result, "css/unknown-token")).toEqual(["css/unknown-token 2:3"]);
    expect(rule(result, "css/unknown-token")[0].suggestion).toBe("--luz-brand-fill");
  });

  it("says where to look when nothing is near, with no suggestion", () => {
    const result = sheet(".promo {\n  color: var(--luz-zzzzzzzzzzzzzzzz);\n}\n");
    const [found] = rule(result, "css/unknown-token");
    expect(found, "a css/unknown-token finding").toBeDefined();
    expect(found.suggestion).toBeNull();
    expect(wordsOf("css/unknown-token", found.message), found.message).toBe(true);
    expect(found.message.startsWith("--luz-zzzzzzzzzzzzzzzz is not a LUZ token;")).toBe(true);
  });

  it("is about --luz-* only: the project's own properties are its own", () => {
    const result = sheet(":root {\n  --promo-brand: #123456;\n}\n.promo {\n  color: var(--promo-brand);\n  background: var(--my-own-token, white);\n}\n");
    expect(rule(result, "css/unknown-token")).toEqual([]);
    expect(rule(result, "css/private-token")).toEqual([]);
  });

  it("never echoes a name that is not safe to print, and does not measure a name over 64 characters", () => {
    const long = `--luz-${"a".repeat(100)}`;
    const result = sheet(`.promo {\n  color: var(${long});\n}\n`);
    const [found] = rule(result, "css/unknown-token");
    expect(found, "a css/unknown-token finding").toBeDefined();
    expect(found.message).toContain("<an unreadable name>");
    expect(found.suggestion).toBeNull();
    expect(found.message.length).toBeLessThanOrEqual(120);
  });
});

/* ---- The run ------------------------------------------------------------------------------------------- */

describe("the CSS warnings in a run", () => {
  const WARNING = ".promo {\n  color: #123456;\n  padding: 12px;\n}\n";

  it("never fail the run, and fail it with --strict, which says that a warning did", () => {
    const plain = sheet(WARNING);
    expect(plain.code).toBe(0);
    expect(plain.data.summary).toMatchObject({ blocking: 0, warnings: 2 });
    expect(plain.data.ok).toBe(true);
    const strict = sheet(WARNING, { argv: ["--strict"] });
    expect(strict.code).toBe(1);
    expect(strict.data.ok).toBe(false);
  });

  it("can be switched off one rule at a time by luz-check.json: the others stay", () => {
    const result = check({ "styles.css": WARNING, "luz-check.json": JSON.stringify({ rules: { "css/literal-size": "off" } }) }, { argv: ["styles.css"], snapshot: WORLD });
    expect(rulesOf(result, "css/")).toEqual(["css/literal-colour"]);
    expect(result.data.config.off).toEqual(["css/literal-size"]);
  });

  it("applies to a stylesheet that names nothing of LUZ's with no manifest anywhere, and reads none", () => {
    const empty = workspace();
    const result = check({ "styles.css": `${WARNING}.again {\n  margin: 8px !important;\n}\n` }, { argv: ["styles.css"], snapshot: empty });
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(rulesOf(result, "css/").sort()).toEqual(["css/important", "css/literal-colour", "css/literal-size", "css/literal-size"]);
    expect(result.data.manifests).toEqual([]);
  });

  it("reads a --theme file like any stylesheet", () => {
    const result = check({ "index.html": "<p>x</p>\n", "theme.css": WARNING }, { argv: ["index.html", "--theme", "theme.css"], snapshot: WORLD });
    expect(rulesOf(result, "css/")).toEqual(["css/literal-colour", "css/literal-size"]);
    expect(rule(result, "css/literal-colour")[0].file).toBe("theme.css");
  });
});

/* ---- Cost ----------------------------------------------------------------------------------------------- */

describe("the CSS warnings cost one pass: a file of 1 MB reads in under a second", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  const timed = (text) => {
    const start = performance.now();
    const result = check({ "big.css": text }, { argv: ["big.css"], snapshot: snapshot.data });
    return { ms: performance.now() - start, ...result };
  };
  const BUDGET_MS = 1000;
  const SIZE = 1_000_000;

  it("1 MB of declarations that warn: the totals are complete, the findings are capped", () => {
    expect(snapshot.error).toBeNull();
    const rule1 = ".a{color:#123456;padding:12px}\n";
    const count = Math.ceil(SIZE / rule1.length);
    const result = timed(rule1.repeat(count));
    expect(result.ms).toBeLessThan(BUDGET_MS);
    expect(result.code).toBe(0);
    expect(result.data.summary.warnings).toBe(count * 2);
    expect(result.data.summary.truncated).toBe(true);
    expect(result.data.findings.length).toBeLessThanOrEqual(200);
  });

  it("1 MB of distinct unknown tokens: the nearest name is looked for a bounded number of times", () => {
    expect(snapshot.error).toBeNull();
    let text = "";
    let count = 0;
    while (text.length < SIZE) text += `.a{color:var(--luz-brand-fil${count++})}\n`;
    const result = timed(text);
    expect(result.ms).toBeLessThan(BUDGET_MS);
    expect(result.code).toBe(0);
    expect(result.data.summary.warnings).toBe(count);
    expect(result.data.findings.length).toBeLessThanOrEqual(200);
  });

  it.each([
    ["(", ".a{color:" + "(".repeat(SIZE) + "}"],
    ["{", "{".repeat(SIZE)],
    ["var(", ".a{b:" + "var(".repeat(SIZE / 4) + "}"],
    ["!important", ".a{b:c" + " !important".repeat(SIZE / 11) + "}"],
  ])("1 MB of %s", (name, text) => {
    expect(snapshot.error).toBeNull();
    const result = timed(text);
    expect(result.ms).toBeLessThan(BUDGET_MS);
    expect(result.stderr).toBe("");
    expect([0, 1]).toContain(result.code);
  });
});
