/**
 * F5 step 9, the rules of names of @luz-ds/check: classes, elements and
 * attributes (.claude/plans/specs/f5-ai-ready.md 5.4 "Where the facts come
 * from", 5.5 and 5.6 for class/unknown, element/unknown,
 * element/unknown-attribute, class/unknown-in-css, class/reserved-prefix and
 * attr/unknown-hook, 5.9, 8; the review answers of accessibility-engineer
 * "False blocks to prevent" and security-auditor Q3 and Q5; the notes from
 * step 8, decision 6).
 *
 * What is not here: the load and misuse rules (step 10) and the theme and
 * CSS-declaration rules (step 11). The fixtures are read by one runner,
 * tests/helpers/check-fixtures.js, keyed by rule-id prefix, that those steps
 * reuse. tests/check-data.test.js is the snapshot these rules fall back on.
 *
 * The contract, new in this step (everything else is step 8's):
 *
 *   run(argv, { version, cwd, data })
 *       `data` is optional: the folder of the bundled snapshot (dist/data).
 *       Without it, the folder next to the bundle (the published layout) or,
 *       from src/, ../dist/data. Tests pass it so no test depends on a build
 *       that happened earlier.
 *   packages/check/src/suggest.js
 *       distance(a, b)            Damerau-Levenshtein (a swap is 1)
 *       closest(name, candidates) the nearest candidate or null: distance at
 *                                 most max(2, ceil(len / 4)) and at most 40 %
 *                                 of the name, ties in code-unit order of the
 *                                 candidate, null for a name over 64 chars
 *   Facts (5.4): for each of the seven packages, from the directory of each
 *       checked file walk up to node_modules/@luz-ds/<pkg>/ and read
 *       dist/classes.json and dist/custom-elements.json, as data, when its
 *       package.json names @luz-ds/<pkg> and the manifest is a manifest
 *       (<= 8 MiB, the shape of the spec); a package not found (or whose
 *       file is not usable) comes from the snapshot, and `manifests` says
 *       which: one entry per package, in dependency order, { package,
 *       version, source: "node_modules" | "bundled" }. Nothing is read, and
 *       `manifests` is [], for files that name nothing of LUZ's; when a file
 *       names something and no package has a manifest anywhere, exit 2 and
 *       one fixed line that says "manifest".
 *   hooks: a manifest may carry `hooks`, the data-luz-* names its package
 *       reads that are not label overrides (tests/check-data.test.js asks the
 *       generator for it). attr/unknown-hook knows those, the attributes of
 *       every element of the custom-elements manifests and data-luz-label-*.
 *   messages.js: `parse/error:template` and `class/unknown:newer`, both
 *       severity "warn" under a rule id that blocks (WARNING_VARIANTS of
 *       tests/helpers/check-modules.js).
 *   Positions: class/unknown at the `class` (or, in a template file,
 *       `className`) attribute; element/unknown at the "<" of the tag;
 *       element/unknown-attribute and attr/unknown-hook at the attribute;
 *       class/unknown-in-css and class/reserved-prefix at the "." of the
 *       class in the stylesheet. `suggestion` is the text the message prints
 *       after "the closest is": ".luz-btn--primary", "<luz-search>",
 *       "autoplay"; null for the `:none` variants.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../packages/check/src/cli.js";
import { BUILDER } from "./helpers/check-build.js";
import { BLOCKING_RULES, WARNING_VARIANTS, checkModule } from "./helpers/check-modules.js";
import {
  FIXTURES,
  LIBRARIES,
  MINI,
  ROOT,
  VERSION,
  builtData,
  checkCase,
  checkJson,
  fixtureCases,
  installPackages,
  key,
  linkPackage,
  miniSnapshot,
  passCases,
  put,
  removeWorkspaces,
  where,
  workspace,
} from "./helpers/check-fixtures.js";
import { linkTo, links } from "./helpers/check-run.js";

const suggest = await checkModule("suggest");
const messages = await checkModule("messages");

afterAll(removeWorkspaces);

const PREFIXES = ["class/", "element/", "attr/"];
const SRC = join(ROOT, "packages/check/src");
const BASE_KEYS = ["column", "docs", "file", "line", "message", "rule", "severity", "suggestion"];
const UNREADABLE = "<an unreadable name>";
// Characters that must never reach a terminal or a model, built from code points so no invisible character sits in this file
const BEL = String.fromCharCode(0x07);
const BIDI = String.fromCharCode(0x202e);
const ZWSP = String.fromCharCode(0x200b);
const NBSP = String.fromCharCode(0xa0);
const UNSAFE = new RegExp(`[${BEL}${BIDI}${ZWSP}]`);

/* ---- Helpers ---------------------------------------------------------------------------------- */

const LINKS = [
  '  <link rel="stylesheet" href="node_modules/@luz-ds/tokens/dist/luz-tokens.min.css">',
  '  <link rel="stylesheet" href="node_modules/@luz-ds/core/dist/luz.min.css">',
  "",
].join("\n");
/** A document with LUZ's two base stylesheets: the body starts at line 10. */
const page = (body, links = LINKS) => `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>Page</title>\n${links}</head>\n<body>\n${body}\n</body>\n</html>\n`;

/**
 * Run the CLI over a temporary project. `installed` puts node_modules in it
 * (installPackages' options), `snapshot` is the bundled data (miniSnapshot's
 * options, or a folder), `env` more of the environment.
 */
function check(files, { argv = ["."], installed = null, snapshot = {}, env = {}, cwd = null } = {}) {
  const dir = workspace(files);
  if (installed) installPackages(dir, installed);
  const data = typeof snapshot === "string" ? snapshot : miniSnapshot(snapshot);
  const result = checkJson(argv, cwd === null ? dir : join(dir, cwd), { data, ...env });
  if (result.data === null) expect.fail(`stdout is not JSON (exit ${result.code}, stderr: ${result.stderr.slice(0, 200)})`);
  return { dir, ...result, findings: result.data.findings };
}
const ofRule = (result, prefix) => result.findings.filter((f) => f.rule.startsWith(prefix));
const keysOf = (findings) => findings.map(key);
const WORDS = (rule, text) =>
  Object.entries(messages.MESSAGES).some(([name, entry]) => {
    if (name.split(":")[0] !== rule) return false;
    const fragments = entry.template.split(/\{[A-Za-z][A-Za-z0-9]*\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`^${fragments.join(".+?")}$`).test(text);
  });

/* ---- The fixtures ------------------------------------------------------------------------------ */

describe("the fixtures: every file makes the rules of names say what its expect comments say", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  const cases = fixtureCases(PREFIXES);

  it("has the files this step needs, each with an expect comment", () => {
    const paths = cases.map((c) => c.path);
    for (const path of [
      "fail/class-typo.html",
      "fail/class-unreadable.html",
      "fail/class-itcss.html",
      "fail/luz-unknown-tag.html",
      "fail/element-typo.html",
      "warn/css-classes.css",
      "warn/reserved-prefix.css",
      "warn/markup.html",
    ]) {
      expect(paths, path).toContain(path);
    }
  });

  it.each(cases)("$path: exactly its expected findings of class/, element/ and attr/, at the line and column it names", (entry) => {
    expect(snapshot.error, "the build writes dist/data (scripts/build-check.js)").toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.data, `stdout is JSON (stderr: ${result.stderr})`).not.toBeNull();
    expect(result.found.map(key)).toEqual(result.expected.map(key));
    result.found.forEach((found, i) => {
      const wanted = result.expected[i];
      expect(found.severity, key(found)).toBe(entry.folder === "fail" ? "block" : "warn");
      expect(found.file, key(found)).toBe(entry.path);
      if ("suggestion" in wanted.options) {
        expect(found.suggestion, key(found)).toBe(wanted.options.suggestion);
        expect(found.message, key(found)).toMatch(new RegExp(`the closest is ${wanted.options.suggestion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      }
      if (wanted.options.echo === "unreadable") {
        expect(found.message, key(found)).toContain(UNREADABLE);
        expect(JSON.stringify(found), key(found)).not.toMatch(UNSAFE);
      }
      expect(WORDS(found.rule, found.message), `${key(found)} is worded by a template of messages.js`).toBe(true);
    });
    if (entry.folder === "fail") expect(result.code).toBe(1);
    else expect(result.code, "a warning never fails").toBe(0);
  });

  it.each(passCases())("$path: nothing from the rules of names (the carve-outs are not mistakes)", (entry) => {
    expect(snapshot.error).toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.found.map(key)).toEqual([]);
  });

  it("has the new pass fixture that holds the element, attribute and hook carve-outs", () => {
    expect(passCases().map((c) => c.path)).toContain("pass/elements.html");
  });
});

/* ---- class/unknown ------------------------------------------------------------------------------ */

describe("class/unknown", () => {
  it("blocks a class that starts luz- and is in no manifest, at its class attribute, with the closest class", () => {
    const html = page('  <button class="luz-btn luz-btn-primary" type="submit">Save</button>');
    const result = check({ "index.html": html });
    const at = where(html, 'class="luz-btn luz-btn-primary"');
    expect(result.code).toBe(1);
    expect(result.findings).toHaveLength(1);
    const [found] = result.findings;
    expect(found).toMatchObject({ rule: "class/unknown", severity: "block", file: "index.html", line: at.line, column: at.column, suggestion: ".luz-btn--primary" });
    expect(Object.keys(found).sort(), "no `details` on a class finding").toEqual(BASE_KEYS);
    expect(found.message).toBe(messages.message("class/unknown", { name: "luz-btn-primary", closest: "luz-btn--primary" }));
    expect(found.docs).toBe(messages.docsUrl("class/unknown"));
  });

  it("knows every class of every package, whatever the page links: that is load/package-missing's to say", () => {
    const html = page(
      [
        '  <div class="luz-search__field luz-sidebar luz-consent">site</div>',
        '  <section class="luz-landing-hero"><h1 class="luz-landing-hero__title">Landing</h1></section>',
        '  <article class="luz-cms-post luz-cms-post__title luz-app-shell luz-app-shell__nav">Kinds</article>',
      ].join("\n"),
    );
    expect(ofRule(check({ "index.html": html }), "class/")).toEqual([]);
  });

  it("knows a class that has no rule of its own (defined: false), and the state classes, and every non-LUZ name", () => {
    const html = page(
      [
        '  <table class="luz-table luz-table--compact"><tbody><tr><td class="luz-table__numeric">1</td></tr></tbody></table>',
        '  <li class="is-active is-featured">state</li>',
        '  <p class="promo btn-primary luzbtn LUZ-BTN luz_btn">not LUZ</p>',
      ].join("\n"),
    );
    expect(ofRule(check({ "index.html": html }), "class/")).toEqual([]);
  });

  it("reports each unknown class of an attribute, in reading order, at the attribute", () => {
    const html = page('  <button class="luz-aaaa-one luz-btn luz-bbbb-two" type="button">x</button>');
    const result = check({ "index.html": html });
    const at = where(html, 'class="luz-aaaa-one');
    expect(keysOf(result.findings)).toEqual([`class/unknown ${at.line}:${at.column}`, `class/unknown ${at.line}:${at.column}`]);
    expect(result.findings.map((f) => f.message.split(" ")[0])).toEqual([".luz-aaaa-one", ".luz-bbbb-two"]);
  });

  it("splits the class value on ASCII whitespace only, as HTML does: a tab and a line break split, a no-break space does not", () => {
    const split = check({ "a.html": page('  <button class="luz-btn\n\tluz-btn-primary\r\nluz-card" type="button">x</button>') });
    expect(split.findings.map((f) => f.message.split(" ")[0])).toEqual([".luz-btn-primary"]);
    const glued = check({ "b.html": page(`  <p class="luz-btn${NBSP}luz-btn--primary">x</p>`) });
    expect(glued.findings).toHaveLength(1);
    expect(glued.findings[0].rule).toBe("class/unknown");
    expect(glued.findings[0].message).toContain(UNREADABLE);
    expect(glued.findings[0].message).not.toContain(NBSP);
  });

  it("never echoes a name that is not safe to print: a control character, a bidi override or over 64 characters", () => {
    const html = page(`  <p class="luz-btn${BEL}evil luz-btn${BIDI}evil luz-${"a".repeat(100)}">x</p>`);
    const result = check({ "index.html": html });
    expect(result.findings).toHaveLength(3);
    for (const found of result.findings) {
      expect(found.message).toContain(UNREADABLE);
      expect(found.message.length).toBeLessThanOrEqual(120);
    }
    expect(result.stdout).not.toMatch(UNSAFE);
    const text = run(["."], { version: VERSION, cwd: result.dir, data: miniSnapshot() });
    expect(text.stdout).not.toMatch(UNSAFE);
  });

  it("says where to look when nothing is close, by the package its prefix names: classes.json of that package", () => {
    const html = page(
      [
        '  <p class="luz-completely-unrelated-thing">core</p>',
        '  <p class="luz-landing-qqqqqqqqqq">landing</p>',
        '  <p class="luz-cms-qqqqqqqqqq">cms</p>',
        '  <p class="luz-app-qqqqqqqqqq">app</p>',
      ].join("\n"),
    );
    const result = check({ "index.html": html });
    expect(result.findings.map((f) => f.suggestion)).toEqual([null, null, null, null]);
    const expected = [
      ["luz-completely-unrelated-thing", "core"],
      ["luz-landing-qqqqqqqqqq", "landing"],
      ["luz-cms-qqqqqqqqqq", "cms"],
      ["luz-app-qqqqqqqqqq", "app"],
    ];
    expected.forEach(([name, pkg], i) => expect(result.findings[i].message).toBe(messages.message("class/unknown:none", { name, package: pkg })));
  });
});

describe("class/unknown: the suggestion table", () => {
  const TABLE = [
    ["luz-btn-primary", ".luz-btn--primary"], // a dash where -- exists
    ["luz-bnt", ".luz-btn"], // a swap is one edit
    ["luz-card__titel", ".luz-card__title"],
    ["luz-card_title", ".luz-card__title"], // an underscore where __ exists
    ["luz-btn--primry", ".luz-btn--primary"],
    ["luz-alert-error", ".luz-alert--error"],
    ["luz-tabel", ".luz-table"],
    ["o-stck", ".o-stack"],
    ["luz-landing-hero__titel", ".luz-landing-hero__title"],
    ["luz-Btn", ".luz-btn"], // case matters to a browser
    ["luz-btn--xl", ".luz-btn--lg"], // lg and sm are as close: ties go in alphabetical order
  ];

  it("names the closest class for ten typos and a tie", () => {
    expect(TABLE.length).toBeGreaterThanOrEqual(10);
    const html = page(TABLE.map(([typo]) => `  <p class="${typo}">x</p>`).join("\n"));
    const result = check({ "index.html": html });
    expect(result.findings).toHaveLength(TABLE.length);
    TABLE.forEach(([typo, wanted], i) => {
      const found = result.findings[i];
      expect(found.suggestion, typo).toBe(wanted);
      expect(found.message, typo).toBe(messages.message("class/unknown", { name: typo, closest: wanted.slice(1) }));
    });
  });
});

describe("class/unknown: the o- and u- prefixes are also a convention of the project's own", () => {
  it("blocks a name within two edits of a LUZ object or utility that no scanned stylesheet defines", () => {
    const result = check({ "index.html": page('  <main class="o-container o-stak"><p class="u-hiden">x</p></main>') });
    expect(result.findings.map((f) => [f.rule, f.suggestion])).toEqual([
      ["class/unknown", ".o-stack"],
      ["class/unknown", ".u-hidden"],
    ]);
  });

  it("leaves a name that is the project's own: far from every LUZ class, or the spec's o-media-x", () => {
    const html = page('  <div class="o-zebra-crossing u-brand-gradient o-media-x o-container">x</div>');
    expect(ofRule(check({ "index.html": html }), "class/")).toEqual([]);
  });

  it("leaves a name that a stylesheet of the same run defines", () => {
    const html = page('  <div class="o-stak">x</div>');
    expect(ofRule(check({ "index.html": html }), "class/").map((f) => f.rule)).toEqual(["class/unknown"]);
    const defined = check({ "index.html": html, "css/own.css": ".o-stak {\n  display: grid;\n}\n" });
    expect(ofRule(defined, "class/")).toEqual([]);
  });
});

describe("class/unknown: what a template or a framework computes is never read as a mistake", () => {
  it("skips a class that holds { } $ : @ or [, and any attribute that is not `class`", () => {
    const html = page(
      [
        '  <p class="luz-{{ kind }}">a</p>',
        '  <p class="luz-btn-{{ kind }}">b</p>',
        '  <p class="luz-btn-${kind}">c</p>',
        '  <p class="luz-btn:hover luz-@x luz-[x]">d</p>',
        '  <p :class="\'luz-btn-primary\'" v-bind:class="\'luz-btn-primary\'" [class]="x" [ngClass]="x" x-bind:class="\'luz-btn-primary\'" class:list="luz-btn-primary">e</p>',
        '  <p className="luz-btn-primary">f</p>',
      ].join("\n"),
    );
    expect(ofRule(check({ "index.html": html }), "class/")).toEqual([]);
  });

  it("still reads the clean tokens of a value that has a placeholder next to them, in an .html file", () => {
    const result = check({ "index.html": page('  <p class="luz-btn-primary {{ extra }}">x</p>') });
    expect(result.findings.map((f) => f.message.split(" ")[0])).toEqual([".luz-btn-primary"]);
  });

  it("in a file of --ext reads class and className, and skips a whole value that has { } $ < % @ or (", () => {
    const astro = [
      "---",
      'const cls = "x";',
      "---",
      '<div class="luz-btn-primary">a</div>',
      '<div className="luz-btn-primary">b</div>',
      '<div class="luz-btn {cls} luz-btn-primary">c</div>',
      "<div class={cls}>d</div>",
      '<div class:list={["luz-btn-primary"]}>e</div>',
      "",
    ].join("\n");
    const result = check({ "page.astro": astro }, { argv: [".", "--ext", ".astro"] });
    expect(keysOf(result.findings)).toEqual([`class/unknown ${where(astro, 'class="luz-btn-primary"').line}:${where(astro, 'class="luz-btn-primary"').column}`, `class/unknown ${where(astro, "className=").line}:${where(astro, "className=").column}`]);
    expect(result.findings.every((f) => f.file === "page.astro")).toBe(true);
  });

  it.each([
    ["luz-btn-primary {x}"],
    ["luz-btn-primary ${x}"],
    ["luz-btn-primary <?= $x ?>"],
    ["luz-btn-primary <% x %>"],
    ["@if(x) luz-btn-primary"],
    ["luz-btn-primary foo(x)"],
  ])("in a file of --ext, a value that is computed is skipped whole: %s", (value) => {
    const result = check({ "view.vue": `<template><div class="${value}">x</div></template>\n` }, { argv: [".", "--ext", ".vue"] });
    expect(ofRule(result, "class/")).toEqual([]);
    const plain = check({ "view.vue": '<template><div class="luz-btn-primary">x</div></template>\n' }, { argv: [".", "--ext", ".vue"] });
    expect(ofRule(plain, "class/").map((f) => f.rule)).toEqual(["class/unknown"]);
  });

  it("does not read className in an .html file", () => {
    expect(ofRule(check({ "a.html": page('  <p className="luz-btn-primary">x</p>') }), "class/")).toEqual([]);
  });
});

/* ---- element/unknown ---------------------------------------------------------------------------- */

describe("element/unknown", () => {
  it("blocks a <luz-*> tag that is in no custom-elements manifest, at its <, and says where to look", () => {
    const html = page("  <luz-carousel>\n    <p>Slides</p>\n  </luz-carousel>");
    const result = check({ "index.html": html });
    const at = where(html, "<luz-carousel>");
    expect(result.code).toBe(1);
    expect(result.findings).toHaveLength(1);
    const [found] = result.findings;
    expect(found).toMatchObject({ rule: "element/unknown", severity: "block", line: at.line, column: at.column, suggestion: null });
    expect(Object.keys(found).sort()).toEqual(BASE_KEYS);
    expect(found.message).toMatch(/^<luz-carousel> is not a LUZ element; see custom-elements\.json of @luz-ds\/(?:core|site)$/);
    expect(found.docs).toBe(messages.docsUrl("element/unknown"));
  });

  it("names the closest tag, for a swapped letter", () => {
    const result = check({ "index.html": page('  <luz-serach><a href="/search/">Search</a></luz-serach>') });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].suggestion).toBe("<luz-search>");
    expect(result.findings[0].message).toBe(messages.message("element/unknown", { tag: "luz-serach", closest: "luz-search" }));
  });

  it("knows every tag of a manifest, a CSS-only one too, and a tag that is the block of a class", () => {
    const html = page(
      [
        '  <luz-timeline><ol><li>1</li></ol></luz-timeline>',
        "  <luz-search></luz-search>",
        '  <luz-banner tone="warning">x</luz-banner>',
        "  <luz-lang-switch></luz-lang-switch>",
        "  <luz-card>a block that is also a tag</luz-card>",
      ].join("\n"),
    );
    expect(ofRule(check({ "index.html": html }), "element/")).toEqual([]);
  });

  it("reads only tags that start luz-: a framework component, an underscore or a longer name is not LUZ's", () => {
    const html = page("  <LuzCarousel>a</LuzCarousel>\n  <luz_carousel>b</luz_carousel>\n  <luzcarousel>c</luzcarousel>\n  <my-luz-carousel>d</my-luz-carousel>");
    expect(ofRule(check({ "index.html": html }), "element/")).toEqual([]);
  });

  it("reports an element once, with or without an end tag, and a self-closing one", () => {
    const html = page("  <luz-carousel></luz-carousel>\n  <luz-gallery />");
    const result = check({ "index.html": html });
    expect(result.findings.map((f) => f.rule)).toEqual(["element/unknown", "element/unknown"]);
    expect(result.findings.map((f) => f.line)).toEqual([where(html, "<luz-carousel>").line, where(html, "<luz-gallery").line]);
  });

  it("does not also blame the attributes of a tag it has already blamed", () => {
    const result = check({ "index.html": page('  <luz-carousel speed="2" autoplay>x</luz-carousel>') });
    expect(result.findings.map((f) => f.rule)).toEqual(["element/unknown"]);
  });

  it("never echoes a tag name that is not safe to print", () => {
    const result = check({ "index.html": page(`  <luz-${"a".repeat(100)}>x</luz-${"a".repeat(100)}>`) });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].message).toContain(UNREADABLE);
  });

  it("does not say a tag of site is unknown on a page that loads only core (load/package-missing's to say)", () => {
    const result = check({ "index.html": page("  <luz-search></luz-search>") });
    expect(ofRule(result, "element/")).toEqual([]);
  });
});

/* ---- element/unknown-attribute ---------------------------------------------------------------- */

describe("element/unknown-attribute", () => {
  it("blocks an attribute a LUZ element does not declare, at the attribute, and says where to look", () => {
    const html = page('  <luz-timeline autoplay speed="2"><ol><li>1</li></ol></luz-timeline>');
    const result = check({ "index.html": html });
    const at = where(html, "speed=");
    expect(result.code).toBe(1);
    expect(result.findings).toHaveLength(1);
    const [found] = result.findings;
    expect(found).toMatchObject({ rule: "element/unknown-attribute", severity: "block", line: at.line, column: at.column, suggestion: null });
    expect(Object.keys(found).sort()).toEqual(BASE_KEYS);
    expect(found.message).toBe(messages.message("element/unknown-attribute:none", { attribute: "speed", tag: "luz-timeline" }));
    expect(found.docs).toBe(messages.docsUrl("element/unknown-attribute"));
  });

  it("names the closest attribute the element declares", () => {
    const result = check({ "index.html": page("  <luz-timeline autoplya intervall=\"3000\"><ol><li>1</li></ol></luz-timeline>") });
    expect(result.findings.map((f) => [f.rule, f.suggestion])).toEqual([
      ["element/unknown-attribute", "autoplay"],
      ["element/unknown-attribute", "interval"],
    ]);
    expect(result.findings[0].message).toBe(messages.message("element/unknown-attribute", { attribute: "autoplya", tag: "luz-timeline", closest: "autoplay" }));
  });

  it("accepts what the element declares, the global attributes, aria-*, data-* and the label overrides", () => {
    const attributes = [
      'layout="vertical"',
      "autoplay",
      'interval="3000"',
      'class="x"',
      'id="t"',
      'lang="es"',
      'dir="rtl"',
      "hidden",
      'role="region"',
      'slot="s"',
      'style="color: red"',
      'title="t"',
      'tabindex="0"',
      "inert",
      'accesskey="t"',
      'translate="no"',
      'contenteditable="false"',
      'draggable="false"',
      'spellcheck="false"',
      'aria-label="Events"',
      'aria-hidden="false"',
      'data-testid="x"',
      'data-analytics="y"',
      'data-luz-label-previous="Back"',
      'data-luz-label-anything="Any"',
    ];
    const html = page(`  <luz-timeline ${attributes.join(" ")}><ol><li>1</li></ol></luz-timeline>`);
    expect(ofRule(check({ "index.html": html }), "element/")).toEqual([]);
  });

  it("accepts the attributes of a framework: v-*, :x, @x, x-*, hx-*, *ngIf, on*, part, popover, is and bindings", () => {
    const attributes = ['v-if="a"', 'v-bind:foo="b"', ':foo="c"', '@click="go"', "x-data", 'x-on:click.prevent="go()"', 'hx-get="/e/"', '*ngIf="a"', 'onclick="go()"', 'onfocus="f()"', 'part="rail"', "popover", 'is="x"', '[prop]="a"', '(event)="go()"'];
    const html = page(`  <luz-timeline ${attributes.join(" ")}><ol><li>1</li></ol></luz-timeline>`);
    expect(ofRule(check({ "index.html": html }), "element/")).toEqual([]);
  });

  it("blocks a data-luz-* name another element declares, or nobody does, and a name taken from Object.prototype", () => {
    const html = page('  <luz-timeline data-luz-search-src="/s.json" data-luz-bogus constructor="1" __proto__="2" tone="warning"><ol><li>1</li></ol></luz-timeline>');
    const result = check({ "index.html": html });
    expect(result.findings.map((f) => f.rule)).toEqual(Array(5).fill("element/unknown-attribute"));
    expect(result.findings.map((f) => f.message.split(" ")[0])).toEqual(["data-luz-search-src", "data-luz-bogus", "constructor", "__proto__", "tone"]);
  });

  it("blocks every non-global attribute of an element that declares none", () => {
    const withSite = links(linkTo("tokens", "luz-tokens.min.css"), linkTo("core", "luz.min.css"), linkTo("site", "site.min.css"));
    const result = check({ "index.html": page('  <luz-lang-switch foo="1" class="x"></luz-lang-switch>', withSite) });
    expect(result.findings.map((f) => f.message.split(" ")[0])).toEqual(["foo"]);
  });

  it("reads the attributes of the right element: tone belongs to luz-banner", () => {
    expect(ofRule(check({ "index.html": page('  <luz-banner tone="warning">x</luz-banner>') }), "element/")).toEqual([]);
  });

  it("never echoes an attribute name that is not safe to print", () => {
    const result = check({ "index.html": page(`  <luz-timeline ${"a".repeat(100)}="1"><ol><li>1</li></ol></luz-timeline>`) });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].message).toContain(UNREADABLE);
    expect(result.findings[0].suggestion).toBeNull();
  });
});

/* ---- attr/unknown-hook --------------------------------------------------------------------------- */

describe("attr/unknown-hook", () => {
  it("warns about a data-luz-* attribute on any element that no manifest knows, at the attribute", () => {
    const html = page('  <p data-luz-sparkle="on">x</p>');
    const result = check({ "index.html": html });
    const at = where(html, "data-luz-sparkle");
    expect(result.code, "a warning does not fail").toBe(0);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ rule: "attr/unknown-hook", severity: "warn", line: at.line, column: at.column });
    expect(result.findings[0].message).toBe(messages.message("attr/unknown-hook", { attribute: "data-luz-sparkle" }));
    expect(result.findings[0].docs).toBe(messages.docsUrl("attr/unknown-hook"));
  });

  it("fails --strict", () => {
    const dir = workspace({ "index.html": page('  <p data-luz-sparkle="on">x</p>') });
    expect(run([".", "--strict"], { version: VERSION, cwd: dir, data: miniSnapshot() }).code).toBe(1);
  });

  it("knows the hooks of the manifests, the attributes of every element and the label overrides", () => {
    const html = page(
      [
        "  <div data-luz-classless>classless</div>",
        '  <table><thead><tr><th data-luz-sort>Plan</th></tr></thead></table>',
        '  <nav data-luz-spy>spy</nav>',
        '  <div data-luz-search-src="/search-index.json">the attribute of luz-search, on a div</div>',
        '  <div data-luz-label-anything="Any">a label override</div>',
        '  <p data-testid="x" data-luzz-x="1">not a hook</p>',
      ].join("\n"),
    );
    expect(ofRule(check({ "index.html": html }), "attr/")).toEqual([]);
  });

  it("leaves a LUZ element to element/unknown-attribute: one finding, not two", () => {
    const result = check({ "index.html": page('  <luz-timeline data-luz-sparkle="on"><ol><li>1</li></ol></luz-timeline>') });
    expect(result.findings.map((f) => f.rule)).toEqual(["element/unknown-attribute"]);
  });

  it("reads the hooks of the project's own node_modules before the snapshot's", () => {
    const html = page('  <div data-luz-newhook>x</div>');
    const old = check({ "index.html": html });
    expect(ofRule(old, "attr/").map((f) => f.rule)).toEqual(["attr/unknown-hook"]);
    const installed = check({ "index.html": html }, { installed: { version: "9.9.0", overrides: { core: { hooks: [...MINI.core.hooks, "data-luz-newhook"] } } } });
    expect(ofRule(installed, "attr/")).toEqual([]);
  });
});

/* ---- class/unknown-in-css and class/reserved-prefix ------------------------------------------- */

describe("class/unknown-in-css and class/reserved-prefix", () => {
  it("warns about an unknown .luz-* class in a selector, at its dot, with the closest class", () => {
    const css = ".promo .luz-btn-primary {\n  margin: 0;\n}\n";
    const result = check({ "site.css": css });
    expect(result.code).toBe(0);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ rule: "class/unknown-in-css", severity: "warn", file: "site.css", line: 1, column: 8, suggestion: ".luz-btn--primary" });
    expect(Object.keys(result.findings[0]).sort()).toEqual(BASE_KEYS);
    expect(result.findings[0].message).toBe(messages.message("class/unknown-in-css", { name: "luz-btn-primary", closest: "luz-btn--primary" }));
    expect(result.findings[0].docs).toBe(messages.docsUrl("class/unknown-in-css"));
  });

  it("says where to look when nothing is close, and fails --strict", () => {
    const dir = workspace({ "site.css": ".promo .luz-completely-unrelated-thing {\n  margin: 0;\n}\n" });
    const data = miniSnapshot();
    const result = checkJson(["."], dir, { data });
    expect(result.data.findings).toHaveLength(1);
    expect(result.data.findings[0].message).toBe(messages.message("class/unknown-in-css:none", { name: "luz-completely-unrelated-thing", package: "core" }));
    expect(run([".", "--strict"], { version: VERSION, cwd: dir, data }).code).toBe(1);
  });

  it("warns that a stylesheet defines a class of LUZ's prefix, once, and not also as unknown", () => {
    const result = check({ "site.css": "/* a promo */\n.luz-promo {\n  margin: 0;\n}\n" });
    expect(result.findings.map((f) => [f.rule, f.severity, f.line, f.column])).toEqual([["class/reserved-prefix", "warn", 2, 1]]);
    expect(result.findings[0].message).toBe(messages.message("class/reserved-prefix", { name: "luz-promo" }));
    expect(result.findings[0].docs).toBe(messages.docsUrl("class/reserved-prefix"));
  });

  it("leaves a stylesheet that styles LUZ's own classes, and any other prefix", () => {
    const css = [
      ".luz-btn {\n  margin: 0;\n}",
      ".luz-btn--primary:hover {\n  margin: 0;\n}",
      ".promo .luz-card__title {\n  margin: 0;\n}",
      ".luz-table--compact td {\n  margin: 0;\n}",
      ".o-zebra,\n.u-brand-gradient {\n  margin: 0;\n}",
      "",
    ].join("\n");
    expect(ofRule(check({ "site.css": css }), "class/")).toEqual([]);
  });

  it("finds the class inside a media query, and not in a comment or a string", () => {
    const css = ["/* .luz-btn-primary */", "@media (min-width: 40rem) {", "  .promo .luz-btn-primary {", "    margin: 0;", "  }", "}", '.promo::after {', '  content: ".luz-btn-primary";', "}", ""].join("\n");
    const result = check({ "site.css": css });
    expect(result.findings.map((f) => [f.rule, f.line, f.column])).toEqual([["class/unknown-in-css", 3, 10]]);
  });
});

/* ---- Where the facts come from ------------------------------------------------------------------ */

describe("the manifests: node_modules first, then the snapshot", () => {
  const LUZ_PAGE = page('  <button class="luz-btn luz-newthing">x</button>');

  it("lists the seven packages in dependency order, from the snapshot when there is no node_modules", () => {
    const result = check({ "index.html": LUZ_PAGE }, { snapshot: { version: "0.1.0" } });
    expect(result.data.manifests).toEqual(LIBRARIES.map((name) => ({ package: `@luz-ds/${name}`, version: "0.1.0", source: "bundled" })));
    expect(run(["."], { version: VERSION, cwd: result.dir, data: miniSnapshot() }).stdout).toMatch(/\(manifests: @luz-ds\/tokens 0\.1\.0 from bundled, @luz-ds\/core 0\.1\.0 from bundled,/);
  });

  it("reads node_modules/@luz-ds/<pkg>/dist: a manifest newer than the snapshot wins, and says which release", () => {
    const overrides = { core: { version: "9.9.0", classes: [...MINI.core.classes, "luz-newthing"] } };
    const result = check({ "index.html": LUZ_PAGE }, { installed: { version: "0.1.0", overrides, only: ["core"] }, snapshot: { version: "0.1.0" } });
    expect(ofRule(result, "class/")).toEqual([]);
    expect(result.data.manifests.map((m) => [m.package, m.version, m.source])).toEqual([
      ["@luz-ds/tokens", "0.1.0", "bundled"],
      ["@luz-ds/core", "9.9.0", "node_modules"],
      ["@luz-ds/site", "0.1.0", "bundled"],
      ["@luz-ds/landing", "0.1.0", "bundled"],
      ["@luz-ds/cms", "0.1.0", "bundled"],
      ["@luz-ds/app", "0.1.0", "bundled"],
      ["@luz-ds/docs", "0.1.0", "bundled"],
    ]);
    expect(run(["."], { version: VERSION, cwd: result.dir, data: miniSnapshot() }).stdout).toContain("@luz-ds/core 9.9.0 from node_modules");
  });

  it("is authoritative per package: a class only the snapshot's copy of core has is unknown", () => {
    const snapshot = { version: "0.1.0", overrides: { core: { classes: [...MINI.core.classes, "luz-oldthing"] } } };
    const html = page('  <p class="luz-oldthing">x</p>');
    expect(ofRule(check({ "index.html": html }, { snapshot }), "class/")).toEqual([]);
    const installed = check({ "index.html": html }, { snapshot, installed: { version: "0.2.0", only: ["core"] } });
    expect(ofRule(installed, "class/").map((f) => f.message.split(" ")[0])).toEqual([".luz-oldthing"]);
  });

  it("walks up from the directory of the file, not only from the working directory", () => {
    const result = check({ "apps/web/index.html": page('  <p class="luz-newthing">x</p>') }, {
      installed: { version: "0.3.0", overrides: { core: { classes: [...MINI.core.classes, "luz-newthing"] } }, only: ["core"] },
      argv: ["web/index.html"],
      cwd: "apps",
    });
    expect(ofRule(result, "class/")).toEqual([]);
    expect(result.data.manifests.find((m) => m.package === "@luz-ds/core")).toEqual({ package: "@luz-ds/core", version: "0.3.0", source: "node_modules" });
  });

  it("follows a symlinked package (pnpm), and only when its package.json names it", () => {
    const dir = workspace({ "index.html": LUZ_PAGE });
    linkPackage(dir, "core", { version: "7.7.7" });
    const linked = checkJson(["."], dir, { data: miniSnapshot() });
    expect(linked.data.manifests.find((m) => m.package === "@luz-ds/core")).toEqual({ package: "@luz-ds/core", version: "7.7.7", source: "node_modules" });

    const other = workspace({ "index.html": LUZ_PAGE });
    installPackages(other, { version: "7.7.7", only: ["core"] });
    writeFileSync(join(other, "node_modules/@luz-ds/core/package.json"), JSON.stringify({ name: "not-luz", version: "7.7.7" }));
    const renamed = checkJson(["."], other, { data: miniSnapshot() });
    expect(renamed.data.manifests.find((m) => m.package === "@luz-ds/core")).toMatchObject({ version: "0.1.0", source: "bundled" });
  });

  it("falls back to the snapshot for a manifest that is malformed, not a manifest, or over 8 MiB, and never crashes", () => {
    const base = { name: "@luz-ds/core", version: "7.7.7" };
    const bad = {
      "not JSON": "{",
      "no classes": JSON.stringify({ schema: 1, package: "@luz-ds/core", version: "7.7.7", classes: 5, properties: [] }),
      "a class with no name": JSON.stringify({ schema: 1, package: "@luz-ds/core", version: "7.7.7", classes: [{ kind: "component" }], properties: [] }),
      "over 8 MiB": JSON.stringify({ schema: 1, package: "@luz-ds/core", version: "7.7.7", classes: [], properties: [], pad: "x".repeat(8 * 1024 * 1024 + 16) }),
    };
    for (const [label, text] of Object.entries(bad)) {
      const dir = workspace({ "index.html": LUZ_PAGE });
      put(dir, "node_modules/@luz-ds/core/package.json", JSON.stringify(base));
      put(dir, "node_modules/@luz-ds/core/dist/classes.json", text);
      const result = checkJson(["."], dir, { data: miniSnapshot() });
      expect(result.code, label).toBe(1);
      expect(result.stderr, label).toBe("");
      expect(result.data.manifests.find((m) => m.package === "@luz-ds/core"), label).toMatchObject({ version: "0.1.0", source: "bundled" });
    }
  });

  it("reads nothing, and lists nothing, for files that name nothing of LUZ's, even when there is no snapshot", () => {
    const dir = workspace({ "index.html": page('  <p class="promo">x</p>', "") });
    const result = checkJson(["."], dir, { data: join(dir, "no-such-folder") });
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.data.manifests).toEqual([]);
  });

  it("stops with exit 2 and a line about manifests when a file names LUZ and there is none to read anywhere", () => {
    const dir = workspace({ "index.html": LUZ_PAGE });
    const result = run(["."], { version: VERSION, cwd: dir, data: join(dir, "no-such-folder") });
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/manifest/i);
    expect(result.stderr).not.toMatch(/\n\s+at \S|TypeError|ENOENT/);
  });
});

describe("a page that loads a LUZ release newer than the snapshot", () => {
  const CDN = (version) =>
    [
      `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@${version}/dist/luz-tokens.min.css">`,
      `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@${version}/dist/luz.min.css">`,
      "",
    ].join("\n");
  const body = '  <p class="luz-shiny-new-thing">x</p>';

  it("warns instead of blocking: the class may be one the checker has not met", () => {
    const result = check({ "index.html": page(body, CDN("0.2.0")) }, { snapshot: { version: "0.1.0" } });
    expect(result.code).toBe(0);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ rule: "class/unknown", severity: "warn" });
    expect(WORDS("class/unknown", result.findings[0].message)).toBe(true);
    expect(JSON.stringify(result.findings[0].details)).toContain("0.2.0");
    expect(JSON.stringify(result.findings[0].details)).toContain("0.1.0");
  });

  it("counts @luz-ds/docs among the packages whose release it reads from a CDN URL", () => {
    const head = CDN("0.1.0") + '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/docs@0.2.0/dist/docs.min.css">\n';
    const result = check({ "index.html": page('  <p class="luz-docs-shiny-new-thing">x</p>', head) }, { snapshot: { version: "0.1.0" } });
    expect(result.code).toBe(0);
    expect(result.findings.map((f) => [f.rule, f.severity])).toEqual([["class/unknown", "warn"]]);
    expect(JSON.stringify(result.findings[0].details)).toContain("0.2.0");
    // The same page with docs at the release the snapshot is: the class is unknown, and blocks
    const same = check({ "index.html": page('  <p class="luz-docs-shiny-new-thing">x</p>', head.replace("docs@0.2.0", "docs@0.1.0")) }, { snapshot: { version: "0.1.0" } });
    expect(same.findings.map((f) => [f.rule, f.severity])).toEqual([["class/unknown", "block"]]);
  });

  it("blocks when the page loads the release the snapshot is, or an older one, or none", () => {
    for (const links of [CDN("0.1.0"), CDN("0.0.9"), LINKS]) {
      const result = check({ "index.html": page(body, links) }, { snapshot: { version: "0.1.0" } });
      expect(result.findings.map((f) => [f.rule, f.severity])).toEqual([["class/unknown", "block"]]);
    }
  });

  it("says in messages.js that its variants are warnings", () => {
    for (const variant of WARNING_VARIANTS) {
      expect(messages.MESSAGES[variant], variant).toBeDefined();
      expect(messages.MESSAGES[variant].severity, variant).toBe("warn");
      expect(BLOCKING_RULES, variant).toContain(variant.split(":")[0]);
    }
  });
});

/* ---- parse/error in a template ------------------------------------------------------------------ */

describe("parse/error: a warning in a template file, blocking in .html and .css", () => {
  const BROKEN = '<p>fine</p>\n<p class="x"\n';

  it("has the template variant in messages.js, a warning, under the same rule id and docs", () => {
    expect(messages.MESSAGES["parse/error:template"], "a key parse/error:template in MESSAGES").toBeDefined();
    expect(messages.MESSAGES["parse/error:template"].severity).toBe("warn");
    expect(messages.docsUrl("parse/error:template")).toBe(messages.docsUrl("parse/error"));
  });

  it("warns for each extension of --ext, at the same position, and still names the rule parse/error", () => {
    for (const file of ["page.astro", "view.vue", "layout.njk"]) {
      const result = check({ [file]: BROKEN }, { argv: [".", "--ext", ".astro,.vue,.njk"] });
      expect(result.code, file).toBe(0);
      expect(result.findings.map((f) => [f.rule, f.severity, f.file, f.line, f.column]), file).toEqual([["parse/error", "warn", file, 2, 1]]);
    }
  });

  it("keeps .html and .css blocking", () => {
    const html = check({ "a.html": BROKEN });
    expect(html.code).toBe(1);
    expect(html.findings.map((f) => [f.rule, f.severity])).toEqual([["parse/error", "block"]]);
    const css = check({ "a.css": "a { margin: 0;\n" });
    expect(css.code).toBe(1);
    expect(css.findings.map((f) => [f.rule, f.severity])).toEqual([["parse/error", "block"]]);
  });
});

/* ---- Words, and the whole of it ------------------------------------------------------------------- */

describe("what the rules say", () => {
  it("takes every word from messages.js: each finding is a template of its rule, with its severity and docs URL", () => {
    const html = page(
      [
        '  <p class="luz-btn-primary luz-completely-unrelated-thing o-stak">x</p>',
        "  <luz-serach>x</luz-serach>",
        "  <luz-carousel>x</luz-carousel>",
        '  <luz-timeline autoplya speed="2"><ol><li>1</li></ol></luz-timeline>',
        '  <p data-luz-sparkle="on">x</p>',
      ].join("\n"),
    );
    const result = check({ "index.html": html, "site.css": ".promo .luz-btn-primary {\n  margin: 0;\n}\n.promo .luz-completely-unrelated-thing {\n  margin: 0;\n}\n.luz-promo {\n  margin: 0;\n}\n" });
    const ours = result.findings.filter((f) => PREFIXES.some((prefix) => f.rule.startsWith(prefix)));
    expect(new Set(ours.map((f) => f.rule))).toEqual(
      new Set(["class/unknown", "element/unknown", "element/unknown-attribute", "attr/unknown-hook", "class/unknown-in-css", "class/reserved-prefix"]),
    );
    for (const found of ours) {
      expect(WORDS(found.rule, found.message), `${found.rule}: ${found.message}`).toBe(true);
      expect(found.docs, found.rule).toBe(messages.docsUrl(found.rule));
      expect(found.message.length, found.rule).toBeLessThanOrEqual(120);
    }
  });

  it("writes no sentence of its own: no fragment of a template of messages.js is in another file of the package", () => {
    const fragments = new Set();
    for (const entry of Object.values(messages.MESSAGES)) {
      for (const part of entry.template.split(/\{[A-Za-z][A-Za-z0-9]*\}/)) if (part.trim().length >= 16) fragments.add(part.trim());
    }
    expect(fragments.size).toBeGreaterThan(5);
    const files = readdirSync(SRC, { recursive: true }).filter((name) => name.endsWith(".js") && name !== "messages.js");
    for (const name of files) {
      const text = readFileSync(join(SRC, name), "utf-8");
      for (const fragment of fragments) expect(text, `${name} repeats a message of messages.js`).not.toContain(fragment);
    }
  });
});

describe("suggest.js: the nearest name", () => {
  it("measures edits as Damerau-Levenshtein: an insertion, a replacement and a swap are one", () => {
    const { distance } = suggest;
    expect(distance("luz-btn", "luz-btn")).toBe(0);
    expect(distance("luz-btn-primary", "luz-btn--primary")).toBe(1);
    expect(distance("luz-card_title", "luz-card__title")).toBe(1);
    expect(distance("luz-bnt", "luz-btn")).toBe(1);
    expect(distance("kitten", "sitting")).toBe(3);
    expect(distance("", "abc")).toBe(3);
  });

  it("answers the nearest candidate within max(2, ceil(len/4)) and 40 % of the name, or null", () => {
    const { closest } = suggest;
    const candidates = ["luz-btn", "luz-btn--primary", "luz-btn--secondary", "luz-card"];
    expect(closest("luz-btn-primary", candidates)).toBe("luz-btn--primary");
    expect(closest("luz-bt", candidates)).toBe("luz-btn");
    expect(closest("luz-completely-different", candidates)).toBeNull();
    expect(closest("abcd", ["wxyz"])).toBeNull();
    expect(closest("ab", ["zz"])).toBeNull();
  });

  it("breaks a tie in code-unit order, and takes any iterable of candidates", () => {
    const { closest } = suggest;
    expect(closest("luz-btn--xl", ["luz-btn--sm", "luz-btn--lg"])).toBe("luz-btn--lg");
    expect(closest("luz-btn--xl", new Set(["luz-btn--sm", "luz-btn--lg"]))).toBe("luz-btn--lg");
  });

  it("does not measure a name over 64 characters, even against itself", () => {
    const { closest } = suggest;
    const long = `luz-${"a".repeat(80)}`;
    expect(closest(long, [long, `${long}b`])).toBeNull();
  });
});

/* ---- Cost -------------------------------------------------------------------------------------------- */

describe("the rules cost one pass: a file of 1 MB reads in under a second", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  const timed = (files, argv = ["."]) => {
    const dir = workspace(files);
    const start = performance.now();
    const result = checkJson(argv, dir, { data: snapshot.data });
    return { ms: performance.now() - start, ...result };
  };
  const BUDGET_MS = 1000;
  const SIZE = 1_000_000;

  it("1 MB of known classes, in one attribute and in many elements", () => {
    expect(snapshot.error).toBeNull();
    const tokens = "luz-btn luz-btn--primary luz-card o-stack u-sr-only ";
    const one = timed({ "one.html": `<button class="${tokens.repeat(Math.ceil(SIZE / tokens.length))}" type="button">x</button>\n` });
    expect(one.code, one.stderr).toBe(0);
    expect(one.ms).toBeLessThan(BUDGET_MS);
    const element = '<button class="luz-btn luz-btn--primary">x</button>\n';
    const many = timed({ "many.html": element.repeat(Math.ceil(SIZE / element.length)) });
    expect(many.code, many.stderr).toBe(0);
    expect(many.ms).toBeLessThan(BUDGET_MS);
  });

  it("1 MB of distinct unknown classes: the totals are complete, the findings are capped, the time is linear", () => {
    expect(snapshot.error).toBeNull();
    let text = "";
    let count = 0;
    while (text.length < SIZE) text += `luz-x${String(count++).padStart(7, "0")} `;
    const result = timed({ "big.html": `<p class="${text}">x</p>\n` });
    expect(result.ms).toBeLessThan(BUDGET_MS);
    expect(result.code).toBe(1);
    expect(result.data.summary.blocking).toBe(count);
    expect(result.data.summary.truncated).toBe(true);
    expect(result.data.findings.length).toBeLessThanOrEqual(200);
  });

  it("1 MB of unknown tags and attributes, and of one element with thousands of attributes", () => {
    expect(snapshot.error).toBeNull();
    const tag = '<luz-timeline speed="1" tempo="2"></luz-timeline>\n';
    const tags = timed({ "tags.html": tag.repeat(Math.ceil(SIZE / tag.length)) });
    expect(tags.ms).toBeLessThan(BUDGET_MS);
    expect(tags.code).toBe(1);
    let attributes = "";
    let n = 0;
    while (attributes.length < SIZE) attributes += `a${n++}="1" `;
    const wide = timed({ "wide.html": `<luz-timeline ${attributes}></luz-timeline>\n` });
    expect(wide.ms).toBeLessThan(BUDGET_MS);
    expect(wide.code).toBe(1);
  });

  it("1 MB of classes in a stylesheet", () => {
    expect(snapshot.error).toBeNull();
    let css = "";
    let n = 0;
    while (css.length < SIZE) css += `.luz-y${n++} .promo { margin: 0; }\n`;
    const result = timed({ "big.css": css });
    expect(result.ms).toBeLessThan(BUDGET_MS);
    expect(result.code).toBe(0);
    expect(result.data.summary.warnings).toBe(n);
  });
});

/* ---- The bundle, as it is installed ---------------------------------------------------------------------- */

describe("the built bin reads the snapshot next to it", () => {
  let bundle;
  beforeAll(async () => {
    const folder = mkdtempSync(join(tmpdir(), "luz-check-bin-"));
    const pkg = join(folder, "pkg");
    mkdirSync(join(pkg, "dist"), { recursive: true });
    writeFileSync(join(pkg, "package.json"), JSON.stringify({ name: "@luz-ds/check", version: "0.0.0", type: "module" }));
    try {
      const { buildCheck } = await import(/* @vite-ignore */ BUILDER);
      await buildCheck({ outdir: join(pkg, "dist") });
      bundle = { file: join(pkg, "dist", "luz-check.js"), folder, error: null };
    } catch (error) {
      bundle = { file: null, folder, error: error.message };
    }
  });
  afterAll(() => {
    if (bundle) rmSync(bundle.folder, { recursive: true, force: true });
  });

  const exec = (...args) => spawnSync(process.execPath, [bundle.file, ...args], { cwd: FIXTURES, encoding: "utf-8" });

  it("finds the typo of fail/class-typo.html from the snapshot, with no node_modules and no argument for it", () => {
    expect(bundle.error, "scripts/build-check.js builds the bundle and the snapshot").toBeNull();
    const result = exec("--json", "fail/class-typo.html");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(1);
    const data = JSON.parse(result.stdout);
    expect(data.findings.map((f) => [f.rule, f.line, f.column, f.suggestion])).toEqual([["class/unknown", 13, 13, ".luz-btn--primary"]]);
    expect(data.manifests.map((m) => [m.package, m.source])).toEqual(LIBRARIES.map((name) => [`@luz-ds/${name}`, "bundled"]));
    for (const manifest of data.manifests) expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("exits 0 over pass/", () => {
    expect(bundle.error).toBeNull();
    const result = exec("--json", "pass");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).findings.filter((f) => f.severity === "block")).toEqual([]);
  });
});
