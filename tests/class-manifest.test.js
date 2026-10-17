/**
 * F5 step 2, `classes.json` (.claude/plans/specs/f5-ai-ready.md §2.1, §2.2,
 * §8 "Parsing cost", §10 row 2; decision D4). One manifest per package, read
 * from the built, unminified CSS of its dist/, so what it says is what a
 * browser gets. Never hand-written.
 *
 * The contract these tests pin (the spec leaves the names open, so these are
 * the ones chosen; the implementer follows them):
 *
 *   packages/check/src/css.js
 *     readCss(text, file = "<css>", { strict = false } = {})
 *       -> { classes:    [{ name, defined, layer, line, column }],
 *            properties: [{ name, scope, layer, line, column }],
 *            findings:   [{ rule: "parse/error", line, column, message }] }
 *     CssError (strict only): message `${file}:${line}:${column}: ${text}`,
 *       and `.file`, `.line`, `.column`.
 *   scripts/ai-manifests.js
 *     buildClassManifest(name, { root = repoRoot } = {}) -> the manifest object
 *     writeManifests(name, { root = repoRoot } = {})     -> writes
 *       <root>/packages/<name>/dist/classes.json, returns the manifest
 *
 * What "defined" means (the choice the spec's own examples force: its table
 * says `.luz-card .is-active` leaves `is-active` `defined: false`, and its
 * layering test says `.o-*` is only defined in core): a class is DEFINED by a
 * selector when it is in the one and only compound of a complex selector, as
 * in `.a`, `.a.b`, `.a:hover`, `.a::before`, `:is(.a, .b)`. A class that sits
 * after another compound (`.a .b`, `.a > .b`, `:root .b`), inside `:not()` or
 * `:has()`, or before the subject, is known, not defined: the checker does
 * not flag it, and it is not a class to write on its own.
 *
 * What a script names (RL-19: what a human is told to copy is what the tool
 * accepts; `.luz-player-playpause` is real markup the player reads, and no
 * stylesheet has a rule for it). The unminified `.js` files of dist/ are read
 * too, by a plain scan (no parser, nothing is executed). A class is NAMED by a
 * script when it is, in code (never a comment):
 *
 *   - a class selector `.name` inside any string or template literal that has
 *     no interpolation next to the name (`querySelector(".luz-x .luz-y")`,
 *     `closest("pre.luz-code-block")`, `":scope > .luz-x"`);
 *   - a literal argument of `classList.add|remove|toggle|contains|replace`;
 *   - the words of a literal assigned to `className` (`=` or `+=`), of
 *     `setAttribute("class", "…")` and of `getElementsByClassName("…")`.
 *
 * Only `luz-*`, `o-*`, `u-*` and `is-*` count. A bare name in a selector API
 * (`querySelector("luz-search")`) is a tag, not a class; a `customElements`
 * name, a storage key and a `data-luz-*` are not classes either. A name
 * computed at run time is skipped: anything touching `${…}`, and a literal
 * ending in `-` or `_` (`"luz-btn--" + kind`, `"luz-"`).
 *
 * Such a class is listed with `defined: false`, `files` naming the script
 * (relative to dist/, as for a stylesheet: the files that name it, or the
 * package's bundle, `exports["."]`, only when no other script does), `kind`,
 * `block`, `modifier` and `part` as for any class, and `layer` the package's
 * own component layer (core `luz.components`, site `luz.site`, …). A class a
 * stylesheet already lists is unchanged: its entry, files and `defined` stay
 * what the CSS says, never a script. `*.min.js` is not read.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { CssError, readCss } from "../packages/check/src/css.js";
import { decodeEntities, tags } from "../packages/check/src/html.js";
import { buildClassManifest, writeManifests } from "../scripts/ai-manifests.js";
import { LAYERS } from "../scripts/luz-layers.js";
import { PACKAGES } from "../scripts/luz-packages.js";
import { indexData, scanSite } from "../scripts/docs-site/site.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const ONE_SECOND = 1000;
const MIB = 1024 * 1024;
const NAMESPACE = /^(?:luz|o|u|is)-/;

const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const readJson = (path) => JSON.parse(read(path));

/** Every file under `dir` (absolute), sorted. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const timed = (fn) => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};

/** { name: defined } of a stylesheet, for the table of cases. */
const definedOf = (css) => Object.fromEntries(readCss(css, "t.css", { strict: true }).classes.map((c) => [c.name, c.defined]));

describe("the CSS reader: which classes a stylesheet names, and which it defines", () => {
  // [what the case shows, css, { class: defined }]
  const CASES = [
    ["a lone class", ".a {}", { a: true }],
    ["a class after another is context, not defined", ".a .b {}", { a: false, b: false }],
    ["every compound of a chain of combinators is context", ".a > .b ~ .c + .d {}", { a: false, b: false, c: false, d: false }],
    ["two classes on one element are both defined", ".a.b {}", { a: true, b: true }],
    ["a selector list defines each of its selectors", ".a, .b {}", { a: true, b: true }],
    ["pseudo-classes and pseudo-elements do not change it", ".a:hover::before, .b:focus-visible {}", { a: true, b: true }],
    ["a class inside :not() is known, not defined", ".a:not(.b, .c) {}", { a: true, b: false, c: false }],
    ["a class inside :has() is known, not defined", ".a:has(> .b) {}", { a: true, b: false }],
    [":is() that is the whole selector defines its classes", ":is(.a, .b) {}", { a: true, b: true }],
    [":where() that is the whole selector defines its class", ":where(.a) {}", { a: true }],
    [":where() with a combinator inside is context", ":where(.a > .b) {}", { a: false, b: false }],
    ["a type or attribute selector before it makes it context", ':root[data-x] .a, [class*="luz-"] .b {}', { a: false, b: false }],
    ["native nesting without & is a descendant", ".a { color: red; .b { color: blue } }", { a: true, b: false }],
    ["native nesting with & on the same element defines both", ".a { color: red; &.b { color: blue } }", { a: true, b: true }],
    ["native nesting with & after a class makes the other context", ".c { color: red; .a & { color: blue } }", { a: false, c: true }],
    ["native nesting with &:hover", ".a { color: red; &:hover { color: blue } }", { a: true }],
    ["a class in an attribute value is not a class", '[class~=".x"] {}', {}],
    ["a dot in a string is not a class", '.a::after { content: ".b .c"; }', { a: true }],
    ["a dot in a url() is not a class", ".a { background: url(x.y.png); }", { a: true }],
    ["a brace in a string does not end the block", '.a::after { content: "}{"; } .b {}', { a: true, b: true }],
    ["a comment names nothing", "/* .a { } */ .b {}", { b: true }],
    ["an escaped character is part of the name, unescaped", ".a\\:b {}", { "a:b": true }],
    ["@media", "@media (min-width: 40em) { .a {} }", { a: true }],
    ["@supports in @media", "@supports (display: grid) { @media print { .a .b {} } }", { a: false, b: false }],
    ["@container", "@container card (min-width: 20em) { .a {} }", { a: true }],
    ["@starting-style", "@starting-style { .a { opacity: 0 } }", { a: true }],
    ["@scope", "@scope (main) to (aside) { .a {} }", { a: true }],
    ["@keyframes steps are not selectors", "@keyframes spin { from { opacity: 0 } 50% { opacity: .5 } to { opacity: 1 } }", {}],
    ["@font-face holds declarations", "@font-face { font-family: X; src: url(a.woff2) format('woff2'); }", {}],
    ["statement at-rules", '@charset "utf-8"; @import url("./a.css"); @layer a, b; .a {}', { a: true }],
  ];

  it.each(CASES)("%s", (_what, css, expected) => {
    expect(definedOf(css)).toEqual(expected);
  });

  it("lists each class once, in the order it is first seen, with the line and column of its dot", () => {
    const { classes } = readCss("\n  .b {}\n.a .b {}\n  .c.a {}", "t.css", { strict: true });
    expect(classes.map((c) => [c.name, c.line, c.column])).toEqual([
      ["b", 2, 3],
      ["a", 3, 1],
      ["c", 4, 3],
    ]);
  });

  it("says a class is defined when any rule defines it, wherever it also appears as context", () => {
    expect(definedOf(".x .a {} .a {} .y .a {}")).toEqual({ x: false, a: true, y: false });
  });

  describe("the layer", () => {
    const layerOf = (css, name) => readCss(css, "t.css", { strict: true }).classes.find((c) => c.name === name)?.layer;

    it("is the layer that holds the rule", () => {
      expect(layerOf("@layer luz.components { .a {} }", "a")).toBe("luz.components");
    });

    it("joins nested layers with a dot, as CSS names them", () => {
      expect(layerOf("@layer luz { @layer components { .a {} } }", "a")).toBe("luz.components");
    });

    it("looks through @media", () => {
      expect(layerOf("@layer luz.print { @media print { .a {} } }", "a")).toBe("luz.print");
    });

    it("is null outside a layer, and the order statement holds no class", () => {
      expect(layerOf("@layer luz.tokens, luz.components; .a {}", "a")).toBeNull();
    });

    it("is the layer of the first rule that DEFINES the class, not of an earlier mention as context", () => {
      const css = "@layer luz.components { .x .a {} } @layer luz.utilities { .a {} }";
      expect(layerOf(css, "a")).toBe("luz.utilities");
    });

    it("is the layer of the first mention for a class that is never defined", () => {
      const css = "@layer luz.objects { .x .a {} } @layer luz.utilities { .y .a {} }";
      expect(layerOf(css, "a")).toBe("luz.objects");
    });
  });

  describe("custom properties", () => {
    const propsOf = (css) => readCss(css, "t.css", { strict: true }).properties.map((p) => [p.name, p.scope, p.layer]);

    it("are root scope when declared on :root, html or a [data-theme] block, in any list", () => {
      const css = ':root { --luz-a: 1 } html { --luz-b: 1 } [data-theme="dark"] { --luz-c: 1 } :root, [data-theme="light"] { --luz-d: 1 }';
      expect(propsOf(css)).toEqual([
        ["--luz-a", "root", null],
        ["--luz-b", "root", null],
        ["--luz-c", "root", null],
        ["--luz-d", "root", null],
      ]);
    });

    it("are component scope when declared on any other selector", () => {
      expect(propsOf(".luz-player { --luz-seek: 0%; }")).toEqual([["--luz-seek", "component", null]]);
    });

    it("carry their layer, through @media", () => {
      const css = "@layer luz.settings { @media (prefers-contrast: more) { :root { --luz-g: 1 } } }";
      expect(propsOf(css)).toEqual([["--luz-g", "root", "luz.settings"]]);
    });

    it("are declarations, not uses: var() names nothing", () => {
      expect(propsOf(".a { color: var(--luz-z); }")).toEqual([]);
    });

    it("are listed once, and root scope wins when a name is declared in both", () => {
      expect(propsOf(".x { --luz-a: 2 } :root { --luz-a: 1 }")).toEqual([["--luz-a", "root", null]]);
      expect(propsOf(":root { --luz-a: 1 } .x { --luz-a: 2 }")).toEqual([["--luz-a", "root", null]]);
    });
  });
});

describe("the CSS reader: strict mode throws with file:line:column, lenient mode reports", () => {
  // [what, css, line, column]: the position each condition is reported at
  const BROKEN = [
    ["an unclosed block, at its opening brace", ".a {\n  color: red;\n", 1, 4],
    ["an unmatched closing brace, at it", ".a {}\n  }\n", 2, 3],
    ["an unterminated comment, at its start", ".a {}\n/* never closed", 2, 1],
    ["an unterminated string, at its opening quote", '.a {\n  content: "never closed;\n}', 2, 12],
    ["an unclosed parenthesis, at it", ".a:not(.b {}\n", 1, 7],
    ["an unmatched closing parenthesis, at it", ".a ) {}\n", 1, 4],
    ["an at-rule it does not know, at its @", ".a {}\n@bogus { .b {} }\n", 2, 1],
  ];

  it.each(BROKEN)("strict: %s", (_what, css, line, column) => {
    expect.assertions(6);
    try {
      readCss(css, "page.css", { strict: true });
    } catch (error) {
      expect(error).toBeInstanceOf(CssError);
      expect(error.file).toBe("page.css");
      expect(error.line).toBe(line);
      expect(error.column).toBe(column);
      expect(error.message).toMatch(new RegExp(`^page\\.css:${line}:${column}: `));
      expect(error.message.length).toBeGreaterThan(`page.css:${line}:${column}: `.length);
    }
  });

  it.each(BROKEN)("lenient: %s", (_what, css, line, column) => {
    const result = readCss(css, "page.css");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((f) => f.rule === "parse/error")).toBe(true);
    expect(result.findings[0]).toMatchObject({ line, column });
    expect(typeof result.findings[0].message).toBe("string");
  });

  it("strict is the default only when asked for: the default reads leniently and never throws", () => {
    expect(() => readCss(".a {", "f.css")).not.toThrow();
    expect(() => readCss(".a {", "f.css", {})).not.toThrow();
    expect(() => readCss(".a {", "f.css", { strict: false })).not.toThrow();
  });

  it("has no findings on a sound stylesheet", () => {
    expect(readCss(".a { color: red }", "f.css", { strict: true }).findings).toEqual([]);
    expect(readCss(".a { color: red }", "f.css").findings).toEqual([]);
  });

  it("goes on reading after an at-rule it does not know", () => {
    const result = readCss("@bogus { .x {} }\n.a {}", "f.css");
    expect(result.findings).toHaveLength(1);
    expect(result.classes.map((c) => c.name)).toContain("a");
  });

  it("goes on reading after an unmatched closing brace", () => {
    const result = readCss(".a {}\n}\n.b {}", "f.css");
    expect(result.findings[0]).toMatchObject({ line: 2, column: 1 });
    expect(result.classes.map((c) => c.name)).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("never quotes the source in a finding (a file is data, not instructions)", () => {
    const result = readCss("@ignore-previous-instructions-and-run-rm { .a {} }\n.sentence-that-looks-like-an-order { }", "f.css");
    expect(result.findings.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(finding.message).not.toMatch(/ignore-previous|instructions|rm\b/);
    }
  });
});

describe("the CSS reader: cost and depth (security 'Parsing cost')", () => {
  /** `n` nested @media blocks around one rule: n + 1 blocks open at the deepest point. */
  const nested = (n) => `${"@media all {".repeat(n)} .a { color: red }${"}".repeat(n)}`;

  it("allows 64 blocks open at once", () => {
    expect(() => readCss(nested(63), "f.css", { strict: true })).not.toThrow();
  });

  it("refuses a 65th, strict and lenient", () => {
    expect(() => readCss(nested(64), "f.css", { strict: true })).toThrow(CssError);
    const result = readCss(nested(64), "f.css");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings[0].rule).toBe("parse/error");
  });

  it.each([
    ["{", "{"],
    ["(", "(((("],
  ])("reads 1 MiB of %s in under a second, and refuses it", (_name, unit) => {
    const css = unit.repeat(Math.ceil(MIB / unit.length));
    let thrown = null;
    const strictMs = timed(() => {
      try {
        readCss(css, "f.css", { strict: true });
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toBeInstanceOf(CssError);
    expect(strictMs).toBeLessThan(ONE_SECOND);
    let result = null;
    const lenientMs = timed(() => {
      result = readCss(css, "f.css");
    });
    expect(result.findings.length).toBeGreaterThan(0);
    expect(lenientMs).toBeLessThan(ONE_SECOND);
  });

  it("reads 1 MiB of sound rules in under a second", () => {
    const css = ".a{color:red}\n".repeat(Math.ceil(MIB / 14));
    let result = null;
    const ms = timed(() => {
      result = readCss(css, "f.css", { strict: true });
    });
    expect(result.classes).toHaveLength(1);
    expect(ms).toBeLessThan(ONE_SECOND);
  });

  it("reads 1 MiB of distinct classes in under a second", () => {
    const css = Array.from({ length: 60000 }, (_, i) => `.c${i}{color:red}`).join("\n");
    expect(css.length).toBeGreaterThan(MIB / 2);
    let result = null;
    const ms = timed(() => {
      result = readCss(css, "f.css", { strict: true });
    });
    expect(result.classes).toHaveLength(60000);
    expect(ms).toBeLessThan(ONE_SECOND);
  });
});

describe("the generator, from a built dist/ (a fixture root)", () => {
  const roots = [];
  afterEach(() => {
    for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  /** A repo root with packages/<name>/package.json and the given dist files. */
  function fixtureRoot(name, packageJson, files) {
    const dir = mkdtempSync(join(tmpdir(), "luz-manifest-"));
    roots.push(dir);
    const put = (path, text) => {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    };
    put(`packages/${name}/package.json`, JSON.stringify(packageJson));
    for (const [path, text] of Object.entries(files)) put(`packages/${name}/dist/${path}`, text);
    return dir;
  }

  const ORDER = `@layer ${LAYERS.map((l) => `luz.${l}`).join(", ")};\n`;
  const BUTTON = ".luz-btn { color: red; --luz-seek: 0%; }\n.luz-btn--primary { color: blue; }\n.luz-shared { margin: 0; }\n";
  const CARD =
    ".luz-card .is-active { color: red; }\n.luz-card__title { margin: 0; }\n.luz-card .luz-btn { margin: 0; }\n.luz-shared { padding: 0; }\n.tok-keyword { color: red; }\n";
  const CORE = {
    "luz.css": `${ORDER}@layer luz.settings {\n  :root { --luz-brand: red; }\n}\n@layer luz.objects {\n  .o-stack { display: grid; }\n}\n@layer luz.components {\n${BUTTON}${CARD}}\n@layer luz.utilities {\n  .u-sr-only { position: absolute; }\n}\n`,
    "components/button.css": `${ORDER}@layer luz.components {\n${BUTTON}}\n`,
    "components/card.css": `${ORDER}@layer luz.components {\n${CARD}}\n`,
    // minified copies and other files are not read
    "luz.min.css": ".luz-only-in-min{color:red}",
    "components/button.min.css": ".luz-only-in-min{color:red}",
    "luz.min.js": 'document.querySelector(".luz-only-in-min-js")',
    "luz.js": "export {};\n",
    "classes.json": '{"stale": true}',
  };
  const CORE_PACKAGE = { name: "@luz-ds/core", version: "1.2.3", exports: { "./css": "./dist/luz.css", "./components/*": "./dist/components/*" } };

  it("gives the entry shape of the spec, ordered by name, from the unminified CSS only", () => {
    const dir = fixtureRoot("core", CORE_PACKAGE, CORE);
    const manifest = buildClassManifest("core", { root: dir });
    expect(Object.keys(manifest)).toEqual(["schema", "package", "version", "classes", "properties"]);
    expect(manifest).toStrictEqual({
      schema: 1,
      package: "@luz-ds/core",
      version: "1.2.3",
      classes: [
        { name: "is-active", kind: "state", layer: "luz.components", files: ["components/card.css"], defined: false },
        { name: "luz-btn", kind: "component", layer: "luz.components", files: ["components/button.css"], defined: true, block: "luz-btn" },
        { name: "luz-btn--primary", kind: "component", layer: "luz.components", files: ["components/button.css"], defined: true, block: "luz-btn", modifier: "primary" },
        { name: "luz-card", kind: "component", layer: "luz.components", files: ["components/card.css"], defined: false, block: "luz-card" },
        { name: "luz-card__title", kind: "component", layer: "luz.components", files: ["components/card.css"], defined: true, block: "luz-card", part: "title" },
        { name: "luz-shared", kind: "component", layer: "luz.components", files: ["components/button.css", "components/card.css"], defined: true, block: "luz-shared" },
        { name: "o-stack", kind: "object", layer: "luz.objects", files: ["luz.css"], defined: true, block: "o-stack" },
        { name: "u-sr-only", kind: "utility", layer: "luz.utilities", files: ["luz.css"], defined: true },
      ],
      properties: [
        { name: "--luz-brand", scope: "root", layer: "luz.settings" },
        { name: "--luz-seek", scope: "component", layer: "luz.components", files: ["components/button.css"] },
      ],
    });
  });

  it("writes keys in a fixed order: name, kind, layer, files, defined, block, modifier, part", () => {
    const dir = fixtureRoot("core", CORE_PACKAGE, CORE);
    const classes = buildClassManifest("core", { root: dir }).classes;
    expect(Object.keys(classes.find((c) => c.name === "luz-btn--primary"))).toEqual(["name", "kind", "layer", "files", "defined", "block", "modifier"]);
    expect(Object.keys(classes.find((c) => c.name === "luz-card__title"))).toEqual(["name", "kind", "layer", "files", "defined", "block", "part"]);
  });

  it("leaves out a class outside the LUZ namespace (luz-, o-, u-, is-)", () => {
    const dir = fixtureRoot("core", CORE_PACKAGE, CORE);
    const names = buildClassManifest("core", { root: dir }).classes.map((c) => c.name);
    expect(names).not.toContain("tok-keyword");
    expect(names.every((n) => NAMESPACE.test(n))).toBe(true);
  });

  it("calls a class of a package for one kind of site a pattern, and keeps core's class it sits beside known", () => {
    const hero = ".luz-landing-hero { display: grid; }\n.luz-landing-hero__title { margin: 0; }\n";
    const dir = fixtureRoot("landing", { name: "@luz-ds/landing", version: "0.4.0", exports: { "./css": "./dist/landing.css" } }, {
      "landing.css": `${ORDER}@layer luz.landing {\n${hero}.luz-landing-header .o-row { gap: 0; }\n}\n`,
      "components/hero.css": `${ORDER}@layer luz.landing {\n${hero}}\n`,
    });
    const { classes, properties, version } = buildClassManifest("landing", { root: dir });
    expect(version).toBe("0.4.0");
    expect(properties).toEqual([]);
    expect(classes).toStrictEqual([
      { name: "luz-landing-header", kind: "pattern", layer: "luz.landing", files: ["landing.css"], defined: false, block: "luz-landing-header" },
      { name: "luz-landing-hero", kind: "pattern", layer: "luz.landing", files: ["components/hero.css"], defined: true, block: "luz-landing-hero" },
      { name: "luz-landing-hero__title", kind: "pattern", layer: "luz.landing", files: ["components/hero.css"], defined: true, block: "luz-landing-hero", part: "title" },
      { name: "o-row", kind: "object", layer: "luz.landing", files: ["landing.css"], defined: false, block: "o-row" },
    ]);
  });

  it("fails, with the path of the file, the line and the column, on CSS it cannot read", () => {
    const dir = fixtureRoot("core", CORE_PACKAGE, { "luz.css": `${ORDER}.a {}\n@bogus { }\n` });
    expect(() => buildClassManifest("core", { root: dir })).toThrow(/packages\/core\/dist\/luz\.css:3:1: /);
  });

  it("writes dist/classes.json: two-space JSON, one class per line, a final newline, byte-for-byte the same twice", () => {
    const dir = fixtureRoot("core", CORE_PACKAGE, CORE);
    const target = join(dir, "packages/core/dist/classes.json");
    const manifest = writeManifests("core", { root: dir });
    const text = readFileSync(target, "utf-8");
    expect(JSON.parse(text)).toStrictEqual(manifest);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.startsWith('{\n  "schema": 1,\n  "package": "@luz-ds/core",\n  "version": "1.2.3",\n  "classes": [\n')).toBe(true);
    const lines = text.split("\n");
    const first = lines.indexOf('  "classes": [') + 1;
    const classLines = lines.slice(first, lines.indexOf("  ],", first));
    expect(classLines).toHaveLength(manifest.classes.length);
    for (const line of classLines) expect(line).toMatch(/^ {4}\{ "name": ".*\},?$/);
    expect(lines).toContain('  "properties": [');
    writeManifests("core", { root: dir });
    expect(readFileSync(target, "utf-8")).toBe(text);
  });

  it("is deterministic: no time, no path, no order of the file system in it", () => {
    const one = fixtureRoot("core", CORE_PACKAGE, CORE);
    // the same files, written in the reverse order, in another directory
    const reversed = Object.fromEntries(Object.entries(CORE).reverse());
    const two = fixtureRoot("core", CORE_PACKAGE, reversed);
    const text = JSON.stringify(buildClassManifest("core", { root: one }));
    expect(JSON.stringify(buildClassManifest("core", { root: two }))).toBe(text);
    expect(text).not.toContain(one);
    expect(text).not.toContain(two);
  });
});

describe("the generator: classes the unminified scripts name (RL-19)", () => {
  const roots = [];
  afterEach(() => {
    for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function fixtureRoot(name, packageJson, files) {
    const dir = mkdtempSync(join(tmpdir(), "luz-manifest-js-"));
    roots.push(dir);
    mkdirSync(join(dir, "packages", name), { recursive: true });
    writeFileSync(join(dir, "packages", name, "package.json"), JSON.stringify(packageJson));
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, "packages", name, "dist", path)), { recursive: true });
      writeFileSync(join(dir, "packages", name, "dist", path), text);
    }
    return dir;
  }

  const ORDER = `@layer ${LAYERS.map((l) => `luz.${l}`).join(", ")};\n`;
  const CORE_PACKAGE = {
    name: "@luz-ds/core",
    version: "1.2.3",
    exports: { ".": "./dist/luz.js", "./css": "./dist/luz.css", "./player": "./dist/player.js" },
  };
  const CSS = `${ORDER}@layer luz.components {\n.luz-btn { color: red; }\n.luz-card .is-active { color: red; }\n}\n`;
  const PLAYER = [
    "/** The player. Reads .luz-in-jsdoc and nothing else. */",
    "// .luz-in-line-comment",
    "/* .luz-in-block-comment */",
    'const playPause = root.querySelector(".luz-player-playpause");',
    'const bars = root.querySelectorAll(".luz-player-seekbar, .luz-player-volbar");',
    'const row = root.querySelector(".luz-player-progress-row .luz-player-seekbar");',
    'const block = el.closest("pre.luz-code-block");',
    'const item = el.matches("li.luz-item:not(.is-hidden)");',
    'const list = root.getElementsByClassName("luz-by-class o-by-class");',
    'const scoped = root.querySelector(":scope > .luz-in-const");',
    'el.classList.add("luz-added", "luz-added-two");',
    'el.classList.remove("is-gone");',
    'el.classList.toggle("is-toggled", on);',
    'el.classList.contains("u-contained");',
    'el.classList.add("luz-btn");',
    'el.classList.toggle("is-active");',
    'el.className = "luz-set luz-set--wide";',
    'el.className += " luz-appended";',
    'el.setAttribute("class", "luz-attr-set");',
    'const shared = el.querySelector(".luz-shared-hook");',
    // not classes
    'const tag = document.querySelector("luz-player-tag");',
    'const inside = document.querySelector("luz-player-tag [data-luz-attr-x]");',
    'customElements.get("luz-ce-tag");',
    'localStorage.setItem("luz-storage-key", "1");',
    'const attr = el.dataset.luzThing;',
    'el.className = `luz-computed__${name}`;',
    'el.classList.add(`luz-dyn--${kind}`);',
    'el.classList.add("luz-prefix-" + kind);',
    'el.querySelector(".luz-sel-" + kind);',
    'el.classList.add("docs-thing", "plain", "luz");',
    'const file = "luz.min.css";',
    "",
  ].join("\n");
  const FILES = {
    "luz.css": CSS,
    "player.js": PLAYER,
    "lib/helper.js": 'document.querySelector(".luz-in-subfolder .luz-shared-hook");\n',
    // the bundle repeats player.js and adds what is in no file of its own
    "luz.js": `${PLAYER}\nconst only = ".luz-only-in-bundle";\n`,
    "luz.min.js": 'document.querySelector(".luz-only-in-min-js")',
    "classes.json": "{}",
  };
  const manifest = () => buildClassManifest("core", { root: fixtureRoot("core", CORE_PACKAGE, FILES) });
  const find = (list, name) => list.classes.find((c) => c.name === name);

  it("lists a class a script queries with defined: false, in the file that names it, with the BEM split", () => {
    const m = manifest();
    expect(find(m, "luz-player-playpause")).toStrictEqual({
      name: "luz-player-playpause",
      kind: "component",
      layer: "luz.components",
      files: ["player.js"],
      defined: false,
      block: "luz-player-playpause",
    });
    expect(find(m, "luz-set--wide")).toStrictEqual({
      name: "luz-set--wide",
      kind: "component",
      layer: "luz.components",
      files: ["player.js"],
      defined: false,
      block: "luz-set",
      modifier: "wide",
    });
    expect(find(m, "is-gone")).toStrictEqual({ name: "is-gone", kind: "state", layer: "luz.components", files: ["player.js"], defined: false });
  });

  it("reads every selector API, the class lists and the dotted names inside a string", () => {
    const names = new Set(manifest().classes.map((c) => c.name));
    for (const name of [
      "luz-player-seekbar", // querySelectorAll, after a comma
      "luz-player-volbar",
      "luz-player-progress-row", // descendant selector
      "luz-code-block", // pre.luz-code-block, a tag then a class
      "luz-item",
      "is-hidden", // inside :not()
      "luz-by-class", // getElementsByClassName, bare words
      "o-by-class",
      "luz-in-const", // ":scope > .luz-in-const"
      "luz-added",
      "luz-added-two", // every literal argument of classList.add
      "is-toggled", // toggle("is-toggled", on): the flag is not a class
      "u-contained",
      "luz-set",
      "luz-appended", // className +=
      "luz-attr-set", // setAttribute("class", …)
    ]) {
      expect(names.has(name), name).toBe(true);
    }
  });

  it("skips comments, tags, storage keys, attributes, computed names and what is not LUZ's", () => {
    const names = manifest().classes.map((c) => c.name);
    const notClasses = [
      "luz-in-jsdoc",
      "luz-in-line-comment",
      "luz-in-block-comment",
      "luz-player-tag", // a tag selector
      "luz-ce-tag", // customElements.get
      "luz-storage-key",
      "luz-thing",
      "luz-computed",
      "luz-computed__",
      "luz-dyn",
      "luz-dyn--",
      "luz-prefix",
      "luz-prefix-",
      "luz-sel",
      "luz-sel-",
      "docs-thing",
      "plain",
      "luz",
      "luz-only-in-min-js",
    ];
    for (const name of notClasses) expect(names, name).not.toContain(name);
    expect(names.filter((n) => /[$_-]$/.test(n) || n.includes("$"))).toEqual([]);
  });

  it("names the script that names it, not the bundle that repeats it; the bundle only for what is in no other script", () => {
    const m = manifest();
    expect(find(m, "luz-player-playpause").files).toEqual(["player.js"]);
    expect(find(m, "luz-only-in-bundle").files).toEqual(["luz.js"]);
    expect(find(m, "luz-in-subfolder").files).toEqual(["lib/helper.js"]);
    expect(find(m, "luz-shared-hook").files).toEqual(["lib/helper.js", "player.js"]);
  });

  it("leaves a class the CSS lists exactly as the CSS says, whatever a script does with it", () => {
    const m = manifest();
    expect(find(m, "luz-btn")).toStrictEqual({ name: "luz-btn", kind: "component", layer: "luz.components", files: ["luz.css"], defined: true, block: "luz-btn" });
    expect(find(m, "is-active")).toStrictEqual({ name: "is-active", kind: "state", layer: "luz.components", files: ["luz.css"], defined: false });
  });

  it("keeps the classes ordered by name, each once, CSS and script names together", () => {
    const names = manifest().classes.map((c) => c.name);
    expect(names).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
  });

  it("puts a script class of a package for one kind of site in that package's layer", () => {
    const dir = fixtureRoot(
      "site",
      { name: "@luz-ds/site", version: "0.4.0", exports: { ".": "./dist/site.js", "./search": "./dist/search.js", "./css": "./dist/site.css" } },
      {
        "site.css": `${ORDER}@layer luz.site {\n.luz-search { display: grid; }\n}\n`,
        "search.js": 'el.querySelector(".luz-search__trigger-hook");\n',
        "site.js": 'import("./search.js");\nel.classList.add("luz-site-loader-hook");\n',
      },
    );
    const { classes } = buildClassManifest("site", { root: dir });
    expect(classes.find((c) => c.name === "luz-search__trigger-hook")).toStrictEqual({
      name: "luz-search__trigger-hook",
      kind: "component",
      layer: "luz.site",
      files: ["search.js"],
      defined: false,
      block: "luz-search",
      part: "trigger-hook",
    });
    expect(classes.find((c) => c.name === "luz-site-loader-hook")).toMatchObject({ kind: "pattern", layer: "luz.site", files: ["site.js"], defined: false });
  });

  it("reads a script it cannot make sense of without failing the build", () => {
    const dir = fixtureRoot("core", CORE_PACKAGE, { "luz.css": CSS, "player.js": '}}{{ "unterminated .luz-after\n`also\n' });
    expect(() => buildClassManifest("core", { root: dir })).not.toThrow();
  });

  it("writes the same dist/classes.json twice, with the script classes one per line", () => {
    const dir = fixtureRoot("core", CORE_PACKAGE, FILES);
    writeManifests("core", { root: dir });
    const text = readFileSync(join(dir, "packages/core/dist/classes.json"), "utf-8");
    expect(text).toContain('{ "name": "luz-player-playpause", "kind": "component", "layer": "luz.components", "files": ["player.js"], "defined": false, "block": "luz-player-playpause" }');
    writeManifests("core", { root: dir });
    expect(readFileSync(join(dir, "packages/core/dist/classes.json"), "utf-8")).toBe(text);
  });
});

describe("the seven built packages", () => {
  const manifests = Object.fromEntries(PACKAGES.map((name) => [name, buildClassManifest(name)]));
  const byName = (pkg) => new Map(manifests[pkg].classes.map((c) => [c.name, c]));
  const SITE_KIND_PREFIX = { landing: "luz-landing-", cms: "luz-cms-", app: "luz-app-", docs: "luz-docs-" };
  const OWN_LAYERS = {
    tokens: ["tokens"],
    core: ["themes", "settings", "generic", "elements", "objects", "components", "utilities", "print"],
    site: ["site", "print"],
    landing: ["landing", "print"],
    cms: ["cms", "print"],
    app: ["app", "print"],
    docs: ["docs", "print"],
  };

  it("covers exactly tokens, core, site, landing, cms, app and docs", () => {
    expect(PACKAGES).toEqual(["tokens", "core", "site", "landing", "cms", "app", "docs"]);
  });

  it.each(PACKAGES)("%s: schema, package name and version come from its package.json", (name) => {
    const pkg = readJson(`packages/${name}/package.json`);
    const { schema, package: pkgName, version } = manifests[name];
    expect({ schema, package: pkgName, version }).toEqual({ schema: 1, package: pkg.name, version: pkg.version });
  });

  it.each(PACKAGES)("%s: classes are sorted by name, each once, with only the fields of the spec", (name) => {
    const names = manifests[name].classes.map((c) => c.name);
    expect(names).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
    const KINDS = ["component", "object", "utility", "pattern", "state"];
    const KEYS = ["name", "kind", "layer", "files", "defined", "block", "modifier", "part", "hosts"];
    for (const c of manifests[name].classes) {
      expect(Object.keys(c).every((k) => KEYS.includes(k)), c.name).toBe(true);
      expect(c.name, c.name).toMatch(/^[a-z0-9_-]+$/);
      expect(KINDS, c.name).toContain(c.kind);
      expect(LAYERS.map((l) => `luz.${l}`), c.name).toContain(c.layer);
      expect(typeof c.defined, c.name).toBe("boolean");
      expect(Array.isArray(c.files) && c.files.length > 0, c.name).toBe(true);
      expect(c.files, c.name).toEqual([...c.files].sort());
      for (const file of c.files) expect(existsSync(`${root}packages/${name}/dist/${file}`), `${c.name} in ${file}`).toBe(true);
      expect(NAMESPACE.test(c.name), c.name).toBe(true);
    }
  });

  it.each(PACKAGES)("%s: properties are sorted by name, each once; only component scope lists files", (name) => {
    const { properties } = manifests[name];
    const names = properties.map((p) => p.name);
    expect(names).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
    for (const p of properties) {
      expect(Object.keys(p).every((k) => ["name", "scope", "layer", "files"].includes(k)), p.name).toBe(true);
      expect(p.name, p.name).toMatch(/^--[a-z0-9-]+$/);
      expect(["root", "component"], p.name).toContain(p.scope);
      expect(p.scope === "component", p.name).toBe("files" in p);
      if (p.scope === "component") for (const file of p.files) expect(existsSync(`${root}packages/${name}/dist/${file}`), `${p.name} in ${file}`).toBe(true);
    }
  });

  it.each(PACKAGES)("%s: kind follows the name; block, modifier and part are its BEM split", (name) => {
    for (const c of manifests[name].classes) {
      const kind = /^luz-(?:site|landing|cms|app|docs)-/.test(c.name) ? "pattern" : c.name.startsWith("o-") ? "object" : c.name.startsWith("u-") ? "utility" : c.name.startsWith("is-") ? "state" : "component";
      expect(c.kind, c.name).toBe(kind);
      if (kind === "utility" || kind === "state") {
        expect(c, c.name).not.toHaveProperty("block");
        expect(c, c.name).not.toHaveProperty("modifier");
        expect(c, c.name).not.toHaveProperty("part");
        continue;
      }
      const [, block, part, modifier] = /^(.+?)(?:__(.+?))?(?:--(.+))?$/.exec(c.name);
      expect(c.block, c.name).toBe(block);
      expect(c.part, c.name).toBe(part);
      expect(c.modifier, c.name).toBe(modifier);
    }
  });

  it.each(PACKAGES)("%s: every defined modifier and part has its block in the manifest, or is the tag of an element", (name) => {
    const css = walk(`${root}packages/${name}/dist`)
      .filter((f) => f.endsWith(".css") && !f.endsWith(".min.css"))
      .map((f) => readFileSync(f, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/"[^"]*"|'[^']*'/g, '""'))
      .join("\n");
    const elements = new Set([...css.matchAll(/(?<![.\w-])(luz-[a-z0-9-]+)(?![\w-])/g)].map((m) => m[1]));
    const known = byName(name);
    for (const c of manifests[name].classes) {
      if (!c.defined || (!c.modifier && !c.part)) continue;
      expect(known.has(c.block) || elements.has(c.block), `${c.name} has no ${c.block}`).toBe(true);
    }
  });

  it.each(PACKAGES)("%s: what it defines is its own: its prefix, its layers", (name) => {
    for (const c of manifests[name].classes) {
      expect(OWN_LAYERS[name].map((l) => `luz.${l}`), `${c.name} is in ${c.layer}`).toContain(c.layer);
      if (!c.defined) continue;
      if (name === "core") expect(c.name, c.name).not.toMatch(/^luz-(?:site|landing|cms|app)-/);
      else if (name === "site") expect(c.name, c.name).toMatch(/^luz-/);
      else if (SITE_KIND_PREFIX[name]) expect(c.name.startsWith(SITE_KIND_PREFIX[name]), `${name} defines ${c.name}`).toBe(true);
    }
  });

  it("core: a class only its scripts name is listed, defined: false, in the script that names it", () => {
    const core = byName("core");
    const ONLY_IN_SCRIPTS = {
      "luz-code-block__copy": "highlight.js",
      "luz-player-audio": "player.js",
      "luz-player-current": "player.js",
      "luz-player-duration": "player.js",
      "luz-player-fullscreen": "player.js",
      "luz-player-mute": "player.js",
      "luz-player-pip": "player.js",
      "luz-player-playpause": "player.js",
    };
    for (const [name, file] of Object.entries(ONLY_IN_SCRIPTS)) {
      expect(core.get(name), name).toMatchObject({ kind: "component", layer: "luz.components", files: [file], defined: false });
    }
  });

  it.each(PACKAGES)("%s: files are all stylesheets or all scripts, and a script's class is never defined", (name) => {
    for (const c of manifests[name].classes) {
      const scripts = c.files.filter((f) => f.endsWith(".js"));
      if (scripts.length === 0) continue;
      expect(scripts, c.name).toEqual(c.files);
      expect(c.defined, c.name).toBe(false);
    }
  });

  it("tokens has no class and declares its tokens at root scope in luz.tokens, with no files", () => {
    expect(manifests.tokens.classes).toEqual([]);
    const brand = manifests.tokens.properties.find((p) => p.name === "--luz-brand-primary");
    expect(brand).toStrictEqual({ name: "--luz-brand-primary", scope: "root", layer: "luz.tokens" });
  });

  it("core: the entries of the spec's example", () => {
    const core = byName("core");
    expect(core.get("luz-btn")).toMatchObject({ kind: "component", layer: "luz.components", defined: true, block: "luz-btn" });
    expect(core.get("luz-btn").files).toContain("components/button.css");
    expect(core.get("luz-btn--primary")).toMatchObject({ kind: "component", layer: "luz.components", defined: true, block: "luz-btn", modifier: "primary" });
    expect(core.get("luz-card__title")).toMatchObject({ kind: "component", layer: "luz.components", defined: true, block: "luz-card", part: "title" });
    expect(core.get("luz-card__title").files).toContain("components/card.css");
    expect(core.get("luz-card__title").files).not.toContain("luz.css");
    expect(core.get("o-stack")).toStrictEqual({ name: "o-stack", kind: "object", layer: "luz.objects", files: ["luz.css"], defined: true, block: "o-stack" });
    expect(core.get("u-sr-only")).toStrictEqual({ name: "u-sr-only", kind: "utility", layer: "luz.utilities", files: ["luz.css"], defined: true });
  });

  it("core: a property a component sets for itself is component scope, in its file", () => {
    const seek = manifests.core.properties.find((p) => p.name === "--luz-seek");
    expect(seek).toStrictEqual({ name: "--luz-seek", scope: "component", layer: "luz.components", files: ["components/player.css"] });
  });

  it("core: a setting is root scope, in luz.settings", () => {
    const font = manifests.core.properties.find((p) => p.name === "--luz-font-body");
    expect(font).toMatchObject({ scope: "root", layer: "luz.settings" });
  });

  it("landing: a core object it sits beside is known, not defined, and its own classes are patterns", () => {
    const landing = byName("landing");
    expect(landing.get("luz-landing-hero")).toMatchObject({ kind: "pattern", layer: "luz.landing", defined: true });
    expect(landing.get("o-row")).toMatchObject({ kind: "object", defined: false });
  });

  it("two builds give the same manifests", () => {
    for (const name of PACKAGES) expect(JSON.stringify(buildClassManifest(name)), name).toBe(JSON.stringify(manifests[name]));
  });
});

describe("independent oracle: a naive regex over the CSS finds the same classes", () => {
  /** Deliberately simple: no parser, only what a regex sees once comments, strings and url() are gone. */
  const naive = (css) =>
    new Set(
      [
        ...css
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/url\([^)]*\)/g, "")
          .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
          .matchAll(/\.((?:luz|o|u|is)-[\w-]+)/g),
      ].map((m) => m[1]),
    );
  const union = (files) => {
    const out = new Set();
    for (const file of files) for (const name of naive(readFileSync(file, "utf-8"))) out.add(name);
    return out;
  };
  const css = (dir) => walk(dir).filter((f) => f.endsWith(".css"));

  it.each(PACKAGES)("%s: the classes with a stylesheet in files are the names of its src/", (name) => {
    const manifest = new Set(buildClassManifest(name).classes.filter((c) => c.files.some((f) => f.endsWith(".css"))).map((c) => c.name));
    expect([...manifest].sort()).toEqual([...union(css(`${root}packages/${name}/src`))].sort());
  });

  /** Deliberately simple too: string literals of the code, then three regexes. */
  const NS = "(?:luz|o|u|is)-";
  const WORD = /^[a-z0-9]+(?:(?:__|--|-)[a-z0-9]+)*$/;
  const scriptNames = (source) => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
    const out = new Set();
    const dotted = new RegExp(`\\.(${NS}[a-z0-9]+(?:(?:__|--|-)[a-z0-9]+)*)(?![\\w$-])`, "g");
    for (const literal of code.matchAll(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g)) {
      for (const m of literal[0].matchAll(dotted)) out.add(m[1]);
    }
    const bare = (words) => {
      for (const word of words.split(/\s+/)) if (new RegExp(`^${NS}`).test(word) && WORD.test(word)) out.add(word);
    };
    for (const call of code.matchAll(/classList\.\w+\(([^)]*)\)/g)) for (const s of call[1].matchAll(/["'`]([^"'`]*)["'`]/g)) bare(s[1]);
    for (const m of code.matchAll(/className\s*\+?=\s*(["'`])(.*?)\1/g)) bare(m[2]);
    for (const m of code.matchAll(/getElementsByClassName\(\s*(["'`])(.*?)\1/g)) bare(m[2]);
    for (const m of code.matchAll(/setAttribute\(\s*["']class["']\s*,\s*(["'`])(.*?)\1/g)) bare(m[2]);
    return out;
  };
  const scripts = (dir) => walk(dir).filter((f) => f.endsWith(".js") && !f.endsWith(".min.js"));

  it.each(PACKAGES)("%s: and the names of its unminified dist/, stylesheets and scripts", (name) => {
    const manifest = new Set(buildClassManifest(name).classes.map((c) => c.name));
    const dist = `${root}packages/${name}/dist`;
    const files = css(dist).filter((f) => !f.endsWith(".min.css"));
    expect(files.length).toBeGreaterThan(0);
    const expected = union(files);
    for (const file of scripts(dist)) for (const n of scriptNames(readFileSync(file, "utf-8"))) expected.add(n);
    expect([...manifest].sort()).toEqual([...expected].sort());
  });
});

describe("RL-19: the classes the docs name are in a manifest", () => {
  const everything = new Set(PACKAGES.flatMap((name) => buildClassManifest(name).classes.map((c) => c.name)));
  const named = indexData(scanSite(`${root}apps/docs`, root))
    .flatMap((entry) => entry.names.map((n) => ({ route: entry.route, text: n.text })))
    .filter((n) => n.text.startsWith(".") && NAMESPACE.test(n.text.slice(1)));

  it("names classes at all", () => {
    expect(named.length).toBeGreaterThan(100);
  });

  it("every class a page names in <code> is in the manifest of some package", () => {
    const missing = named.filter((n) => !everything.has(n.text.slice(1))).map((n) => `${n.route} ${n.text}`);
    expect(missing).toEqual([]);
  });

  // The markup a reader is told to copy: every class="…" of a page, in the live
  // demo and in the escaped `#markup` blocks (&quot;). Only LUZ's namespace is
  // judged: `docs-*` and the like are the site's own, not LUZ's.
  const pages = walk(`${root}apps/docs/pages`).filter((f) => f.endsWith(".html"));
  const inMarkup = new Map();
  for (const file of pages) {
    const text = readFileSync(file, "utf-8").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'");
    for (const m of text.matchAll(/\bclass\s*=\s*"([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) {
        if (!NAMESPACE.test(token) || /[^a-z0-9_-]/.test(token)) continue;
        if (!inMarkup.has(token)) inMarkup.set(token, new Set());
        inMarkup.get(token).add(file.slice(root.length));
      }
    }
  }

  it("reads the markup of the pages at all", () => {
    expect(pages.length).toBeGreaterThan(90);
    expect(inMarkup.size).toBeGreaterThan(200);
  });

  it("every luz-, o-, u- and is- class in the markup of a page is in the manifest of some package", () => {
    const missing = [...inMarkup].filter(([token]) => !everything.has(token)).map(([token, files]) => `${token} in ${[...files].join(", ")}`);
    expect(missing).toEqual([]);
  });
});

describe("how it enters the packages (§2.2)", () => {
  it.each(PACKAGES)("%s: exports ./classes.json from dist", (name) => {
    expect(readJson(`packages/${name}/package.json`).exports["./classes.json"]).toBe("./dist/classes.json");
  });

  it.each(PACKAGES)("%s: pack-files.txt lists dist/classes.json", (name) => {
    expect(read(`packages/${name}/pack-files.txt`).split("\n")).toContain("dist/classes.json");
  });

  it.each(PACKAGES)("%s: the build has written dist/classes.json, equal to what the generator reads from dist/", (name) => {
    const path = `packages/${name}/dist/classes.json`;
    expect(existsSync(`${root}${path}`), `${path} is not there: run the build`).toBe(true);
    expect(readJson(path)).toStrictEqual(buildClassManifest(name));
  });

  it.each(["scripts/build-package.js", "scripts/build-tokens.js", "scripts/build-core.js"])("%s calls writeManifests", (file) => {
    const source = read(file);
    expect(source).toMatch(/import\s*\{[^}]*\bwriteManifests\b[^}]*\}\s*from\s*["']\.\/ai-manifests\.js["']/);
    expect(source).toMatch(/\bwriteManifests\(/);
  });
});

/* ---- hosts: the elements a block may sit on (D13-A; f5-ai-ready.md 5.6 "@host grammar", 2.1 `hosts`) ----
 *
 * `@host <block>: <selector>, <selector>, …` on a line of a block comment of a
 * stylesheet (in practice the header of a component's file; the bundle repeats
 * the comment, and the two must agree) says which elements the block's class
 * may sit on. A selector is a tag name with at most one attribute test:
 * `a`, `input[type=submit]`, `a[href]`. The generator puts the list, as
 * written and in order, in `hosts` of the block's entry, the last key, and
 * nowhere else. It fails the build, with `<file>:<line>` of the `@host` line,
 * on a line that does not follow the grammar, a block no stylesheet of the
 * package defines (the annotation rotted), a name that is a modifier or a
 * part, an empty list, and two files that give a block different lists.
 * Only `luz-btn` declares one today (accessibility-engineer Q1: `a`, `button`
 * and `input` of type button, submit or reset; no `label`, no `summary`).
 */
describe("hosts: the generator reads `@host` from the comments of the stylesheets", () => {
  const roots = [];
  afterEach(() => {
    for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function fixtureRoot(files) {
    const dir = mkdtempSync(join(tmpdir(), "luz-hosts-"));
    roots.push(dir);
    const put = (path, text) => {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    };
    put("packages/core/package.json", JSON.stringify({ name: "@luz-ds/core", version: "1.2.3", exports: { "./css": "./dist/luz.css", "./components/*": "./dist/components/*" } }));
    for (const [path, text] of Object.entries(files)) put(`packages/core/dist/${path}`, text);
    return dir;
  }

  const ORDER = `@layer ${LAYERS.map((l) => `luz.${l}`).join(", ")};\n`;
  // line 1 the layer statement, line 2 the layer, line 3 the comment, line 4 the @host line
  const BUTTON = (host) => `${ORDER}@layer luz.components {\n/* LUZ Component: button\n   ${host}\n*/\n.luz-btn { color: red; }\n.luz-btn--primary { color: blue; }\n.luz-card { margin: 0; }\n}\n`;
  const HOST_LINE = "@host luz-btn: a, button, input[type=button], input[type=submit], input[type=reset]";
  const HOSTS = ["a", "button", "input[type=button]", "input[type=submit]", "input[type=reset]"];
  const entry = (manifest, name) => manifest.classes.find((c) => c.name === name);

  it("puts the list on the block's entry, as written, in order, as its last key, and on no other class", () => {
    const dir = fixtureRoot({ "components/button.css": BUTTON(HOST_LINE) });
    const manifest = buildClassManifest("core", { root: dir });
    expect(entry(manifest, "luz-btn").hosts).toStrictEqual(HOSTS);
    expect(Object.keys(entry(manifest, "luz-btn"))).toEqual(["name", "kind", "layer", "files", "defined", "block", "hosts"]);
    expect(entry(manifest, "luz-btn--primary")).not.toHaveProperty("hosts");
    expect(entry(manifest, "luz-card")).not.toHaveProperty("hosts");
    expect(Object.keys(manifest)).toEqual(["schema", "package", "version", "classes", "properties"]);
  });

  it("writes it on the entry's line, as a one-line array", () => {
    const dir = fixtureRoot({ "components/button.css": BUTTON(HOST_LINE) });
    writeManifests("core", { root: dir });
    const text = readFileSync(join(dir, "packages/core/dist/classes.json"), "utf-8");
    expect(text).toContain('"block": "luz-btn", "hosts": ["a", "button", "input[type=button]", "input[type=submit]", "input[type=reset]"] }');
  });

  it("takes the same line from the bundle and from the component file, and the selectors of an attribute test", () => {
    const css = BUTTON("@host luz-btn: a[href], button, input[type=submit]");
    const dir = fixtureRoot({ "luz.css": css, "components/button.css": css });
    expect(entry(buildClassManifest("core", { root: dir }), "luz-btn").hosts).toStrictEqual(["a[href]", "button", "input[type=submit]"]);
  });

  it("reads it from the bundle alone, and from any block comment, not only the first", () => {
    const css = `${ORDER}@layer luz.components {\n.luz-btn { color: red; }\n/* later in the file\n   @host luz-btn: button\n*/\n.luz-card { margin: 0; }\n}\n`;
    const dir = fixtureRoot({ "luz.css": css });
    expect(entry(buildClassManifest("core", { root: dir }), "luz-btn").hosts).toStrictEqual(["button"]);
  });

  it("is not there for a class whose comment does not say it, or whose @host is in a string or a declaration", () => {
    const css = `${ORDER}@layer luz.components {\n.luz-btn { color: red; }\n.luz-card::after { content: "@host luz-card: div"; }\n}\n`;
    const dir = fixtureRoot({ "components/button.css": css });
    const manifest = buildClassManifest("core", { root: dir });
    for (const c of manifest.classes) expect(c, c.name).not.toHaveProperty("hosts");
  });

  it.each([
    ["has no colon", "@host luz-btn a, button"],
    ["has an empty list", "@host luz-btn:"],
    ["has an empty item", "@host luz-btn: a,, button"],
    ["names a class selector", "@host luz-btn: .a, button"],
    ["names two tags in one selector", "@host luz-btn: a b"],
    ["has a descendant combinator", "@host luz-btn: div > a"],
    ["has an uppercase tag", "@host luz-btn: A, button"],
    ["has a universal selector", "@host luz-btn: *"],
    ["has two attribute tests", "@host luz-btn: input[type=button][name=x]"],
    ["has a quoted value", '@host luz-btn: input[type="button"]'],
    ["has a value with a space", "@host luz-btn: input[type=a b]"],
  ])("fails the build, with file and line, on an @host that %s", (_what, host) => {
    const dir = fixtureRoot({ "components/button.css": BUTTON(host) });
    expect(() => buildClassManifest("core", { root: dir })).toThrow(/packages\/core\/dist\/components\/button\.css:4\b.*@host/s);
  });

  it("fails the build for a block no stylesheet of the package defines, and for a name that is not a block", () => {
    const missing = fixtureRoot({ "components/button.css": BUTTON("@host luz-nothing: a") });
    expect(() => buildClassManifest("core", { root: missing })).toThrow(/components\/button\.css:4\b.*luz-nothing/s);
    const modifier = fixtureRoot({ "components/button.css": BUTTON("@host luz-btn--primary: a") });
    expect(() => buildClassManifest("core", { root: modifier })).toThrow(/components\/button\.css:4\b.*luz-btn--primary/s);
  });

  it("fails the build when two files give the same block different lists", () => {
    const dir = fixtureRoot({ "luz.css": BUTTON("@host luz-btn: a"), "components/button.css": BUTTON("@host luz-btn: a, button") });
    expect(() => buildClassManifest("core", { root: dir })).toThrow(/@host luz-btn/);
  });
});

describe("hosts: the built packages, the sources and the docs agree", () => {
  const SELECTOR = /^[a-z][a-z0-9]*(?:\[[a-z][a-z-]*(?:=[A-Za-z0-9_-]+)?\])?$/;
  const HOST_LINE = /^[\s*]*@host\s+(luz-[a-z0-9_-]+)\s*:\s*(.+?)\s*$/;
  const manifests = Object.fromEntries(PACKAGES.map((name) => [name, buildClassManifest(name)]));
  const hosted = new Map(PACKAGES.flatMap((name) => manifests[name].classes.filter((c) => c.hosts).map((c) => [c.name, { package: name, hosts: c.hosts }])));

  /** [{ file, line, block, hosts }] of the `@host` lines of the sources of the packages. */
  const declared = PACKAGES.flatMap((name) =>
    walk(`${root}packages/${name}/src`)
      .filter((f) => f.endsWith(".css"))
      .flatMap((file) =>
        readFileSync(file, "utf-8")
          .split("\n")
          .flatMap((text, index) => {
            const m = HOST_LINE.exec(text);
            return m ? [{ file: file.slice(root.length), line: index + 1, block: m[1], hosts: m[2].split(",").map((h) => h.trim()), package: name }] : [];
          }),
      ),
  );

  it("is declared for .luz-btn in button.css, with the elements of the accessibility review", () => {
    const button = declared.filter((d) => d.block === "luz-btn");
    expect(button.map((d) => d.file)).toEqual(["packages/core/src/components/button.css"]);
    expect(button[0].hosts).toStrictEqual(["a", "button", "input[type=button]", "input[type=submit]", "input[type=reset]"]);
  });

  it("is in the manifest of core for luz-btn, and for no class a source does not declare", () => {
    expect(manifests.core.classes.find((c) => c.name === "luz-btn").hosts).toStrictEqual(["a", "button", "input[type=button]", "input[type=submit]", "input[type=reset]"]);
    expect([...hosted.keys()].sort()).toEqual([...new Set(declared.map((d) => d.block))].sort());
    for (const d of declared) expect(hosted.get(d.block), `${d.file}:${d.line} ${d.block}`).toEqual({ package: d.package, hosts: d.hosts });
  });

  it("follows the grammar in every source: a tag with at most one attribute test, each once, no label and no summary for a button", () => {
    expect(declared.length).toBeGreaterThan(0);
    for (const d of declared) {
      expect(d.hosts.length, `${d.file}:${d.line}`).toBeGreaterThan(0);
      for (const host of d.hosts) expect(SELECTOR.test(host), `${d.file}:${d.line} ${host}`).toBe(true);
      expect(new Set(d.hosts).size, `${d.file}:${d.line}`).toBe(d.hosts.length);
    }
    expect(hosted.get("luz-btn").hosts.map((h) => h.split("[")[0])).not.toContain("label");
    expect(hosted.get("luz-btn").hosts.map((h) => h.split("[")[0])).not.toContain("summary");
  });

  it("is in the built dist/classes.json of core (the build has run since the header changed)", () => {
    const built = readJson("packages/core/dist/classes.json");
    expect(built.classes.find((c) => c.name === "luz-btn").hosts).toStrictEqual(["a", "button", "input[type=button]", "input[type=submit]", "input[type=reset]"]);
  });

  // RL-19, D13-A: what the docs show a reader to copy is what the table says. The live demos, the
  // partials, the layouts and the home page, outside `inert` stages (the do and don't, which show
  // a mistake on purpose), and the markup of every <pre> block, decoded.
  const matches = (selector, name, attrs) => {
    const [, tag, attribute, value] = /^([a-z0-9]+)(?:\[([a-z-]+)(?:=(.+))?\])?$/.exec(selector);
    if (tag !== name) return false;
    if (attribute === undefined) return true;
    if (!attrs.has(attribute)) return false;
    return value === undefined || attrs.get(attribute).toLowerCase() === value;
  };

  function misplaced(html, file) {
    const found = [];
    const open = []; // { name, inert }
    let visited = 0;
    for (const token of tags(html, file, { lenient: true })) {
      if (token.type === "error") break;
      if (token.type === "end") {
        const at = open.map((o) => o.name).lastIndexOf(token.name);
        if (at !== -1) open.length = at;
        continue;
      }
      if (token.type !== "start") continue;
      const own = token.attrs.has("inert");
      const inert = own || open.some((o) => o.inert);
      const written = html.slice(token.index + 1, token.index + 1 + token.name.length);
      if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/.test(token.name) && !token.selfClosing) open.push({ name: token.name, inert: inert });
      if (inert || written !== token.name) continue;
      for (const name of (token.attrs.get("class") ?? "").split(/\s+/)) {
        const spec = hosted.get(name);
        if (spec === undefined) continue;
        visited += 1;
        if (!spec.hosts.some((h) => matches(h, token.name, token.attrs))) found.push(`${file}:${token.line} .${name} is on <${token.name}>`);
      }
    }
    return { found, visited };
  }

  it("has every page, partial, layout and the home page put a class that has hosts only on its hosts, in markup and in the code a page shows", () => {
    const files = [
      ...walk(`${root}apps/docs/pages`),
      ...walk(`${root}apps/docs/_partials`),
      ...walk(`${root}apps/docs/_layouts`),
      ...walk(`${root}apps/landing`).filter((f) => !f.includes("node_modules")),
    ].filter((f) => f.endsWith(".html"));
    expect(hosted.size, "a class with hosts: the cross-check is not vacuous").toBeGreaterThan(0);
    let visited = 0;
    const problems = [];
    for (const file of files) {
      const rel = file.slice(root.length);
      const text = readFileSync(file, "utf-8");
      const live = misplaced(text, rel);
      visited += live.visited;
      problems.push(...live.found);
      for (const match of text.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)) {
        const code = decodeEntities(match[1].replace(/<[^>]+>/g, ""));
        const shown = misplaced(code, `${rel} (a <pre> block)`);
        visited += shown.visited;
        problems.push(...shown.found);
      }
    }
    expect(visited, "it looked at the markup of the docs").toBeGreaterThan(100);
    expect(problems).toEqual([]);
  });
});
