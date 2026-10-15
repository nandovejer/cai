/**
 * RL-19, from the other side: what a human is told to copy is what the tool
 * accepts. @luz-ds/check runs over the repository's own pages, partials,
 * layouts and home page, as a user of the package would run it, against the
 * snapshot the build bundles (`builtData()`), and finds nothing to block and
 * no hook LUZ does not read.
 *
 * What is read: apps/docs/pages/**.html (page fragments), apps/docs/_partials,
 * apps/docs/_layouts, apps/docs/404.html and apps/landing/**.html. The
 * templates carry the generator's markers (`{{t:key}}`, `{{content}}`,
 * `<!-- luz:include header -->`, the `<!-- luz:page -->` front matter); the
 * tool must read them as text, never as a mistake: that is asserted here on
 * its own, in a small project, and again on the real files.
 *
 * Nothing is excepted but what is not LUZ's namespace: `docs-*` classes and
 * `data-docs-*` attributes (the site's own). The tool already ignores them
 * (only luz-, o-, u- classes and data-luz-* attributes are its business), so
 * no list of exceptions is needed or allowed here.
 *
 * The data the tool reads is generated: after a change to a package's
 * scripts or stylesheets run its build (`pnpm core:build`, …) so that
 * dist/classes.json is current; tests/class-manifest.test.js says when it is
 * not.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ROOT, builtData, checkJson, miniSnapshot, removeWorkspaces, workspace } from "./helpers/check-fixtures.js";

const GLOBS = [
  "apps/docs/pages/**/*.html",
  "apps/docs/_partials/*.html",
  "apps/docs/_layouts/*.html",
  "apps/docs/404.html",
  "apps/landing/**/*.html",
];

/** Every .html under `dir` (relative to the repo, with `/`), sorted; node_modules left out. */
function htmlUnder(dir) {
  const out = [];
  for (const entry of readdirSync(join(ROOT, dir)).sort()) {
    if (entry === "node_modules") continue;
    const path = `${dir}/${entry}`;
    if (statSync(join(ROOT, path)).isDirectory()) out.push(...htmlUnder(path));
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

const EXPECTED_FILES = [
  ...htmlUnder("apps/docs/pages"),
  ...htmlUnder("apps/docs/_partials"),
  ...htmlUnder("apps/docs/_layouts"),
  "apps/docs/404.html",
  ...htmlUnder("apps/landing"),
].sort();

const say = (f) => `${f.file}:${f.line}:${f.column} ${f.rule} ${f.message}`;

afterAll(removeWorkspaces);

describe("luz-check reads the generator's markers as text", () => {
  const TEMPLATE = [
    "<!-- luz:page",
    "title: A page",
    "area: components",
    "files: components/button.css",
    "-->",
    "<!-- luz:include header -->",
    '<header class="site-header {{headerClass}}">',
    '  <a class="luz-btn luz-btn--{{variant}} docs-link" href="{{home}}" data-docs-view="code" data-docs-specimen>{{t:header.search}}</a>',
    '  <div class="{{wrapper}} luz-card" data-luz-label-results="{{t:search.results}}">{{html:header.az}}</div>',
    "</header>",
    "{{nav}}",
    "{{content}}",
    "",
  ].join("\n");
  let data;
  beforeAll(() => {
    data = miniSnapshot();
  });

  it("finds nothing wrong with {{…}} values, luz:include, front matter and a class built from a value", () => {
    const dir = workspace({ "page.html": TEMPLATE });
    const result = checkJson(["page.html"], dir, { data });
    expect(result.stderr).toBe("");
    expect(result.data.findings.map(say)).toEqual([]);
    expect(result.code).toBe(0);
  });

  it("does not let a marker switch the checking off: a real typo beside one is still found, once", () => {
    const text = TEMPLATE.replace('class="luz-btn luz-btn--{{variant}} docs-link"', 'class="luz-btn luz-crad luz-btn--{{variant}} docs-link"');
    const dir = workspace({ "page.html": text });
    const result = checkJson(["page.html"], dir, { data });
    expect(result.data.findings.map((f) => f.rule)).toEqual(["class/unknown"]);
    expect(result.data.findings[0].message).toContain(".luz-crad");
    expect(result.code).toBe(1);
  });

  it("ignores docs-* classes and data-docs-* attributes: they are not LUZ's namespace", () => {
    const html = '<div class="luz-card docs-example docs-demo__stage" data-docs-specimen data-docs-view="code" data-docs-copy-from="x"><p class="docs-view__title">x</p></div>\n';
    const dir = workspace({ "page.html": html });
    const result = checkJson(["page.html"], dir, { data });
    expect(result.data.findings.map(say)).toEqual([]);
    expect(result.code).toBe(0);
  });
});

describe("luz-check over the repository's own docs and home page", () => {
  let snapshot;
  let result;
  beforeAll(async () => {
    snapshot = await builtData();
    result = checkJson(GLOBS, ROOT, { data: snapshot.data });
  });

  it("runs, with the data the build bundles, and reads every page, partial, layout and the home page", () => {
    expect(snapshot.error).toBeNull();
    expect(result.stderr).toBe("");
    expect(result.data, result.stdout.slice(0, 300)).not.toBeNull();
    expect(EXPECTED_FILES.length).toBeGreaterThan(100);
    expect([...result.data.files].sort()).toEqual(EXPECTED_FILES);
    expect(result.data.skipped).toEqual([]);
    expect(result.data.summary.truncated).toBe(false);
  });

  it("reads the templates (their {{…}} and luz:include) without a parse error or a false block", () => {
    const withMarkers = EXPECTED_FILES.filter((file) => /\{\{|<!--\s*luz:/.test(readFileSync(join(ROOT, file), "utf-8")));
    expect(withMarkers.length).toBeGreaterThan(5);
    // a real mistake in a template is the next test's; here only the markers are judged
    const unreadable = result.data.findings.filter((f) => withMarkers.includes(f.file) && f.rule.startsWith("parse/"));
    expect(unreadable.map(say)).toEqual([]);
  });

  it("has no blocking finding: every class and element the docs show is one LUZ ships", () => {
    const blocking = result.data.findings.filter((f) => f.severity === "block");
    expect(blocking.map(say)).toEqual([]);
    expect(result.data.summary.blocking).toBe(0);
    expect(result.code).toBe(0);
  });

  it("has no data-luz-* attribute LUZ does not read (attr/unknown-hook)", () => {
    const hooks = result.data.findings.filter((f) => f.rule === "attr/unknown-hook");
    expect(hooks.map(say)).toEqual([]);
  });
});
