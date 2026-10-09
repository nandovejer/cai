/**
 * CAI docs site generator (scripts/docs-site): front matter, routes, relative
 * URLs per depth, includes and placeholders, the strict HTML reader, the link
 * check and the security rules of .claude/plans/docs-redesign/security.md
 * (SEC-PLG-*). The real site is checked too: it must build with no problem.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readHtml } from "../scripts/docs-site/html.js";
import {
  buildSite,
  checkLinks,
  currentOf,
  assertThumbSafe,
  escapeHtml,
  expand,
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
  `<!-- cai:page\ntitle: ${title}\ndescription: About ${title}.\narea: components\n${extra}-->\n${body}\n`;

const LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>{{title}}</title>
  <meta name="description" content="{{description}}">
</head>
<body>
  <!-- cai:include header -->
  <main id="main-content">
{{content}}
  </main>
</body>
</html>
`;

const HEADER = `<header id="site-header">
  <a class="brand" href="/">CAI</a>
  <nav aria-label="Site">
    <a href="/">Home</a>
    <a href="/docs/">Docs</a>
  </nav>
</header>
`;

/** Write a docs folder: { "pages/index.html": "...", ... } plus defaults. */
function fixture(files = {}) {
  const repoRoot = mkdtempSync(join(tmpdir(), "cai-docs-site-"));
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
    expect(relativizeLinks('<a href="/">a</a><a href="/docs/#x">b</a>', "/404.html", routes, "/cai/")).toBe('<a href="/cai/">a</a><a href="/cai/docs/#x">b</a>');
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
    expect(() => parseFrontMatter("<!-- cai:page\ntitle: A\narea: components\n-->\n", "x.html")).toThrow(/needs "description"/);
    expect(() => parseFrontMatter(PAGE("A").replace("components", "widgets"), "x.html", areas)).toThrow(/unknown area "widgets"/);
    expect(() => parseFrontMatter(PAGE("A", "", "layout: ../evil\n"), "x.html")).toThrow(/layout/);
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
    expect(html.replace(/\s+/g, " ")).toContain('href="#b">B</a> <ul class="docs-onpage__sub"> <li><a class="cai-sidebar__link docs-onpage__link" href="#b1">B one</a></li> <li><a class="cai-sidebar__link docs-onpage__link" href="#b2">B two</a></li> </ul> </li>');
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
    outer: "<div>\n  <!-- cai:include inner -->\n</div>",
    inner: "<span>{{title}}</span>",
    loop: "<!-- cai:include loop -->",
  };
  const ctx = (extra = {}) => ({
    file: "t.html",
    partial: (name) => {
      if (!(name in partials)) throw new Error(`no partial ${name}`);
      return { text: partials[name], file: `_partials/${name}.html` };
    },
    values: { title: 'A "quoted" <title>', description: "d", root: "../", content: "<p>{{title}} <!-- cai:include header --></p>" },
    placeholders: true,
    current: new Map([["/docs/", "page"]]),
    ...extra,
  });

  it("indents an included partial to its line and marks the current link in the nav", () => {
    expect(expand("<body>\n  <!-- cai:include header -->\n</body>", ctx())).toBe(
      '<body>\n  <header>\n    <nav>\n      <a href="/">Home</a>\n      <a href="/docs/" aria-current="page">Docs</a>\n    </nav>\n  </header>\n</body>',
    );
    expect(expand("  <!-- cai:include outer -->", ctx())).toBe("  <div>\n    <span>A &quot;quoted&quot; &lt;title&gt;</span>\n  </div>");
  });

  it("escapes values for attributes and expands in a single pass (SEC-PLG-7)", () => {
    expect(expand('<meta content="{{title}}">', ctx())).toBe('<meta content="A &quot;quoted&quot; &lt;title&gt;">');
    // Raw content is inserted as it is, and what it contains is never expanded again
    expect(expand("{{content}}", ctx())).toBe("<p>{{title}} <!-- cai:include header --></p>");
    expect(escapeHtml(`"><script>'`)).toBe("&quot;&gt;&lt;script&gt;&#39;");
  });

  it("leaves placeholders alone in page bodies", () => {
    expect(expand("<p>{{title}}</p>", ctx({ placeholders: false }))).toBe("<p>{{title}}</p>");
  });

  it("fails on an unknown placeholder or include, a bad name, a cycle (SEC-PLG-3)", () => {
    expect(() => expand("{{nope}}", ctx())).toThrow(/unknown placeholder/);
    expect(() => expand("<!-- cai:include missing -->", ctx())).toThrow(/no partial missing/);
    expect(() => expand("<!-- cai:include ../../.npmrc -->", ctx())).toThrow(/not valid/);
    expect(() => expand("<!-- cai:include Header -->", ctx())).toThrow(/not valid/);
    expect(() => expand("<!-- cai:include loop -->", ctx())).toThrow(/cycle/);
  });

  it("marks only links inside a <nav>, never the brand link", () => {
    const html = '<a class="brand" href="/">CAI</a><nav><a href="/">Home</a></nav>';
    expect(markCurrent(html, new Map([["/", "page"]]))).toBe('<a class="brand" href="/">CAI</a><nav><a href="/" aria-current="page">Home</a></nav>');
    expect(markCurrent(html, new Map([["/", "true"]]))).toBe('<a class="brand" href="/">CAI</a><nav><a href="/" aria-current="true">Home</a></nav>');
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
        { href: "/packages/core/dist/cai.css", file: "a.html", line: 8 },
        { href: "https://example.com/docs/", file: "a.html", line: 9 },
        { href: "/platform/#anything", file: "a.html", line: 10 },
        { href: "//evil.example/", file: "a.html", line: 11 },
      ],
    },
  ];
  const known = new Map([
    ["/docs/", new Set(["top", "c-button"])],
    ["/docs/components/button/", new Set(["how"])],
    ["/platform/", null],
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
      "pages/components/_thumbs/button.html": "<p>not a page</p>",
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

  it("fails when two files make the same route", () => {
    const { repoRoot, docsDir } = fixture({ "pages/a.html": PAGE("A"), "pages/a/index.html": PAGE("A again") });
    expect(() => scanSite(docsDir, repoRoot)).toThrow(/both make \/docs\/a\//);
  });

  it("fails on a symlink anywhere under pages/ or as a partial (SEC-PLG-2)", () => {
    const secret = join(tmpdir(), "cai-docs-site-secret.html");
    writeFileSync(secret, "<p>secret</p>");
    try {
      const one = fixture();
      symlinkSync(secret, join(one.docsDir, "pages/leak.html"));
      expect(() => scanSite(one.docsDir, one.repoRoot)).toThrow(/symlinks are not allowed/);

      const two = fixture();
      symlinkSync(secret, join(two.docsDir, "_partials/leak.html"));
      writeFileSync(join(two.docsDir, "pages/index.html"), PAGE("Home", "<!-- cai:include leak -->"));
      const site = scanSite(two.docsDir, two.repoRoot);
      expect(() => renderPage(site.pages[0], site)).toThrow(/symlinks are not allowed/);
    } finally {
      rmSync(secret, { force: true });
    }
  });

  it("refuses a partials or layouts folder that is a symlink out of the docs (SEC-PLG-1)", () => {
    // The folder's own real path follows the link: the root must be apps/docs
    const outside = mkdtempSync(join(tmpdir(), "cai-docs-site-outside-"));
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
      "_partials/a.html": "<!-- cai:include b -->",
      "_partials/b.html": "<!-- cai:include a -->",
      "pages/index.html": PAGE("Home", "<!-- cai:include a -->"),
    });
    expect(() => buildSite(scanSite(docsDir, repoRoot), { unchecked: ["/"] })).toThrow(/include cycle a → b → a/);
  });

  it("fails on a duplicate id between the layout and the page", () => {
    const { repoRoot, docsDir } = fixture({ "pages/index.html": PAGE("Home", '<p id="main-content">x</p>') });
    expect(() => buildSite(scanSite(docsDir, repoRoot))).toThrow(/duplicate id "main-content"/);
  });
});

/* ---- The real site ------------------------------------------------------ */

describe("the CAI docs site", () => {
  const site = scanSite(join(repo, "apps/docs"), repo);
  const landing = { route: "/", file: "apps/landing/index.html", html: readFileSync(join(repo, "apps/landing/index.html"), "utf-8") };
  const { rendered, problems } = buildSite(site, { extra: [landing] });
  const pages = [...rendered].filter(([route]) => route !== "/");

  it("builds with every source well nested and every internal link resolving", () => {
    expect(problems).toEqual([]);
    expect([...rendered.keys()].sort()).toEqual(["/", "/404.html", ...site.pages.map((p) => p.route)].sort());
  });

  it("renders one header for every page from the shared partial, with the current links marked", () => {
    const header = (html) => html.match(/<header class="site-header"[\s\S]*?<\/header>/)[0];
    const partial = readFileSync(join(repo, "apps/docs/_partials/header.html"), "utf-8").trim();
    const flat = (html) => html.replace(/ aria-current="(page|true)"/g, "").replace(/\s+/g, " ");
    for (const [route, html] of rendered) {
      expect(flat(header(html)), route).toBe(flat(partial));
      const marked = [...header(html).matchAll(/<a[^>]* href="([^"]*)" aria-current="(page|true)">/g)].map(([, href, value]) => [href, value]);
      expect(marked, route).toEqual([...currentOf(route)]);
    }
  });

  it("titles every page as \"<h1> – <area> – CAI documentation\" and gives it one h1 (NAV-2)", () => {
    const titles = new Set();
    for (const [route, html] of pages) {
      const title = html.match(/<title>([^<]*)<\/title>/)[1];
      // The heading specimens of the HTML elements pages are aria-hidden h1s: the page h1 is .docs-title
      const h1 = [...html.matchAll(/<h1 class="docs-title">([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
      expect(h1, route).toHaveLength(1);
      expect(title.startsWith(h1[0].replace(/&amp;/g, "&")), `${route}: ${title}`).toBe(true);
      expect(title.endsWith("CAI documentation"), route).toBe(true);
      expect(titles.has(title), `${route}: ${title} is not unique`).toBe(false);
      titles.add(title);
    }
  });

  it("marks the current page in the sidebar, its area with \"true\", and expands only that area (NAV-9, NAV-10)", () => {
    for (const [route, html] of pages) {
      const nav = html.match(/<ul class="docs-nav">[\s\S]*?\n {4}<\/ul>/)[0];
      const current = [...nav.matchAll(/aria-current="page" href="([^"]*)"/g)].map((m) => m[1]);
      const page = site.byRoute.get(route);
      const area = site.areas.find((a) => a.id === page?.meta.area);
      expect(current, route).toEqual(area ? [route] : []);
      const parents = [...nav.matchAll(/aria-current="true" href="([^"]*)"/g)].map((m) => m[1]);
      expect(parents, route).toEqual(area && route !== `/docs/${area.slug}/` ? [`/docs/${area.slug}/`] : []);
      expect(nav, route).not.toContain("is-active");
      // One nested list at most: the current area
      expect((nav.match(/<li><a class="cai-sidebar__link docs-nav__area"[^>]*>[^<]*<\/a>\n/g) ?? []).length, route).toBeLessThanOrEqual(1);
    }
  });

  it("lists every page in the A–Z index, and every HTML element", () => {
    const az = rendered.get("/docs/a-z/");
    for (const page of site.pages.filter((p) => p.meta.search !== "false")) expect(az, page.route).toContain(`href="${page.route}"`);
    const elements = JSON.parse(readFileSync(join(repo, "tests/fixtures/html-elements.json"), "utf-8")).elements;
    for (const { name } of elements) expect(az, name).toContain(`#el-${name}"`);
  });

  it("reaches every component in two links from any page, without opening anything (ia.md §14)", () => {
    // Links shown at every width: the header row (Components stays in it on a
    // phone) and the content of main; the drawer and "On this page" are closed.
    const components = site.pages.filter((p) => p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers");
    expect(components).toHaveLength(20);
    const visible = (html) => {
      const header = html.match(/<nav class="site-header__nav"[\s\S]*?<\/nav>/)[0];
      const main = html.match(/<main[\s\S]*?<\/main>/)[0].replace(/<nav class="docs-onpage"[\s\S]*?<\/nav>/, "");
      const row = [...header.matchAll(/<a([^>]*) href="([^"]*)"/g)].filter(([, attrs]) => attrs.includes("site-header__components")).map((m) => m[2]);
      return new Set([...row, ...[...main.matchAll(/href="(\/docs\/[^"#]*)/g)].map((m) => m[1])]);
    };
    const links = new Map([...rendered].map(([route, html]) => [route, visible(html)]));
    for (const [route] of rendered) {
      const one = links.get(route);
      const two = new Set([...one, ...[...one].flatMap((r) => [...(links.get(r) ?? [])])]);
      for (const c of components) expect(two.has(c.route), `${route} → ${c.route}`).toBe(true);
    }
  });

  it("gives every component and pattern page the same structure: example, known issues, then the Code and Design tabs (PRINCIPLES RL-18, SR-5)", () => {
    // ia.md §6 and a11y.md TAB-1/3/16/17. The sections still to come are not
    // required yet: Copy the markup (components), Variants and options,
    // Without JavaScript, Do and don't, Contrast and focus (EX-006).
    const viewPages = site.pages.filter(
      (p) => (p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers") || (p.meta.area === "platform" && p.meta.group === "patterns"),
    );
    expect(viewPages).toHaveLength(29);
    const CODE = ["markup", "variants", "how", "no-js", "keyboard"];
    const DESIGN = ["when", "when-not", "do-dont", "content", "contrast", "tokens"];
    for (const page of viewPages) {
      const where = page.file;
      expect(page.meta.toc, where).toBe("h2,h3");
      const { headings } = readHtml(page.body, page.file);
      const h2 = headings.filter((h) => h.level === 2 && !h.specimen).map((h) => h.id);
      expect(h2, where).toEqual(["example", "known-issues", "code", "design"]);
      // The tab row: Code then Design, named after the page, linking the two panels
      const tabs = [...page.body.matchAll(/<a class="cai-tab" href="#([a-z-]+)" data-docs-view="([a-z]+)">([^<]*)<\/a>/g)].map((m) => m.slice(1).join(" "));
      expect(tabs, where).toEqual(["code-panel code Code", "design-panel design Design"]);
      expect(page.body, where).toContain(`<nav class="cai-tabs docs-view-tabs" aria-label="${page.meta.title} documentation">`);
      // Known issues before the tab row, so never inside a panel, and never empty
      const at = (text) => page.body.indexOf(text);
      expect(at('<h2 id="known-issues">'), where).toBeLessThan(at('<nav class="cai-tabs docs-view-tabs"'));
      expect(page.body, where).toMatch(/<h2 id="known-issues">Known issues<\/h2>\s*<p>[^<]{5,}/);
      // Each panel: its h2, then its sections in the template's order
      for (const [panel, heading, ids, required] of [
        ["code-panel", "code", CODE, ["how", "keyboard"]],
        ["design-panel", "design", DESIGN, ["when", "when-not", "content"]],
      ]) {
        const start = at(`<div class="cai-tabpanel docs-view" id="${panel}">`);
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

  it("renders the not-found page with no <base> and no script (SEC-MISC-3/5)", () => {
    const html = rendered.get("/404.html");
    expect(html).not.toMatch(/<base\b/);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("<h1 class=\"docs-title\">Page not found</h1>");
  });

  it("keeps gallery thumbnails inert: no id, script, media, form or handler (HUB-2, SEC-PLG-12)", () => {
    expect(() => assertThumbSafe('<span id="x">a</span>', "t.html")).toThrow(/id/);
    expect(() => assertThumbSafe('<span onclick="x()">a</span>', "t.html")).toThrow(/onclick/);
    expect(() => assertThumbSafe("<video></video>", "t.html")).toThrow(/video/);
    expect(() => assertThumbSafe('<a href="javascript:x">a</a>', "t.html")).toThrow(/javascript/);
    expect(() => assertThumbSafe('<a href="java&#9;script:x">a</a>', "t.html")).toThrow(/script/);
    expect(() => assertThumbSafe('<a href=" JaVa\nScRiPt:x">a</a>', "t.html")).toThrow(/ScRiPt/);
    const gallery = rendered.get("/docs/components/");
    expect(gallery.match(/<div class="docs-card__thumb" inert aria-hidden="true">/g)).toHaveLength(20);
  });
});
