/**
 * The A–Z index in two pages (RL-17: a docs page is at most 80 KiB, and the one page was over it).
 *
 *   /docs/a-z/       the entries whose first letter is A–L
 *   /docs/a-z/m-z/   the entries whose first letter is M–Z, then the "Other" group (#az-other: the
 *                    entries that do not start with a letter A–Z), last, as on the one page before
 *
 * Both pages are made by the generator from the same indexEntries() (itself made from indexData()),
 * nothing is listed by hand. Each page links to the other near its top with plain links ("A–L",
 * "M–Z"), `aria-current="page"` on the current one. Its row of letters may link to the other half's
 * letters across pages (`/docs/a-z/m-z/#az-m`); every link of the row must resolve to an id on its
 * target page. The search index is unchanged and still covers everything, and the header's fallback
 * link still goes to `/docs/a-z/`.
 *
 * Source only, no browser: the browser half is the A–Z test of tests/docs.spec.js.
 */
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildSearchIndex, buildSite, indexData, indexEntries, relativizeLinks, renderAZ, scanSite } from "../scripts/docs-site/site.js";
import { decodeEntities } from "../scripts/docs-site/html.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const FIRST = "/docs/a-z/";
const SECOND = "/docs/a-z/m-z/";
const ROUTES = [FIRST, SECOND];
const LOW = [..."ABCDEFGHIJKL"];
const HIGH = [..."MNOPQRSTUVWXYZ"];
/** The ceiling of budgets.json for a docs page, and the room the Pages build leaves for the asset tags Vite adds. */
const ASSET_TAGS = 256;

/** The letter the generator files an entry under: its first letter or digit, A–Z, else "#" (Other). */
const letterOf = (name) => {
  const first = name.replace(/^[^\p{L}\p{N}]+/u, "")[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
};
const idOf = (letter) => (letter === "#" ? "az-other" : `az-${letter.toLowerCase()}`);

let site;
let rendered;
let entries;

beforeAll(() => {
  site = scanSite(`${root}apps/docs`, root);
  rendered = buildSite(site).rendered;
  entries = indexEntries(site);
});

/** The page's rendered HTML, or "" when the route is not there yet (so the assertion says what is missing). */
const htmlOf = (route) => rendered.get(route) ?? "";
const idsIn = (html) => new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => decodeEntities(m[1])));
/** The inner HTML of the nav of letters, or "" when there is none. */
const rowOf = (html) => html.match(/<nav class="docs-az__letters" aria-label="Letters">([\s\S]*?)<\/nav>/)?.[1] ?? "";
const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decodeEntities(m[1]) : null;
};

/** [{ name, href, kind, letter }] of the entries a page lists, in the order it lists them. */
function listed(html) {
  return [...html.matchAll(/<section class="docs-az__letter" aria-labelledby="([^"]+)">([\s\S]*?)<\/section>/g)].flatMap(([, id, body]) =>
    [...body.matchAll(/<li><a\b([^>]*)>([\s\S]*?)<\/a>\s*<span class="docs-az__kind">([\s\S]*?)<\/span><\/li>/g)].map((m) => ({
      section: id,
      name: decodeEntities(m[2]),
      href: attr(m[1], "href"),
      kind: decodeEntities(m[3]),
    })),
  );
}
const key = (e) => `${e.name}\u0000${e.href}\u0000${e.kind}`;

/** The ids of the h2 of the letter sections, in document order. */
const sectionIds = (html) => [...html.matchAll(/<section class="docs-az__letter" aria-labelledby="([^"]+)"/g)].map((m) => m[1]);

describe("the A–Z index is two pages", () => {
  it("has /docs/a-z/ and /docs/a-z/m-z/, both rendered, neither in the search or in the A–Z entries", () => {
    for (const route of ROUTES) {
      expect(site.byRoute.has(route), `${route} is a page of the docs`).toBe(true);
      expect(rendered.has(route), `${route} is rendered`).toBe(true);
      expect(site.byRoute.get(route)?.meta.search, `${route}: search: false`).toBe("false");
      expect(site.byRoute.get(route)?.meta.area, `${route}: area`).toBe("hub");
    }
    expect(indexData(site).map((d) => d.route).filter((r) => ROUTES.includes(r))).toEqual([]);
  });

  it("puts every entry of indexData() on exactly one of the two pages", () => {
    const first = listed(htmlOf(FIRST));
    const second = listed(htmlOf(SECOND));
    expect(first.length, "entries on /docs/a-z/").toBeGreaterThan(0);
    expect(second.length, "entries on /docs/a-z/m-z/").toBeGreaterThan(0);
    const want = entries.map(key).sort();
    const got = [...first, ...second].map(key).sort();
    expect(got.length, "entries on the two pages").toBe(want.length);
    expect(got).toEqual(want);
  });

  it("files the entries by first letter: A–L on /docs/a-z/, M–Z and Other on /docs/a-z/m-z/", () => {
    const first = listed(htmlOf(FIRST));
    const second = listed(htmlOf(SECOND));
    expect(first.filter((e) => !LOW.includes(letterOf(e.name))).map((e) => e.name)).toEqual([]);
    expect(second.filter((e) => ![...HIGH, "#"].includes(letterOf(e.name))).map((e) => e.name)).toEqual([]);
    // ... and each entry sits under the h2 of its own letter
    for (const e of [...first, ...second]) expect(e.section, e.name).toBe(idOf(letterOf(e.name)));
  });

  it("has the sections of the letters that have entries, in order: A–L, then M–Z and Other last", () => {
    const present = new Set(entries.map((e) => letterOf(e.name)));
    expect(sectionIds(htmlOf(FIRST))).toEqual(LOW.filter((l) => present.has(l)).map(idOf));
    expect(sectionIds(htmlOf(SECOND))).toEqual([...HIGH, "#"].filter((l) => present.has(l)).map(idOf));
  });

  // Other exists only when an entry's first letter or digit is not A–Z (a digit, "É", ...): today none is
  it("has the Other section (#az-other) last on M–Z, and never on A–L, only when an entry has no leading letter", () => {
    const hasOther = entries.some((e) => letterOf(e.name) === "#");
    expect(htmlOf(FIRST), "#az-other is never on A–L").not.toContain('id="az-other"');
    if (hasOther) expect(sectionIds(htmlOf(SECOND)).at(-1)).toBe("az-other");
    else expect(htmlOf(SECOND), "no entry lacks a leading letter, so no Other section").not.toContain('id="az-other"');
  });

  // The filing rule, proved with entries the real index does not have. renderAZ(site, page) reads
  // indexEntries(site); the filing helper is not exported, so a copy of the site with extra pages
  // (their titles are index entries) goes through the public function, not through internals.
  describe("the filing rule, with synthetic entries", () => {
    const withTitles = (titles) => {
      // called inside the tests: `site` is read in beforeAll
      const model = site.pages.find((p) => p.meta.search !== "false");
      const extra = titles.map((title, i) => ({
        ...model,
        route: `/docs/synthetic-${i}/`,
        meta: { ...model.meta, title, keywords: "" },
        body: "<p>Synthetic.</p>",
      }));
      const byRoute = new Map(site.byRoute);
      for (const p of extra) byRoute.set(p.route, p);
      return { ...site, pages: [...site.pages, ...extra], byRoute };
    };
    let synthetic;
    beforeAll(() => {
      synthetic = withTitles(["2D shapes", "Éclair", "@layer"]);
    });
    const second = () => renderAZ(synthetic, site.byRoute.get(SECOND));
    const first = () => renderAZ(synthetic, site.byRoute.get(FIRST));
    const sectionOf = (html, name) => listed(html).find((e) => e.name === name)?.section;

    it("files a name that starts with a digit or a letter outside A–Z under Other, last, on M–Z only", () => {
      expect(sectionIds(second()).at(-1)).toBe("az-other");
      expect(sectionIds(first())).not.toContain("az-other");
      for (const name of ["2D shapes", "Éclair"]) {
        expect(sectionOf(second(), name), `${name} on M–Z`).toBe("az-other");
        expect(sectionOf(first(), name), `${name} is not on A–L`).toBeUndefined();
      }
    });

    it("skips leading punctuation, so \"@layer\" is filed under L on A–L, not under Other", () => {
      expect(sectionOf(first(), "@layer")).toBe("az-l");
      expect(sectionOf(second(), "@layer")).toBeUndefined();
    });

    // The row is a way to every section of the page: a reader who jumps by letter must be able to reach Other too
    it("ends the row of letters of M–Z with a link to Other (#az-other), labelled \"Other\", when the page has that section", () => {
      const items = [...rowOf(second()).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
      const last = items.at(-1) ?? "";
      const a = /<a\b([^>]*)>([\s\S]*?)<\/a>/.exec(last);
      expect(a, `the last item of the row is a link: ${last}`).toBeTruthy();
      expect(decodeEntities(a[2]).trim(), "its label").toBe("Other");
      expect(attr(`<a${a[1]}>`, "href"), "its target is the section on this page").toBe("#az-other");
      expect(idsIn(second()).has("az-other"), "and the section is there").toBe(true);
      // ... after the 26 letters, which are still there
      expect(items.length, "26 letters, then Other").toBe(27);
    });

    it("leaves the real index alone", () => {
      expect(indexEntries(synthetic).length).toBeGreaterThan(entries.length);
      expect(entries.some((e) => e.name === "2D shapes")).toBe(false);
    });
  });
});

describe("each page links to the other, near its top", () => {
  /** What the page shows between its h1 and its first letter section. */
  const top = (html) => {
    const from = html.indexOf('<h1 class="docs-title">');
    const to = html.indexOf('<section class="docs-az__letter"');
    return from > -1 && to > from ? html.slice(from, to) : "";
  };
  /** The <nav> of the top that holds the "A–L" link (not the row of letters). */
  const switcher = (html) =>
    [...top(html).matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)].find(([, , body]) => /<a\b[^>]*>\s*A–L\s*<\/a>/.test(body));

  it.each([
    [FIRST, "A–L", "M–Z"],
    [SECOND, "M–Z", "A–L"],
  ])("%s: a labelled nav with plain links A–L and M–Z, and aria-current on %s only", (route, current, other) => {
    const nav = switcher(htmlOf(route));
    expect(nav, `a <nav> with an "A–L" link between the h1 and the first letter of ${route}`).toBeTruthy();
    const [, open, body] = nav;
    expect(attr(`<nav${open}>`, "aria-label"), "the nav has a name (there are two on the page)").toBeTruthy();
    expect(attr(`<nav${open}>`, "aria-label")).not.toBe("Letters");
    const links = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ text: decodeEntities(m[2]).trim(), href: attr(m[1], "href"), current: attr(m[1], "aria-current") }));
    expect(links.map((l) => [l.text, l.href])).toEqual([
      ["A–L", FIRST],
      ["M–Z", SECOND],
    ]);
    expect(links.find((l) => l.text === current)?.current, `${current} is the current page`).toBe("page");
    expect(links.find((l) => l.text === other)?.current, `${other} is not`).toBeNull();
  });
});

describe("the halves nav says what it is, in visible words", () => {
  const TOP = (html) => {
    const from = html.indexOf('<h1 class="docs-title">');
    const to = html.indexOf('<section class="docs-az__letter"');
    return from > -1 && to > from ? html.slice(from, to) : "";
  };
  const halves = (html) => [...TOP(html).matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)].find(([, , body]) => /<a\b[^>]*>\s*A–L\s*<\/a>/.test(body));
  const SENTENCE = "This index has two pages:";

  it.each(ROUTES)("%s: the nav starts with the sentence \"This index has two pages:\", before its links", (route) => {
    const nav = halves(htmlOf(route));
    expect(nav, `the halves nav of ${route}`).toBeTruthy();
    const body = nav[2];
    const before = body.slice(0, body.search(/<a\b/));
    expect(decodeEntities(before.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim(), "the words before the first link").toBe(SENTENCE);
  });

  it.each(ROUTES)("%s: the sentence is shown, not hidden or kept for a screen reader only", (route) => {
    const nav = halves(htmlOf(route));
    const body = nav?.[2] ?? "";
    const prefix = `<nav${nav?.[1] ?? ""}>${body.slice(0, Math.max(0, body.search(/<a\b/)))}`;
    expect(prefix, "the sentence is in the nav").toContain(SENTENCE);
    expect(prefix, "no hidden, aria-hidden, display:none or visually-hidden class around it").not.toMatch(/\shidden\b|aria-hidden|display:\s*none|sr-only|visually-hidden|u-visually/i);
  });

  it.each(ROUTES)("%s: the sentence about the components gallery comes after the row of letters, not before the halves nav", (route) => {
    // from the h1 on: the header and the sidebar link to the gallery too
    const html = htmlOf(route).slice(htmlOf(route).indexOf('<h1 class="docs-title">'));
    const gallery = html.indexOf('href="/docs/components/"');
    const lettersEnd = html.indexOf("</nav>", html.indexOf('<nav class="docs-az__letters"'));
    const halvesStart = html.indexOf('<nav class="docs-az__halves"');
    expect(gallery, "the link to the components gallery").toBeGreaterThan(-1);
    expect(halvesStart, "the halves nav").toBeGreaterThan(-1);
    expect(lettersEnd, "the row of letters").toBeGreaterThan(-1);
    expect(gallery, "after the row of letters").toBeGreaterThan(lettersEnd);
    expect(gallery, "so not before the halves nav").toBeGreaterThan(halvesStart);
  });
});

describe("the Other group is named only when it exists", () => {
  const hasOther = () => entries.some((e) => letterOf(e.name) === "#");
  const topOf = (html) => {
    const from = html.indexOf('<h1 class="docs-title">');
    const to = html.indexOf('<section class="docs-az__letter"');
    return from > -1 && to > from ? html.slice(from, to) : "";
  };
  const words = (html) => decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ");
  const MENTION = /symbol|digit|number/i;

  it("without an entry that lacks a leading letter, the M–Z page has no Other link in its row", () => {
    if (hasOther()) return;
    expect(rowOf(htmlOf(SECOND)), "a link to #az-other").not.toContain("az-other");
    expect(words(rowOf(htmlOf(SECOND)))).not.toMatch(/\bOther\b/);
  });

  it("without such an entry, the description of the M–Z page does not promise symbols or digits", () => {
    if (hasOther()) return;
    const description = site.byRoute.get(SECOND)?.meta.description ?? "";
    expect(description, "description in the front matter").not.toMatch(MENTION);
    expect(htmlOf(SECOND).match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "", "<meta name=description>").not.toMatch(MENTION);
  });

  it("... nor does its lead, or anything between its h1 and its first letter", () => {
    if (hasOther()) return;
    expect(words(topOf(htmlOf(SECOND)))).not.toMatch(MENTION);
  });
});

describe("the row of letters", () => {
  const row = rowOf;

  it.each(ROUTES)("%s: every link of the row resolves to an id on its target page", (route) => {
    const links = [...row(htmlOf(route)).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ href: attr(m[1], "href"), text: decodeEntities(m[2]).trim() }));
    expect(links.length, `links in the row of ${route}`).toBeGreaterThan(0);
    for (const { href, text } of links) {
      const url = new URL(href, `https://example.org${route}`);
      const target = rendered.get(url.pathname);
      expect(target, `${text}: ${href} is a page of the site`).toBeTruthy();
      expect(url.hash, `${text}: ${href} has a fragment`).not.toBe("");
      expect(idsIn(target).has(decodeURIComponent(url.hash.slice(1))), `${text}: ${href} is an id on ${url.pathname}`).toBe(true);
    }
  });

  it.each([
    [FIRST, LOW],
    [SECOND, HIGH],
  ])("%s: every letter of its own half that has entries is a link to its section on this page", (route, letters) => {
    const present = new Set(entries.map((e) => letterOf(e.name)));
    const hrefs = [...row(htmlOf(route)).matchAll(/<a\b([^>]*)>/g)].map((m) => new URL(attr(m[1], "href"), `https://example.org${route}`));
    for (const letter of letters.filter((l) => present.has(l))) {
      expect(hrefs.some((u) => u.pathname === route && u.hash === `#${idOf(letter)}`), `${letter} links to #${idOf(letter)} on ${route}`).toBe(true);
    }
  });

  it("is on a page that has the section: a same-page link never names a letter the page lacks", () => {
    for (const route of ROUTES) {
      const html = htmlOf(route);
      for (const m of row(html).matchAll(/<a\b([^>]*)>/g)) {
        const href = attr(m[1], "href");
        if (href?.startsWith("#")) expect(idsIn(html).has(href.slice(1)), `${route} ${href}`).toBe(true);
      }
    }
  });
});

describe("each page stays under the ceiling of a docs page (RL-17, never raised)", () => {
  const { budgets } = JSON.parse(readFileSync(`${root}budgets.json`, "utf-8"));
  const ceiling = budgets.find((b) => b.glob === "docs/**/*.html")?.max;

  it("reads the ceiling from budgets.json: 80 KiB", () => {
    expect(ceiling).toBe(80 * 1024);
  });

  it.each(ROUTES)("%s renders, with relative links as the Pages build writes it, in at most the ceiling", (route) => {
    expect(rendered.has(route), `${route} is rendered`).toBe(true);
    const html = relativizeLinks(htmlOf(route), route, new Set(rendered.keys()));
    expect(Buffer.byteLength(html) + ASSET_TAGS, `${route} is ${Buffer.byteLength(html)} bytes`).toBeLessThanOrEqual(ceiling);
  });
});

describe("what does not change", () => {
  it("the search index still covers every page of indexData(), and neither A–Z page", () => {
    const index = buildSearchIndex(site);
    expect(index.pages).toHaveLength(indexData(site).length);
    expect(index.pages.find(([title]) => /A–Z/.test(title))).toBeUndefined();
    for (const [, url] of [...index.pages, ...index.sections, ...index.elements]) expect(url, url).not.toMatch(/(^|\/)a-z\//);
  });

  it("every A–Z entry, on either page, is a result of the search index", () => {
    const index = buildSearchIndex(site);
    const base = "https://example.org/docs/search-index.json";
    const urls = new Set([...index.pages, ...index.sections, ...index.elements].map(([, url]) => new URL(url, base).pathname + new URL(url, base).hash));
    for (const e of entries) expect(urls.has(e.href), e.href).toBe(true);
  });

  it("the fallback link of the header goes to /docs/a-z/ on every page that has it", () => {
    let seen = 0;
    for (const [route, html] of rendered) {
      const m = /<a\b[^>]*\bdata-luz-search-fallback[^>]*>/.exec(html);
      if (!m) continue;
      seen++;
      expect(attr(m[0], "href"), route).toBe(FIRST);
    }
    expect(seen, "pages with the header's search").toBeGreaterThan(0);
  });
});
