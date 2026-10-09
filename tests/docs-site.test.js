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
  escapeHtml,
  expand,
  markCurrent,
  parseFrontMatter,
  relativizeLinks,
  renderPage,
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
  });

  it("marks Home on the landing and Docs on every docs page", () => {
    expect(currentOf("/")).toBe("/");
    expect(currentOf("/docs/")).toBe("/docs/");
    expect(currentOf("/docs/tokens/color/")).toBe("/docs/");
    expect(currentOf("/platform/")).toBe(null);
  });

  it("makes root-absolute links to known routes relative, and leaves the rest", () => {
    const routes = new Set(["/", "/docs/", "/docs/components/button/"]);
    const html = '<a href="/">a</a><a href="/docs/#x">b</a><a href="/docs/components/button/">c</a><a href="/packages/x.css">d</a><a href="/docs">e</a><a href="https://x.org/docs/">f</a>';
    expect(relativizeLinks(html, "/docs/components/button/", routes)).toBe(
      '<a href="../../../">a</a><a href="../../../docs/#x">b</a><a href="../../../docs/components/button/">c</a><a href="/packages/x.css">d</a><a href="/docs">e</a><a href="https://x.org/docs/">f</a>',
    );
    expect(relativizeLinks('<a href="/docs/#x">b</a>', "/", routes)).toBe('<a href="./docs/#x">b</a>');
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
    current: "/docs/",
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
    expect(markCurrent(html, "/")).toBe('<a class="brand" href="/">CAI</a><nav><a href="/" aria-current="page">Home</a></nav>');
    expect(markCurrent(html, null)).toBe(html);
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
    expect(html).toContain('<a href="/docs/" aria-current="page">Docs</a>');
    expect(html).toContain('  <main id="main-content">\n<p><a href="/docs/#main-content">Up</a></p>\n  </main>');
    expect(html).not.toContain(repoRoot); // SEC-PLG-10
    expect(buildSite(site, { legacy: ["/"] }).problems).toEqual([]);
  });

  it("reports broken links with the source file and line", () => {
    const { repoRoot, docsDir } = fixture({ "pages/a.html": PAGE("A", "<p>\n<a href=\"/docs/b/\">B</a></p>") });
    expect(buildSite(scanSite(docsDir, repoRoot), { legacy: ["/"] }).problems).toEqual(["apps/docs/pages/a.html:7: /docs/b/ is not a page of the site"]);
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
    expect(() => buildSite(scanSite(docsDir, repoRoot), { legacy: ["/"] })).toThrow(/include cycle a → b → a/);
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

  it("builds with every source well nested and every internal link resolving", () => {
    const { rendered, problems } = buildSite(site, { extra: [landing], legacy: ["/platform/", "/html/"] });
    expect(problems).toEqual([]);
    expect([...rendered.keys()].sort()).toEqual(["/", ...site.pages.map((p) => p.route)].sort());
  });

  it("renders one header for every page from the shared partial", () => {
    const { rendered } = buildSite(site, { extra: [landing], legacy: ["/platform/", "/html/"] });
    const header = (html) => html.match(/<header class="site-header"[\s\S]*?<\/header>/)[0];
    const partial = readFileSync(join(repo, "apps/docs/_partials/header.html"), "utf-8").trim();
    const flat = (html) => html.replace(/ aria-current="page"/g, "").replace(/\s+/g, " ");
    for (const [route, html] of rendered) {
      expect(flat(header(html)), route).toBe(flat(partial));
      const current = header(html).match(/<a href="([^"]*)" aria-current="page">/g);
      expect(current, route).toEqual([`<a href="${currentOf(route)}" aria-current="page">`]);
    }
  });
});
