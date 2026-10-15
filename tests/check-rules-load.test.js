/**
 * F5 step 10, the rules of loading of @luz-ds/check: what a page links, and
 * in which order (.claude/plans/specs/f5-ai-ready.md 5.5 and 5.6 for
 * load/tokens-missing, load/package-missing, load/layer-statement,
 * load/order and load/no-stylesheet; F-4 and D8; the review answers of
 * accessibility-engineer "False blocks to prevent"; the notes from step 8).
 *
 * The misuse and a11y rules are tests/check-rules-misuse.test.js; the names
 * are tests/check-rules-names.test.js. The fixtures are read by the runner
 * of tests/helpers/check-fixtures.js, keyed by rule-id prefix.
 *
 * The contract, new in this step:
 *
 *   A LUZ stylesheet is something a document names, by `<link rel="stylesheet"
 *   href>` or by an `@import` in a `<style>` of the page (the url or the
 *   string), and the package it belongs to is read from the URL:
 *     - `@luz-ds/<pkg>` anywhere in it (node_modules, a CDN, a bare
 *       specifier `@luz-ds/landing/css`), or `/packages/<pkg>/` (the
 *       repository's dev server): that package, whatever the file, so a
 *       `components/*.css` file is its package;
 *     - else a file name of `luz.css` or `luz.min.css` (core) or
 *       `luz-tokens.css` or `luz-tokens.min.css` (tokens), the copies
 *       people make;
 *     - `site`, `landing`, `cms` and `app` with `.css` or `.min.css` as a
 *       file name, and nothing of the path, may be a copy of LUZ's or the
 *       project's own (app.css): it is not a LUZ link for the rules that
 *       block on what is linked, and it keeps load/package-missing silent
 *       for that package.
 *   Anything else is not LUZ's. A `<link>` or `@import` whose url is a
 *   template expression (`{{`, `<%`, `${`) may be anything: while a page has
 *   one, load/tokens-missing and load/package-missing are silent.
 *
 *   Where each rule points: load/tokens-missing at the first LUZ link of the
 *   package that needs tokens (the `<` of the `<link>`, or of the `<style>`);
 *   load/package-missing at the class attribute, or at the `<` of a tag, of
 *   the first use of each missing package, once per package; load/layer-
 *   statement at the `<` of the `<style>`; load/order and load/no-stylesheet
 *   have no position (line and column null) because they are about the
 *   document, or the run, as a whole.
 *
 *   load/no-stylesheet is one finding for the run: `count` is the number of
 *   checked HTML files that name LUZ and that no stylesheet reaches, `file`
 *   the first of them. It is silent when any checked file links or imports a
 *   LUZ stylesheet (an .html page, a .css file of the run), when any checked
 *   page loads a `<script type="module" src>` (a bundler brings the CSS,
 *   pass/bundled.html), when nothing checked names LUZ, and for a file that
 *   could not be read (fail/broken.html is its one parse/error).
 *
 *   load/package-missing needs the document to have at least one LUZ link
 *   or import; a document with none is load/no-stylesheet's, and so is a
 *   bundled one. A class counts for the package whose manifest defines it:
 *   a `is-*` state class and a class no manifest defines are nobody's to
 *   load. A tag counts for the package of its custom-elements manifest.
 *   A `<link>` to a stylesheet of the project, a file of the run that
 *   `@import`s a LUZ package, counts as that import.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../packages/check/src/cli.js";
import { checkModule } from "./helpers/check-modules.js";
import { FIXTURES, VERSION, builtData, checkCase, fixtureCases, key, miniSnapshot, passCases, removeWorkspaces, where, workspace } from "./helpers/check-fixtures.js";
import { check, links, linkTo, ofRule, page, rulesOf, wordsOf } from "./helpers/check-run.js";

const messages = await checkModule("messages");

afterAll(removeWorkspaces);

const PREFIXES = ["load/"];

const TOKENS = linkTo("tokens", "luz-tokens.min.css");
const CORE = linkTo("core", "luz.min.css");
const SITE = linkTo("site", "site.min.css");
const LANDING = linkTo("landing", "landing.min.css");
const style = (css) => `  <style>\n    ${css.split("\n").join("\n    ")}\n  </style>\n`;

/* ---- The fixtures ------------------------------------------------------------------------------ */

describe("the fixtures: every file makes the rules of loading say what its expect comments say", () => {
  let snapshot;
  beforeAll(async () => {
    snapshot = await builtData();
  });

  const cases = fixtureCases(PREFIXES);

  it("has the files this step needs, each with an expect comment", () => {
    const paths = cases.map((c) => c.path);
    for (const path of [
      "fail/core-without-tokens.html",
      "fail/layer-after.html",
      "fail/package-missing.html",
      "warn/load-order.html",
      "warn/no-stylesheet.html",
    ]) {
      expect(paths, path).toContain(path);
    }
  });

  it.each(cases)("$path: exactly its expected findings of load/, at the line and column it names", (entry) => {
    expect(snapshot.error, "the build writes dist/data (scripts/build-check.js)").toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.data, `stdout is JSON (stderr: ${result.stderr})`).not.toBeNull();
    expect(result.found.map(key)).toEqual(result.expected.map(key));
    for (const found of result.found) {
      expect(found.severity, key(found)).toBe(entry.folder === "fail" ? "block" : "warn");
      expect(found.file, key(found)).toBe(entry.path);
      expect(wordsOf(found.rule, found.message), `${key(found)} is worded by a template of messages.js`).toBe(true);
      expect(found.docs, key(found)).toBe(messages.docsUrl(found.rule));
    }
    if (entry.folder === "fail") expect(result.code).toBe(1);
    else expect(result.code, "a warning never fails").toBe(0);
  });

  it.each(passCases())("$path: nothing from the rules of loading (a bundled page, a CDN page and a framework page are not mistakes)", (entry) => {
    expect(snapshot.error).toBeNull();
    const result = checkCase(entry, PREFIXES, { data: snapshot.data });
    expect(result.found.map(key)).toEqual([]);
  });
});

/* ---- load/tokens-missing ----------------------------------------------------------------------- */

describe("load/tokens-missing", () => {
  it("blocks a page that links core and not tokens, at the first LUZ link, and names the package", () => {
    const html = page('  <p class="luz-card">x</p>', links(CORE));
    const result = check({ "index.html": html });
    const at = where(html, "<link");
    expect(result.code).toBe(1);
    expect(ofRule(result, "load/")).toHaveLength(1);
    const [found] = ofRule(result, "load/");
    expect(found).toMatchObject({ rule: "load/tokens-missing", severity: "block", file: "index.html", line: at.line, column: at.column, suggestion: null });
    expect(found.message).toBe(messages.message("load/tokens-missing", { package: "core" }));
    expect(found.docs).toBe(messages.docsUrl("load/tokens-missing"));
  });

  it.each([
    ["site", SITE],
    ["landing", LANDING],
  ])("names the package that needs tokens: only %s is linked", (pkg, link) => {
    const result = check({ "index.html": page('  <p class="o-stack">x</p>', links(link)) });
    const found = ofRule(result, "load/tokens-missing");
    expect(found).toHaveLength(1);
    expect(found[0].message).toBe(messages.message("load/tokens-missing", { package: pkg }));
  });

  it("is one finding, at the first of the links that need tokens, however many there are", () => {
    const html = page('  <p class="luz-card">x</p>', links(CORE, SITE, LANDING));
    const result = check({ "index.html": html });
    const found = ofRule(result, "load/tokens-missing");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ line: where(html, "<link").line });
    expect(found[0].message).toBe(messages.message("load/tokens-missing", { package: "core" }));
  });

  it("counts a file of components/ as its package: a link to one component of core still needs tokens", () => {
    const result = check({ "index.html": page('  <button class="luz-btn" type="button">x</button>', links(linkTo("core", "components/button.css"))) });
    const found = ofRule(result, "load/tokens-missing");
    expect(found).toHaveLength(1);
    expect(found[0].message).toBe(messages.message("load/tokens-missing", { package: "core" }));
  });

  it("is satisfied by tokens linked by any of the ways a page names a stylesheet", () => {
    const ways = {
      "after core (that is load/order's to warn about)": links(CORE, TOKENS),
      "the dev server's path": links('  <link rel="stylesheet" href="/packages/tokens/dist/luz-tokens.css">', '  <link rel="stylesheet" href="/packages/core/dist/luz.css">'),
      "a CDN": links(
        '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">',
        '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">',
      ),
      "copies in the project": links('  <link rel="stylesheet" href="vendor/luz-tokens.min.css">', '  <link rel="stylesheet" href="vendor/luz.min.css">'),
      "tokens.css of the package": links(linkTo("tokens", "tokens.min.css"), CORE),
      "an @import in a <style>": style('@import url("https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css");') + links(CORE),
    };
    for (const [label, head] of Object.entries(ways)) {
      const result = check({ "index.html": page('  <p class="luz-card">x</p>', head) });
      expect(rulesOf(result, "load/"), label).not.toContain("load/tokens-missing");
    }
  });

  it("reads the file name of a copy: luz.min.css alone is core, and needs tokens", () => {
    const result = check({ "index.html": page('  <p class="luz-card">x</p>', links('  <link rel="stylesheet" href="vendor/luz.min.css">')) });
    expect(ofRule(result, "load/").map((f) => f.message)).toEqual([messages.message("load/tokens-missing", { package: "core" })]);
  });

  it("is silent for a page with no LUZ stylesheet, or with only tokens, or with stylesheets of its own", () => {
    for (const head of [
      "",
      links(TOKENS),
      links('  <link rel="stylesheet" href="css/site.css">', '  <link rel="stylesheet" href="css/app.css">', '  <link rel="stylesheet" href="/apps/docs/site-header.css">'),
    ]) {
      const result = check({ "index.html": page('  <p class="o-stack">x</p>', head) });
      expect(rulesOf(result, "load/tokens-missing"), head).toEqual([]);
    }
  });

  it("is silent while the page names a stylesheet by a template expression: it may be tokens", () => {
    for (const href of ["{{ asset('luz-tokens.min.css') }}", "<%= asset_path('luz-tokens.css') %>", "${assets}/luz-tokens.css"]) {
      const head = links(CORE, `  <link rel="stylesheet" href="${href}">`);
      const result = check({ "index.html": page('  <p class="luz-card">x</p>', head) });
      expect(rulesOf(result, "load/"), href).toEqual([]);
    }
  });
});

/* ---- load/package-missing ---------------------------------------------------------------------- */

describe("load/package-missing", () => {
  it("blocks the first use of each package whose stylesheet is not linked, once per package, at the class attribute", () => {
    const html = page(
      [
        '  <main class="o-container">',
        '    <section class="luz-landing-hero"><h1 class="luz-landing-hero__title">Title</h1></section>',
        '    <article class="luz-cms-post"><h2 class="luz-cms-post__title">Post</h2></article>',
        '    <p class="luz-landing-main">again</p>',
        "  </main>",
      ].join("\n"),
      links(TOKENS, SITE),
    );
    const result = check({ "index.html": html });
    const found = ofRule(result, "load/");
    expect(result.code).toBe(1);
    expect(found.map((f) => [f.rule, f.severity, f.line, f.column])).toEqual([
      ["load/package-missing", "block", where(html, 'class="o-container"').line, where(html, 'class="o-container"').column],
      ["load/package-missing", "block", where(html, 'class="luz-landing-hero"').line, where(html, 'class="luz-landing-hero"').column],
      ["load/package-missing", "block", where(html, 'class="luz-cms-post"').line, where(html, 'class="luz-cms-post"').column],
    ]);
    expect(found.map((f) => f.message)).toEqual([
      messages.message("load/package-missing", { name: "o-container", package: "core" }),
      messages.message("load/package-missing", { name: "luz-landing-hero", package: "landing" }),
      messages.message("load/package-missing", { name: "luz-cms-post", package: "cms" }),
    ]);
    expect(found[0].docs).toBe(messages.docsUrl("load/package-missing"));
  });

  it("blocks a custom element of a package that is not linked, at its <, and names the element", () => {
    const html = page("  <luz-search><a href=\"/search/\">Search</a></luz-search>");
    const result = check({ "index.html": html });
    const found = ofRule(result, "load/");
    const at = where(html, "<luz-search>");
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "load/package-missing", severity: "block", line: at.line, column: at.column });
    expect(found[0].message).toContain("<luz-search>");
    expect(found[0].message).toContain("@luz-ds/site");
    expect(wordsOf("load/package-missing", found[0].message)).toBe(true);
  });

  it("is satisfied by the package's stylesheet, a component file of it, or an @import", () => {
    const body = '  <main class="o-container"><section class="luz-landing-hero"><luz-banner tone="warning">x</luz-banner></section></main>';
    const ways = {
      "the bundles": links(TOKENS, CORE, SITE, LANDING),
      "one component file each": links(TOKENS, linkTo("core", "components/button.css"), linkTo("site", "components/banner.css"), linkTo("landing", "components/hero.css")),
      "the dev server's paths": links(
        '  <link rel="stylesheet" href="/packages/tokens/dist/luz-tokens.css">',
        '  <link rel="stylesheet" href="/packages/core/dist/luz.css">',
        '  <link rel="stylesheet" href="/packages/site/dist/site.css">',
        '  <link rel="stylesheet" href="/packages/landing/dist/landing.css">',
      ),
      "@import in a <style>": style('@import "@luz-ds/tokens/css";\n@import "@luz-ds/core/css";\n@import url("@luz-ds/site/css");\n@import "@luz-ds/landing/css";'),
    };
    for (const [label, head] of Object.entries(ways)) {
      const result = check({ "index.html": page(body, head) });
      expect(rulesOf(result, "load/"), label).toEqual([]);
    }
  });

  it("is silent for a document with no LUZ stylesheet at all: that is load/no-stylesheet's, and a bundler's", () => {
    const bundled = page('  <section class="luz-landing-hero">x</section>', '  <script type="module" src="/src/main.js"></script>\n');
    expect(rulesOf(check({ "index.html": bundled }), "load/")).toEqual([]);
    const unlinked = page('  <section class="luz-landing-hero">x</section>', "");
    expect(rulesOf(check({ "index.html": unlinked }), "load/package-missing")).toEqual([]);
  });

  it("is silent while the page names a stylesheet by a template expression", () => {
    const head = links(TOKENS, CORE, '  <link rel="stylesheet" href="{{ asset(kind ~ \'.min.css\') }}">');
    const result = check({ "index.html": page('  <section class="luz-landing-hero">x</section>', head) });
    expect(rulesOf(result, "load/")).toEqual([]);
  });

  it("does not take a stylesheet of the project's own for LUZ's, but cannot tell a copy of a dist file from it", () => {
    const body = '  <section class="luz-landing-hero">x</section>';
    // css/theme.css is nobody's but the project's: landing is not linked
    const own = check({ "index.html": page(body, links(TOKENS, CORE, '  <link rel="stylesheet" href="css/theme.css">')) });
    expect(ofRule(own, "load/").map((f) => f.message)).toEqual([messages.message("load/package-missing", { name: "luz-landing-hero", package: "landing" })]);
    // vendor/landing.min.css and css/app.css may be a copy of LUZ's: not a mistake it can be sure of
    for (const href of ["vendor/landing.min.css", "vendor/landing.css", "css/landing.css"]) {
      const copy = check({ "index.html": page(body, links(TOKENS, CORE, `  <link rel="stylesheet" href="${href}">`)) });
      expect(rulesOf(copy, "load/"), href).toEqual([]);
    }
  });

  it("counts what a stylesheet of the run imports: a page that links the project's own css, which imports landing", () => {
    const html = page('  <section class="luz-landing-hero">x</section>', links(TOKENS, CORE, '  <link rel="stylesheet" href="css/own.css">'));
    const withImport = check({ "index.html": html, "css/own.css": '@import "@luz-ds/landing/css";\n.promo {\n  margin: 0;\n}\n' });
    expect(rulesOf(withImport, "load/")).toEqual([]);
    const without = check({ "index.html": html, "css/own.css": ".promo {\n  margin: 0;\n}\n" });
    expect(rulesOf(without, "load/")).toEqual(["load/package-missing"]);
  });

  it("leaves what no package loads: a state class, a name no manifest has, a name that is the project's own", () => {
    const html = page('  <p class="is-active luz-nothing-here o-zebra-crossing promo">x</p>', links(TOKENS));
    const result = check({ "index.html": html });
    expect(rulesOf(result, "load/")).toEqual([]);
  });

  it("is reported once however often the package's classes appear, and sorted with the other findings", () => {
    const html = page('  <p class="luz-landing-hero luz-landing-hero__title luz-landing-main">x</p>', links(TOKENS, CORE));
    const found = ofRule(check({ "index.html": html }), "load/");
    expect(found).toHaveLength(1);
    expect(found[0].message).toBe(messages.message("load/package-missing", { name: "luz-landing-hero", package: "landing" }));
  });
});

/* ---- load/layer-statement ---------------------------------------------------------------------- */

describe("load/layer-statement", () => {
  const BODY = '  <p class="luz-card">x</p>';

  it("blocks a <style> after the first LUZ link that declares the page's layers with luz among them, at the <style>", () => {
    const html = page(BODY, links(TOKENS, CORE) + style("@layer reset, luz, app;"));
    const result = check({ "index.html": html });
    const at = where(html, "<style");
    const found = ofRule(result, "load/");
    expect(result.code).toBe(1);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "load/layer-statement", severity: "block", file: "index.html", line: at.line, column: at.column });
    expect(found[0].message).toBe(messages.message("load/layer-statement", { tag: "style" }));
    expect(found[0].docs).toBe(messages.docsUrl("load/layer-statement"));
  });

  it("is silent when the same statement comes before the first LUZ link: that is what the layers page asks for", () => {
    const html = page(BODY, style("@layer reset, luz, app;") + links(TOKENS, CORE));
    expect(rulesOf(check({ "index.html": html }), "load/")).toEqual([]);
  });

  it("is silent for a later <style> when an earlier one already declared the layers", () => {
    const html = page(BODY, style("@layer reset, luz, app;") + links(TOKENS, CORE) + style("@layer reset, luz, app;"));
    expect(rulesOf(check({ "index.html": html }), "load/")).toEqual([]);
  });

  it("is silent for what is not a statement with luz in it: a block, a list without luz, no LUZ link at all", () => {
    const cases = {
      "a layer block": links(TOKENS, CORE) + style("@layer luz.components {\n  .promo {\n    margin: 0;\n  }\n}"),
      "the project's own layers": links(TOKENS, CORE) + style("@layer reset, app;"),
      "rules outside a layer": links(TOKENS, CORE) + style(".promo {\n  margin: 0;\n}"),
      "no LUZ link": style("@layer reset, luz, app;"),
    };
    for (const [label, head] of Object.entries(cases)) {
      expect(rulesOf(check({ "index.html": page(BODY, head) }), "load/"), label).toEqual([]);
    }
  });

  it("reports each <style> that does it, not the page's other styles", () => {
    const html = page(BODY, links(TOKENS, CORE) + style("@layer reset, luz;") + style(".promo {\n  margin: 0;\n}") + style("@layer luz, app;"));
    const found = ofRule(check({ "index.html": html }), "load/");
    expect(found.map((f) => [f.rule, f.line])).toEqual([
      ["load/layer-statement", where(html, "<style").line],
      ["load/layer-statement", where(html, "@layer luz, app;").line - 1],
    ]);
  });
});

/* ---- load/order -------------------------------------------------------------------------------- */

describe("load/order", () => {
  const body = '  <p class="o-container">x</p>';

  it("warns when core is linked before tokens, once for the document, with no position, and never fails", () => {
    const result = check({ "index.html": page(body, links(CORE, TOKENS)) });
    const found = ofRule(result, "load/");
    expect(result.code).toBe(0);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "load/order", severity: "warn", file: "index.html", line: null, column: null });
    expect(found[0].message).toBe(messages.message("load/order", { first: "core", second: "tokens" }));
    expect(found[0].docs).toBe(messages.docsUrl("load/order"));
  });

  it("names the first pair that is out of order: site before core", () => {
    const result = check({ "index.html": page(body, links(TOKENS, SITE, CORE)) });
    expect(ofRule(result, "load/").map((f) => [f.rule, f.message])).toEqual([["load/order", messages.message("load/order", { first: "site", second: "core" })]]);
  });

  it("is silent for the order the docs give, a component file of core after the bundle, and the kinds in any order", () => {
    const orders = {
      "tokens, core, site, landing": links(TOKENS, CORE, SITE, LANDING),
      "core's components after its bundle": links(TOKENS, CORE, linkTo("core", "components/button.css")),
      "landing, cms, app": links(TOKENS, CORE, linkTo("app", "app.min.css"), linkTo("cms", "cms.min.css")),
    };
    for (const [label, head] of Object.entries(orders)) {
      const result = check({ "index.html": page('  <p class="o-container">x</p>', head) });
      expect(rulesOf(result, "load/order"), label).toEqual([]);
    }
  });

  it("fails --strict, like any warning", () => {
    const dir = workspace({ "index.html": page(body, links(CORE, TOKENS)) });
    expect(run([".", "--strict"], { version: VERSION, cwd: dir, data: miniSnapshot() }).code).toBe(1);
  });
});

/* ---- load/no-stylesheet ------------------------------------------------------------------------ */

describe("load/no-stylesheet", () => {
  const PARTIAL = (name) => page(`  <p class="luz-card">${name}</p>`, "");

  it("warns once for the run, with the number of files, at no position, when nothing links or imports LUZ", () => {
    const result = check({ "partials/a.html": PARTIAL("a"), "partials/b.html": page('  <button class="luz-btn" type="button">b</button>', "") });
    const found = ofRule(result, "load/");
    expect(result.code, "a warning does not fail").toBe(0);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "load/no-stylesheet", severity: "warn", file: "partials/a.html", line: null, column: null });
    expect(found[0].message).toBe(messages.message("load/no-stylesheet", { count: "2" }));
    expect(found[0].docs).toBe(messages.docsUrl("load/no-stylesheet"));
  });

  it("counts one file as one, and fails --strict", () => {
    const dir = workspace({ "partial.html": PARTIAL("a") });
    const data = miniSnapshot();
    const result = run([".", "--json"], { version: VERSION, cwd: dir, data });
    const found = JSON.parse(result.stdout).findings.filter((f) => f.rule === "load/no-stylesheet");
    expect(found.map((f) => f.message)).toEqual([messages.message("load/no-stylesheet", { count: "1" })]);
    expect(run([".", "--strict"], { version: VERSION, cwd: dir, data }).code).toBe(1);
  });

  it("lets the other rules run: a mistake in the template is still found", () => {
    const result = check({ "partial.html": page('  <p class="luz-btn-primary">x</p>', "") });
    expect(result.findings.map((f) => [f.rule, f.severity])).toEqual([
      ["class/unknown", "block"],
      ["load/no-stylesheet", "warn"],
    ]);
    expect(result.code).toBe(1);
  });

  it("is silent when a file of the run links LUZ, as a layout does for its partials", () => {
    const result = check({ "layout.html": page('  <p class="luz-card">layout</p>'), "partials/a.html": PARTIAL("a") });
    expect(rulesOf(result, "load/")).toEqual([]);
  });

  it("is silent when a stylesheet of the run, or a <style>, imports LUZ", () => {
    const imported = check({ "css/main.css": '@import "@luz-ds/core/css";\n.promo {\n  margin: 0;\n}\n', "index.html": PARTIAL("a") });
    expect(rulesOf(imported, "load/no-stylesheet")).toEqual([]);
    const inline = check({ "index.html": page('  <p class="luz-card">a</p>', style('@import url("https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css");')) });
    expect(rulesOf(inline, "load/no-stylesheet")).toEqual([]);
  });

  it("is silent for a bundled page: a module script is where the CSS comes from", () => {
    const bundled = page('  <p class="luz-card">a</p>', '  <script type="module" src="/src/main.js"></script>\n');
    expect(rulesOf(check({ "index.html": bundled }), "load/")).toEqual([]);
  });

  it("is silent when nothing checked names LUZ, and for stylesheets alone", () => {
    const plain = check({ "index.html": page('  <p class="promo">a</p>', "") });
    expect(plain.findings).toEqual([]);
    const sheets = check({ "css/own.css": ".luz-btn {\n  margin: 0;\n}\n.promo {\n  margin: 0;\n}\n" });
    expect(rulesOf(sheets, "load/")).toEqual([]);
  });

  it("does not count a file that could not be read: its parse/error is the only finding", () => {
    const result = check({ "broken.html": '<p>fine</p>\n<a class="luz-btn" href="/pricing/"\n' });
    expect(result.findings.map((f) => f.rule)).toEqual(["parse/error"]);
    expect(result.code).toBe(1);
  });

  it("gives fail/broken.html the one finding it always had", () => {
    const result = run(["fail/broken.html", "--json"], { version: VERSION, cwd: FIXTURES, data: miniSnapshot() });
    expect(JSON.parse(result.stdout).findings.map((f) => f.rule)).toEqual(["parse/error"]);
  });
});
