/**
 * LUZ docs site generator (scripts/docs-site): front matter, routes, relative
 * URLs per depth, includes and placeholders, the strict HTML reader, the link
 * check and the security rules of .claude/plans/docs-redesign/security.md
 * (SEC-PLG-*). The real site is checked too: it must build with no problem.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readHtml } from "../scripts/docs-site/html.js";
import { findAll, parse, query, queryAllLive, textOf } from "./helpers/html-dom.js";
import { KIND_AREAS, PATTERN_AREAS } from "./helpers/package-areas.js";
import { readIndex, search } from "../packages/site/src/search.js";
import {
  SEARCH_INDEX_ROUTE,
  buildSearchIndex,
  buildSite,
  checkLinks,
  currentOf,
  landingDocuments,
  MAX_ESSENTIALS,
  essentialsOf,
  readingOrder,
  escapeHtml,
  expand,
  indexData,
  indexEntries,
  markCurrent,
  parseFrontMatter,
  readInside,
  relativizeLinks,
  renderPage,
  renderToc,
  rootOf,
  routeOfPage,
  scanSite,
} from "../scripts/docs-site/site.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- Fixture sites ------------------------------------------------------ */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const PAGE = (title, body = "<p>Hello.</p>", extra = "") =>
  `<!-- luz:page\ntitle: ${title}\ndescription: About ${title}.\narea: components\n${extra}-->\n${body}\n`;

const LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>{{title}}</title>
  <meta name="description" content="{{description}}">
</head>
<body>
  <!-- luz:include header -->
  <main id="main-content">
{{content}}
  </main>
</body>
</html>
`;

const HEADER = `<header id="site-header">
  <a class="brand" href="/">LUZ</a>
  <nav aria-label="Site">
    <a href="/">Home</a>
    <a href="/docs/">Docs</a>
  </nav>
</header>
`;

/** Write a docs folder: { "pages/index.html": "...", ... } plus defaults. */
function fixture(files = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-docs-site-"));
  temps.push(repoRoot);
  const docsDir = join(repoRoot, "apps/docs");
  const all = {
    "site.json": JSON.stringify({ areas: [{ id: "components", label: "Components", slug: "components" }] }),
    "_layouts/page.html": LAYOUT,
    "_partials/header.html": HEADER,
    "pages/index.html": PAGE("Home"),
    ...files,
  };
  for (const [path, text] of Object.entries(all)) {
    if (text === null) continue;
    mkdirSync(dirname(join(docsDir, path)), { recursive: true });
    writeFileSync(join(docsDir, path), text);
  }
  return { repoRoot, docsDir };
}

/* ---- Routes and URLs ---------------------------------------------------- */

describe("routes", () => {
  it("maps a page file to its route", () => {
    expect(routeOfPage("index.html")).toBe("/docs/");
    expect(routeOfPage("get-started.html")).toBe("/docs/get-started/");
    expect(routeOfPage("components/index.html")).toBe("/docs/components/");
    expect(routeOfPage("components/button.html")).toBe("/docs/components/button/");
  });

  it("refuses route segments outside [a-z0-9-] (SEC-PLG-4)", () => {
    for (const bad of ["Button.html", "-x.html", "a b.html", "../x.html", ".hidden.html", "café.html", "a/../b.html", "x.htm"]) {
      expect(() => routeOfPage(bad), bad).toThrow();
    }
  });

  it("gives the way back to the site root at any depth", () => {
    expect(rootOf("/")).toBe("./");
    expect(rootOf("/docs/")).toBe("../");
    expect(rootOf("/docs/components/button/")).toBe("../../../");
    expect(rootOf("/404.html")).toBe("./");
  });

  it("marks Home on the landing, Docs on every docs page and Components in its area", () => {
    const marks = (route) => Object.fromEntries(currentOf(route));
    expect(marks("/")).toEqual({ "/": "page" });
    expect(marks("/docs/")).toEqual({ "/docs/": "page" });
    expect(marks("/docs/tokens/color/")).toEqual({ "/docs/": "true" });
    expect(marks("/docs/components/")).toEqual({ "/docs/": "true", "/docs/components/": "page" });
    expect(marks("/docs/components/button/")).toEqual({ "/docs/": "true", "/docs/components/": "true" });
    expect(marks("/404.html")).toEqual({});
  });

  it("makes root-absolute links to known routes relative, and leaves the rest", () => {
    const routes = new Set(["/", "/docs/", "/docs/components/button/"]);
    const html = '<a href="/">a</a><a href="/docs/#x">b</a><a href="/docs/components/button/">c</a><a href="/packages/x.css">d</a><a href="/docs">e</a><a href="https://x.org/docs/">f</a>';
    expect(relativizeLinks(html, "/docs/components/button/", routes)).toBe(
      '<a href="../../../">a</a><a href="../../../docs/#x">b</a><a href="../../../docs/components/button/">c</a><a href="/packages/x.css">d</a><a href="/docs">e</a><a href="https://x.org/docs/">f</a>',
    );
    expect(relativizeLinks('<a href="/docs/#x">b</a>', "/", routes)).toBe('<a href="./docs/#x">b</a>');
    // The not-found page: from the site's path
    expect(relativizeLinks('<a href="/">a</a><a href="/docs/#x">b</a>', "/404.html", routes, "/luz/")).toBe('<a href="/luz/">a</a><a href="/luz/docs/#x">b</a>');
    // The search index URL of the dialog, from any depth
    const dialog = '<dialog class="luz-search" data-luz-search-src="/docs/search-index.json"></dialog>';
    expect(relativizeLinks(dialog, "/docs/components/button/", routes)).toContain('data-luz-search-src="../../../docs/search-index.json"');
    expect(relativizeLinks(dialog, "/", routes)).toContain('data-luz-search-src="./docs/search-index.json"');
  });
});

/* ---- Front matter ------------------------------------------------------- */

describe("front matter", () => {
  const areas = [{ id: "components", label: "Components" }];

  it("reads key: value lines, applies defaults and returns the body with its line", () => {
    const { meta, body, bodyLine } = parseFrontMatter(PAGE("Button", "\n\n<p>Body.</p>", "order: 30\n"), "x.html", areas);
    expect(meta).toMatchObject({ title: "Button", description: "About Button.", area: "components", order: "30", layout: "page", toc: "h2" });
    expect(body).toBe("<p>Body.</p>");
    expect(bodyLine).toBe(9);
  });

  it("fails on a missing comment, unknown key, missing required key or unknown area", () => {
    expect(() => parseFrontMatter("<p>x</p>", "x.html")).toThrow(/front matter/);
    expect(() => parseFrontMatter(PAGE("A", "", "colour: red\n"), "x.html")).toThrow(/unknown front matter key "colour"/);
    expect(() => parseFrontMatter("<!-- luz:page\ntitle: A\narea: components\n-->\n", "x.html")).toThrow(/needs "description"/);
    expect(() => parseFrontMatter(PAGE("A").replace("components", "widgets"), "x.html", areas)).toThrow(/unknown area "widgets"/);
    expect(() => parseFrontMatter(PAGE("A", "", "layout: ../evil\n"), "x.html")).toThrow(/layout/);
  });

  it("allows generate: gallery, a-z, snippets and ai, and nothing else", () => {
    for (const value of ["gallery", "a-z", "snippets", "ai"]) {
      expect(parseFrontMatter(PAGE("A", "", `generate: ${value}\n`), "x.html", areas).meta.generate, value).toBe(value);
    }
    expect(() => parseFrontMatter(PAGE("A", "", "generate: tokens\n"), "x.html", areas)).toThrow(/generate/);
  });
});

/* ---- Strict HTML reader ------------------------------------------------- */

describe("HTML reader", () => {
  it("collects ids, links and headings, skipping raw text and comments", () => {
    const html = `<section id="s">
  <h2 id="t">Title &amp; more</h2>
  <!-- <a href="#nope"> -->
  <script type="module" src="x.js"></script>
  <pre><code>&lt;a href="#nope"&gt;</code></pre>
  <div data-docs-specimen><h3 id="demo">Demo</h3></div>
  <p><a href="#t">Back</a> <img src="x.png" alt=""><br></p>
  <svg viewBox="0 0 1 1"><rect x="0" y="0" width="1" height="1"/></svg>
</section>`;
    const { ids, links, headings } = readHtml(html, "f.html");
    expect([...ids.keys()]).toEqual(["s", "t", "demo"]);
    expect(links).toEqual([{ href: "#t", line: 7 }]);
    expect(headings).toEqual([
      { level: 2, id: "t", text: "Title & more", line: 2, specimen: false },
      { level: 3, id: "demo", text: "Demo", line: 6, specimen: true },
    ]);
  });

  it("collects the short <code> names: their section, their own id and their table cell, never a sample or a demo", () => {
    const html = `<h2 id="v">Variants</h2>
<table><tr><td data-label="Class"><div><code>.luz-btn</code></div></td></tr></table>
<ul><li id="luz-brand-primary"><code>--luz-brand-primary</code></li></ul>
<pre><code>.not-a-name</code></pre>
<div data-docs-specimen><h3 id="demo">Demo</h3><code>.luz-demo</code></div>
<p><code>a &amp; b</code></p>`;
    const { codes } = readHtml(html, "f.html");
    expect(codes).toEqual([
      { text: ".luz-btn", line: 2, heading: "v", own: null, cell: "Class", specimen: false },
      { text: "--luz-brand-primary", line: 3, heading: "v", own: "luz-brand-primary", cell: null, specimen: false },
      { text: ".luz-demo", line: 5, heading: "v", own: null, cell: null, specimen: true },
      { text: "a & b", line: 6, heading: "v", own: null, cell: null, specimen: false },
    ]);
  });

  it("collects the swatches: a colour drawn without a <code>, linked to the label of its scale", () => {
    const html = `<h2 id="r">Ramps</h2>
<span id="ramp-blue">blue</span>
<ul aria-labelledby="ramp-blue"><li><span class="docs-swatch" style="--v: var(--luz-blue-60)" aria-hidden="true"></span>60</li></ul>
<div id="box"><span class="docs-swatch u-x" style="--v: var(--luz-gray-10)"></span><span class="docs-box" style="--v: var(--luz-space-md)"></span></div>`;
    const { swatches } = readHtml(html, "f.html");
    expect(swatches).toEqual([
      { token: "--luz-blue-60", line: 3, heading: "r", own: "ramp-blue" },
      { token: "--luz-gray-10", line: 4, heading: "r", own: "box" },
    ]);
  });

  it("fails with file:line on bad nesting", () => {
    expect(() => readHtml("<div>\n<span></div></span>", "f.html")).toThrow("f.html:2: </div> closes <span>");
    expect(() => readHtml("<div>\n<p>", "f.html")).toThrow("f.html:2: <p> is never closed");
    expect(() => readHtml("<p>Text\n<div>x</div></p>", "f.html")).toThrow(/f\.html:2: <div> inside an open <p>/);
    expect(() => readHtml("<div/>", "f.html")).toThrow(/not a void element/);
    expect(() => readHtml("</div>", "f.html")).toThrow(/no open element/);
    expect(() => readHtml('<a id="x"></a>\n<b id="x"></b>', "f.html")).toThrow('f.html:2: duplicate id "x" (first at line 1)');
    expect(() => readHtml('<a href="1" href="2"></a>', "f.html")).toThrow(/twice/);
  });
});

/* ---- "On this page" ------------------------------------------------------ */

describe("On this page", () => {
  const page = (toc) => ({ file: "p.html", meta: { toc } });
  const body = '<h2 id="a">A</h2><h2 id="b">B</h2><h3 id="b1">B one</h3><h3 id="b2">B two</h3><h2 id="c">C</h2><div data-docs-specimen><h3>Demo</h3></div>';

  it("lists each h3 in a nested list under its h2, and leaves demos out", () => {
    const html = renderToc(page("h2,h3"), body);
    const items = readHtml(html, "toc").links.map((l) => l.href);
    expect(items).toEqual(["#a", "#b", "#b1", "#b2", "#c"]);
    expect(html.replace(/\s+/g, " ")).toContain('href="#b">B</a> <ul class="luz-docs-rail__sub"> <li><a class="luz-sidebar__link luz-docs-rail__link" href="#b1">B one</a></li> <li><a class="luz-sidebar__link luz-docs-rail__link" href="#b2">B two</a></li> </ul> </li>');
    expect(html).not.toContain("Demo");
  });

  it("lists h2 only by default, and needs three of them", () => {
    expect(readHtml(renderToc(page("h2"), body), "toc").links.map((l) => l.href)).toEqual(["#a", "#b", "#c"]);
    expect(renderToc(page("h2"), '<h2 id="a">A</h2><h2 id="b">B</h2>')).toBe("");
    expect(renderToc(page("false"), body)).toBe("");
  });

  it("refuses a listed heading without an id, and an h3 before any h2", () => {
    expect(() => renderToc(page("h2"), "<h2>A</h2><h2 id='b'>B</h2><h2 id='c'>C</h2>")).toThrow(/needs an id/);
    expect(() => renderToc(page("h2,h3"), '<h3 id="x">X</h3><h2 id="a">A</h2><h2 id="b">B</h2><h2 id="c">C</h2>')).toThrow(/before any h2/);
  });
});

/* ---- Templates ---------------------------------------------------------- */

describe("includes and placeholders", () => {
  const partials = {
    header: "<header>\n  <nav>\n    <a href=\"/\">Home</a>\n    <a href=\"/docs/\">Docs</a>\n  </nav>\n</header>\n",
    outer: "<div>\n  <!-- luz:include inner -->\n</div>",
    inner: "<span>{{title}}</span>",
    loop: "<!-- luz:include loop -->",
  };
  const ctx = (extra = {}) => ({
    file: "t.html",
    partial: (name) => {
      if (!(name in partials)) throw new Error(`no partial ${name}`);
      return { text: partials[name], file: `_partials/${name}.html` };
    },
    values: { title: 'A "quoted" <title>', description: "d", root: "../", content: "<p>{{title}} <!-- luz:include header --></p>" },
    placeholders: true,
    current: new Map([["/docs/", "page"]]),
    ...extra,
  });

  it("indents an included partial to its line and marks the current link in the nav", () => {
    expect(expand("<body>\n  <!-- luz:include header -->\n</body>", ctx())).toBe(
      '<body>\n  <header>\n    <nav>\n      <a href="/">Home</a>\n      <a href="/docs/" aria-current="page">Docs</a>\n    </nav>\n  </header>\n</body>',
    );
    expect(expand("  <!-- luz:include outer -->", ctx())).toBe("  <div>\n    <span>A &quot;quoted&quot; &lt;title&gt;</span>\n  </div>");
  });

  it("escapes values for attributes and expands in a single pass (SEC-PLG-7)", () => {
    expect(expand('<meta content="{{title}}">', ctx())).toBe('<meta content="A &quot;quoted&quot; &lt;title&gt;">');
    // Raw content is inserted as it is, and what it contains is never expanded again
    expect(expand("{{content}}", ctx())).toBe("<p>{{title}} <!-- luz:include header --></p>");
    expect(escapeHtml(`"><script>'`)).toBe("&quot;&gt;&lt;script&gt;&#39;");
  });

  it("leaves placeholders alone in page bodies", () => {
    expect(expand("<p>{{title}}</p>", ctx({ placeholders: false }))).toBe("<p>{{title}}</p>");
  });

  it("fails on an unknown placeholder or include, a bad name, a cycle (SEC-PLG-3)", () => {
    expect(() => expand("{{nope}}", ctx())).toThrow(/unknown placeholder/);
    expect(() => expand("<!-- luz:include missing -->", ctx())).toThrow(/no partial missing/);
    expect(() => expand("<!-- luz:include ../../.npmrc -->", ctx())).toThrow(/not valid/);
    expect(() => expand("<!-- luz:include Header -->", ctx())).toThrow(/not valid/);
    expect(() => expand("<!-- luz:include loop -->", ctx())).toThrow(/cycle/);
  });

  it("marks only links inside a <nav>, never the brand link", () => {
    const html = '<a class="brand" href="/">LUZ</a><nav><a href="/">Home</a></nav>';
    expect(markCurrent(html, new Map([["/", "page"]]))).toBe('<a class="brand" href="/">LUZ</a><nav><a href="/" aria-current="page">Home</a></nav>');
    expect(markCurrent(html, new Map([["/", "true"]]))).toBe('<a class="brand" href="/">LUZ</a><nav><a href="/" aria-current="true">Home</a></nav>');
    expect(markCurrent(html, new Map())).toBe(html);
  });
});

/* ---- Link check --------------------------------------------------------- */

describe("link check", () => {
  const docs = [
    {
      route: "/docs/",
      ids: new Set(["top", "c-button"]),
      links: [
        { href: "#top", file: "a.html", line: 1 },
        { href: "#", file: "a.html", line: 2 },
        { href: "#missing", file: "a.html", line: 3 },
        { href: "/docs/components/button/#how", file: "a.html", line: 4 },
        { href: "/docs/components/button", file: "a.html", line: 5 },
        { href: "/docs/nope/", file: "a.html", line: 6 },
        { href: "/docs/components/button/#gone", file: "a.html", line: 7 },
        { href: "/packages/core/dist/luz.css", file: "a.html", line: 8 },
        { href: "https://example.com/docs/", file: "a.html", line: 9 },
        { href: "/site/#anything", file: "a.html", line: 10 },
        { href: "//evil.example/", file: "a.html", line: 11 },
      ],
    },
  ];
  const known = new Map([
    ["/docs/", new Set(["top", "c-button"])],
    ["/docs/components/button/", new Set(["how"])],
    ["/site/", null],
  ]);

  it("reports a missing id, a missing trailing slash, an unknown route and a missing fragment", () => {
    expect(checkLinks(docs, known)).toEqual([
      "a.html:3: #missing is not an id on /docs/",
      "a.html:5: /docs/components/button needs a trailing slash (/docs/components/button/)",
      "a.html:6: /docs/nope/ is not a page of the site",
      "a.html:7: /docs/components/button/#gone: #gone is not an id on /docs/components/button/",
    ]);
  });
});

/* ---- Scanning a site ---------------------------------------------------- */

describe("scanning and building a site", () => {
  it("finds every page, skips _ folders and renders the layout", () => {
    const { repoRoot, docsDir } = fixture({
      "pages/components/index.html": PAGE("Components"),
      "pages/components/button.html": PAGE("Button", '<p><a href="/docs/#main-content">Up</a></p>'),
      "pages/components/_draft/button.html": "<p>not a page</p>",
    });
    const site = scanSite(docsDir, repoRoot);
    expect(site.pages.map((p) => [p.file, p.route, p.depth])).toEqual([
      ["apps/docs/pages/index.html", "/docs/", 1],
      ["apps/docs/pages/components/index.html", "/docs/components/", 2],
      ["apps/docs/pages/components/button.html", "/docs/components/button/", 3],
    ]);
    const html = renderPage(site.byRoute.get("/docs/components/button/"), site);
    expect(html).toContain("<title>Button</title>");
    expect(html).toContain('<a href="/docs/" aria-current="true">Docs</a>');
    expect(html).toContain('  <main id="main-content">\n<p><a href="/docs/#main-content">Up</a></p>\n  </main>');
    expect(html).not.toContain(repoRoot); // SEC-PLG-10
    expect(buildSite(site, { unchecked: ["/"] }).problems).toEqual([]);
  });

  it("reports broken links with the source file and line", () => {
    const { repoRoot, docsDir } = fixture({ "pages/a.html": PAGE("A", "<p>\n<a href=\"/docs/b/\">B</a></p>") });
    expect(buildSite(scanSite(docsDir, repoRoot), { unchecked: ["/"] }).problems).toEqual(["apps/docs/pages/a.html:7: /docs/b/ is not a page of the site"]);
  });

  it("fails on an essential that is not a page, listed twice, or past the limit", () => {
    const site = (essentials) =>
      fixture({ "site.json": JSON.stringify({ areas: [{ id: "components", label: "Components", slug: "components", essentials }] }), "pages/components/index.html": PAGE("Components") });
    const scan = (essentials) => {
      const { repoRoot, docsDir } = site(essentials);
      return () => scanSite(docsDir, repoRoot);
    };
    expect(scan([{ href: "/docs/nope/" }])).toThrow(/essential \/docs\/nope\/ is not a page of the site/);
    expect(scan([{ href: "/docs/" }, { href: "/docs/" }])).toThrow(/listed twice/);
    expect(scan(Array.from({ length: MAX_ESSENTIALS + 1 }, () => ({ href: "/docs/" })))).toThrow(/up to 3/);
    expect(scan([{ href: "/docs/", label: "" }])).toThrow(/\{ href, label\? \}/);
    expect(scan([{ href: "/docs/" }])).not.toThrow();
  });

  it("fails when two files make the same route", () => {
    const { repoRoot, docsDir } = fixture({ "pages/a.html": PAGE("A"), "pages/a/index.html": PAGE("A again") });
    expect(() => scanSite(docsDir, repoRoot)).toThrow(/both make \/docs\/a\//);
  });

  it("fails on a symlink anywhere under pages/ or as a partial (SEC-PLG-2)", () => {
    const secret = join(tmpdir(), "luz-docs-site-secret.html");
    writeFileSync(secret, "<p>secret</p>");
    try {
      const one = fixture();
      symlinkSync(secret, join(one.docsDir, "pages/leak.html"));
      expect(() => scanSite(one.docsDir, one.repoRoot)).toThrow(/symlinks are not allowed/);

      const two = fixture();
      symlinkSync(secret, join(two.docsDir, "_partials/leak.html"));
      writeFileSync(join(two.docsDir, "pages/index.html"), PAGE("Home", "<!-- luz:include leak -->"));
      const site = scanSite(two.docsDir, two.repoRoot);
      expect(() => renderPage(site.pages[0], site)).toThrow(/symlinks are not allowed/);
    } finally {
      rmSync(secret, { force: true });
    }
  });

  it("refuses a partials or layouts folder that is a symlink out of the docs (SEC-PLG-1)", () => {
    // The folder's own real path follows the link: the root must be apps/docs
    const outside = mkdtempSync(join(tmpdir(), "luz-docs-site-outside-"));
    temps.push(outside);
    writeFileSync(join(outside, "header.html"), "<p>secret</p>");
    writeFileSync(join(outside, "page.html"), LAYOUT);
    for (const folder of ["_partials", "_layouts"]) {
      const { repoRoot, docsDir } = fixture();
      rmSync(join(docsDir, folder), { recursive: true });
      symlinkSync(outside, join(docsDir, folder));
      const site = scanSite(docsDir, repoRoot);
      expect(() => renderPage(site.pages[0], site), folder).toThrow(/outside the docs sources|symlinks are not allowed/);
    }
  });

  it("refuses a root that is itself a symlink (SEC-PLG-1)", () => {
    const { docsDir } = fixture();
    const link = join(dirname(docsDir), "docs-link");
    symlinkSync(docsDir, link);
    expect(() => readInside(join(docsDir, "site.json"), [link])).toThrow(/symlinks are not allowed/);
  });

  it("fails on a bad file name or a stray file in pages/ (SEC-PLG-4)", () => {
    const one = fixture({ "pages/Bad.html": PAGE("Bad") });
    expect(() => scanSite(one.docsDir, one.repoRoot)).toThrow(/not a valid route segment/);
    const two = fixture({ "pages/notes.txt": "x" });
    expect(() => scanSite(two.docsDir, two.repoRoot)).toThrow(/a page is an \.html file/);
  });

  it("refuses a <script>, <base> or <meta http-equiv> in a page or partial (SEC-PLG-12)", () => {
    for (const bad of ['<script src="x.js"></script>', '<base href="https://evil.example/">', '<meta http-equiv="refresh" content="0">']) {
      const { repoRoot, docsDir } = fixture({ "pages/index.html": PAGE("Home", `<div>\n${bad}\n</div>`) });
      expect(() => buildSite(scanSite(docsDir, repoRoot)), bad).toThrow(/belongs in a layout/);
    }
  });

  it("fails, instead of hanging, on partials that include each other", () => {
    const { repoRoot, docsDir } = fixture({
      "_partials/a.html": "<!-- luz:include b -->",
      "_partials/b.html": "<!-- luz:include a -->",
      "pages/index.html": PAGE("Home", "<!-- luz:include a -->"),
    });
    expect(() => buildSite(scanSite(docsDir, repoRoot), { unchecked: ["/"] })).toThrow(/include cycle a → b → a/);
  });

  it("fails on a duplicate id between the layout and the page", () => {
    const { repoRoot, docsDir } = fixture({ "pages/index.html": PAGE("Home", '<p id="main-content">x</p>') });
    expect(() => buildSite(scanSite(docsDir, repoRoot))).toThrow(/duplicate id "main-content"/);
  });
});

/* ---- The real site ------------------------------------------------------ */

describe("the LUZ docs site", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const landing = landingDocuments(site, "apps/landing/index.html", readFileSync(join(repo, "apps/landing/index.html"), "utf-8"));
  const homes = landing.map((d) => d.route);
  const { rendered, problems } = buildSite(site, { extra: landing });
  const pages = [...rendered].filter(([route]) => !homes.includes(route));

  it("builds with every source well nested, every internal link resolving and every catalog key used", () => {
    expect(problems).toEqual([]);
    expect(homes).toEqual(["/", "/es/", "/ar/"]);
    expect([...rendered.keys()].sort()).toEqual([...homes, "/404.html", ...site.pages.map((p) => p.route)].sort());
  });

  it("renders one header for every page from the shared partial, with the current links marked", () => {
    const header = (html) => html.match(/<header class="site-header"[\s\S]*?<\/header>/)[0];
    // The English docs header: the home page adds its language switcher, in its language
    const flat = (html) =>
      html
        .replace(/ aria-current="(page|true)"/g, "")
        .replace(/<luz-lang-switch>[\s\S]*?<\/luz-lang-switch>/, "")
        .replace(/\s+/g, " ");
    const docsHeader = flat(header(rendered.get("/docs/")));
    for (const [route, html] of rendered) {
      const own = header(html);
      if (route === "/" || !homes.includes(route)) expect(flat(own), route).toBe(docsHeader);
      expect(own.includes("<luz-lang-switch>"), route).toBe(homes.includes(route));
      // The site links (Home and Docs; the brand is not a navigation item) and the switcher's current language
      const marked = [...own.matchAll(/<a[^>]* href="([^"]*)"[^>]* aria-current="(page|true)">/g)].map(([, href, value]) => [href, value]);
      const expected = [...currentOf(route, homes)].filter(([href]) => href === "/docs/" || homes.includes(href));
      expect(marked, route).toEqual(homes.includes(route) ? [...expected, [route, "page"]] : expected);
    }
  });

  it("titles every page as \"<h1> – <area> – LUZ documentation\" and gives it one h1 (NAV-2)", () => {
    const titles = new Set();
    for (const [route, html] of pages) {
      const title = html.match(/<title>([^<]*)<\/title>/)[1];
      // The heading specimens of the HTML elements pages are aria-hidden h1s: the page h1 is .docs-title
      const h1 = [...html.matchAll(/<h1 class="docs-title">([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
      expect(h1, route).toHaveLength(1);
      expect(title.startsWith(h1[0].replace(/&amp;/g, "&")), `${route}: ${title}`).toBe(true);
      expect(title.endsWith("LUZ documentation"), route).toBe(true);
      expect(titles.has(title), `${route}: ${title} is not unique`).toBe(false);
      titles.add(title);
    }
  });

  it("marks the current page in the sidebar and its area with \"true\", in a flat list where every area is open (NAV-9, NAV-10)", () => {
    const everyPage = readingOrder(site).map((p) => p.route);
    for (const [route, html] of pages) {
      const list = query(parse(html, route), "ul.docs-nav");
      const links = findAll(list, (n) => n.name === "a");
      const current = links.filter((a) => a.attrs.get("aria-current") === "page").map((a) => a.attrs.get("href"));
      const page = site.byRoute.get(route);
      const area = site.areas.find((a) => a.id === page?.meta.area);
      expect(current, route).toEqual(area ? [route] : []);
      const parents = links.filter((a) => a.attrs.get("aria-current") === "true").map((a) => a.attrs.get("href"));
      expect(parents, route).toEqual(area && route !== `/docs/${area.slug}/` ? [`/docs/${area.slug}/`] : []);
      expect(links.filter((a) => (a.attrs.get("class") ?? "").includes("is-active")), route).toEqual([]);
      // Flat: not only the current area's pages, every page of every area
      const hrefs = links.map((a) => a.attrs.get("href"));
      for (const target of everyPage) expect(hrefs, `${route} lists ${target}`).toContain(target);
    }
  });

  it("lists every page in the A–Z index, and every HTML element", () => {
    // The index is two pages (A–L, then M–Z and Other): tests/az-split.test.js holds the split itself
    const az = `${rendered.get("/docs/a-z/")}\n${rendered.get("/docs/a-z/m-z/")}`;
    for (const page of site.pages.filter((p) => p.meta.search !== "false")) expect(az, page.route).toContain(`href="${page.route}"`);
    const elements = JSON.parse(readFileSync(join(repo, "tests/fixtures/html-elements.json"), "utf-8")).elements;
    for (const { name } of elements) expect(az, name).toContain(`#el-${name}"`);
  });

  it("reaches every component in two links from any page, without opening anything (ia.md §14)", () => {
    // Links shown at every width: the content of main (the header's site
    // links are in the closed drawer on a phone, "On this page" is closed).
    const components = site.pages.filter((p) => p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers");
    expect(components).toHaveLength(32);
    const visible = (html) => {
      const main = html.match(/<main[\s\S]*?<\/main>/)[0].replace(/<nav class="luz-docs-rail__onpage"[\s\S]*?<\/nav>/, "");
      return new Set([...[...main.matchAll(/href="(\/docs\/[^"#]*)/g)].map((m) => m[1])]);
    };
    const links = new Map([...rendered].map(([route, html]) => [route, visible(html)]));
    for (const [route] of rendered) {
      const one = links.get(route);
      const two = new Set([...one, ...[...one].flatMap((r) => [...(links.get(r) ?? [])])]);
      for (const c of components) expect(two.has(c.route), `${route} → ${c.route}`).toBe(true);
    }
  });

  it("gives every component and pattern page the same structure: example, known issues, then the Code and Design tabs (PRINCIPLES RL-18, SR-5)", () => {
    // ia.md §6 and a11y.md TAB-1/3/16/17. Every section of both tabs is
    // required; tests/docs-design.test.js checks what the Design sections say.
    const viewPages = site.pages.filter(
      (p) => (p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers") || (PATTERN_AREAS.includes(p.meta.area) && p.meta.group === "patterns"),
    );
    expect(viewPages).toHaveLength(57);
    const CODE = ["markup", "variants", "how", "no-js", "keyboard"];
    const DESIGN = ["when", "when-not", "do-dont", "content", "contrast", "tokens"];
    for (const page of viewPages) {
      const where = page.file;
      expect(page.meta.toc, where).toBe("h2,h3");
      const { headings } = readHtml(page.body, page.file);
      const h2 = headings.filter((h) => h.level === 2 && !h.specimen).map((h) => h.id);
      expect(h2, where).toEqual(["example", "known-issues", "code", "design"]);
      // The tab row: Code then Design, named after the page, linking the two panels
      const tabs = [...page.body.matchAll(/<a class="luz-tab" href="#([a-z-]+)" data-docs-view="([a-z]+)">([^<]*)<\/a>/g)].map((m) => m.slice(1).join(" "));
      expect(tabs, where).toEqual(["code-panel code Code", "design-panel design Design"]);
      expect(page.body, where).toContain(`<nav class="luz-tabs docs-view-tabs" aria-label="${page.meta.title} documentation">`);
      // Known issues before the tab row, so never inside a panel, and never empty
      const at = (text) => page.body.indexOf(text);
      expect(at('<h2 id="known-issues">'), where).toBeLessThan(at('<nav class="luz-tabs docs-view-tabs"'));
      expect(page.body, where).toMatch(/<h2 id="known-issues">Known issues<\/h2>\s*<p>[^<]{5,}/);
      // Each panel: its h2, then its sections in the template's order
      for (const [panel, heading, ids, required] of [
        ["code-panel", "code", CODE, CODE],
        ["design-panel", "design", DESIGN, DESIGN],
      ]) {
        const start = at(`<div class="luz-tabpanel docs-view" id="${panel}">`);
        expect(start, `${where} #${panel}`).toBeGreaterThan(0);
        const inner = page.body.slice(start).match(/^<div[^>]*>([\s\S]*?)\n {10}<\/div>/)[1];
        expect(inner.trim().startsWith(`<h2 class="docs-view__title" id="${heading}">`), `${where} #${heading}`).toBe(true);
        const sections = readHtml(inner, page.file).headings.filter((h) => h.level === 3).map((h) => h.id);
        const known = sections.filter((id) => ids.includes(id));
        expect(known, `${where} #${panel} order`).toEqual(ids.filter((id) => known.includes(id)));
        for (const id of required) expect(known, `${where} #${id}`).toContain(id);
        // It ends with the one line pointing at the other tab's notes
        expect(inner, `${where} #${panel}`).toMatch(/<p class="docs-view__xref"><a href="#[a-z-]+">[^<]+<\/a>[^<]+<\/p>\s*$/);
      }
      // RL-18: When to use and When not to use say something
      for (const id of ["when", "when-not"]) {
        const text = page.body.split(`<h3 id="${id}">`)[1].split("<h3")[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
        expect(text.length, `${where} #${id}`).toBeGreaterThan(20);
      }
    }
  });

  it("builds the search index from the same data as the A–Z index (SEC-IDX-5, SEC-PLG-9)", () => {
    const index = buildSearchIndex(site);
    expect(Object.keys(index)).toEqual(["version", "pages", "sections", "elements"]);
    expect(index.version).toBe(1);
    const items = [...index.pages, ...index.sections, ...index.elements];
    // Relative to the JSON file: no scheme, no root-absolute or backslash URL
    for (const [text, url] of items) {
      expect(typeof text, url).toBe("string");
      expect(url, text).not.toMatch(/^([a-z][a-z0-9+.-]*:|\/|\\)/i);
    }
    // Every URL is a page of the site and every fragment an id on it (a11y.md TEST-13)
    const base = `https://example.org${SEARCH_INDEX_ROUTE}`;
    for (const [text, url] of items) {
      const target = new URL(url, base);
      const html = rendered.get(target.pathname);
      expect(html, `${text}: ${url}`).toBeTruthy();
      if (target.hash) expect(html, `${text}: ${url}`).toContain(`id="${decodeURIComponent(target.hash.slice(1))}"`);
    }
    // The A–Z index and the search never disagree: every A–Z entry is a result
    const urls = new Set(items.map(([, url]) => new URL(url, base).pathname + new URL(url, base).hash));
    for (const entry of indexEntries(site)) expect(urls.has(entry.href), entry.href).toBe(true);
    // Pages, with their area
    expect(index.pages).toContainEqual(["Button", "components/button/", "Components"]);
    expect(index.pages).toContainEqual(["LUZ documentation", "./"]);
    expect(index.pages.find(([title]) => title === "A–Z index")).toBeUndefined();
    // Template headings are kept, their page and tab in the meta; the tab row is not
    expect(index.sections).toContainEqual(["When to use", "components/button/#when", "Button › Design"]);
    expect(index.sections).toContainEqual(["Keyboard and ARIA", "components/button/#keyboard", "Button › Code"]);
    expect(index.sections).toContainEqual(["Known issues", "components/button/#known-issues", "Button"]);
    expect(index.sections.filter(([, url]) => /#(example|code|design)$/.test(url))).toEqual([]);
    expect(index.elements).toContainEqual(["<table> element, Tables", "html/tables/#el-table"]);
    // Plain JSON, small enough to fetch on the first open
    expect(JSON.stringify(index).length).toBeLessThan(200_000);
  });

  it("lists each class and token once, at the part of the page that defines it, and a page's other names after its area", () => {
    const index = buildSearchIndex(site);
    // A class or a token is a section: its text, its page and tab, the id of the part that names it
    expect(index.sections).toContainEqual([".luz-btn--primary", "components/button/#variants", "Button › Code"]);
    expect(index.sections).toContainEqual([".o-container", "components/layout/#objects-reference", "Layout objects"]);
    expect(index.sections).toContainEqual(["--luz-brand-primary", "tokens/color/#luz-brand-primary", "Color"]);
    // A primitive is drawn as a swatch, with no <code>: it is listed at the label of its scale on the palette page
    const { color } = JSON.parse(readFileSync(new URL("../packages/tokens/tokens.json", import.meta.url), "utf-8"));
    for (const [family, steps] of Object.entries(color)) {
      for (const step of Object.keys(steps)) {
        expect(index.sections, `--luz-${family}-${step}`).toContainEqual([`--luz-${family}-${step}`, `tokens/palette/#ramp-${family}`, "Color palette"]);
      }
    }
    // A name a page only mentions goes to the page that documents it, never to an area index
    expect(index.sections).toContainEqual([".luz-select", "components/select/#variants", "Select › Code"]);
    expect(index.sections.filter(([text, url]) => /^(\.|--luz-)/.test(text) && url.startsWith("tokens/#"))).toEqual([]);
    const names = indexData(site).flatMap((e) => e.names.map((n) => n.text));
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThan(250);
    // Keywords: after the area, not already in the title; the page keeps its place
    expect(index.pages).toContainEqual(["Navbar", "components/navbar/", "Components · nav bar, navigation bar"]);
    // The page of the language switch is site/lang-switch/ (the tag is the block); its title is the page's own
    expect(index.pages.filter(([, url]) => url === "site/lang-switch/").map(([, , keywords]) => keywords)).toEqual(["Site · translation, locale, i18n, hreflang"]);
    expect(index.pages.filter(([, url]) => url === "site/lang-switcher/")).toEqual([]);
    expect(index.pages.filter(([, url]) => url === "site/notice/")).toEqual([]);
    expect(index.pages.filter(([, url]) => url === "site/banner/")).toHaveLength(1);
    // A keyword is never the title of another page: that page would come second in its own search
    const titles = new Set(site.pages.map((p) => p.meta.title.toLowerCase()));
    for (const { keywords, title } of indexData(site)) for (const k of keywords) expect(titles.has(k.toLowerCase()), `${title}: ${k}`).toBe(false);
    // The A–Z index lists them too, as "Another name for"
    expect(indexEntries(site)).toContainEqual({ name: "nav bar", href: "/docs/components/navbar/", kind: "Another name for Navbar" });
  });

  it("answers what a developer types: class names, tokens, other names, and a part of a title (the search of @luz-ds/site)", () => {
    const results = readIndex(buildSearchIndex(site), `https://example.org${SEARCH_INDEX_ROUTE}`);
    const [PAGES, SECTIONS] = [0, 1];
    const first = (query, group = SECTIONS) => search(results, query)[group].map((r) => r.text);
    expect(first("btn-primary")).toEqual([".luz-btn--primary"]);
    expect(first("--luz-brand-primary")).toEqual(["--luz-brand-primary"]);
    expect(first("--luz-blue-60")).toEqual(["--luz-blue-60"]);
    expect(first("blue-60")).toEqual(["--luz-blue-60"]);
    expect(first("navbar", PAGES)).toEqual(["Navbar"]);
    expect(first("container")).toContain(".o-container");
    expect(first("input", PAGES)).toEqual(["Form fields"]);
    expect(first("input")).toContain(".luz-input");
    // "grid" means the layout objects before it means the template headings of Icon grid
    const grid = search(results, "grid")[SECTIONS].slice(0, 8);
    expect(grid.map((r) => r.text)).toContain(".o-grid");
    expect(grid.filter((r) => r.meta?.startsWith("Icon grid"))).toEqual([]);
    // What was found by a page's name still is
    expect(first("keyboard tooltip")).toEqual(["Keyboard and ARIA"]);
  });

  /**
   * The Previous / Next targets of a rendered page, with the name of each link and whether it carries an
   * aria-label (it must not: the name is the visible text, WCAG 2.5.3), and its "Keep going" links.
   */
  const endOf = (html) => {
    const nav = html.match(/<nav class="docs-end" aria-labelledby="docs-end-title">[\s\S]*?<\/nav>/)?.[0] ?? null;
    const tree = parse(html, "page");
    const rel = (kind) => {
      const link = queryAllLive(tree, "a.luz-docs-pager__link").find((a) => a.attrs.get("rel") === kind);
      return link ? [link.attrs.get("href"), textOf(link), link.attrs.has("aria-label")] : null;
    };
    const links = nav?.match(/<ul class="docs-end__links">([\s\S]*?)<\/ul>/)?.[1].match(/href="[^"]*"/g)?.map((h) => h.slice(6, -1)) ?? [];
    return { nav, prev: rel("prev"), next: rel("next"), links };
  };

  it("reads the areas in sidebar order, each index first, every docs page once but the hub area and the not-found page", () => {
    const order = readingOrder(site).map((p) => p.route);
    const expected = site.pages.filter((p) => p.meta.area !== "hub" && p.meta.nav !== "false");
    expect([...order].sort()).toEqual(expected.map((p) => p.route).sort());
    expect(new Set(order).size).toBe(order.length);
    // The six area indexes, in site.json order, each before its own pages
    const indexes = site.areas.map((a) => `/docs/${a.slug}/`);
    expect(order.filter((r) => indexes.includes(r))).toEqual(indexes);
    for (const route of order) {
      const area = site.areas.find((a) => a.id === site.byRoute.get(route).meta.area);
      expect(order.indexOf(route), route).toBeGreaterThanOrEqual(order.indexOf(`/docs/${area.slug}/`));
    }
    // F4 (D7) and F5 (f5-ai-ready.md 6): Install, Choose your snippet, organised, how to read,
    // Make it yours, bundler, JavaScript, layers, print, Working with AI, Classless, then (F7 step 7,
    // f7-open-source.md) How LUZ is built last (so `/docs/tokens/` keeps its Previous link)
    expect(order.slice(0, 13)).toEqual([
      "/docs/get-started/",
      "/docs/get-started/snippet/",
      "/docs/get-started/structure/",
      "/docs/get-started/how-to-read/",
      "/docs/get-started/make-it-yours/",
      "/docs/get-started/bundler/",
      "/docs/get-started/javascript/",
      "/docs/get-started/layers/",
      "/docs/get-started/print/",
      "/docs/get-started/ai/",
      "/docs/get-started/classless/",
      "/docs/get-started/how-luz-is-built/",
      "/docs/tokens/",
    ]);
    expect(order.at(-1)).toBe("/docs/accessibility/");
  });

  it("numbers the Get started pages 1 to 12 in the reading order, with these titles", () => {
    const pages = readingOrder(site).filter((p) => p.meta.area === "get-started" && p.route !== "/docs/get-started/");
    const all = [site.byRoute.get("/docs/get-started/"), ...pages];
    expect(all.map((p) => [p.meta.order, p.meta.title])).toEqual([
      ["1", "Install LUZ"],
      ["2", "Choose your snippet"],
      ["3", "How LUZ is organised"],
      ["4", "How to read LUZ"],
      ["5", "Make it yours"],
      ["6", "With a bundler or framework"],
      ["7", "JavaScript modules"],
      ["8", "Cascade layers"],
      ["9", "Print styles"],
      ["10", "Working with AI"],
      ["11", "Classless styles"],
      ["12", "How LUZ is built"],
    ]);
  });

  it("generates the AI files and rules tables on its page: generate: ai, Working with AI, after Print styles", () => {
    const page = site.byRoute.get("/docs/get-started/ai/");
    expect(page?.meta.generate).toBe("ai");
    expect(page?.meta.area).toBe("get-started");
    expect(page?.meta.title).toBe("Working with AI");
    // the generator wrote the two tables under the hand-written sections
    const html = rendered.get("/docs/get-started/ai/") ?? "";
    expect(html, "the files table").toContain('id="files"');
    expect(html, "the rules table").toContain('id="rules"');
  });

  it("generates the snippet selector on its page: generate: snippets, the page after Install", () => {
    const page = site.byRoute.get("/docs/get-started/snippet/");
    expect(page?.meta.generate).toBe("snippets");
    expect(page?.meta.area).toBe("get-started");
    // the generator wrote the ten snippets (five kinds, two ways) under the hand-written intro
    const html = rendered.get("/docs/get-started/snippet/") ?? "";
    for (const id of ["atoms-npm", "atoms-cdn", "landing-npm", "landing-cdn", "blog-npm", "blog-cdn", "app-npm", "app-cdn", "docs-npm", "docs-cdn"]) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });

  it("ends every docs page but the hub and the not-found page with Previous or Next, a consistent chain (A.next = B ⇔ B.prev = A)", () => {
    const order = readingOrder(site).map((p) => p.route);
    for (const [route, html] of rendered) {
      const { nav, prev, next } = endOf(html);
      if (!order.includes(route)) {
        expect(nav, route).toBeNull();
        continue;
      }
      expect(prev || next, route).toBeTruthy();
      const i = order.indexOf(route);
      expect(prev?.[0] ?? null, route).toBe(order[i - 1] ?? null);
      expect(next?.[0] ?? null, route).toBe(order[i + 1] ?? null);
      if (next) expect(endOf(rendered.get(next[0])).prev?.[0], `${route} → ${next[0]}`).toBe(route);
      if (prev) expect(endOf(rendered.get(prev[0])).next?.[0], `${prev[0]} → ${route}`).toBe(route);
      // The name is the visible text, which way and where: "Previous Breadcrumb", with no aria-label (WCAG 2.5.3)
      for (const [kind, link] of [["Previous", prev], ["Next", next]]) {
        if (!link) continue;
        expect(link[1], route).toBe(`${kind} ${site.byRoute.get(link[0]).meta.title}`);
        expect(link[2], `${route}: ${kind} has an aria-label`).toBe(false);
      }
    }
    // Get started → Tokens → HTML elements → Components → Site → Accessibility
    expect(endOf(rendered.get("/docs/tokens/")).prev?.[0]).toBe("/docs/get-started/how-luz-is-built/");
    expect(endOf(rendered.get("/docs/tokens/")).next?.[0]).toBe("/docs/tokens/color/");
    expect(endOf(rendered.get("/docs/get-started/classless/")).next?.[0]).toBe("/docs/get-started/how-luz-is-built/");
    expect(endOf(rendered.get("/docs/get-started/how-luz-is-built/")).next?.[0]).toBe("/docs/tokens/");
    expect(endOf(rendered.get("/docs/html/")).prev?.[0]).toMatch(/^\/docs\/tokens\//);
    expect(endOf(rendered.get("/docs/components/")).prev?.[0]).toMatch(/^\/docs\/html\//);
    expect(endOf(rendered.get("/docs/site/")).prev?.[0]).toMatch(/^\/docs\/components\//);
  });

  it("lists up to three essentials per area (site.json), never the page itself nor its Previous / Next, all existing pages", () => {
    for (const area of site.areas) {
      expect(area.essentials?.length, area.id).toBeGreaterThan(0);
      expect(area.essentials.length, area.id).toBeLessThanOrEqual(MAX_ESSENTIALS);
    }
    for (const [route, html] of rendered) {
      const { nav, prev, next, links } = endOf(html);
      if (!nav) continue;
      const page = site.byRoute.get(route);
      expect(links, route).toEqual(essentialsOf(site, page).map((e) => e.route));
      expect(links.length, route).toBeGreaterThan(0);
      expect(links, route).not.toContain(route);
      for (const target of links) {
        expect(site.byRoute.has(target), `${route} → ${target}`).toBe(true);
        expect([prev?.[0], next?.[0]], `${route} → ${target}`).not.toContain(target);
      }
    }
    // Data, not code: the Tokens list, on its index and on one of its own targets
    expect(endOf(rendered.get("/docs/tokens/")).links).toEqual(["/docs/tokens/modes/", "/docs/components/", "/docs/tokens/figma/"]);
    expect(endOf(rendered.get("/docs/tokens/modes/")).links).toEqual(["/docs/components/", "/docs/tokens/figma/"]);
  });

  // F3 step 12: what moved out of site leaves its pages behind. Each went to core (shell and
  // actions to `layout`, section to `band`, image, skip link), to landing (hero, footer, header,
  // section) or to cms (header, footer, page header); the old URLs fall to the 404 page
  const LEFT_SITE = ["actions", "footer", "hero", "image", "lang-switcher", "notice", "page-header", "section", "shell", "site-header", "skip-link", "templates"];

  it("the Site area holds its six components and its class reference, and nothing of the page structure that moved out", () => {
    const routes = site.pages.filter((p) => p.meta.area === "site").map((p) => p.route).sort();
    expect(routes).toEqual(["/docs/site/", ...["banner", "classes", "consent", "lang-switch", "mode", "search", "submenu"].map((slug) => `/docs/site/${slug}/`)]);
    const patterns = site.pages.filter((p) => p.meta.area === "site" && p.meta.group === "patterns").map((p) => p.route);
    expect(patterns.sort()).toEqual(["banner", "consent", "lang-switch", "mode", "search", "submenu"].map((slug) => `/docs/site/${slug}/`));
  });

  // F3 step 15 (.claude/plans/specs/f3-package-model.md, §7 and §9): the structure page says what site
  // is now, in its chain of packages, not only in the table of parts below it
  it("the structure page's package chain lists site's six components and the three kinds, with site optional for them", () => {
    const body = site.byRoute.get("/docs/get-started/structure/").body;
    const chain = body
      .match(/<pre[^>]*aria-label="Package dependency chain"[^>]*><code>([\s\S]*?)<\/code><\/pre>/)[1]
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
    for (const tag of ["search", "consent", "mode", "lang-switch", "submenu", "banner"]) expect(chain, `site's ${tag}`).toContain(tag);
    for (const kind of ["landing", "cms", "app", "docs"]) expect(chain, `the ${kind} kind`).toContain(`@luz-ds/${kind}`);
    // Site no longer holds page structure ("page patterns"), and the kinds take it as an optional peer
    expect(chain).not.toMatch(/page patterns/i);
    expect(chain).toMatch(/optional/i);
  });

  it("every title of a page is its own: one page per name, except a header or footer of two different kinds of site", () => {
    const byTitle = new Map();
    for (const p of site.pages.filter((q) => q.meta.search !== "false")) byTitle.set(p.meta.title, [...(byTitle.get(p.meta.title) ?? []), p.meta.area]);
    const shared = [...byTitle].filter(([, areas]) => areas.length > 1 && !areas.every((a) => KIND_AREAS.includes(a)));
    expect(shared.map(([title, areas]) => `${title}: ${areas.join(" and ")}`)).toEqual([]);
  });

  it("nothing links to a page that left site: pages, partials, layouts, the home page, its catalogs and site.json", () => {
    const old = new RegExp(`/docs/site/(?:${LEFT_SITE.join("|")})/`);
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules") continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(html|json|js|css|md)$/.test(entry)) files.push(path);
      }
    };
    walk(join(repo, "apps"));
    for (const dir of ["packages/site", "packages/landing", "packages/cms", "packages/core"]) {
      for (const entry of ["README.md"]) if (existsSync(join(repo, dir, entry))) files.push(join(repo, dir, entry));
    }
    files.push(join(repo, "README.md"));
    const offenders = files.flatMap((file) =>
      readFileSync(file, "utf-8").split("\n").flatMap((line, i) => (old.test(line) ? [`${file.slice(repo.length + 1)}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });

  it("no page, partial, layout, home page or stylesheet of the apps uses a class or property of site's old blocks", () => {
    // `luz-site-mode` is the key of the stored colour mode. A sentence that says what a class was called before
    // F3 is fine; a `class` attribute (in a demo or in a snippet) or a selector is not
    const inMarkup = /\bclass=(?:"|&quot;)[^"&]*\bluz-site-(?!mode)/;
    const inCode = /\.luz-site-(?!mode)[a-z]|--luz-site-(?!mode)[a-z]/;
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules") continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(html|css|js|json)$/.test(entry)) {
          const code = /\.(css|js)$/.test(entry);
          readFileSync(path, "utf-8").split("\n").forEach((line, i) => {
            if ((code ? inCode : inMarkup).test(line)) offenders.push(`${path.slice(repo.length + 1)}:${i + 1}`);
          });
        }
      }
    };
    walk(join(repo, "apps"));
    expect(offenders).toEqual([]);
  });

  it("renders the not-found page with no <base> and no script (SEC-MISC-3/5)", () => {
    const html = rendered.get("/404.html");
    expect(html).not.toMatch(/<base\b/);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("<h1 class=\"docs-title\">Page not found</h1>");
  });
});

/* ---- The shared partials: apps/site/_partials (F2) ------------------------ */

describe("partials shared with the home page: apps/site/_partials", () => {
  /** A repository whose docs have no header of their own: it is in apps/site. */
  function shared(extra = {}) {
    const one = fixture({ "_partials/header.html": null, ...extra });
    mkdirSync(join(one.repoRoot, "apps/site/_partials"), { recursive: true });
    writeFileSync(join(one.repoRoot, "apps/site/_partials/header.html"), HEADER.replace("LUZ", "Shared header"));
    return one;
  }

  it("a layout includes a partial that lives in apps/site/_partials", () => {
    const { repoRoot, docsDir } = shared();
    const site = scanSite(docsDir, repoRoot);
    const html = renderPage(site.byRoute.get("/docs/"), site);
    expect(html).toContain("Shared header");
  });

  it("a partial of apps/docs/_partials is still found", () => {
    const { repoRoot, docsDir } = shared({ "_partials/note.html": "<p>Docs only.</p>", "pages/index.html": PAGE("Home", "<!-- luz:include note -->") });
    const site = scanSite(docsDir, repoRoot);
    expect(renderPage(site.byRoute.get("/docs/"), site)).toContain("Docs only.");
  });

  it("the file named in an error is the one that is wrong, with its folder", () => {
    const { repoRoot, docsDir } = shared({ "_partials/note.html": "<p>Docs only.</p><script>x</script>", "pages/index.html": PAGE("Home", "<!-- luz:include note -->") });
    const site = scanSite(docsDir, repoRoot);
    expect(() => renderPage(site.byRoute.get("/docs/"), site)).toThrow(/apps\/docs\/_partials\/note\.html/);
  });

  /** What the build says about the site, whether it throws or reports: the message, or "" when it is clean. */
  const outcome = (repoRoot, docsDir) => {
    try {
      const site = scanSite(docsDir, repoRoot);
      const { problems } = buildSite(site, { unchecked: ["/"] });
      for (const page of site.pages) renderPage(page, site);
      return problems.join("\n");
    } catch (error) {
      return String(error.message);
    }
  };

  it("a name that is in both folders is a build error, found at scan or at render", () => {
    const { repoRoot, docsDir } = shared({ "_partials/header.html": HEADER });
    expect(outcome(repoRoot, docsDir)).toMatch(/header[\s\S]*(both|twice)|(both|twice)[\s\S]*header/i);
  });

  it("a name that is in both folders is an error even when no page includes it", () => {
    const { repoRoot, docsDir } = shared({ "_partials/note.html": "<p>Docs.</p>" });
    writeFileSync(join(repoRoot, "apps/site/_partials/note.html"), "<p>Site.</p>");
    expect(outcome(repoRoot, docsDir)).toMatch(/note[\s\S]*(both|twice)|(both|twice)[\s\S]*note/i);
  });

  it("a partial of apps/site that is a symlink out of the repository is refused", () => {
    const secret = join(tmpdir(), "luz-docs-site-shared-secret.html");
    writeFileSync(secret, "<p>secret</p>");
    try {
      const { repoRoot, docsDir } = shared();
      symlinkSync(secret, join(repoRoot, "apps/site/_partials/leak.html"));
      writeFileSync(join(docsDir, "pages/index.html"), PAGE("Home", "<!-- luz:include leak -->"));
      const message = outcome(repoRoot, docsDir);
      expect(message).toMatch(/symlinks are not allowed|outside/);
      expect(message).not.toContain("secret</p>");
    } finally {
      rmSync(secret, { force: true });
    }
  });

  it("apps/site/_partials itself being a symlink out of the repository is refused, and nothing in it is read", () => {
    const outside = mkdtempSync(join(tmpdir(), "luz-docs-site-outside-"));
    temps.push(outside);
    writeFileSync(join(outside, "header.html"), "<header>secret header</header>\n");
    const { repoRoot, docsDir } = fixture({ "_partials/header.html": null });
    mkdirSync(join(repoRoot, "apps/site"), { recursive: true });
    symlinkSync(outside, join(repoRoot, "apps/site/_partials"));
    const message = outcome(repoRoot, docsDir);
    expect(message).toMatch(/symlinks are not allowed|outside/);
    expect(message).not.toContain("secret header");
  });

  it("the links of a shared partial are checked, with its file and line", () => {
    const { repoRoot, docsDir } = shared();
    writeFileSync(join(repoRoot, "apps/site/_partials/header.html"), `${HEADER}<a href="/docs/nowhere/">x</a>\n`);
    const problems = buildSite(scanSite(docsDir, repoRoot), { unchecked: ["/"] }).problems;
    expect(problems.some((p) => p.startsWith("apps/site/_partials/header.html:") && p.includes("/docs/nowhere/"))).toBe(true);
  });
});
