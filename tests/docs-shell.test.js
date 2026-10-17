/**
 * LUZ docs site — the docs app adopts @luz-ds/docs (F6b), and the generator
 * writes the rest of the page (scripts/docs-site). What the generated pages
 * must do, from the markup of tests/fixtures/docs-patterns.html:
 *
 *   shell      body.o-shell.luz-docs-shell > nav.luz-sidebar.luz-docs-nav,
 *              main.luz-docs-main, then aside.luz-docs-rail "About this page"
 *   sidebar    flat: every area of site.json open, every page listed, no accordion
 *   page head  header.luz-docs-page-head: eyebrow "Area · Group", h1, lead and,
 *              on a component or pattern page, the chips
 *   rail       "On this page" (outside main) and the three actions
 *   index.md   every page also published as Markdown, from the text of llms-full.txt
 *   page foot  "Last updated <time>", Edit, Report
 *   pager      named by its visible text (WCAG 2.5.3), no aria-label
 *   gallery    `<!-- luz:generated -->` puts the area index's gallery where it stands
 *
 * The browser half (layout, clipboard, no JavaScript) is tests/docs-shell.spec.js.
 * The real site is checked for what is fixed by the front matter and site.json;
 * the rules that need a page of a given shape (the chips, the marker, the date of a
 * file git does not know) run on a small repository made for the test, which
 * copies the real layout and partials, so it renders what the real site renders.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readHtml } from "../scripts/docs-site/html.js";
import { LLMS_FULL_MAX, renderLlmsFull } from "../scripts/docs-site/ai.js";
import { docsSite } from "../scripts/docs-site/plugin.js";
import {
  areaOf,
  buildSite,
  neighboursOf,
  readingOrder,
  relativizeLinks,
  renderPage,
  scanSite,
} from "../scripts/docs-site/site.js";
import { find, findAll, hasClass, isInside, matcher, parse, query, queryAll, queryAllLive, queryLive, textOf } from "./helpers/html-dom.js";
import { PATTERN_AREAS, eyebrowPackageOf } from "./helpers/package-areas.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EDIT = "https://github.com/nandovejer/luz/edit/main/";
const ISSUES = "https://github.com/nandovejer/luz/issues/new?title=";

/* ---- Helpers ---------------------------------------------------------------- */

const pad = (n) => String(n).padStart(2, "0");
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const utcToday = () => new Date().toISOString().slice(0, 10);
/** The date of "today" is the local one or the UTC one: a run that crosses midnight must not flake. */
const isToday = (iso) => [localToday(), utcToday()].includes(iso);

const gitDate = (file) => {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: repo, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

/** A component or a pattern page: the pages that have the chips (docs-site.test.js defines them the same way). */
const isView = (p) =>
  (p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers") || (PATTERN_AREAS.includes(p.meta.area) && p.meta.group === "patterns");

/**
 * The number of known issues a page's "Known issues" section declares: its list items; without a list,
 * its paragraphs; "None known." is 0. Undefined when the page has no such section.
 */
function listedIssues(body) {
  const heading = /<h2 id="known-issues">[\s\S]*?<\/h2>/.exec(body);
  if (!heading) return undefined;
  const rest = body.slice(heading.index + heading[0].length);
  const end = rest.search(/<h2\b|<nav\b/);
  const section = end === -1 ? rest : rest.slice(0, end);
  const items = (section.match(/<li\b/g) ?? []).length;
  if (items) return items;
  if (/None known\./.test(section)) return 0;
  return (section.match(/<p[\s>]/g) ?? []).length;
}

/** The chip that says it: "No known issues", "1 known issue", "3 known issues". */
const issuesChip = (n) => (n === 0 ? "No known issues" : n === 1 ? "1 known issue" : `${n} known issues`);

/** The files of a page, one chip per entry separated by ";" (a comma is inside an entry). */
const filesOf = (p) => p.meta.files.split(";").map((f) => f.trim()).filter(Boolean);

/** Is there a spec for the page: tests/<slug>.spec.js or tests/<area>-<slug>.spec.js? */
const hasSpec = (p) => {
  const slug = p.route.split("/").at(-2);
  return [`${slug}.spec.js`, `${p.meta.area}-${slug}.spec.js`].some((name) => existsSync(join(repo, "tests", name)));
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const said = (actual, expected) => (expected instanceof RegExp ? expected.test(actual) : actual === expected);

/** The parts of the page every test reads. */
const partsOf = (root) => {
  const body = query(root, "body");
  const main = query(root, "main");
  const nav = queryLive(root, "nav.luz-docs-nav");
  const aside = queryLive(root, "aside.luz-docs-rail");
  const head = queryLive(root, "header.luz-docs-page-head");
  return { body, main, nav, aside, head };
};

/* ---- The real site, rendered once ------------------------------------------------ */

const site = scanSite(join(repo, "apps/docs"), repo);
const { rendered } = buildSite(site);
const trees = new Map();
const treeOf = (route) => trees.get(route) ?? trees.set(route, parse(rendered.get(route), route)).get(route);

const order = readingOrder(site);
const orderRoutes = order.map((p) => p.route);

/* ---- A small repository, for the pages the real site does not have --------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const SITE_JSON = {
  areas: [
    { id: "get-started", label: "Get started", slug: "get-started" },
    { id: "components", label: "Components", slug: "components", groups: [{ id: "actions", label: "Actions and input" }] },
  ],
};

const page = (front, body) => `<!-- luz:page\n${Object.entries(front).map(([k, v]) => `${k}: ${v}`).join("\n")}\n-->\n${body}\n`;

/** The body of a component page: example, known issues, then the Code and Design tabs. */
const componentBody = (issues) => `<div class="docs-component" id="c-x">
  <h2 id="example">Example</h2>
  <p>The demo.</p>
  <h2 id="known-issues">Known issues</h2>
  ${issues}
  <nav class="luz-tabs docs-view-tabs" aria-label="Tabs"><a class="luz-tab" href="#code-panel" data-docs-view="code">Code</a><a class="luz-tab" href="#design-panel" data-docs-view="design">Design</a></nav>
  <div class="luz-tabpanel docs-view" id="code-panel">
    <h2 class="docs-view__title" id="code">Code</h2>
    <h3 id="markup">Copy the markup</h3>
    <ul><li>one</li><li>two</li><li>three</li></ul>
  </div>
  <div class="luz-tabpanel docs-view" id="design-panel">
    <h2 class="docs-view__title" id="design">Design</h2>
    <h3 id="when">When to use</h3>
    <p>Always.</p>
  </div>
</div>`;

const COMPONENT = (name, extra, issues) =>
  page({ title: name, description: `${name} does one thing.`, area: "components", group: "actions", toc: "h2,h3", ...extra }, componentBody(issues));

/**
 * A repository with a few pages: the real layouts and partials, the home page's catalogs
 * (the header's strings), and `tests/<name>.spec.js` for each name in `specs`.
 */
function repository(pages, { specs = [], siteJson = SITE_JSON } = {}) {
  const root = mkdtempSync(join(tmpdir(), "luz-docs-shell-"));
  temps.push(root);
  const docs = join(root, "apps/docs");
  mkdirSync(join(docs, "pages"), { recursive: true });
  for (const dir of ["apps/docs/_layouts", "apps/docs/_partials", "apps/site/_partials", "apps/landing/i18n"]) {
    cpSync(join(repo, dir), join(root, dir), { recursive: true });
  }
  mkdirSync(join(root, "packages/core"), { recursive: true });
  cpSync(join(repo, "packages/core/package.json"), join(root, "packages/core/package.json"));
  writeFileSync(join(docs, "site.json"), JSON.stringify(siteJson));
  for (const [path, text] of Object.entries(pages)) {
    mkdirSync(dirname(join(docs, "pages", path)), { recursive: true });
    writeFileSync(join(docs, "pages", path), text);
  }
  mkdirSync(join(root, "tests"), { recursive: true });
  for (const name of specs) writeFileSync(join(root, "tests", `${name}.spec.js`), "// a spec\n");
  return { root, docs };
}

const PAGES = {
  "get-started/index.html": page(
    { title: "Get started", description: "Start here.", area: "get-started", toc: "h2", generate: "gallery" },
    '<p>Intro.</p>\n<h2 id="one">One</h2>\n<p>Text.</p>\n<h2 id="two">Two</h2>\n<p>Text.</p>\n<h2 id="three">Three</h2>\n<p>Text.</p>',
  ),
  "get-started/short.html": page({ title: "Short", description: "A short page without a rail list.", area: "get-started", toc: "false" }, "<p>Short.</p>"),
  "get-started/plain.html": page(
    { title: "Plain", description: "Plain page.", area: "get-started", files: "plain.css; plain-extra.css", module: "plain.js", lead: "false" },
    '<p>Its own lead.</p>\n<h2 id="a">A</h2>\n<p>.</p>\n<h2 id="b">B</h2>\n<p>.</p>\n<h2 id="c">C</h2>\n<p>.</p>',
  ),
  "get-started/fish.html": page({ title: "Fish & Chips: a/b? Don't", description: "A title that needs encoding.", area: "get-started", toc: "false" }, "<p>Fish.</p>"),
  "components/index.html": page(
    { title: "Components", description: "The components.", area: "components", generate: "gallery" },
    '<p>Intro of the area.</p>\n<h2 id="before">Before the gallery</h2>\n<p>Text.</p>\n<!-- luz:generated -->\n<h2 id="after">After the gallery</h2>\n<p>Text.</p>',
  ),
  "components/widget.html": COMPONENT(
    "Widget",
    { files: "components/widget.css; components/widget-extra.css", module: "widget.js" },
    "<ul><li>First problem.</li><li>Second problem.</li></ul>",
  ),
  "components/gadget.html": COMPONENT("Gadget", { files: "components/gadget.css" }, "<p>None known.</p>"),
  "components/oddity.html": COMPONENT("Oddity", { files: "components/oddity.css" }, "<p>One thing does not work.</p>"),
  "components/pair.html": COMPONENT("Pair", { files: ".luz-pair, __a, __b" }, "<p>The first.</p><p>The second.</p>"),
};

const fixtureSite = (options) => {
  const { root, docs } = repository(PAGES, options);
  return { root, site: scanSite(docs, root) };
};

const renderedOf = (fixture, route, options) => {
  const p = fixture.site.byRoute.get(route);
  return parse(renderPage(p, fixture.site, options), route);
};

/* ===================================================================================
 * 1. The shell
 * =================================================================================== */

describe("the shell: body.o-shell.luz-docs-shell, the sidebar, main, then the rail", () => {
  it("every docs page has the shell classes on body, on the sidebar nav and on main", () => {
    for (const p of site.pages) {
      const { body, main, nav } = partsOf(treeOf(p.route));
      expect(body, p.route).toBeTruthy();
      expect(hasClass(body, "o-shell"), `${p.route} body.o-shell`).toBe(true);
      expect(hasClass(body, "luz-docs-shell"), `${p.route} body.luz-docs-shell`).toBe(true);
      expect(nav, `${p.route} nav.luz-docs-nav`).toBeTruthy();
      expect(hasClass(nav, "luz-sidebar"), `${p.route} the nav is core's sidebar`).toBe(true);
      expect(queryAllLive(treeOf(p.route), "nav.luz-docs-nav"), p.route).toHaveLength(1);
      expect(main, `${p.route} main.luz-docs-main`).toBeTruthy();
      expect(hasClass(main, "luz-docs-main"), p.route).toBe(true);
    }
  });

  it("aside.luz-docs-rail, named \"About this page\", comes right after main, as its sibling", () => {
    for (const p of site.pages) {
      const { main, aside } = partsOf(treeOf(p.route));
      expect(aside, `${p.route} aside.luz-docs-rail`).toBeTruthy();
      expect(aside.attrs.get("aria-label"), p.route).toBe("About this page");
      expect(aside.parent, p.route).toBe(main.parent);
      const siblings = main.parent.children;
      expect(siblings[siblings.indexOf(main) + 1], `${p.route}: what follows main`).toBe(aside);
      expect(isInside(aside, main), `${p.route}: the rail is not inside main`).toBe(false);
    }
  });

  it("the not-found page is unchanged: no script, no rail, its old head", () => {
    const html = rendered.get("/404.html");
    const root = parse(html, "/404.html");
    expect(findAll(root, (n) => n.name === "script"), "no script").toEqual([]);
    expect(findAll(root, (n) => n.name === "aside"), "no aside").toEqual([]);
    expect(html).not.toContain("luz-docs-rail");
    expect(queryAll(root, "h1.docs-title"), "one h1, with its old class").toHaveLength(1);
    expect(queryAll(root, "header.luz-docs-page-head"), "it keeps its old head: no page-head header").toEqual([]);
  });
});

/* ===================================================================================
 * 2. The flat sidebar
 * =================================================================================== */

describe("the flat sidebar: every area open, every page listed", () => {
  /** The page links of the sidebar, without the site links (Home, Docs, GitHub) the drawer starts with. */
  const pageLinks = (root) => {
    // Until the shell classes exist (the first describe) the sidebar is the core one: the flat list is checked on it
    const nav = queryLive(root, "nav.luz-docs-nav") ?? query(root, "nav.luz-sidebar");
    const siteLinks = find(nav, (n) => hasClass(n, "page-nav__site"));
    return findAll(nav, (n) => n.name === "a" && !(siteLinks && isInside(n, siteLinks)));
  };

  it("lists every page of every area, in reading order, on every page", () => {
    for (const p of site.pages) {
      const hrefs = pageLinks(treeOf(p.route)).map((a) => a.attrs.get("href"));
      let at = -1;
      for (const route of orderRoutes) {
        const i = hrefs.indexOf(route, at + 1);
        expect(i, `${p.route}: ${route} is listed, after the page before it`).toBeGreaterThan(at);
        at = i;
      }
    }
  });

  it("keeps ul.docs-nav and a.docs-nav__area for each area, in its flat form", () => {
    for (const p of site.pages) {
      const nav = queryLive(treeOf(p.route), "nav.luz-docs-nav") ?? query(treeOf(p.route), "nav.luz-sidebar");
      expect(query(nav, "ul.docs-nav"), `${p.route} ul.docs-nav`).toBeTruthy();
      const areas = queryAll(nav, "a.docs-nav__area").map((a) => a.attrs.get("href"));
      expect(areas, p.route).toEqual(site.areas.map((a) => `/docs/${a.slug}/`));
    }
  });

  it("has no accordion: no <details>, <summary>, hidden or aria-expanded inside the sidebar", () => {
    for (const p of site.pages) {
      const nav = queryLive(treeOf(p.route), "nav.luz-docs-nav") ?? query(treeOf(p.route), "nav.luz-sidebar");
      const folded = findAll(nav, (n) => n.name === "details" || n.name === "summary" || n.attrs.has("hidden") || n.attrs.has("aria-expanded"));
      expect(folded.map((n) => n.name), p.route).toEqual([]);
    }
  });

  it("marks the current page with aria-current=\"page\" and its area with \"true\" (the area link itself on an area index)", () => {
    for (const p of site.pages) {
      const links = pageLinks(treeOf(p.route));
      const current = links.filter((a) => a.attrs.get("aria-current") === "page").map((a) => a.attrs.get("href"));
      const parents = links.filter((a) => a.attrs.get("aria-current") === "true").map((a) => a.attrs.get("href"));
      const area = areaOf(site, p);
      expect(current, `${p.route} page`).toEqual(area ? [p.route] : []);
      expect(parents, `${p.route} area`).toEqual(area && p.route !== `/docs/${area.slug}/` ? [`/docs/${area.slug}/`] : []);
      expect(links.filter((a) => hasClass(a, "is-active")), p.route).toEqual([]);
    }
  });

  it("keeps every generated page under the 'docs page HTML' ceiling of budgets.json, measured as the Pages build writes it", () => {
    const { budgets } = JSON.parse(readFileSync(join(repo, "budgets.json"), "utf-8"));
    const row = budgets.find((b) => b.glob === "docs/**/*.html");
    expect(row, "the docs page HTML row").toBeTruthy();
    const routes = new Set(rendered.keys());
    // The built file is a little larger than the generator's: Vite writes the script and link tags
    const ASSET_TAGS = 256;
    const over = [];
    for (const [route, html] of rendered) {
      const bytes = Buffer.byteLength(relativizeLinks(html, route, routes)) + ASSET_TAGS;
      if (bytes > row.max) over.push(`${route}: ${bytes} > ${row.max}`);
    }
    expect(over).toEqual([]);
  });
});

/* ===================================================================================
 * 3. The page head
 * =================================================================================== */

describe("the page head: eyebrow, h1, lead, then the chips", () => {
  const eyebrowOf = (p) => {
    const area = areaOf(site, p);
    const group = area?.groups?.find((g) => g.id === p.meta.group);
    return group ? `${area.label} · ${group.label}` : area?.label ?? null;
  };

  it("every page with an area has header.luz-docs-page-head in main, with the eyebrow \"Area · Group\" (or the area alone) ABOVE the one h1", () => {
    for (const p of site.pages.filter((q) => areaOf(site, q))) {
      const root = treeOf(p.route);
      const { main, head } = partsOf(root);
      expect(head, `${p.route} header.luz-docs-page-head`).toBeTruthy();
      expect(isInside(head, main), `${p.route}: the head is in main`).toBe(true);
      const eyebrow = query(head, "p.luz-docs-page-head__eyebrow");
      expect(eyebrow, `${p.route} eyebrow`).toBeTruthy();
      expect(textOf(eyebrow), p.route).toBe(eyebrowOf(p));
      const h1s = queryAll(head, "h1");
      expect(h1s, `${p.route} h1`).toHaveLength(1);
      expect(textOf(h1s[0]), p.route).toBe(p.meta.title);
      expect(hasClass(h1s[0], "docs-title"), `${p.route}: the h1 keeps class docs-title`).toBe(true);
      expect(eyebrow.open.index, `${p.route}: the eyebrow is above the h1`).toBeLessThan(h1s[0].open.index);
    }
  });

  it("then the lead, which is the description, unless the page brings its own lead (lead: false)", () => {
    for (const p of site.pages.filter((q) => areaOf(site, q))) {
      const { head } = partsOf(treeOf(p.route));
      const lead = query(head, "p.luz-docs-page-head__lead");
      if (p.meta.lead === "false") {
        expect(lead, `${p.route} brings its own lead`).toBeNull();
        continue;
      }
      expect(lead, `${p.route} lead`).toBeTruthy();
      expect(textOf(lead), p.route).toBe(p.meta.description);
      expect(query(head, "h1").open.index, p.route).toBeLessThan(lead.open.index);
    }
  });

  it("an area index says \"Area · package\" when the area documents a package, and the area alone when it does not, above its h1 (not below, as a paragraph of the content)", () => {
    // HTML elements is not decided: it documents core's elements, but is not a package's area
    for (const area of site.areas.filter((a) => a.id !== "html")) {
      const index = site.byRoute.get(`/docs/${area.slug}/`);
      if (!index) continue;
      const { head, main } = partsOf(treeOf(index.route));
      const pkg = eyebrowPackageOf(area.id);
      expect(textOf(query(head, "p.luz-docs-page-head__eyebrow")), index.route).toBe(pkg ? `${area.label} · ${pkg}` : area.label);
      // Nothing styled as an eyebrow sits in the content under the h1
      const below = findAll(main, (n) => n.name === "p" && /(^|\s)docs-eyebrow(\s|$)/.test(n.attrs.get("class") ?? ""));
      expect(below.map((n) => textOf(n)), index.route).toEqual([]);
    }
  });

  it("a component or pattern page ends its head with the chips, in this order: files, module or No JavaScript, modes, Tested, known issues", () => {
    const views = site.pages.filter(isView);
    expect(views.length).toBeGreaterThan(40);
    for (const p of views) {
      const { head } = partsOf(treeOf(p.route));
      const meta = query(head, "ul.luz-docs-page-head__meta");
      expect(meta, `${p.route} chips`).toBeTruthy();
      const chips = meta.children.filter((c) => c.name === "li");
      const texts = chips.map((c) => textOf(c));

      const tested = hasSpec(p);
      const issues = listedIssues(p.body);
      expect(issues, `${p.route} has a Known issues section`).not.toBeUndefined();
      const expected = [
        ...filesOf(p),
        ...(p.meta.module ? [new RegExp(escapeRe(p.meta.module))] : ["No JavaScript"]),
        "Light · Dark · High contrast",
        ...(tested ? ["Tested"] : []),
        issuesChip(issues),
      ];
      expect(texts.length, `${p.route}: ${texts.join(" | ")}`).toBe(expected.length);
      expected.forEach((want, i) => expect(said(texts[i], want), `${p.route}: chip ${i} "${texts[i]}" is ${want}`).toBe(true));

      // "n known issues" links to the section
      if (issues !== 0) {
        expect(query(chips.at(-1), "a")?.attrs.get("href"), `${p.route} the issues chip links`).toBe("#known-issues");
      }
    }
  });

  it("a comma-separated list of classes is one chip: the files of a pattern page are what the front matter says between semicolons", () => {
    const hero = site.byRoute.get("/docs/landing/hero/");
    expect(hero.meta.files).toContain(",");
    const meta = query(partsOf(treeOf(hero.route)).head, "ul.luz-docs-page-head__meta");
    expect(textOf(meta?.children[0])).toBe(hero.meta.files);
  });

  it("the chips are for component and pattern pages only: every other page has the eyebrow, the h1 and the lead, and no list of chips", () => {
    for (const p of site.pages.filter((q) => areaOf(site, q) && !isView(q))) {
      const { head } = partsOf(treeOf(p.route));
      expect(query(head, "ul.luz-docs-page-head__meta"), p.route).toBeNull();
    }
  });

  it("names the package of an area on its index: Components · @luz-ds/core, Tokens · @luz-ds/tokens, and each pattern area its own package", () => {
    const expected = {
      components: "@luz-ds/core",
      tokens: "@luz-ds/tokens",
      site: "@luz-ds/site",
      landing: "@luz-ds/landing",
      cms: "@luz-ds/cms",
      app: "@luz-ds/app",
      documentation: "@luz-ds/docs",
    };
    for (const [id, pkg] of Object.entries(expected)) {
      const area = site.areas.find((a) => a.id === id);
      expect(textOf(query(partsOf(treeOf(`/docs/${area.slug}/`)).head, "p.luz-docs-page-head__eyebrow")), id).toBe(`${area.label} · ${pkg}`);
      expect(eyebrowPackageOf(id), `${id}: the helper reads the package.json name`).toBe(pkg);
    }
    for (const id of ["get-started", "accessibility"]) {
      const area = site.areas.find((a) => a.id === id);
      expect(textOf(query(partsOf(treeOf(`/docs/${area.slug}/`)).head, "p.luz-docs-page-head__eyebrow")), id).toBe(area.label);
    }
  });

  it("the package is the area's, not the page's: a page of the area keeps \"Area · Group\" or the area alone", () => {
    for (const route of ["/docs/components/button/", "/docs/components/keyframes/", "/docs/tokens/color/", "/docs/landing/hero/"]) {
      const p = site.byRoute.get(route);
      const eyebrow = textOf(query(partsOf(treeOf(route)).head, "p.luz-docs-page-head__eyebrow"));
      expect(eyebrow, route).not.toContain("@luz-ds/");
      expect(eyebrow, route).toBe(eyebrowOf(p));
    }
  });

  it("a plain line, Files: <code>, <code>, in the head of every page that has `files` and no chips; the pages with chips and the pages without files get none", () => {
    let plain = 0;
    for (const p of site.pages.filter((q) => areaOf(site, q))) {
      const { head } = partsOf(treeOf(p.route));
      const line = queryAllLive(head, "p.luz-docs-page-head__files");
      if (isView(p) || !p.meta.files) {
        expect(line, `${p.route}: no Files line`).toEqual([]);
        continue;
      }
      plain += 1;
      expect(line, `${p.route}: one Files line`).toHaveLength(1);
      const files = filesOf(p);
      expect(textOf(line[0]), p.route).toBe(`Files: ${files.join(", ")}`);
      expect(findAll(line[0], (n) => n.name === "code").map((c) => textOf(c)), `${p.route}: each file in a <code>`).toEqual(files);
      expect(query(head, "ul.luz-docs-page-head__meta"), `${p.route}: a line, not chips`).toBeNull();
      // Under the h1 and the lead, where the chips would stand
      expect(line[0].open.index, p.route).toBeGreaterThan(query(head, "h1").open.index);
      const lead = query(head, "p.luz-docs-page-head__lead");
      if (lead) expect(line[0].open.index, p.route).toBeGreaterThan(lead.open.index);
    }
    expect(plain, "there are such pages").toBeGreaterThan(5);
  });

  it("shows it on a helper (/docs/components/keyframes/) and on a tokens page (/docs/tokens/color/)", () => {
    for (const [route, files] of [
      ["/docs/components/keyframes/", ["components/_animations.css"]],
      ["/docs/tokens/color/", ["src/semantic.css"]],
    ]) {
      const { head } = partsOf(treeOf(route));
      const line = queryLive(head, "p.luz-docs-page-head__files");
      expect(line, route).toBeTruthy();
      expect(textOf(line), route).toBe(`Files: ${files.join(", ")}`);
    }
  });

  it("keeps the chips on a component page (/docs/components/button/) and gives it no Files line", () => {
    const { head } = partsOf(treeOf("/docs/components/button/"));
    expect(query(head, "ul.luz-docs-page-head__meta")).toBeTruthy();
    expect(query(head, "p.luz-docs-page-head__files")).toBeNull();
  });

  describe("on a repository made for it", () => {
    const chipsNodes = (fixture, route) => {
      const { head } = partsOf(renderedOf(fixture, route));
      const meta = query(head, "ul.luz-docs-page-head__meta");
      expect(meta, `${route} chips`).toBeTruthy();
      return (meta?.children ?? []).filter((c) => c.name === "li");
    };
    const chipsOf = (fixture, route) => {
      const { head } = partsOf(renderedOf(fixture, route));
      const meta = query(head, "ul.luz-docs-page-head__meta");
      expect(meta, `${route} chips`).toBeTruthy();
      return meta.children.filter((c) => c.name === "li").map((c) => textOf(c));
    };

    it("one chip per entry of `files` (separated by a semicolon), the module, the modes, Tested when tests/<slug>.spec.js exists, and the issues", () => {
      const fixture = fixtureSite({ specs: ["widget"] });
      const chips = chipsOf(fixture, "/docs/components/widget/");
      expect(chips).toHaveLength(6);
      expect(chips.slice(0, 2)).toEqual(["components/widget.css", "components/widget-extra.css"]);
      expect(chips[2]).toMatch(/widget\.js/);
      expect(chips[2]).not.toMatch(/No JavaScript/);
      expect(chips.slice(3)).toEqual(["Light · Dark · High contrast", "Tested", "2 known issues"]);
    });

    it("a comma-separated list of classes is one chip", () => {
      const fixture = fixtureSite();
      expect(chipsOf(fixture, "/docs/components/pair/")[0]).toBe(".luz-pair, __a, __b");
    });

    it("says No JavaScript when the page has no module, and Tested when tests/<area>-<slug>.spec.js exists; No known issues for \"None known.\"", () => {
      const fixture = fixtureSite({ specs: ["components-gadget"] });
      expect(chipsOf(fixture, "/docs/components/gadget/")).toEqual(["components/gadget.css", "No JavaScript", "Light · Dark · High contrast", "Tested", "No known issues"]);
    });

    it("leaves Tested out without a spec", () => {
      const fixture = fixtureSite({ specs: ["widget"] });
      expect(chipsOf(fixture, "/docs/components/oddity/")).not.toContain("Tested");
    });

    it("counts the items of the section, not the list items of the sections after it; \"n known issues\" links to #known-issues", () => {
      const fixture = fixtureSite();
      // Widget's section has two items and its Code section three more
      const last = chipsNodes(fixture, "/docs/components/widget/").at(-1);
      expect(textOf(last)).toBe("2 known issues");
      expect(query(last, "a")?.attrs.get("href")).toBe("#known-issues");
    });

    it("a section without a list counts its paragraphs: one is \"1 known issue\", singular", () => {
      const fixture = fixtureSite();
      expect(chipsOf(fixture, "/docs/components/oddity/").at(-1)).toBe("1 known issue");
      expect(chipsOf(fixture, "/docs/components/pair/").at(-1)).toBe("2 known issues");
    });

    it("names the eyebrow \"Area · Group\" for a page with a group, and the area alone without one", () => {
      const fixture = fixtureSite();
      const eyebrow = (route) => textOf(query(renderedOf(fixture, route), "p.luz-docs-page-head__eyebrow"));
      expect(eyebrow("/docs/components/widget/")).toBe("Components · Actions and input");
      expect(eyebrow("/docs/components/")).toBe("Components");
      expect(eyebrow("/docs/get-started/short/")).toBe("Get started");
    });

    /** The fixture with a helper, a tokens page and the packages of two areas named in site.json (`package`). */
    const packaged = () => {
      const siteJson = {
        areas: [
          { id: "get-started", label: "Get started", slug: "get-started" },
          { id: "tokens", label: "Tokens", slug: "tokens", package: "@luz-ds/tokens", groups: [{ id: "families", label: "Token families" }] },
          {
            id: "components",
            label: "Components",
            slug: "components",
            package: "@luz-ds/core",
            groups: [{ id: "actions", label: "Actions and input" }, { id: "helpers", label: "Helpers", sidebar: true, list: true }],
          },
        ],
      };
      const pages = {
        ...PAGES,
        "tokens/index.html": page({ title: "Tokens", description: "The tokens.", area: "tokens", generate: "gallery" }, "<p>Intro.</p>"),
        "tokens/color.html": page({ title: "Color", description: "Colours.", area: "tokens", group: "families", files: "src/semantic.css; src/extra.css" }, "<p>Colour.</p>"),
        "tokens/bare.html": page({ title: "Bare", description: "No files.", area: "tokens", group: "families" }, "<p>Bare.</p>"),
        "components/keyframes.html": page({ title: "Keyframes", description: "Motion.", area: "components", group: "helpers", files: "components/_animations.css" }, "<p>Keyframes.</p>"),
        "components/loose.html": page({ title: "Loose", description: "A helper with two files.", area: "components", group: "helpers", files: "components/_a.css; components/_b.css" }, "<p>Loose.</p>"),
      };
      const { root, docs } = repository(pages, { siteJson });
      return { root, site: scanSite(docs, root) };
    };
    const headOf = (fixture, route) => partsOf(renderedOf(fixture, route)).head;

    it("an area index says \"Area · package\" with the package of its entry in site.json; an area with none says the label alone", () => {
      const fixture = packaged();
      const eyebrow = (route) => textOf(query(headOf(fixture, route), "p.luz-docs-page-head__eyebrow"));
      expect(eyebrow("/docs/components/")).toBe("Components · @luz-ds/core");
      expect(eyebrow("/docs/tokens/")).toBe("Tokens · @luz-ds/tokens");
      expect(eyebrow("/docs/get-started/")).toBe("Get started");
    });

    it("the package is for the index only: a page of the area says \"Area · Group\", and a page without a group the area alone", () => {
      const fixture = packaged();
      const eyebrow = (route) => textOf(query(headOf(fixture, route), "p.luz-docs-page-head__eyebrow"));
      expect(eyebrow("/docs/components/widget/")).toBe("Components · Actions and input");
      expect(eyebrow("/docs/tokens/color/")).toBe("Tokens · Token families");
      expect(eyebrow("/docs/get-started/short/")).toBe("Get started");
    });

    it("a helper and a tokens page that have files get a Files line, and no chips", () => {
      const fixture = packaged();
      for (const [route, files] of [
        ["/docs/components/keyframes/", ["components/_animations.css"]],
        ["/docs/components/loose/", ["components/_a.css", "components/_b.css"]],
        ["/docs/tokens/color/", ["src/semantic.css", "src/extra.css"]],
      ]) {
        const head = headOf(fixture, route);
        const line = queryAll(head, "p.luz-docs-page-head__files");
        expect(line, route).toHaveLength(1);
        expect(textOf(line[0]), route).toBe(`Files: ${files.join(", ")}`);
        expect(findAll(line[0], (n) => n.name === "code").map((c) => textOf(c)), route).toEqual(files);
        expect(query(head, "ul.luz-docs-page-head__meta"), route).toBeNull();
        expect(line[0].parent, `${route}: in the page head`).toBe(head);
      }
    });

    it("a component page keeps its chips and has no Files line; a page without files has neither", () => {
      const fixture = packaged();
      const widget = headOf(fixture, "/docs/components/widget/");
      expect(query(widget, "ul.luz-docs-page-head__meta")).toBeTruthy();
      expect(query(widget, "p.luz-docs-page-head__files")).toBeNull();
      for (const route of ["/docs/tokens/bare/", "/docs/get-started/short/"]) {
        const head = headOf(fixture, route);
        expect(query(head, "p.luz-docs-page-head__files"), route).toBeNull();
        expect(query(head, "ul.luz-docs-page-head__meta"), route).toBeNull();
      }
    });

    it("gives a page that is not a component the eyebrow, the h1 and the lead, whatever its front matter says of files and module; lead: false leaves the lead to the content", () => {
      const fixture = fixtureSite();
      const { head } = partsOf(renderedOf(fixture, "/docs/get-started/plain/"));
      expect(query(head, "ul.luz-docs-page-head__meta"), "no chips").toBeNull();
      expect(query(head, "p.luz-docs-page-head__eyebrow")).toBeTruthy();
      expect(query(head, "h1")).toBeTruthy();
      expect(query(head, "p.luz-docs-page-head__lead"), "lead: false").toBeNull();
      const short = partsOf(renderedOf(fixture, "/docs/get-started/short/")).head;
      expect(textOf(query(short, "p.luz-docs-page-head__lead"))).toBe("A short page without a rail list.");
    });
  });
});

/* ===================================================================================
 * 4. The rail
 * =================================================================================== */

describe("the rail: \"On this page\" outside main, then Copy, Edit and Report", () => {
  const actionsOf = (aside) => {
    const box = query(aside, ".luz-docs-rail__actions");
    return box ? findAll(box, (n) => n.name === "a") : [];
  };

  it("has three actions in this order, on every page: Copy page as Markdown (index.md of the route), Edit this page, Report a problem", () => {
    for (const p of site.pages) {
      const { aside } = partsOf(treeOf(p.route));
      const links = actionsOf(aside);
      expect(links.map((a) => textOf(a)), p.route).toEqual(["Copy page as Markdown", "Edit this page", "Report a problem"]);
      expect(links[0].attrs.get("href"), `${p.route} copy`).toBe(`${p.route}index.md`);
      expect(links[1].attrs.get("href"), `${p.route} edit`).toBe(`${EDIT}${p.file}`);
      expect(links[1].attrs.get("href"), `${p.route} edit`).toMatch(/^https:\/\/github\.com\/nandovejer\/luz\/edit\/main\/apps\/docs\/pages\/.+\.html$/);
      expect(links[2].attrs.get("href"), `${p.route} report`).toBe(`${ISSUES}${encodeURIComponent(p.meta.title)}`);
    }
  });

  it("puts \"On this page\" in the rail, never in main: nav.luz-docs-rail__onpage > details > summary.luz-docs-rail__title", () => {
    let withList = 0;
    let expected = 0;
    for (const p of site.pages) {
      const root = treeOf(p.route);
      const { main, aside } = partsOf(root);
      // A list is written when the page has three or more h2 with an id outside the demos
      const h2s = readHtml(rendered.get(p.route).slice(main.open.index, main.close.end), p.route).headings.filter((h) => h.level === 2 && !h.specimen && h.id && h.id !== "docs-end-title");
      if (p.meta.toc !== "false" && h2s.length >= 3) expected += 1;
      expect(queryAllLive(main, "nav.luz-docs-rail__onpage"), `${p.route}: nothing of the list stays in main`).toEqual([]);
      const onpage = queryAll(aside, "nav.luz-docs-rail__onpage");
      if (!onpage.length) continue;
      withList += 1;
      expect(onpage, p.route).toHaveLength(1);
      const summary = query(onpage[0], "summary.luz-docs-rail__title");
      expect(textOf(summary), p.route).toBe("On this page");
      expect(summary.parent.name, p.route).toBe("details");
      expect(isInside(summary.parent, onpage[0]), p.route).toBe(true);
    }
    expect(withList, "the pages with a list are those with three or more h2").toBe(expected);
    expect(withList).toBeGreaterThan(0);
  });

  it("lists the h2 of the page that have an id (and the h3 of toc: h2,h3, nested under their h2), in the order of the page", () => {
    for (const p of site.pages.filter((q) => q.meta.toc !== "false")) {
      const root = treeOf(p.route);
      const { main, aside } = partsOf(root);
      const levels = p.meta.toc === "h2,h3" ? [2, 3] : [2];
      const html = rendered.get(p.route).slice(main.open.index, main.close.end);
      const headings = readHtml(html, p.route).headings.filter((h) => levels.includes(h.level) && !h.specimen && h.id && h.id !== "docs-end-title");
      const onpage = query(aside, "nav.luz-docs-rail__onpage");
      if (headings.filter((h) => h.level === 2).length < 3) continue;
      expect(onpage, `${p.route} has the list`).toBeTruthy();
      const hrefs = findAll(onpage, (n) => n.name === "a").map((a) => a.attrs.get("href"));
      expect(hrefs, p.route).toEqual(headings.map((h) => `#${h.id}`));
    }
  });

  it("a page with toc: false has the rail, with only the actions", () => {
    const pages = site.pages.filter((q) => q.meta.toc === "false");
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      const { aside } = partsOf(treeOf(p.route));
      expect(aside, p.route).toBeTruthy();
      expect(queryAll(aside, "nav.luz-docs-rail__onpage"), p.route).toEqual([]);
      expect(actionsOf(aside), p.route).toHaveLength(3);
    }
  });

  describe("on a repository made for it", () => {
    it("nests the h3 of toc: h2,h3 under their h2, and the list is the rail's, not main's", () => {
      const fixture = fixtureSite();
      const root = renderedOf(fixture, "/docs/components/widget/");
      const { main, aside } = partsOf(root);
      expect(queryAllLive(main, "nav.luz-docs-rail__onpage")).toEqual([]);
      const onpage = query(aside, "nav.luz-docs-rail__onpage");
      expect(findAll(onpage, (n) => n.name === "a").map((a) => a.attrs.get("href"))).toEqual(["#example", "#known-issues", "#code", "#markup", "#design", "#when"]);
      const markup = find(onpage, (n) => n.name === "a" && n.attrs.get("href") === "#markup");
      const sub = markup.parent.parent;
      expect(hasClass(sub, "luz-docs-rail__sub")).toBe(true);
      const owner = sub.parent;
      expect(owner.name).toBe("li");
      expect(find(owner, (n) => n.name === "a").attrs.get("href")).toBe("#code");
    });

    it("toc: false leaves only the actions, with the same three links", () => {
      const fixture = fixtureSite();
      const { aside } = partsOf(renderedOf(fixture, "/docs/get-started/short/"));
      expect(queryAll(aside, "nav.luz-docs-rail__onpage")).toEqual([]);
      expect(actionsOf(aside).map((a) => textOf(a))).toEqual(["Copy page as Markdown", "Edit this page", "Report a problem"]);
    });

    it("writes the Edit URL from the file and the Report URL from the title, URL-encoded", () => {
      const fixture = fixtureSite();
      const { aside } = partsOf(renderedOf(fixture, "/docs/get-started/fish/"));
      const links = actionsOf(aside);
      expect(links, "three actions").toHaveLength(3);
      const [copy, edit, report] = links;
      expect(copy.attrs.get("href")).toBe("/docs/get-started/fish/index.md");
      expect(edit.attrs.get("href")).toBe("https://github.com/nandovejer/luz/edit/main/apps/docs/pages/get-started/fish.html");
      expect(report.attrs.get("href")).toBe(`${ISSUES}Fish%20%26%20Chips%3A%20a%2Fb%3F%20Don't`);
    });
  });

  it("the Pages build makes the Copy link relative to the page, as it does every link to a route (the site lives under /luz/)", () => {
    const plugin = docsSite({ repoRoot: repo, relative: true, outRoot: join(tmpdir(), "luz-docs-shell-out"), pagesBase: "/luz/", siteUrl: "" });
    const file = join(repo, "apps/docs/pages/components/button.html");
    const html = plugin.transformIndexHtml.handler(readFileSync(file, "utf-8"), { filename: file });
    const aside = query(parse(html, "button"), "aside.luz-docs-rail");
    const copy = actionsOf(aside)[0];
    expect(copy, "the Copy link").toBeTruthy();
    const href = copy.attrs.get("href");
    expect(href, "not root-absolute").not.toMatch(/^\//);
    expect(new URL(href, "https://example.org/luz/docs/components/button/").pathname).toBe("/luz/docs/components/button/index.md");
  });
});

/* ===================================================================================
 * 5. index.md for every route
 * =================================================================================== */

describe("index.md: every page also published as Markdown, from the same text as llms-full.txt (RL-19)", () => {
  const plugin = (relative) => docsSite({ repoRoot: repo, relative, outRoot: join(tmpdir(), "luz-docs-shell-out"), pagesBase: "/luz/", siteUrl: "" });
  const mdFileOf = (route) => `${route.slice(1)}index.md`;
  const emittedBy = (relative) => {
    const files = new Map();
    plugin(relative).generateBundle.call({ emitFile: (f) => files.set(f.fileName, f.source) });
    return files;
  };
  const flat = (text) => text.replace(/^#{1,6} /gm, "# ").replace(/\s+/g, " ").trim();

  /** What llms-full.txt says of a page after its description: its body. Null for a page that has no entry (the hub). */
  const entryBodyOf = (full, p) => {
    const lines = full.split("\n");
    const starts = lines.flatMap((line, i) => (line.startsWith("## ") && lines[i + 1]?.startsWith("URL: ") ? [i] : []));
    const mine = starts.find((i) => lines[i + 1] === `URL: ${p.route}`);
    if (mine === undefined) return null;
    const entry = lines.slice(mine, starts.find((i) => i > mine) ?? lines.length);
    const d = entry.indexOf(p.meta.description, 2);
    return d === -1 ? null : entry.slice(d + 1).join("\n").trim();
  };

  const files = emittedBy(false);
  const full = renderLlmsFull(site, { siteUrl: "" });

  it("the build writes docs/<route>/index.md for every page", () => {
    for (const p of site.pages) {
      expect(files.has(mdFileOf(p.route)), `${mdFileOf(p.route)} is emitted`).toBe(true);
    }
    expect(files.has("docs/components/button/index.md")).toBe(true);
    expect(files.has("docs/index.md")).toBe(true);
  });

  it("starts with `# <title>`, then the description", () => {
    for (const p of site.pages) {
      const lines = String(files.get(mdFileOf(p.route))).split("\n");
      expect(lines[0], p.route).toBe(`# ${p.meta.title}`);
      expect(lines.slice(1).find((l) => l.trim()), `${p.route}: the first line after the title`).toBe(p.meta.description);
    }
  });

  it("carries what llms-full.txt says of the page, from the same function (headings may sit one level up)", () => {
    let compared = 0;
    for (const p of site.pages) {
      const body = entryBodyOf(full, p);
      if (body === null) continue;
      compared += 1;
      expect(flat(String(files.get(mdFileOf(p.route)))), p.route).toContain(flat(body));
    }
    // Every listed page has an entry: the count is the site's, not a number typed here
    expect(compared).toBe(site.pages.filter((p) => areaOf(site, p) && p.meta.search !== "false").length);
    expect(compared).toBeGreaterThan(0);
  });

  it("does not make llms-full.txt grow: the files are separate, one entry per page, one # LUZ, under its ceiling", () => {
    expect(Buffer.byteLength(full)).toBeLessThanOrEqual(LLMS_FULL_MAX);
    expect(full.split("\n").filter((l) => /^# /.test(l))).toEqual(["# LUZ"]);
    const lines = full.split("\n");
    const entries = lines.filter((line, i) => line.startsWith("## ") && lines[i + 1]?.startsWith("URL: "));
    expect(entries, "one entry per listed page of an area, none for the index.md of a page").toHaveLength(site.pages.filter((p) => areaOf(site, p) && p.meta.search !== "false").length);
    expect(lines.filter((l) => /^URL: .*index\.md$/.test(l))).toEqual([]);
  });

  it("the dev server answers /docs/<route>/index.md as text, the same bytes the build writes", async () => {
    const middlewares = [];
    plugin(false).configureServer({
      watcher: { on() {} },
      ws: { send() {} },
      middlewares: { use: (fn) => middlewares.push(fn) },
      transformIndexHtml: async (_file, html) => html,
    });
    const serve = (url) =>
      new Promise((done) => {
        const headers = {};
        const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => done({ headers, body, statusCode: res.statusCode }) };
        middlewares[0]({ url, originalUrl: url }, res, () => done({ next: true }));
      });
    const got = await serve("/docs/components/button/index.md");
    expect(got.next, "answered by the plugin").toBeUndefined();
    expect(got.headers["content-type"]).toMatch(/^text\/(markdown|plain); charset=utf-8/);
    expect(got.body).toBe(files.get("docs/components/button/index.md"));
    expect(String(got.body).startsWith("# Button\n")).toBe(true);
  }, 60_000);
});

/* ===================================================================================
 * 6. The page foot
 * =================================================================================== */

describe("the page foot: Last updated <time>, then Edit and Report", () => {
  /** The datetime of the page's own "Last updated" (undefined when there is none). */
  const timeOf = (root) => query(queryLive(root, "p.luz-docs-page-foot"), "time")?.attrs.get("datetime");

  const footOf = (root) => {
    const { main } = partsOf(root);
    return queryAllLive(main, "p.luz-docs-page-foot");
  };

  it("every page has one p.luz-docs-page-foot in main, after the pager, with Last updated and a <time datetime> from git log", () => {
    for (const p of site.pages) {
      const root = treeOf(p.route);
      const foots = footOf(root);
      expect(foots, p.route).toHaveLength(1);
      const foot = foots[0];
      expect(textOf(foot), p.route).toMatch(/^Last updated /);
      const time = query(foot, "time");
      expect(time, `${p.route} <time>`).toBeTruthy();
      const iso = time.attrs.get("datetime");
      expect(iso, p.route).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const expected = gitDate(p.file);
      if (expected) expect(iso, `${p.route}: git log -1 --format=%cs -- ${p.file}`).toBe(expected);
      else expect(isToday(iso), `${p.route}: not in git, so today`).toBe(true);
      // After the pager
      const pager = queryLive(root, ".luz-docs-pager");
      if (pager) expect(foot.open.index, p.route).toBeGreaterThan(pager.open.index);
    }
  });

  it("is followed by Edit and Report, the same URLs as the rail", () => {
    for (const p of site.pages) {
      const root = treeOf(p.route);
      const foot = footOf(root)[0];
      const [, edit, report] = findAll(queryLive(root, ".luz-docs-rail__actions"), (n) => n.name === "a");
      const links = findAll(foot, (n) => n.name === "a");
      expect(links.map((a) => textOf(a)), p.route).toEqual(["Edit this page", "Report a problem"]);
      expect(links[0].attrs.get("href"), p.route).toBe(edit.attrs.get("href"));
      expect(links[1].attrs.get("href"), p.route).toBe(report.attrs.get("href"));
      expect(links[0].open.index, p.route).toBeGreaterThan(find(foot, (n) => n.name === "time").open.index);
    }
  });

  it("dev writes today's date, whatever git says", () => {
    const p = site.byRoute.get("/docs/components/button/");
    const root = parse(renderPage(p, site, { dev: true }), p.route);
    expect(isToday(timeOf(root))).toBe(true);
  });

  it("a file git does not know is dated today", () => {
    const fixture = fixtureSite();
    expect(isToday(timeOf(renderedOf(fixture, "/docs/components/widget/")))).toBe(true);
  });

  it("a tracked file is dated by its last commit (git log -1 --format=%cs -- <file>), and a file added since is dated today", () => {
    const { root, docs } = repository(PAGES);
    const git = (...args) =>
      execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.org", "-c", "commit.gpgsign=false", ...args], {
        cwd: root,
        stdio: "pipe",
        env: { ...process.env, GIT_AUTHOR_DATE: "2020-02-03T12:00:00+0000", GIT_COMMITTER_DATE: "2020-02-03T12:00:00+0000" },
      });
    git("init", "-q");
    git("add", "-A");
    git("commit", "-q", "-m", "pages");
    writeFileSync(join(docs, "pages/get-started/new.html"), page({ title: "New", description: "Added after the commit.", area: "get-started" }, "<p>New.</p>"));
    const fresh = scanSite(docs, root);
    const dateOf = (route) => timeOf(parse(renderPage(fresh.byRoute.get(route), fresh), route));
    expect(dateOf("/docs/components/widget/")).toBe("2020-02-03");
    expect(isToday(dateOf("/docs/get-started/new/"))).toBe(true);
  });
});

/* ===================================================================================
 * 7. The pager
 * =================================================================================== */

describe("the pager: @luz-ds/docs's Previous / Next, named by its visible text (WCAG 2.5.3)", () => {
  it("every page of the reading order has the pager, with a nav around it and the prev and next items", () => {
    for (const p of order) {
      const root = treeOf(p.route);
      const pager = queryLive(root, ".luz-docs-pager");
      expect(pager, `${p.route} pager`).toBeTruthy();
      expect(pager.name, `${p.route}: the package's form is ul.luz-docs-pager`).toBe("ul");
      let nav = pager;
      while (nav && nav.name !== "nav") nav = nav.parent;
      expect(nav?.name, `${p.route}: the pager is in a nav`).toBe("nav");
      const { prev, next } = neighboursOf(site, p);
      expect(queryAllLive(root, ".luz-docs-pager__prev").length, `${p.route} prev`).toBe(prev ? 1 : 0);
      expect(queryAllLive(root, ".luz-docs-pager__next").length, `${p.route} next`).toBe(next ? 1 : 0);
    }
  });

  it("the links point at the neighbours and have NO aria-label and no aria-labelledby: their name is the visible text, \"Previous Title\"", () => {
    for (const p of order) {
      const root = treeOf(p.route);
      const { prev, next } = neighboursOf(site, p);
      for (const [key, label, target] of [["prev", "Previous", prev], ["next", "Next", next]]) {
        if (!target) continue;
        const link = query(queryLive(root, `.luz-docs-pager__${key}`), "a.luz-docs-pager__link");
        expect(link, `${p.route} ${key}`).toBeTruthy();
        expect(link.attrs.get("rel"), p.route).toBe(key);
        expect(link.attrs.get("href"), p.route).toBe(target.route);
        expect(link.attrs.has("aria-label"), `${p.route} ${key} has no aria-label`).toBe(false);
        expect(link.attrs.has("aria-labelledby"), `${p.route} ${key} has no aria-labelledby`).toBe(false);
        expect(textOf(query(link, "span.luz-docs-pager__label")), p.route).toBe(label);
        expect(textOf(query(link, "span.luz-docs-pager__title")), p.route).toBe(target.meta.title);
        expect(textOf(link), `${p.route}: the name`).toBe(`${label} ${target.meta.title}`);
      }
    }
  });

  it("the pages outside the reading order (the hub area, the not-found page) have none", () => {
    for (const [route] of rendered) {
      if (orderRoutes.includes(route)) continue;
      expect(queryLive(parse(rendered.get(route), route), ".luz-docs-pager"), route).toBeNull();
    }
  });
});

/* ===================================================================================
 * 8. Where the area index's gallery goes
 * =================================================================================== */

describe("<!-- luz:generated --> puts the gallery of an area index where the marker is", () => {
  const positions = (root) => {
    const main = query(root, "main");
    const at = (id) => find(main, (n) => n.attrs.get("id") === id)?.open.index ?? null;
    return { before: at("before"), gallery: at("group-actions"), after: at("after") };
  };

  it("writes the gallery between the content before the marker and the content after it, once, and removes the marker", () => {
    const fixture = fixtureSite();
    const html = renderPage(fixture.site.byRoute.get("/docs/components/"), fixture.site);
    expect(html).not.toContain("luz:generated");
    const root = parse(html, "/docs/components/");
    const { before, gallery, after } = positions(root);
    expect(gallery, "the gallery is written").not.toBeNull();
    expect(before).toBeLessThan(gallery);
    expect(gallery).toBeLessThan(after);
    expect(findAll(root, (n) => n.attrs.get("id") === "group-actions"), "once").toHaveLength(1);
    // The cards are the area's pages
    const hrefs = findAll(query(root, "main"), (n) => n.name === "a").map((a) => a.attrs.get("href"));
    for (const route of ["/docs/components/widget/", "/docs/components/gadget/", "/docs/components/oddity/"]) expect(hrefs, route).toContain(route);
  });

  it("the rail lists the headings in the order they are on the page, the gallery's among them", () => {
    const fixture = fixtureSite();
    const root = parse(renderPage(fixture.site.byRoute.get("/docs/components/"), fixture.site), "/docs/components/");
    const onpage = query(query(root, "aside.luz-docs-rail"), "nav.luz-docs-rail__onpage");
    expect(onpage, "the list is in the rail").toBeTruthy();
    expect(findAll(onpage, (n) => n.name === "a").map((a) => a.attrs.get("href"))).toEqual(["#before", "#group-actions", "#after"]);
  });

  it("without the marker the gallery stays after the content", () => {
    const fixture = fixtureSite();
    const root = parse(renderPage(fixture.site.byRoute.get("/docs/get-started/"), fixture.site), "/docs/get-started/");
    const main = query(root, "main");
    const three = find(main, (n) => n.attrs.get("id") === "three").open.index;
    const card = find(main, (n) => n.name === "a" && n.attrs.get("href") === "/docs/get-started/short/");
    expect(card.open.index).toBeGreaterThan(three);
  });

  it("on the documentation index, \"Install and load\" comes after the pattern gallery", () => {
    const p = site.byRoute.get("/docs/documentation/");
    const root = treeOf(p.route);
    const main = query(root, "main");
    const at = (id) => find(main, (n) => n.attrs.get("id") === id)?.open.index ?? null;
    expect(at("group-patterns"), "the patterns gallery").not.toBeNull();
    expect(at("install-and-load"), "Install and load").not.toBeNull();
    expect(at("group-patterns")).toBeLessThan(at("install-and-load"));
    expect(at("group-reference")).toBeLessThan(at("install-and-load"));
    expect(rendered.get(p.route)).not.toContain("luz:generated");
  });
});

/* ---- Keep the helpers honest ---------------------------------------------------------------- */

describe("the helpers", () => {
  it("matcher reads tag, .class and tag.class", () => {
    const root = parse('<div class="a b"><p class="b">x</p></div>');
    expect(queryAll(root, ".b").map((n) => n.name)).toEqual(["div", "p"]);
    expect(queryAll(root, "p.b")).toHaveLength(1);
    expect(matcher("p.a")(query(root, "p"))).toBe(false);
  });
});
