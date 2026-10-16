/**
 * F5 step 4, `llms.txt` and `llms-full.txt` (.claude/plans/specs/f5-ai-ready.md
 * 1.1 to 1.3, 3, 9, 10 row 4, D3, and "Review answers"). The docs generator
 * writes two text files at the Pages root for an AI agent, from the same pages a
 * person reads (RL-19): an index of every page, and the curated text of them.
 * Step 5 (examples/ and manifests/ on Pages, spec 1.4, 1.5, D1, D2, D4) adds
 * its cases at the end of this same file; its contract is written there, above
 * the first of them.
 *
 * THE CONTRACT these tests pin (the spec leaves some names open; the
 * implementer follows them):
 *
 *   scripts/docs-site/ai.js
 *     AI_ROUTES      { llms: "/llms.txt", llmsFull: "/llms-full.txt",
 *                      examples: "/examples/", manifests: "/manifests/" }
 *     LLMS_FULL_MAX  the ceiling in bytes (448 KiB; fixed once, never raised)
 *     renderLlmsTxt(site, { siteUrl = "" })
 *     renderLlmsFull(site, { siteUrl = "" })   throws over LLMS_FULL_MAX
 *     htmlToText(fragment, { file })           throws `<file>:<line>` on an
 *                                              element it does not know
 *   `siteUrl` is the site's root URL with its trailing slash (SITE_URL), or ""
 *   (root-absolute links, as in dev): a page's URL is siteUrl + route.slice(1)
 *   when siteUrl is set and the route itself when it is not.
 *
 *   llms.txt (spec 1.2). `# LUZ`, a `> ` summary, one details paragraph, then
 *   one `##` per area of site.json that has pages, in its order, in the
 *   reading order of Previous / Next (the area index first), then `##
 *   Documentation` (the hub's home) and, last, `## Optional`. Each item is
 *   `- [<title>](<url>): <description>`, the page's front matter verbatim. The
 *   pages are exactly those of indexData() (the A-Z page has `search: false`
 *   and is out, whatever the spec's sample shows; the spec contradicts
 *   itself there and "as in indexData()" is the rule it states). Optional links
 *   llms-full.txt. Details paragraph: the packages in load order from
 *   scripts/luz-packages.js, `classes.json`, and `npx @luz-ds/check`.
 *
 *   llms-full.txt (spec 1.3). `# LUZ` first, then one entry per page of every
 *   area but the hub, in the same order, opening with `## <title>` then a
 *   header block that starts `URL: <url>` and, for a page with `files`, has
 *   `Files: <files> · Package: @luz-ds/<package>` (the package of the area:
 *   components is core; site, landing, cms and app are their own), a blank line, the page's description,
 *   then `### <heading>` sections taken by id: the known issues, `#markup`
 *   (each `pre[data-lang=html]` as a fenced block, its `aria-label` as the
 *   caption line before the fence), `#variants` (a table row is
 *   `- \`first\`: other cells`), `#how`, `#no-js`, `#keyboard`, `#when`,
 *   `#when-not`. Never `#content` (Writing the content), the Do and Don't
 *   captions of `#do-dont`, `#example`, `#contrast`, `#tokens`, a specimen, an `[inert]` or
 *   `[aria-hidden="true"]` subtree, a `<dialog>`, a `<script>` or a `<style>`.
 *   The accessibility statement is only its summary, its h2 outline and a
 *   pointer to its URL (under 2,000 B), not its full text.
 *   An internal link (`href="/docs/..."`) is absolute under siteUrl.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { decodeEntities, readHtml, tags } from "../scripts/docs-site/html.js";
import { docsSite } from "../scripts/docs-site/plugin.js";
import { indexData, readingOrder, scanSite } from "../scripts/docs-site/site.js";
import { PACKAGES } from "../scripts/luz-packages.js";
import { FILES } from "../scripts/docs-site/snippets.js";
import { PAGES_CSP, SITE_URL } from "../vite.config.js";

const root = fileURLToPath(new URL("../", import.meta.url));

/* ---- the module, or a clear failure while it does not exist ---------------- */

const AI_FILE = join(root, "scripts/docs-site/ai.js");
const ai = existsSync(AI_FILE) ? await import(/* @vite-ignore */ AI_FILE) : {};

function member(name) {
  if (ai[name] === undefined) throw new Error(`scripts/docs-site/ai.js does not exist or does not export ${name}`);
  return ai[name];
}
/** The message of what `fn` throws, "" when it does not; the missing module is never a pass. */
function thrownBy(fn) {
  try {
    fn();
  } catch (error) {
    if (/does not exist or does not export/.test(error.message)) throw error;
    return error.message;
  }
  return "";
}
const renderLlmsTxt = (...args) => member("renderLlmsTxt")(...args);
const renderLlmsFull = (...args) => member("renderLlmsFull")(...args);
const htmlToText = (...args) => member("htmlToText")(...args);

/* ---- the numbers ----------------------------------------------------------- */

// llms.txt: the unit-test guard, tighter than any shared budget (spec 1.2).
const LLMS_TXT_MAX = 32 * 1024;
// llms-full.txt: fixed once, on 2026-10-15, from the measured 390,512 B of
// renderLlmsFull() on the real pages (the spec's 300-340 kB was an estimate,
// not a build; the owner accepted the ideal and the ceiling below). The ceiling
// goes to ai.js as LLMS_FULL_MAX and to budgets.json in step 6, and it is never
// raised afterwards (RL-17). The ideal was re-fixed once on 2026-10-15 after the
// F5 pages (it was 384 KiB, measured before "Working with AI" existed); the
// ceiling is unchanged and never raised.
const LLMS_FULL_IDEAL = 400 * 1024;
const LLMS_FULL_CEILING = 448 * 1024;
// Room for the pages F4 and F6 add: at least 40 KiB under the ideal (the file is what an agent needs
// to write LUZ markup; the audit material of a page stays on the page and in the manifests).
const LLMS_FULL_ROOM = LLMS_FULL_IDEAL - 40 * 1024;
// Curated, not empty: a floor that only says the sections are really there.
const LLMS_FULL_FLOOR = 64 * 1024;

/* ---- the real site --------------------------------------------------------- */

const docsDir = join(root, "apps/docs");
const site = scanSite(docsDir, root);
const listed = indexData(site);
const urlOf = (route, siteUrl = SITE_URL) => (siteUrl ? `${siteUrl}${route.slice(1)}` : route);

const cache = new Map();
const once = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};
const txt = (siteUrl = SITE_URL) => once(`txt:${siteUrl}`, () => renderLlmsTxt(site, { siteUrl }));
const full = (siteUrl = SITE_URL) => once(`full:${siteUrl}`, () => renderLlmsFull(site, { siteUrl }));
const bytes = (text) => Buffer.byteLength(text, "utf-8");

const ITEM = /^- \[(.*)\]\(([^)\s]+)\): (.*)$/;

/** llms.txt as { h1, quote (first line), quoteText, intro: [lines], sections: [{ title, lines, items }] }. */
function parseTxt(text) {
  const lines = text.split("\n");
  const sections = [];
  const head = [];
  let current = null;
  for (const line of lines) {
    const h2 = /^## (.+)$/.exec(line);
    if (h2) {
      current = { title: h2[1], lines: [], items: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
      const item = ITEM.exec(line);
      if (item) current.items.push({ title: item[1], url: item[2], description: item[3], line });
    } else {
      head.push(line);
    }
  }
  const nonBlank = head.filter((l) => l.trim());
  const quoted = nonBlank.slice(1).filter((l) => l.startsWith(">"));
  return {
    h1: nonBlank[0],
    quote: quoted[0],
    quoteText: quoted.join("\n"),
    intro: nonBlank.slice(1).filter((l) => !l.startsWith(">")),
    sections,
  };
}

/** The `##` entries of llms-full.txt, outside fenced code: { title, text, url }. */
function entriesOf(text) {
  const entries = [];
  let fenced = false;
  let current = null;
  for (const line of text.split("\n")) {
    if (/^```/.test(line)) fenced = !fenced;
    if (!fenced && /^## /.test(line)) {
      current = { title: line.slice(3), lines: [] };
      entries.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  for (const entry of entries) {
    entry.text = entry.lines.join("\n");
    entry.url = /^URL: (\S+)$/m.exec(entry.text)?.[1] ?? null;
  }
  return entries;
}

/** Text with its fenced blocks and inline code spans removed: what is left is prose. */
function proseOf(text) {
  const out = [];
  let fenced = false;
  for (const line of text.split("\n")) {
    if (/^```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) out.push(line.replace(/`[^`\n]*`/g, ""));
  }
  return out.join("\n");
}

const TAG = /<\/?[A-Za-z!][^>\n]*>/;

/** The sections llms.txt must list, from the front matter and the reading order. */
function expectedSections() {
  const inIndex = new Set(listed.map((e) => e.route));
  const order = readingOrder(site);
  const sections = [];
  for (const area of site.areas) {
    const pages = order.filter((p) => p.meta.area === area.id && inIndex.has(p.route));
    if (pages.length) sections.push({ title: area.label, pages });
  }
  const hub = site.pages.filter((p) => !site.areas.some((a) => a.id === p.meta.area) && inIndex.has(p.route));
  sections.push({ title: "Documentation", pages: hub });
  return sections;
}

// Patterns a published file must never carry (RL-19, OWNER.md section 5). The one
// `.claude/` path a page may write is where a project copies the published
// accessibility reviewer to (`npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md`,
// the page "Working with AI"): it is the consumer's folder, not this repository's.
const PRIVATE = [/\.claude\/(?!agents\/luz-accessibility-reviewer\.md)/, /OWNER\.md/, /MEMORY\.md/, /\/home\/ares/, /ghp_[A-Za-z0-9]{20}/, /npm_[A-Za-z0-9]{30}/, /-----BEGIN/, /sincero/, /settings\.local/];

/* ---- fixtures: a small docs folder ------------------------------------------ */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const FIXTURE_URL = "https://example.test/luz/";

function fixtureSite(files) {
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-ai-files-"));
  temps.push(repoRoot);
  const dir = join(repoRoot, "apps/docs");
  const all = {
    "site.json": JSON.stringify({
      areas: [
        { id: "components", label: "Components", slug: "components" },
        { id: "tokens", label: "Tokens", slug: "tokens" },
      ],
    }),
    "pages/index.html": '<!-- luz:page\ntitle: LUZ documentation\ndescription: The hub, for the tests.\narea: hub\n-->\n<p>HUB-ONLY-TEXT</p>\n',
    ...files,
  };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return { repoRoot, docsDir: dir, scan: () => scanSite(dir, repoRoot) };
}

const FRONT = (title, description, area, extra = "") => `<!-- luz:page\ntitle: ${title}\ndescription: ${description}\narea: ${area}\n${extra}-->\n`;

/** A component page shaped like the real ones (copy of components/button.html). */
function widgetPage({ how = "<p>HOW-TEXT, with <a href=\"/docs/tokens/color/#modes\">the colour tokens</a>, <code>.luz-widget</code> and <strong>bold</strong>.</p>" } = {}) {
  return `${FRONT("Widget", "A widget that does one thing, for the tests.", "components", "files: components/widget.css\ntoc: h2,h3\n")}`.concat(`
<div class="docs-component" id="c-widget">
  <h2 id="example">Example</h2>
  <div class="docs-example" data-docs-specimen>
    <p>DEMO-TEXT</p>
    <style>.demo-style-leak { color: red; }</style>
  </div>
  <h2 id="known-issues">Known issues</h2>
  <p>None known.</p>
  <nav class="luz-tabs docs-view-tabs" aria-label="Widget documentation">
    <a class="luz-tab" href="#code-panel" data-docs-view="code">Code</a>
    <a class="luz-tab" href="#design-panel" data-docs-view="design">Design</a>
  </nav>
  <div class="luz-tabpanel docs-view" id="code-panel">
    <h2 class="docs-view__title" id="code">Code</h2>
    <h3 id="markup">Copy the markup</h3>
    <div class="docs-snippet">
      <div class="docs-snippet__bar">
        <span class="docs-snippet__lang">HTML</span>
        <button class="luz-copy-btn" type="button" data-copy-from="code-widget" aria-label="Copy the widget markup">Copy</button>
      </div>
      <pre class="luz-code-block" data-lang="html" tabindex="0" role="region" aria-label="Widget markup"><code id="code-widget">&lt;div class=&quot;luz-widget&quot;&gt;Fish &amp;amp; chips&lt;/div&gt;</code></pre>
    </div>
    <h3 id="variants">Variants and options</h3>
    <div class="luz-table-wrap" role="region" aria-label="Widget variants" tabindex="0">
      <table class="luz-table">
        <thead>
          <tr><th scope="col">Class or attribute</th><th scope="col">Effect</th></tr>
        </thead>
        <tbody>
          <tr><td data-label="Class or attribute"><div><code>.luz-widget--big</code></div></td><td data-label="Effect"><div>Makes it big</div></td></tr>
          <tr><td data-label="Class or attribute"><div><code>.luz-widget--wide</code></div></td><td data-label="Effect"><div>Makes it wide</div></td><td data-label="Needs"><div>Needs room</div></td></tr>
        </tbody>
      </table>
    </div>
    <h3 id="how">How it works</h3>
    ${how}
    <h3 id="no-js">Without JavaScript</h3>
    <p>NOJS-TEXT</p>
    <h3 id="keyboard">Keyboard and ARIA</h3>
    <ul>
      <li>KEY-ONE</li>
      <li>KEY-TWO</li>
    </ul>
  </div>
  <div class="luz-tabpanel docs-view" id="design-panel">
    <h2 class="docs-view__title" id="design">Design</h2>
    <h3 id="when">When to use</h3>
    <p>WHEN-TEXT</p>
    <h3 id="when-not">When not to use</h3>
    <p>WHEN-NOT-TEXT</p>
    <h3 id="do-dont">Do and don't</h3>
    <div class="docs-dodont">
      <figure class="docs-dodont__item docs-dodont__item--do">
        <figcaption><strong class="docs-dodont__verdict">Do</strong> DO-REASON</figcaption>
        <div class="docs-dodont__stage" inert aria-hidden="true"><button class="luz-btn" type="button">DO-STAGE</button></div>
      </figure>
      <figure class="docs-dodont__item docs-dodont__item--dont">
        <figcaption><strong class="docs-dodont__verdict">Don't</strong> DONT-REASON</figcaption>
        <div class="docs-dodont__stage" inert aria-hidden="true"><button class="luz-btn" type="button">DONT-STAGE</button></div>
      </figure>
    </div>
    <h3 id="content">Writing the content</h3>
    <p>CONTENT-TEXT</p>
    <h3 id="contrast">Contrast and focus</h3>
    <p>CONTRAST-TEXT</p>
    <h3 id="tokens">Tokens it uses</h3>
    <dl class="docs-uses"><dt>Colour</dt><dd><code>--luz-token-only-here</code></dd></dl>
  </div>
</div>
`);
}

const TOKENS_PAGE = `${FRONT("Color", "The colour tokens, for the tests.", "tokens")}<div class="docs-block" id="t-color">
  <p>COLOR-PROSE</p>
  <table class="luz-table"><thead><tr><th scope="col">Token</th><th scope="col">Value</th></tr></thead><tbody>
    <tr><td><code>--luz-brand-primary</code></td><td>VALUE-CELL</td></tr>
  </tbody></table>
</div>
`;

const fixtureFiles = (extra = {}) => ({
  "pages/components/index.html": FRONT("Components", "Every component, for the tests.", "components", "generate: gallery\nlead: false\n") + "<p>INDEX-PROSE</p>\n",
  "pages/components/widget.html": widgetPage(),
  "pages/tokens/color.html": TOKENS_PAGE,
  ...extra,
});

/* ---- the module ------------------------------------------------------------ */

describe("scripts/docs-site/ai.js: the contract", () => {
  it("names the four routes of the AI files, as the spec's table does", () => {
    expect(member("AI_ROUTES")).toEqual({ llms: "/llms.txt", llmsFull: "/llms-full.txt", examples: "/examples/", manifests: "/manifests/" });
  });

  it("exports the pure functions, and the ceiling of llms-full.txt the test fixes", () => {
    for (const name of ["renderLlmsTxt", "renderLlmsFull", "htmlToText"]) expect(typeof member(name), name).toBe("function");
    expect(member("LLMS_FULL_MAX")).toBe(LLMS_FULL_CEILING);
  });
});

/* ---- htmlToText: the converter ---------------------------------------------- */

describe("htmlToText: a page fragment as text", () => {
  const FILE = "apps/docs/pages/x.html";
  const text = (html) => htmlToText(html, { file: FILE }).trim();

  it("writes a paragraph per <p>, apart by a blank line, with the entities decoded", () => {
    expect(text("<p>One &amp; two.</p>\n<p>Three &lt;four&gt;.</p>")).toBe("One & two.\n\nThree <four>.");
  });

  it("writes code, a link and strong the way Markdown does", () => {
    expect(text('<p>Use <code>.luz-btn</code> and <a href="/docs/x/">the docs</a>, <strong>always</strong>.</p>')).toBe(
      "Use `.luz-btn` and [the docs](/docs/x/), **always**.",
    );
    expect(text("<p>An <em>odd</em> one</p>")).toMatch(/^An (\*odd\*|_odd_) one$/);
  });

  it("writes lists as list items, and ordered lists numbered", () => {
    expect(text("<ul><li>one</li><li>two</li></ul>")).toBe("- one\n- two");
    expect(text("<ol><li>one</li><li>two</li></ol>")).toBe("1. one\n2. two");
  });

  it("writes h3 and h4 as Markdown headings", () => {
    expect(text("<h3>Section</h3><h4>Part</h4>")).toMatch(/^### Section\s+#### Part$/);
  });

  it("writes a table row as `- first cell: other cells`, whatever wraps the cell", () => {
    const out = text(
      '<table class="luz-table"><thead><tr><th scope="col">Class</th><th scope="col">Effect</th></tr></thead><tbody>' +
        '<tr><td data-label="Class"><div><code>.luz-btn--primary</code></div></td><td data-label="Effect"><div>Brand fill</div></td></tr>' +
        "</tbody></table>",
    );
    expect(out.split("\n")).toContain("- `.luz-btn--primary`: Brand fill");
  });

  it("writes a code block fenced with its language, its aria-label as the caption, decoded once", () => {
    const html = '<pre class="luz-code-block" data-lang="html" aria-label="Hello markup"><code id="c">&lt;p&gt;Fish &amp;amp; chips&lt;/p&gt;</code></pre>';
    expect(text(html)).toBe("Hello markup\n```html\n<p>Fish &amp; chips</p>\n```");
  });

  it("leaves out a script, a style, a specimen, what is inert or hidden, and a dialog, even with unknown elements inside", () => {
    const wrapped = [
      "<script>var leak = 1;</script>",
      "<style>.leak { color: red; }</style>",
      "<div data-docs-specimen><p>leak</p><marquee>leak</marquee></div>",
      "<div inert><p>leak</p></div>",
      '<div aria-hidden="true"><p>leak</p></div>',
      "<dialog><p>leak</p></dialog>",
    ];
    for (const part of wrapped) expect(text(`<p>kept</p>\n${part}\n<p>also kept</p>`), part).toBe("kept\n\nalso kept");
  });

  it("throws with file:line on an element it does not know, so a new element is a decision", () => {
    const message = thrownBy(() => htmlToText("<p>fine</p>\n<marquee>odd</marquee>", { file: FILE }));
    expect(message, "htmlToText must throw").not.toBe("");
    expect(message).toContain(`${FILE}:2`);
    expect(message).toMatch(/marquee/);
  });
});

/* ---- llms.txt --------------------------------------------------------------- */

describe("llms.txt: the index of the site for an agent", () => {
  // read lazily: while ai.js does not exist each test fails on its own, not the whole file
  const lazy = (make) => new Proxy({}, { get: (_, key) => make()[key] });
  const parsed = lazy(() => once("parsed", () => parseTxt(txt())));

  it("is the llmstxt.org shape: an H1 that says LUZ, a blockquote summary, then H2 sections", () => {
    expect(parsed.h1).toBe("# LUZ");
    expect(parsed.quote).toMatch(/^> \S/);
    expect(parsed.sections.length).toBeGreaterThan(2);
    expect(txt().startsWith("# LUZ\n")).toBe(true);
    expect(txt().endsWith("\n")).toBe(true);
    expect(txt()).not.toContain("\r");
  });

  it("has only list items of `- [Title](url): description` under each H2", () => {
    for (const section of parsed.sections) {
      const lines = section.lines.filter((l) => l.trim());
      expect(lines.length, section.title).toBeGreaterThan(0);
      for (const line of lines) expect(line, `${section.title}: ${line}`).toMatch(ITEM);
    }
  });

  it("says what it is from the hub page's description, MIT and the beta, with no claim of conformance", () => {
    const hub = site.byRoute.get("/docs/");
    expect(parsed.quoteText).toContain(hub.meta.description);
    expect(parsed.quoteText).toMatch(/\bMIT\b/);
    expect(parsed.quoteText).toContain("any release may break anything");
    expect(txt()).not.toMatch(/\b(conforms|conformant|compliant|fully accessible|is accessible|are accessible)\b/i);
  });

  it("tells the load order of the packages, the class manifest and the check command, in one paragraph", () => {
    const details = parsed.intro.join("\n");
    const at = PACKAGES.map((name) => details.indexOf(`@luz-ds/${name}`));
    for (const [i, name] of PACKAGES.entries()) expect(at[i], `@luz-ds/${name}`).toBeGreaterThan(-1);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(details).toContain("classes.json");
    expect(details).toContain("npx @luz-ds/check");
    expect(txt()).not.toContain("npx luz-check");
    expect(txt()).not.toMatch(/until it passes/i);
  });

  it("lists the areas in site.json order, each page in the reading order, then Documentation and Optional last", () => {
    const expected = expectedSections();
    const titles = parsed.sections.map((s) => s.title);
    expect(titles).toEqual([...expected.map((s) => s.title), "Optional"]);
    for (const [i, section] of expected.entries()) {
      expect(parsed.sections[i].items.map((item) => item.url), section.title).toEqual(section.pages.map((p) => urlOf(p.route)));
    }
  });

  it("writes each page as its title and description from the front matter, verbatim", () => {
    for (const section of expectedSections()) {
      const items = parsed.sections.find((s) => s.title === section.title).items;
      for (const [i, page] of section.pages.entries()) {
        expect(items[i].line).toBe(`- [${page.meta.title}](${urlOf(page.route)}): ${page.meta.description}`);
      }
    }
  });

  it("lists the pages of indexData() and no others: once each, not the A-Z page, not the 404", () => {
    const urls = parsed.sections.filter((s) => s.title !== "Optional").flatMap((s) => s.items.map((i) => i.url));
    expect(urls.length).toBe(new Set(urls).size);
    expect([...urls].sort()).toEqual(listed.map((e) => urlOf(e.route)).sort());
    expect(urls).not.toContain(urlOf("/docs/a-z/"));
    expect(urls.some((u) => u.endsWith("/404.html"))).toBe(false);
  });

  it("links the full text under Optional", () => {
    const optional = parsed.sections.at(-1);
    expect(optional.items.map((i) => i.url)).toContain(`${SITE_URL}llms-full.txt`);
  });

  it("has absolute URLs under the Pages base, each a route of the generator or a file the build emits", () => {
    const routes = new Set(site.pages.map((p) => p.route));
    const emitted = [member("AI_ROUTES").llmsFull, member("AI_ROUTES").llms];
    for (const section of parsed.sections) {
      for (const item of section.items) {
        expect(item.url.startsWith(SITE_URL), item.url).toBe(true);
        const route = `/${item.url.slice(SITE_URL.length)}`;
        const known = routes.has(route) || emitted.includes(route) || [member("AI_ROUTES").examples, member("AI_ROUTES").manifests].some((p) => route.startsWith(p));
        expect(known, item.url).toBe(true);
      }
    }
  });

  it("has root-absolute URLs with no site URL, as the dev server serves it", () => {
    const dev = parseTxt(txt(""));
    const routes = new Set(site.pages.map((p) => p.route));
    for (const section of dev.sections.filter((s) => s.title !== "Optional")) {
      for (const item of section.items) expect(routes.has(item.url), item.url).toBe(true);
    }
    expect(dev.sections.at(-1).items.map((i) => i.url)).toContain("/llms-full.txt");
  });

  it("is the same text twice, and from a fresh scan of the site", () => {
    expect(renderLlmsTxt(site, { siteUrl: SITE_URL })).toBe(txt());
    expect(renderLlmsTxt(scanSite(docsDir, root), { siteUrl: SITE_URL })).toBe(txt());
  });

  it("stays under 32 KiB, with the longest URLs", () => {
    expect(bytes(txt())).toBeLessThan(LLMS_TXT_MAX);
  });

  it("names nothing that is not on a human page: no private path, no secret, a route behind every title", () => {
    for (const pattern of PRIVATE) expect(txt(), String(pattern)).not.toMatch(pattern);
    for (const section of parsed.sections.filter((s) => s.title !== "Optional")) {
      for (const item of section.items) {
        const page = site.byRoute.get(`/${item.url.slice(SITE_URL.length)}`);
        expect(page, item.url).toBeTruthy();
        expect(item.title, item.url).toBe(page.meta.title);
        expect(item.title, item.url).not.toMatch(/[[\]]/);
      }
    }
  });
});

/* ---- llms-full.txt, the real pages ------------------------------------------ */

const markupAreas = ["components", "site", "landing", "cms", "app"];
// Pages that print "&lt;tag" as plain text on purpose (counted in apps/docs/pages)
const PLAIN_TAGS = new Set(["/docs/components/copy-button/", "/docs/components/icon-grid/", "/docs/site/classes/"]);

describe("llms-full.txt: the curated text of the pages, from the real site", () => {
  // read lazily: while ai.js does not exist each test fails on its own, not the whole file
  const all = () => once("entries", () => entriesOf(full()));
  const entry = (route) => all().find((e) => e.url === urlOf(route));

  it("starts with the H1 and is one entry per page in the reading order of llms.txt, none for the hub", () => {
    expect(full().startsWith("# LUZ\n")).toBe(true);
    const entries = all();
    const pages = expectedSections().filter((s) => s.title !== "Documentation").flatMap((s) => s.pages);
    const guided = entries.filter((e) => e.url);
    expect(guided.map((e) => e.url)).toEqual(pages.map((p) => urlOf(p.route)));
    for (const e of guided) expect(e.title, e.url).toBe(site.byRoute.get(`/${e.url.slice(SITE_URL.length)}`).meta.title);
    expect(entry("/docs/")).toBeUndefined();
  });

  it("is fixed in size: under the ideal, over a floor, and its ceiling is the one ai.js throws at", () => {
    expect(bytes(full())).toBeGreaterThan(LLMS_FULL_FLOOR);
    expect(bytes(full())).toBeLessThanOrEqual(LLMS_FULL_IDEAL);
    expect(LLMS_FULL_IDEAL).toBeLessThan(LLMS_FULL_CEILING);
  });

  it("leaves 40 KiB of room under the ideal, so the pages that come do not break the build", () => {
    expect(LLMS_FULL_ROOM).toBe(368_640);
    expect(bytes(full())).toBeLessThanOrEqual(LLMS_FULL_ROOM);
  });

  it("has no \"Contrast and focus\" table and no \"Tokens it uses\" list on any component or pattern page", () => {
    const withMarkup = all().filter((e) => e.url && /^Example: /m.test(e.text));
    expect(withMarkup.length, "entries of component and pattern pages").toBeGreaterThan(40);
    for (const e of withMarkup) {
      // a contrast cell is `--luz-x on --luz-y` (or ` over ` for a translucent layer)
      expect(e.text, `${e.url}: a contrast cell`).not.toMatch(/--luz-[a-z0-9-]+`?\s+(?:on|over)\s+`?--luz-/);
      // the heading of the two sections
      expect(e.text, `${e.url}: Contrast and focus`).not.toMatch(/^#{2,4} Contrast and focus$/m);
      expect(e.text, `${e.url}: Tokens it uses`).not.toMatch(/^#{2,4} Tokens it uses$/m);
    }
    // and nowhere else in the file either
    expect(full()).not.toMatch(/--luz-[a-z0-9-]+`?\s+(?:on|over)\s+`?--luz-/);
  });

  it("is the same text twice, and from a fresh scan of the site, with root-absolute links in dev", () => {
    expect(renderLlmsFull(scanSite(docsDir, root), { siteUrl: SITE_URL })).toBe(full());
    const urls = [...full("").matchAll(/^URL: (\S+)$/gm)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(90);
    for (const url of urls) expect(url.startsWith("/docs/"), url).toBe(true);
  });

  it("gives Button what its page says: summary, files and package, known issues, markup, variants", () => {
    const button = entry("/docs/components/button/");
    expect(button, "an entry for Button").toBeTruthy();
    const head = button.text.split(/\n\s*\n/)[0].split("\n").filter(Boolean);
    expect(button.title).toBe("Button");
    expect(head[0]).toBe(`URL: ${urlOf("/docs/components/button/")}`);
    expect(head).toContain("Files: components/button.css · Package: @luz-ds/core");
    const meta = site.byRoute.get("/docs/components/button/").meta;
    expect(button.text).toContain(`\n\n${meta.description}\n`);
    expect(button.text).toContain("### Known issues\nNone known.");
    expect(button.text).toContain(
      '### Copy the markup\nPrimary button markup\n```html\n<button class="luz-btn luz-btn--primary" type="button">Save changes</button>\n```',
    );
    expect(button.text).toContain("### Variants and options");
    expect(button.text.split("\n")).toContain("- `.luz-btn--primary`: Brand fill: the main action of the view");
  });

  it("gives a page of site its own package", () => {
    const banner = entry("/docs/site/banner/");
    expect(banner, "an entry for Banner").toBeTruthy();
    expect(banner.text).toContain("Package: @luz-ds/site");
  });

  it("keeps the sections a person reads by id and leaves the computed and the demo ones out, on Button", () => {
    const button = entry("/docs/components/button/");
    const page = site.byRoute.get("/docs/components/button/");
    const headings = readHtml("\n".repeat(page.bodyLine - 1) + page.body, page.file).headings;
    const titleOf = (id) => headings.find((h) => h.id === id)?.text;
    for (const id of ["how", "no-js", "keyboard", "when", "when-not"]) {
      expect(titleOf(id), `the page has #${id}`).toBeTruthy();
      expect(button.text, `#${id}`).toContain(`### ${titleOf(id)}`);
    }
    for (const id of ["example", "content", "contrast", "tokens"]) {
      expect(titleOf(id), `the page has #${id}`).toBeTruthy();
      expect(button.text, `#${id}`).not.toContain(`### ${titleOf(id)}`);
    }
    // text that is only in the live demo (a specimen)
    expect(button.text).not.toContain("Link as button");
    // nor the row of tabs between the known issues and the code
    expect(button.text).not.toContain("#code-panel");
  });

  it("has every html block of every #markup section, verbatim as the page shows it", () => {
    let blocks = 0;
    let pages = 0;
    for (const page of site.pages.filter((p) => markupAreas.includes(p.meta.area))) {
      const start = page.body.search(/<h3\b[^>]*\bid="markup"/);
      if (start === -1) continue;
      pages += 1;
      const rest = page.body.slice(start + 1);
      const end = rest.search(/<h[23]\b/);
      const section = rest.slice(0, end === -1 ? undefined : end);
      const e = entry(page.route);
      expect(e, `an entry for ${page.route}`).toBeTruthy();
      for (const [, code] of section.matchAll(/<pre\b[^>]*\bdata-lang="html"[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)) {
        blocks += 1;
        expect(e.text, `${page.route}: ${decodeEntities(code).slice(0, 60)}`).toContain(decodeEntities(code).trim());
      }
    }
    // the spec counts 48 pages and 65 html blocks; the oracle must have found them
    expect(pages).toBeGreaterThan(40);
    expect(blocks).toBeGreaterThan(55);
  });

  it("has the headings of a get-started, an accessibility and an html page, outside demos", () => {
    for (const route of ["/docs/get-started/layers/", "/docs/accessibility/", "/docs/html/text/"]) {
      const page = site.byRoute.get(route);
      const e = entry(route);
      expect(e, route).toBeTruthy();
      const h2 = readHtml("\n".repeat(page.bodyLine - 1) + page.body, page.file).headings.filter((h) => h.level === 2 && !h.specimen);
      expect(h2.length, route).toBeGreaterThan(0);
      for (const h of h2) expect(e.text, `${route}: ${h.text}`).toContain(h.text);
    }
  });

  it("keeps the accessibility statement to its summary, its h2 outline and its URL", () => {
    const route = "/docs/accessibility/";
    const page = site.byRoute.get(route);
    const e = entry(route);
    expect(e, route).toBeTruthy();
    expect(Buffer.byteLength(e.text, "utf8"), "size of the entry").toBeLessThan(2000);
    expect(e.text).toContain(`URL: ${SITE_URL}docs/accessibility/`);
    const h2 = readHtml("\n".repeat(page.bodyLine - 1) + page.body, page.file).headings.filter((h) => h.level === 2 && !h.specimen);
    expect(h2.length).toBeGreaterThan(0);
    for (const h of h2) expect(e.text, h.text).toContain(h.text);
  });

  it("points a tokens page at the manifests instead of copying its tables of values", () => {
    for (const route of ["/docs/tokens/spacing/", "/docs/tokens/color/"]) {
      const e = entry(route);
      expect(e, route).toBeTruthy();
      expect(e.text, route).toContain("tokens.json");
      expect(e.text, route).toContain("classes.json");
    }
  });

  it("has no HTML left outside code: every tag is in a fenced block or between backticks", () => {
    for (const e of all()) {
      const route = `/${e.url?.slice(SITE_URL.length)}`;
      // the html area's outline is the names of elements (`<blockquote>`), the one place a tag is the text
      if (!e.url || PLAIN_TAGS.has(route) || site.byRoute.get(route)?.meta.area === "html") continue;
      // a `Files:` line may carry the page's own `files` text, such as <luz-banner>
      const prose = proseOf(e.text).split("\n").filter((l) => !l.startsWith("Files:")).join("\n");
      expect(prose, e.url).not.toMatch(TAG);
    }
  });

  it("makes every internal link absolute under the site URL, and none root-absolute", () => {
    const prose = proseOf(full());
    expect(prose).not.toMatch(/\]\(\/docs\//);
    expect(prose).toMatch(/\]\(https:\/\/nandovejer\.github\.io\/luz\/docs\//);
    expect(proseOf(full(""))).toMatch(/\]\(\/docs\//);
  });

  it("names nothing that is not on a human page: no private path, no secret, no GitHub or npm token", () => {
    for (const pattern of PRIVATE) expect(full(), String(pattern)).not.toMatch(pattern);
    for (const e of all().filter((x) => x.url)) {
      const page = site.byRoute.get(`/${e.url.slice(SITE_URL.length)}`);
      expect(page, e.url).toBeTruthy();
      expect(e.title, e.url).toBe(page.meta.title);
    }
  });
});

/* ---- the converter's policy, on a fixture ------------------------------------ */

describe("llms-full.txt: what a page contributes, on a fixture", () => {
  const options = { siteUrl: FIXTURE_URL };

  it("keeps the sections of the spec and leaves out the demo, the do/don't stages, the computed tables and the style", () => {
    const { scan } = fixtureSite(fixtureFiles());
    const out = renderLlmsFull(scan(), options);
    for (const kept of ["None known.", "HOW-TEXT", "NOJS-TEXT", "KEY-ONE", "KEY-TWO", "WHEN-TEXT", "WHEN-NOT-TEXT"]) {
      expect(out, kept).toContain(kept);
    }
    for (const left of ["DO-REASON", "DONT-REASON", "CONTENT-TEXT", "DEMO-TEXT", "demo-style-leak", "DO-STAGE", "DONT-STAGE", "CONTRAST-TEXT", "--luz-token-only-here", "Contrast and focus", "Tokens it uses", "### Example", "HUB-ONLY-TEXT", "#code-panel", "#design-panel"]) {
      expect(out, left).not.toContain(left);
    }
  });

  it("writes the entry as the spec shapes it, decodes the markup once and absolutises links", () => {
    const { scan } = fixtureSite(fixtureFiles());
    const out = renderLlmsFull(scan(), options);
    const widget = entriesOf(out).find((e) => e.title === "Widget");
    expect(widget.url).toBe(`${FIXTURE_URL}docs/components/widget/`);
    expect(widget.text).toContain("Files: components/widget.css · Package: @luz-ds/core");
    expect(widget.text).toContain('Widget markup\n```html\n<div class="luz-widget">Fish &amp; chips</div>\n```');
    expect(widget.text.split("\n")).toContain("- `.luz-widget--big`: Makes it big");
    expect(widget.text).toMatch(/^- `\.luz-widget--wide`: Makes it wide.*Needs room$/m);
    expect(widget.text).toContain("HOW-TEXT, with [the colour tokens](https://example.test/luz/docs/tokens/color/#modes), `.luz-widget` and **bold**.");
    expect(renderLlmsFull(scan(), { siteUrl: "" })).toContain("[the colour tokens](/docs/tokens/color/#modes)");
  });

  it("gives a tokens page its prose and a pointer to the manifests, not its table of values", () => {
    const { scan } = fixtureSite(fixtureFiles());
    const color = entriesOf(renderLlmsFull(scan(), options)).find((e) => e.title === "Color");
    expect(color.text).toContain("COLOR-PROSE");
    expect(color.text).toContain("tokens.json");
    expect(color.text).not.toContain("VALUE-CELL");
  });

  it("follows the page: change its text and the file changes with it, and nothing else holds the old text", () => {
    const fixture = fixtureSite(fixtureFiles());
    const before = renderLlmsFull(fixture.scan(), options);
    expect(before).toContain("HOW-TEXT");
    const path = join(fixture.docsDir, "pages/components/widget.html");
    writeFileSync(path, readFileSync(path, "utf-8").replace("HOW-TEXT", "HOW-CHANGED").replace("A widget that does one thing, for the tests.", "A changed description."));
    const after = renderLlmsFull(fixture.scan(), options);
    expect(after).toContain("HOW-CHANGED");
    expect(after).toContain("A changed description.");
    expect(after).not.toContain("HOW-TEXT");
    expect(renderLlmsTxt(fixture.scan(), options)).toContain(`- [Widget](${FIXTURE_URL}docs/components/widget/): A changed description.`);
  });

  it("lists the fixture's areas in order, the hub under Documentation, and each description in llms.txt", () => {
    const { scan } = fixtureSite(fixtureFiles());
    const parsed = parseTxt(renderLlmsTxt(scan(), options));
    expect(parsed.sections.map((s) => s.title)).toEqual(["Components", "Tokens", "Documentation", "Optional"]);
    expect(parsed.sections[0].items.map((i) => i.title)).toEqual(["Components", "Widget"]);
    expect(parsed.sections[2].items.map((i) => i.url)).toEqual([`${FIXTURE_URL}docs/`]);
  });

  it("throws, with the page's file and line, on an element no section can say", () => {
    const odd = widgetPage({ how: "<marquee>ODD-ELEMENT</marquee>" });
    const { scan } = fixtureSite(fixtureFiles({ "pages/components/widget.html": odd }));
    const line = odd.split("\n").findIndex((l) => l.includes("<marquee>")) + 1;
    const message = thrownBy(() => renderLlmsFull(scan(), options));
    expect(message, "renderLlmsFull must throw").not.toBe("");
    expect(message).toContain(`apps/docs/pages/components/widget.html:${line}`);
    expect(message).toMatch(/marquee/);
  });

  it("throws at the ceiling, naming the file, so the build fails before check:size", () => {
    const paragraph = `<p>${"lorem ipsum dolor ".repeat(60)}</p>\n`;
    const count = Math.ceil(LLMS_FULL_CEILING / paragraph.length) + 20;
    const big = widgetPage({ how: paragraph.repeat(count) });
    const { scan } = fixtureSite(fixtureFiles({ "pages/components/widget.html": big }));
    const message = thrownBy(() => renderLlmsFull(scan(), options));
    expect(message, "renderLlmsFull must throw over the ceiling").toMatch(/llms-full\.txt/);
    // and the same pages with a short section are fine
    const small = fixtureSite(fixtureFiles());
    expect(thrownBy(() => renderLlmsFull(small.scan(), options))).toBe("");
  });
});

/* ---- the plugin: emitted by the build, served by the dev server -------------- */

describe("the Vite plugin emits and serves the two files", () => {
  const plugin = (relative) => docsSite({ repoRoot: root, relative, outRoot: join(tmpdir(), "luz-ai-files-out"), pagesBase: "/luz/", siteUrl: SITE_URL });

  it("emits llms.txt and llms-full.txt at the root of the pages build, with the absolute site URL", () => {
    const emitted = [];
    plugin(true).generateBundle.call({ emitFile: (file) => emitted.push(file) });
    const byName = new Map(emitted.map((f) => [f.fileName, f]));
    for (const [name, render] of [
      ["llms.txt", () => renderLlmsTxt(site, { siteUrl: SITE_URL })],
      ["llms-full.txt", () => renderLlmsFull(site, { siteUrl: SITE_URL })],
    ]) {
      const file = byName.get(name);
      expect(file, `${name} is emitted`).toBeTruthy();
      expect(file.type).toBe("asset");
      expect(file.source).toBe(render());
    }
  });

  it("serves both from the dev server, as plain text with root-absolute links", async () => {
    const middlewares = [];
    plugin(false).configureServer({
      watcher: { on() {} },
      ws: { send() {} },
      middlewares: { use: (fn) => middlewares.push(fn) },
      transformIndexHtml: async (_file, html) => html,
    });
    expect(middlewares.length).toBeGreaterThan(0);
    const serve = (url) =>
      new Promise((resolve) => {
        const headers = {};
        const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => resolve({ headers, body, statusCode: res.statusCode }) };
        middlewares[0]({ url, originalUrl: url }, res, () => resolve({ next: true }));
      });
    const llms = await serve("/llms.txt");
    expect(llms.next, "/llms.txt is answered by the plugin").toBeUndefined();
    expect(llms.headers["content-type"]).toMatch(/^text\/plain; charset=utf-8/);
    expect(llms.body).toBe(renderLlmsTxt(site, { siteUrl: "" }));
    const fullText = await serve("/llms-full.txt");
    expect(fullText.next, "/llms-full.txt is answered by the plugin").toBeUndefined();
    expect(fullText.headers["content-type"]).toMatch(/^text\/plain; charset=utf-8/);
    expect(fullText.body).toBe(renderLlmsFull(site, { siteUrl: "" }));
  }, 60_000);
});

/* ======================================================================= *
 * Step 5: examples/ and manifests/ on Pages (spec 1.4, 1.5, D1, D2, D4)
 *
 * THE CONTRACT these tests pin (the names are the spec's 1.1; the shapes the
 * spec leaves open are fixed here, the implementer follows them):
 *
 *   scripts/docs-site/ai.js
 *     exampleDocuments(site, { csp, versions })
 *         -> [{ route, page, html }], one per page that has a `#markup`
 *         section (48 today), whatever its area. `route` is
 *         `/examples/<area>/<slug>.html` for the page `/docs/<area>/<slug>/`
 *         (D2-A); `page` is the page of `site`; `html` a complete document.
 *         `csp` is the string of the CSP <meta> (PAGES_CSP in the pages
 *         build); `versions` maps each package name of PACKAGES to its
 *         version ({ tokens: "0.0.0", core: "0.0.0", ... }).
 *     exampleAssets(root)
 *         -> [{ route, from }]: the files an example loads, copied beside
 *         the examples (D1-A). `from` is relative to the repository root
 *         (`packages/core/dist/luz.min.css`), `route` is
 *         `/examples/dist/<pkg>/<file>`, flat, so a chunk is beside the entry
 *         that imports it by name. One per file of FILES of snippets.js (its
 *         css, js and chunks) with the tokens file `tokens.min.css` (no
 *         @font-face, no font to carry a licence for), nothing else.
 *     manifestAssets(root)
 *         -> [{ route, from }]: `/manifests/<pkg>/classes.json` for each
 *         package of PACKAGES, and `/manifests/<pkg>/custom-elements.json`
 *         for each package that has one in dist (core and site), `from` being
 *         `packages/<pkg>/dist/<file>`.
 *
 *   One example document (the shell of spec 1.4):
 *     <!doctype html>, <html lang="en">, charset and viewport meta, the CSP
 *     <meta http-equiv> (content === csp) before any <link> or <script>, a
 *     <title> `<Title>: markup examples – LUZ`, a header comment (it says
 *     "Do not edit", MIT and the version of core from `versions`), one
 *     <link rel=stylesheet> per package the page needs in load order (tokens,
 *     core, then site when the page's area is `site` or a kept block names a
 *     <luz-*> tag site's custom-elements.json declares, then the kind's when
 *     the area is landing, cms or app), each `../dist/<pkg>/<file>`; `<h1>`
 *     the page's title; the first link is to its docs page (relative, ending
 *     `#markup`); then, for each `html` block of `#markup` that has no
 *     <script> and no on*= attribute, `<h2 id="ex-<n>">` with the block's
 *     aria-label and the block's text, decoded once, as markup; the scripts at
 *     the end: `<script type="module" src="../dist/core/luz.min.js">` and, with
 *     site, `../dist/site/site.min.js`. Blocks skipped for a <script> or an
 *     on*= attribute are named (their aria-label) in the last comment of the
 *     document. No <style>, no inline <script>, no on*= attribute, no <base>,
 *     no third-party URL; no `style=` outside the blocks' own text.
 *
 *   scripts/docs-site/plugin.js: docsSite({ ..., csp }) takes the CSP string
 *     (vite.config.js passes PAGES_CSP); generateBundle() emits every example,
 *     every asset of exampleAssets() and every manifest of manifestAssets()
 *     at `route.slice(1)`; the dev server answers the same routes from a
 *     route -> body table (never joined from the URL).
 *
 *   llms.txt: `## Optional` links an example and the manifests; llms-full.txt:
 *     the header block of a page that has an example is `URL:`, `Example:`
 *     (the example's URL), then `Files:`.
 * ======================================================================= */

const exampleDocuments = (...args) => member("exampleDocuments")(...args);
const exampleAssets = (...args) => member("exampleAssets")(...args);
const manifestAssets = (...args) => member("manifestAssets")(...args);

const readJson = (relative) => JSON.parse(readFileSync(join(root, relative), "utf-8"));
/** Distinct, so a document that writes another package's version is caught. */
const VERSIONS = Object.fromEntries(PACKAGES.map((name, i) => [name, `${i + 11}.7.3`]));
const REAL_VERSIONS = Object.fromEntries(PACKAGES.map((name) => [name, readJson(`packages/${name}/package.json`).version]));
const SITE_ELEMENTS = readJson("packages/site/dist/custom-elements.json")
  .modules.flatMap((m) => m.declarations ?? [])
  .map((d) => d.tagName)
  .filter(Boolean);
const KIND_AREAS = ["landing", "cms", "app"];
const EXAMPLE_ENTRY = { tokens: "tokens.min.css" };
/** The css file of each package an example links (the tokens one is the font-less file). */
const cssOf = (pkg) => EXAMPLE_ENTRY[pkg] ?? FILES[pkg].css;

/* ---- the oracle: what a page's "Copy the markup" holds ---------------------- */

function markupSection(page) {
  const start = page.body.search(/<h3\b[^>]*\bid="markup"/);
  if (start === -1) return null;
  const rest = page.body.slice(start + 1);
  const end = rest.search(/<h[23]\b/);
  return rest.slice(0, end === -1 ? undefined : end);
}

/** { kept: [{ label, code }], skipped: [{ label, code }] } of the `html` blocks of #markup. */
function blocksOf(page) {
  const kept = [];
  const skipped = [];
  for (const [, attrs, code] of markupSection(page).matchAll(/<pre\b([^>]*\bdata-lang="html"[^>]*)>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g)) {
    const block = { label: decodeEntities(/\baria-label="([^"]*)"/.exec(attrs)?.[1] ?? ""), code: decodeEntities(code).trim() };
    (/<script\b/i.test(block.code) || /\son[a-z]+\s*=/i.test(block.code) ? skipped : kept).push(block);
  }
  return { kept, skipped };
}

const exampleRouteOf = (page) => page.route.replace(/^\/docs\//, "/examples/").replace(/\/$/, ".html");
const areaOf = (route) => route.split("/")[2];
const markupPages = (from = site) => from.pages.filter((p) => markupSection(p) !== null);

/** The packages an example of this page loads, in load order. */
function packagesFor(page) {
  const area = areaOf(page.route);
  const { kept } = blocksOf(page);
  const useSite = area === "site" || kept.some((b) => SITE_ELEMENTS.some((tag) => new RegExp(`<${tag}[\\s>/]`).test(b.code)));
  return ["tokens", "core", ...(useSite ? ["site"] : []), ...(KIND_AREAS.includes(area) ? [area] : [])];
}

/* ---- reading a generated document ------------------------------------------- */

const LOADS = ["src", "srcset", "poster", "data", "action", "formaction", "ping"];
const SCHEME_OR_HOST = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

/** What the tests need of a document; `tags()` throws with file:line if it is not valid. */
function inspect(html, file) {
  const doc = { starts: [], links: [], scripts: [], metas: [], anchors: [], h2: [], onAttributes: [], thirdParty: [], title: null, h1: null, lang: null };
  const textAfter = (tag) => decodeEntities(html.slice(tag.end, html.indexOf("<", tag.end))).trim();
  for (const tag of tags(html, file)) {
    if (tag.type !== "start") continue;
    doc.starts.push(tag);
    const { name, attrs } = tag;
    if (name === "html") doc.lang = attrs.get("lang") ?? null;
    if (name === "title" && doc.title === null) doc.title = textAfter(tag);
    if (name === "h1" && doc.h1 === null) doc.h1 = textAfter(tag);
    if (name === "h2" && /^ex-\d+$/.test(attrs.get("id") ?? "")) doc.h2.push({ id: attrs.get("id"), text: textAfter(tag) });
    if (name === "link") doc.links.push({ rel: attrs.get("rel"), href: attrs.get("href"), index: tag.index });
    if (name === "script") doc.scripts.push({ src: attrs.get("src") ?? null, type: attrs.get("type") ?? null, index: tag.index });
    if (name === "meta") doc.metas.push({ attrs, index: tag.index });
    if (name === "a") doc.anchors.push(attrs.get("href") ?? "");
    for (const [attr, value] of attrs) {
      if (/^on/i.test(attr)) doc.onAttributes.push(`${name}[${attr}]`);
      if ((LOADS.includes(attr) || (name === "link" && attr === "href")) && SCHEME_OR_HOST.test(decodeEntities(value ?? ""))) doc.thirdParty.push(`${name}[${attr}]=${value}`);
    }
  }
  return doc;
}

/** The comments of a document, in order. */
const commentsOf = (html) => [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]);
/** `href` resolved against the example's own route: the path and the fragment it reaches. */
const resolved = (route, href) => {
  const url = new URL(href, `https://example.test${route}`);
  return { path: url.pathname, hash: url.hash };
};

const examples = () => once("examples", () => exampleDocuments(site, { csp: PAGES_CSP, versions: VERSIONS }));
const assets = () => once("assets", () => exampleAssets(root));
const manifests = () => once("manifests", () => manifestAssets(root));

/* ---- exampleDocuments: the real site ------------------------------------------ */

describe("exampleDocuments: one standalone page per component or pattern page, from its markup", () => {
  it("makes one document for every page that has a #markup section, at /examples/<area>/<slug>.html", () => {
    const wanted = markupPages().map((p) => ({ route: exampleRouteOf(p), page: p.route }));
    // the spec counts 48; the oracle must have found them
    expect(wanted.length).toBeGreaterThan(40);
    const got = examples().map((e) => ({ route: e.route, page: e.page.route }));
    expect([...got].sort((a, b) => a.route.localeCompare(b.route))).toEqual([...wanted].sort((a, b) => a.route.localeCompare(b.route)));
    expect(new Set(got.map((g) => g.route)).size).toBe(got.length);
    for (const e of examples()) {
      expect(e.route, e.route).toMatch(/^\/examples\/[a-z-]+\/[a-z0-9-]+\.html$/);
      expect(e.page, e.route).toBe(site.byRoute.get(e.page.route));
      expect(typeof e.html, e.route).toBe("string");
    }
  });

  it("is the same documents twice, and from a fresh scan of the site", () => {
    const again = exampleDocuments(scanSite(docsDir, root), { csp: PAGES_CSP, versions: VERSIONS });
    expect(again.map((e) => [e.route, e.html])).toEqual(examples().map((e) => [e.route, e.html]));
  });

  it("is a complete HTML document in English: doctype, lang, charset, viewport, a title and one h1 from the page", () => {
    for (const e of examples()) {
      expect(e.html, e.route).toMatch(/^<!doctype html>/i);
      expect(e.html.trimEnd(), e.route).toMatch(/<\/html>$/i);
      const doc = inspect(e.html, e.route);
      expect(doc.lang, e.route).toBe("en");
      expect(doc.starts.map((t) => t.name), e.route).toEqual(expect.arrayContaining(["html", "head", "body", "main"]));
      expect(doc.metas.some((m) => m.attrs.has("charset")), `${e.route} charset`).toBe(true);
      expect(doc.metas.some((m) => m.attrs.get("name") === "viewport"), `${e.route} viewport`).toBe(true);
      expect(doc.title, e.route).toBe(`${e.page.meta.title}: markup examples – LUZ`);
      expect(doc.h1, e.route).toBe(e.page.meta.title);
    }
  });

  it("carries the CSP the build passes, in a <meta http-equiv> before anything it governs", () => {
    for (const e of examples()) {
      const doc = inspect(e.html, e.route);
      const csp = doc.metas.filter((m) => (m.attrs.get("http-equiv") ?? "").toLowerCase() === "content-security-policy");
      expect(csp.length, e.route).toBe(1);
      expect(decodeEntities(csp[0].attrs.get("content")), e.route).toBe(PAGES_CSP);
      for (const loaded of [...doc.links, ...doc.scripts]) expect(csp[0].index, e.route).toBeLessThan(loaded.index);
    }
  });

  it("has no inline style or script, no event handler, no <base>, and loads nothing from another host", () => {
    for (const e of examples()) {
      const doc = inspect(e.html, e.route);
      const names = doc.starts.map((t) => t.name);
      for (const banned of ["style", "base", "iframe", "object", "embed"]) expect(names, `${e.route} <${banned}>`).not.toContain(banned);
      for (const script of doc.scripts) {
        expect(script.src, `${e.route}: an inline script`).toBeTruthy();
        expect(script.type, e.route).toBe("module");
      }
      expect(doc.onAttributes, e.route).toEqual([]);
      expect(doc.thirdParty, e.route).toEqual([]);
      // `style=` can only be in a block's own text (the player's markup has one)
      let shell = e.html;
      for (const block of blocksOf(e.page).kept) shell = shell.replace(block.code, "");
      expect(shell, `${e.route}: style= outside a block`).not.toMatch(/\sstyle\s*=/i);
    }
  });

  it("links the packages the page needs in load order, and its scripts at the end, all relative to ../dist/", () => {
    for (const e of examples()) {
      const doc = inspect(e.html, e.route);
      const pkgs = packagesFor(e.page);
      expect(doc.links.map((l) => l.rel), e.route).toEqual(pkgs.map(() => "stylesheet"));
      expect(doc.links.map((l) => l.href), e.route).toEqual(pkgs.map((pkg) => `../dist/${pkg}/${cssOf(pkg)}`));
      const js = ["core", ...pkgs.filter((p) => p === "site")];
      expect(doc.scripts.map((s) => s.src), e.route).toEqual(js.map((pkg) => `../dist/${pkg}/${FILES[pkg].js}`));
      const bodyAt = e.html.search(/<body\b/i);
      for (const script of doc.scripts) expect(script.index, e.route).toBeGreaterThan(bodyAt);
    }
  });

  it("loads only files that exampleAssets copies: every <link> and <script> resolves to one of its routes", () => {
    const routes = new Set(assets().map((a) => a.route));
    for (const e of examples()) {
      const doc = inspect(e.html, e.route);
      for (const url of [...doc.links.map((l) => l.href), ...doc.scripts.map((s) => s.src)]) {
        expect(SCHEME_OR_HOST.test(url) || url.startsWith("/"), `${e.route}: ${url} is relative`).toBe(false);
        expect(routes.has(resolved(e.route, url).path), `${e.route}: ${url}`).toBe(true);
      }
    }
  });

  it("links back to the docs page, relative, at its #markup section", () => {
    for (const e of examples()) {
      const first = inspect(e.html, e.route).anchors[0];
      expect(first, `${e.route} has a link`).toBeTruthy();
      expect(SCHEME_OR_HOST.test(first) || first.startsWith("/"), `${e.route}: ${first} is relative`).toBe(false);
      expect(resolved(e.route, first), e.route).toEqual({ path: e.page.route, hash: "#markup" });
    }
  });

  it("holds exactly the html blocks of #markup the page shows, verbatim, each under its aria-label", () => {
    let kept = 0;
    let skipped = 0;
    for (const e of examples()) {
      const blocks = blocksOf(e.page);
      const doc = inspect(e.html, e.route);
      expect(doc.h2.map((h) => h.text), e.route).toEqual(blocks.kept.map((b) => b.label));
      expect(new Set(doc.h2.map((h) => h.id)).size, e.route).toBe(doc.h2.length);
      let at = 0;
      for (const block of blocks.kept) {
        const found = e.html.indexOf(block.code, at);
        expect(found, `${e.route}: ${block.label}`).toBeGreaterThanOrEqual(0);
        at = found + block.code.length;
        kept += 1;
      }
      for (const block of blocks.skipped) {
        expect(e.html.includes(block.code), `${e.route}: ${block.label} is left out`).toBe(false);
        skipped += 1;
      }
    }
    // the spec counts 65 html blocks, two of them with a script (consent, search)
    expect(kept).toBeGreaterThan(55);
    expect(skipped).toBeGreaterThan(0);
  });

  it("names, in its last comment, each block it left out for a script or a handler", () => {
    for (const e of examples()) {
      const { skipped } = blocksOf(e.page);
      if (!skipped.length) continue;
      const last = commentsOf(e.html).at(-1);
      expect(last, `${e.route} has a closing comment`).toBeTruthy();
      expect(e.html.trimEnd().endsWith("-->") || e.html.lastIndexOf("-->") > e.html.lastIndexOf("</main>"), `${e.route}: the comment is at the end`).toBe(true);
      for (const block of skipped) expect(last, `${e.route}: ${block.label}`).toContain(block.label);
      expect(last, e.route).toMatch(/script/i);
    }
  });

  it("opens with a comment that says where it comes from, that it is generated, the licence and the core version", () => {
    for (const e of examples()) {
      const head = commentsOf(e.html)[0];
      expect(head, e.route).toBeTruthy();
      expect(head, e.route).toMatch(/do not edit/i);
      expect(head, e.route).toMatch(/\bMIT\b/);
      expect(head, e.route).toContain(VERSIONS.core);
      expect(head, e.route).toContain("scripts/docs-site/ai.js");
      expect(head, e.route).toContain("#markup");
    }
  });

  it("is valid for the strict tokenizer, with no template left over and nothing private in it", () => {
    for (const e of examples()) {
      expect(() => tags(e.html, e.route), e.route).not.toThrow();
      for (const pattern of PRIVATE) expect(e.html, `${e.route} ${pattern}`).not.toMatch(pattern);
      expect(e.html, e.route).not.toMatch(/sha384-\(run|\/home\/|ghp_|npm_|-----BEGIN/);
      expect(e.html, e.route).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/);
      expect(e.html, e.route).not.toMatch(/\{\{|\}\}/);
    }
  });

  it("takes the CSP from its argument, not from a constant", () => {
    const own = "default-src 'none'; img-src 'self'";
    const [first] = exampleDocuments(site, { csp: own, versions: VERSIONS });
    const csp = inspect(first.html, first.route).metas.find((m) => m.attrs.has("http-equiv"));
    expect(decodeEntities(csp.attrs.get("content"))).toBe(own);
    expect(first.html).not.toContain(PAGES_CSP);
  });
});

/* ---- exampleDocuments: what it does with the sources, on a fixture ------------ */

describe("exampleDocuments: the rules on a small site", () => {
  const snippet = (id, label, lang, code) =>
    `<div class="docs-snippet"><div class="docs-snippet__bar"><span class="docs-snippet__lang">${lang}</span></div>` +
    `<pre class="luz-code-block" data-lang="${lang}" tabindex="0" role="region" aria-label="${label}"><code id="${id}">${code
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")}</code></pre></div>`;
  const page = (title, area, blocks, { how = "" } = {}) =>
    `${FRONT(title, `${title}, for the tests.`, area, `files: components/${title.toLowerCase().replace(/\W+/g, "-")}.css\ntoc: h2,h3\n`)}<div class="docs-component">
  <h2 id="example">Example</h2>
  <div class="docs-example" data-docs-specimen><p>DEMO</p></div>
  <h2 id="known-issues">Known issues</h2>
  <p>None known.</p>
  <h2 class="docs-view__title" id="code">Code</h2>
  <h3 id="markup">Copy the markup</h3>
  ${blocks.map((b, i) => snippet(`code-${i}`, ...b)).join("\n  ")}
  <h3 id="how">How it works</h3>
  <p>HOW-TEXT</p>
  ${how}
</div>
`;
  const files = {
    "site.json": JSON.stringify({
      areas: [
        { id: "components", label: "Components", slug: "components" },
        { id: "site", label: "Site", slug: "site" },
        { id: "landing", label: "Landing", slug: "landing" },
        { id: "tokens", label: "Tokens", slug: "tokens" },
      ],
    }),
    "pages/components/index.html": FRONT("Components", "Every component, for the tests.", "components", "generate: gallery\nlead: false\n") + "<p>INDEX</p>\n",
    "pages/components/widget.html": page(
      "Widget & friends",
      "components",
      [
        ["Widget markup", "html", '<div class="luz-widget">Fish &amp; chips</div>'],
        ["Widget script", "js", "const widget = 1;"],
        ["Widget with a handler", "html", '<button class="luz-btn" onclick="go()">Go</button>'],
        ["Widget with a script", "html", '<script>go()</script>'],
        ["Second widget", "html", '<p class="luz-widget">Second <strong>one</strong></p>'],
      ],
      { how: snippet("code-how", "How only block", "html", '<span class="how-only">HOW-ONLY-BLOCK</span>') },
    ),
    "pages/components/timeline.html": page("Timeline", "components", [["Timeline markup", "html", '<luz-timeline role="group" aria-label="Releases"><ol class="luz-timeline"></ol></luz-timeline>']]),
    "pages/components/plain.html": FRONT("Plain", "A page with no markup section.", "components") + "<h2 id=\"how\">How</h2><p>PLAIN-TEXT</p>\n",
    "pages/site/banner.html": page("Banner", "site", [["Banner markup", "html", '<luz-banner tone="warning">Closed on Monday</luz-banner>']]),
    "pages/landing/index.html": FRONT("Landing", "The landing patterns, for the tests.", "landing", "generate: gallery\nlead: false\n") + "<p>LANDING</p>\n",
    "pages/landing/header.html": page("Header", "landing", [["Header markup", "html", '<header class="luz-landing-header"><luz-search>…</luz-search></header>']]),
    "pages/tokens/color.html": TOKENS_PAGE,
  };
  const build = () => {
    const fixture = fixtureSite(files);
    return exampleDocuments(fixture.scan(), { csp: "default-src 'self'", versions: VERSIONS });
  };
  const byRoute = (docs, route) => docs.find((d) => d.route === route);

  it("makes a document only for the pages with a #markup section, and names each at its own route", () => {
    expect(
      build()
        .map((d) => d.route)
        .sort(),
    ).toEqual(["/examples/components/timeline.html", "/examples/components/widget.html", "/examples/landing/header.html", "/examples/site/banner.html"]);
  });

  it("writes the kept html blocks as markup, decoded once, and leaves out the js block, the handler, the script and other sections", () => {
    const widget = byRoute(build(), "/examples/components/widget.html").html;
    expect(widget).toContain('<div class="luz-widget">Fish &amp; chips</div>');
    expect(widget).toContain('<p class="luz-widget">Second <strong>one</strong></p>');
    expect(widget.indexOf("Fish &amp; chips")).toBeLessThan(widget.indexOf("Second <strong>"));
    for (const left of ["const widget = 1", "go()", "HOW-ONLY-BLOCK", "HOW-TEXT", "DEMO", "None known"]) {
      expect(widget.replace(/<!--[\s\S]*?-->/g, ""), left).not.toContain(left);
    }
    const doc = inspect(widget, "widget");
    expect(doc.h2.map((h) => h.text)).toEqual(["Widget markup", "Second widget"]);
    const last = commentsOf(widget).at(-1);
    expect(last).toContain("Widget with a handler");
    expect(last).toContain("Widget with a script");
  });

  it("escapes the title: the text is the page's, the markup is valid", () => {
    const widget = byRoute(build(), "/examples/components/widget.html").html;
    const doc = inspect(widget, "widget");
    expect(doc.title).toBe("Widget & friends: markup examples – LUZ");
    expect(doc.h1).toBe("Widget & friends");
    expect(widget).not.toMatch(/<title>[^<]*&[^a-z#]/i);
  });

  it("loads only tokens and core for a component, and site's too for an element site declares", () => {
    const docs = build();
    const hrefs = (route) => inspect(byRoute(docs, route).html, route).links.map((l) => l.href);
    expect(hrefs("/examples/components/widget.html")).toEqual(["../dist/tokens/tokens.min.css", "../dist/core/luz.min.css"]);
    // <luz-timeline> is core's tag
    expect(hrefs("/examples/components/timeline.html")).toEqual(["../dist/tokens/tokens.min.css", "../dist/core/luz.min.css"]);
    expect(hrefs("/examples/site/banner.html")).toEqual(["../dist/tokens/tokens.min.css", "../dist/core/luz.min.css", "../dist/site/site.min.css"]);
    expect(hrefs("/examples/landing/header.html")).toEqual([
      "../dist/tokens/tokens.min.css",
      "../dist/core/luz.min.css",
      "../dist/site/site.min.css",
      "../dist/landing/landing.min.css",
    ]);
    const scripts = (route) => inspect(byRoute(docs, route).html, route).scripts.map((s) => s.src);
    expect(scripts("/examples/components/widget.html")).toEqual(["../dist/core/luz.min.js"]);
    expect(scripts("/examples/landing/header.html")).toEqual(["../dist/core/luz.min.js", "../dist/site/site.min.js"]);
  });

  it("takes the kind's stylesheet from the area even when no tag of site is named", () => {
    const plainLanding = { ...files, "pages/landing/header.html": page("Header", "landing", [["Header markup", "html", '<header class="luz-landing-header">Name</header>']]) };
    const docs = exampleDocuments(fixtureSite(plainLanding).scan(), { csp: "default-src 'self'", versions: VERSIONS });
    const links = inspect(byRoute(docs, "/examples/landing/header.html").html, "header").links.map((l) => l.href);
    expect(links).toEqual(["../dist/tokens/tokens.min.css", "../dist/core/luz.min.css", "../dist/landing/landing.min.css"]);
  });

  it("follows the page: change a block and the example changes, nothing else holds the old text", () => {
    const fixture = fixtureSite(files);
    const render = () => exampleDocuments(fixture.scan(), { csp: "default-src 'self'", versions: VERSIONS });
    expect(byRoute(render(), "/examples/components/widget.html").html).toContain("Second <strong>one</strong>");
    const path = join(fixture.docsDir, "pages/components/widget.html");
    writeFileSync(path, readFileSync(path, "utf-8").replace("Second &lt;strong&gt;one", "Changed &lt;strong&gt;one"));
    const after = byRoute(render(), "/examples/components/widget.html").html;
    expect(after).toContain("Changed <strong>one</strong>");
    expect(after).not.toContain("Second <strong>");
  });
});

/* ---- exampleAssets, manifestAssets ------------------------------------------ */

describe("exampleAssets: the CSS and JS an example loads, copied beside the examples", () => {
  it("names each as { route, from }: a file of the package's dist at /examples/dist/<pkg>/<file>", () => {
    expect(assets().length).toBeGreaterThan(10);
    for (const asset of assets()) {
      const m = /^\/examples\/dist\/(tokens|core|site|landing|cms|app)\/([A-Za-z0-9._-]+\.(?:css|js))$/.exec(asset.route);
      expect(m, asset.route).toBeTruthy();
      expect(asset.from, asset.route).toBe(`packages/${m[1]}/dist/${m[2]}`);
      expect(existsSync(join(root, asset.from)), `${asset.from} exists (run pnpm build)`).toBe(true);
    }
    expect(new Set(assets().map((a) => a.route)).size).toBe(assets().length);
  });

  it("is exactly the css, the js and the chunks of each package, with the font-less tokens file", () => {
    const expected = PACKAGES.flatMap((pkg) => [cssOf(pkg), FILES[pkg].js, ...FILES[pkg].chunks].filter(Boolean).map((file) => `/examples/dist/${pkg}/${file}`));
    expect(assets().map((a) => a.route).sort()).toEqual(expected.sort());
    const routes = assets().map((a) => a.route);
    expect(routes).toContain("/examples/dist/tokens/tokens.min.css");
    expect(routes.some((r) => /luz-tokens|fonts/.test(r))).toBe(false);
  });

  it("only copies files the package publishes (its pack-files.txt)", () => {
    for (const asset of assets()) {
      const [, pkg, file] = /^packages\/([a-z]+)\/dist\/(.+)$/.exec(asset.from);
      const packed = readFileSync(join(root, "packages", pkg, "pack-files.txt"), "utf-8").split("\n");
      expect(packed, asset.from).toContain(`dist/${file}`);
    }
  });

  it("carries every chunk an entry imports by name, beside it", () => {
    const routes = new Set(assets().map((a) => a.route));
    for (const asset of assets().filter((a) => /\/(luz|site)\.min\.js$/.test(a.route))) {
      const text = readFileSync(join(root, asset.from), "utf-8");
      const chunks = [...text.matchAll(/["']\.\/([A-Za-z0-9._-]+\.js)["']/g)].map((m) => m[1]);
      expect(chunks.length, asset.route).toBeGreaterThan(0);
      for (const chunk of chunks) expect(routes.has(`${asset.route.replace(/[^/]+$/, "")}${chunk}`), `${asset.route} imports ${chunk}`).toBe(true);
    }
  });

  it("reads the repository it is given, and gives the same list twice", () => {
    expect(exampleAssets(root)).toEqual(assets());
  });
});

describe("manifestAssets: the manifests of every package, served from /manifests/<pkg>/", () => {
  it("lists classes.json of every package and custom-elements.json of the packages that have one", () => {
    const expected = PACKAGES.flatMap((pkg) =>
      ["classes.json", "custom-elements.json"].filter((file) => existsSync(join(root, "packages", pkg, "dist", file))).map((file) => ({ route: `/manifests/${pkg}/${file}`, from: `packages/${pkg}/dist/${file}` })),
    );
    expect(expected.map((e) => e.route)).toEqual(expect.arrayContaining(["/manifests/core/classes.json", "/manifests/core/custom-elements.json", "/manifests/site/custom-elements.json", "/manifests/landing/classes.json"]));
    expect([...manifests()].sort((a, b) => a.route.localeCompare(b.route))).toEqual(expected.sort((a, b) => a.route.localeCompare(b.route)));
    for (const asset of manifests()) expect(existsSync(join(root, asset.from)), asset.from).toBe(true);
  });
});

/* ---- the files for an agent point at them ------------------------------------ */

describe("llms.txt and llms-full.txt name the examples and the manifests", () => {
  const optional = () => parseTxt(txt()).sections.at(-1);
  const exampleRoutes = () => new Set(markupPages().map(exampleRouteOf));

  it("links under Optional an example page that is emitted, and the manifests of core and site", () => {
    const urls = optional().items.map((i) => i.url);
    const routes = urls.filter((u) => u.startsWith(`${SITE_URL}examples/`)).map((u) => `/${u.slice(SITE_URL.length)}`);
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(exampleRoutes().has(route), route).toBe(true);
    expect(urls).toContain(`${SITE_URL}manifests/core/classes.json`);
    expect(urls).toContain(`${SITE_URL}manifests/site/custom-elements.json`);
    expect(urls).toContain(`${SITE_URL}llms-full.txt`);
  });

  it("links every Optional URL to a file the build writes", () => {
    const emitted = new Set([member("AI_ROUTES").llmsFull, ...[...exampleRoutes()], ...manifests().map((m) => m.route)]);
    for (const item of optional().items) expect(emitted.has(`/${item.url.slice(SITE_URL.length)}`), item.url).toBe(true);
  });

  it("is root-absolute in dev, as the rest of the file is", () => {
    const items = parseTxt(txt("")).sections.at(-1).items.map((i) => i.url);
    expect(items).toContain("/manifests/core/classes.json");
    expect(items.some((u) => u.startsWith("/examples/"))).toBe(true);
  });

  it("gives each entry of a page that has an example an `Example:` line between URL and Files, and the others none", () => {
    const withExample = new Set(markupPages().map((p) => urlOf(p.route)));
    let seen = 0;
    for (const e of entriesOf(full()).filter((x) => x.url)) {
      const head = e.text.split(/\n\s*\n/)[0].split("\n").filter(Boolean);
      const route = `/${e.url.slice(SITE_URL.length)}`;
      if (withExample.has(e.url)) {
        seen += 1;
        const page = site.byRoute.get(route);
        expect(head[0], e.url).toBe(`URL: ${e.url}`);
        expect(head[1], e.url).toBe(`Example: ${urlOf(exampleRouteOf(page))}`);
        if (head[2]) expect(head[2], e.url).toMatch(/^Files: /);
      } else {
        expect(head.some((l) => l.startsWith("Example:")), e.url).toBe(false);
      }
    }
    expect(seen).toBe(withExample.size);
  });

  it("writes the example URL root-absolute in dev, absolute under the site URL in the build", () => {
    expect(full()).toContain(`\nExample: ${SITE_URL}examples/components/button.html\n`);
    expect(full("")).toContain("\nExample: /examples/components/button.html\n");
  });

  it("does that on a fixture too: the example of Widget, and nothing for the tokens page", () => {
    const { scan } = fixtureSite(fixtureFiles());
    const out = renderLlmsFull(scan(), { siteUrl: FIXTURE_URL });
    const widget = entriesOf(out).find((e) => e.title === "Widget");
    expect(widget.text.split("\n").slice(0, 3)).toEqual([`URL: ${FIXTURE_URL}docs/components/widget/`, `Example: ${FIXTURE_URL}examples/components/widget.html`, "Files: components/widget.css · Package: @luz-ds/core"]);
    expect(entriesOf(out).find((e) => e.title === "Color").text).not.toContain("Example:");
    expect(renderLlmsFull(scan(), { siteUrl: "" })).toContain("\nExample: /examples/components/widget.html\n");
  });
});

/* ---- the plugin emits and serves them ---------------------------------------- */

describe("the Vite plugin emits and serves the examples and the manifests", () => {
  const plugin = (relative) =>
    docsSite({ repoRoot: root, relative, outRoot: join(tmpdir(), "luz-ai-files-out"), pagesBase: "/luz/", siteUrl: SITE_URL, csp: PAGES_CSP });
  const bytesOf = (relative) => readFileSync(join(root, relative));
  const same = (source, expected) => Buffer.from(source).equals(Buffer.isBuffer(expected) ? expected : Buffer.from(expected));

  it("emits every example, asset and manifest at its route, byte for byte", () => {
    const emitted = [];
    plugin(true).generateBundle.call({ emitFile: (file) => emitted.push(file) });
    const byName = new Map(emitted.map((f) => [f.fileName, f]));
    const documents = exampleDocuments(site, { csp: PAGES_CSP, versions: REAL_VERSIONS });
    expect(documents.length).toBeGreaterThan(40);
    for (const doc of documents) {
      const file = byName.get(doc.route.slice(1));
      expect(file, `${doc.route} is emitted`).toBeTruthy();
      expect(file.type).toBe("asset");
      expect(file.source).toBe(doc.html);
    }
    for (const asset of [...exampleAssets(root), ...manifestAssets(root)]) {
      const file = byName.get(asset.route.slice(1));
      expect(file, `${asset.route} is emitted`).toBeTruthy();
      expect(file.type).toBe("asset");
      expect(same(file.source, bytesOf(asset.from)), `${asset.route} equals ${asset.from}`).toBe(true);
    }
  }, 60_000);

  describe("in the dev server", () => {
    const serve = async (url) => {
      const middlewares = [];
      plugin(false).configureServer({
        watcher: { on() {} },
        ws: { send() {} },
        middlewares: { use: (fn) => middlewares.push(fn) },
        transformIndexHtml: async (_file, html) => html,
      });
      return new Promise((resolve) => {
        const headers = {};
        const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => resolve({ headers, body, statusCode: res.statusCode }) };
        middlewares[0]({ url, originalUrl: url }, res, () => resolve({ next: true }));
      });
    };

    it("answers an example as HTML, from the table of generated documents", async () => {
      const got = await serve("/examples/components/button.html");
      expect(got.next, "answered by the plugin").toBeUndefined();
      expect(got.headers["content-type"]).toMatch(/^text\/html; charset=utf-8/);
      const doc = exampleDocuments(site, { csp: PAGES_CSP, versions: REAL_VERSIONS }).find((d) => d.route === "/examples/components/button.html");
      expect(got.body).toBe(doc.html);
    }, 60_000);

    it("answers an asset with its bytes and a type, and a manifest as JSON", async () => {
      const css = await serve("/examples/dist/core/luz.min.css");
      expect(css.next).toBeUndefined();
      expect(css.headers["content-type"]).toMatch(/^text\/css/);
      expect(same(css.body, bytesOf("packages/core/dist/luz.min.css"))).toBe(true);
      const js = await serve("/examples/dist/core/luz.min.js");
      expect(js.headers["content-type"]).toMatch(/^(text|application)\/javascript/);
      const json = await serve("/manifests/core/classes.json");
      expect(json.next).toBeUndefined();
      expect(json.headers["content-type"]).toMatch(/^application\/json/);
      expect(same(json.body, bytesOf("packages/core/dist/classes.json"))).toBe(true);
    }, 60_000);

    it("never builds a path from the URL: a name it does not list, or a way out of the folder, is not answered", async () => {
      // the table answers what it lists (so the refusals below are not an unwired route)
      expect((await serve("/examples/components/button.html")).next, "the table answers a listed example").toBeUndefined();
      for (const url of ["/examples/components/nope.html", "/examples/dist/core/../../../package.json", "/manifests/core/../../../package.json", "/manifests/core/secret.json", "/manifests/../.gitignore"]) {
        const got = await serve(url);
        expect(got.next === true || got.statusCode !== 200, url).toBe(true);
        expect(String(got.body ?? ""), url).not.toContain('"name"');
      }
    }, 60_000);
  });
});
