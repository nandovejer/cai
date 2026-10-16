/**
 * F6 step 6, the text (.claude/plans/specs/f6-languages.md sections 5.3 and 6,
 * and its "Review answers (2026-10-15)", which are binding). The files are read
 * as text; no browser, no build. After F6 English is the only language in the
 * entry: every text that said "English and Spanish ship built in" says what is
 * true now, and the new rules are written where a contributor looks.
 *
 *   - packages/core/README.md: the "Keys:" list is the keys of `en`; Spanish
 *     is not "built in"; loadLocales(), and the rule of the standalone modules
 *   - AGENTS.md: "Adding a language to core's scripts", beside "Adding a
 *     language to the home page", with the JSON checklist and the value rules
 *   - VERSIONING.md: loadLocales() and @luz-ds/core/i18n/<code> are public
 *   - get-started/javascript.html: an h3 #js-languages (an h3 is not a row of
 *     the A-Z index of a `toc: h2` page) and no "English and Spanish"
 *   - components/timeline.html, PRINCIPLES.md, EXCEPTIONS.md (EX-010)
 *   - accessibility.html: the known issues the accessibility review asked for
 *   - SECURITY.md: a CSP without 'strict-dynamic' blocks the language chunk
 *   - the A-Z page stays under the page ceiling of budgets.json, from the
 *     generator, not typed
 *   - .changeset/core-languages.md: core minor with a Breaking: paragraph
 */
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, relativizeLinks, scanSite } from "../scripts/docs-site/site.js";
import { decodeEntities, readHtml } from "../scripts/docs-site/html.js";
import { readPage } from "./helpers/page-facts.js";
import { enDictionary, readCore } from "./helpers/i18n-source.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const en = enDictionary(readCore("i18n.js"));

/** The text of a markdown file between a heading line and the next line that starts with one of `until`. */
const section = (text, heading, until = /\n#{1,3} /) => {
  const start = text.indexOf(heading);
  expect(start, `"${heading}" is in the file`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + heading.length);
  const end = rest.search(until);
  return end === -1 ? rest : rest.slice(0, end);
};

/** The English-and-Spanish-built-in wording of before F6, in any of its forms. */
const BUILT_IN = /English (?:and|or) Spanish|`en` and `es`|\(`en`\) and Spanish|Spanish[^.]{0,40}built in|built in[^.]{0,40}Spanish/i;

/** The text of markup: inline tags vanish (so "(<code>x</code>)" reads "(x)"), block tags are a space. */
const INLINE = "a|abbr|b|cite|code|em|i|kbd|mark|q|small|span|strong|sub|sup";
const flat = (html) =>
  decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(new RegExp(`</?(?:${INLINE})\\b[^>]*>`, "gi"), "")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

/* ---- packages/core/README.md ------------------------------------------------ */

describe("packages/core/README.md, the Language section", () => {
  const readme = read("packages/core/README.md");
  const language = section(readme, "## Language\n", /\n## /);

  it("lists as its keys exactly the keys of en (no key missing, none that en does not have)", () => {
    const line = section(language, "Keys:", /A key in camelCase/);
    const listed = [...line.matchAll(/`([a-z][A-Za-z]*)`/g)].map((m) => m[1]);
    expect([...new Set(listed)].sort()).toEqual(Object.keys(en).sort());
  });

  it("does not say that English and Spanish ship built in: Spanish is a file fetched for the pages in Spanish", () => {
    expect(language).not.toMatch(BUILT_IN);
    expect(language).toMatch(/Spanish/);
    expect(language).toMatch(/lazy|fetch|loads?\b|file/i);
  });

  it("names loadLocales(), and the rule of the standalone modules: await it before the init functions that write text", () => {
    expect(language).toMatch(/loadLocales\(\)/);
    expect(language).toMatch(/await loadLocales\(\)/);
    for (const call of ["initHighlight()", "initPlayers()", "initThemeCycle()"]) expect(language, call).toContain(call);
  });

  it("names the author route: data-luz-label-* and registerLocale() for a language LUZ does not ship", () => {
    expect(language).toContain("data-luz-label-");
    expect(language).toMatch(/registerLocale\(/);
  });
});

/* ---- AGENTS.md -------------------------------------------------------------- */

describe("AGENTS.md", () => {
  const agents = read("AGENTS.md");
  const HOME = "### Adding a language to the home page";
  const CORE = "### Adding a language to core's scripts";

  it("has \"Adding a language to core's scripts\" beside \"Adding a language to the home page\", under Common workflows", () => {
    expect(agents).toContain(HOME);
    expect(agents).toContain(CORE);
    const workflows = section(agents, "## Common workflows", /\n## /);
    expect(workflows).toContain(HOME);
    expect(workflows).toContain(CORE);
  });

  describe("its checklist", () => {
    const list = () => section(agents, CORE, /\n#{1,3} |\n---\n/);

    it("starts from a JSON file: packages/core/src/i18n/<code>.json, never a JavaScript file", () => {
      expect(list()).toContain("packages/core/src/i18n/<code>.json");
    });

    it("names the literal `files` map of i18n.js, the budget row, the snippets line and check-pack --update", () => {
      const text = list();
      expect(text).toMatch(/`files`/);
      expect(text).toContain("i18n.js");
      expect(text).toContain("budgets.json");
      expect(text).toContain("core JS lazy chunk: i18n-<code>");
      expect(text).toContain("scripts/docs-site/snippets.js");
      expect(text).toContain("node scripts/check-pack.js --update");
    });

    it("runs the build and the gates: pnpm core:build, check:size, test:unit and check:strings", () => {
      const text = list();
      for (const command of ["pnpm core:build", "pnpm check:size", "pnpm test:unit", "pnpm check:strings"]) expect(text, command).toContain(command);
    });

    it("states the rules of a value: the keys and {placeholders} of English, at most 3 x + 40, no `://`, `www.` or `@`, isolates in a right-to-left language", () => {
      const text = list();
      expect(text).toMatch(/placeholder/i);
      expect(text).toMatch(/\b3\s*(?:x|×)/i);
      for (const banned of ["`://`", "`www.`", "`@`"]) expect(text, banned).toContain(banned);
      expect(text).toMatch(/isolate/i);
      expect(text).toMatch(/\$header/);
    });

    it("says that a language for core does not translate <luz-search> or <luz-consent>", () => {
      const text = list();
      expect(text).toContain("luz-search");
      expect(text).toContain("luz-consent");
    });
  });

  it("no longer says that i18n.js ships en and es; it names loadLocales and the /i18n/<code> export", () => {
    const row = agents.split("\n").find((line) => line.startsWith("| `i18n.js`"));
    expect(row, "the i18n.js row of the module table").toBeTruthy();
    expect(row).not.toMatch(BUILT_IN);
    expect(row).toContain("loadLocales");
    expect(agents).toContain("`/i18n/<code>`");
  });
});

/* ---- VERSIONING.md ---------------------------------------------------------- */

describe("VERSIONING.md names the language surface as public", () => {
  const versioning = read("VERSIONING.md");
  const row = (name) => versioning.split("\n").find((line) => line.startsWith(`| **${name}**`)) ?? "";

  it("loadLocales() is in the JS row or the Text row", () => {
    expect(row("JS") + row("Text")).toMatch(/loadLocales/);
  });

  it("the @luz-ds/core/i18n/<code> default export (a dictionary) is in the JS row or the Text row", () => {
    expect(row("JS") + row("Text")).toMatch(/@luz-ds\/core\/i18n\/<code>|\.\/i18n\/\*/);
  });
});

/* ---- get-started/javascript.html -------------------------------------------- */

describe("get-started/javascript.html", () => {
  const page = readPage("get-started/javascript.html");
  const { headings } = readHtml(page.body, page.rel);
  const text = flat(page.body);

  it("has an h3 #js-languages \"Languages and the strings scripts write\" under the h2 #js-modules, before #js-without", () => {
    const at = headings.findIndex((h) => h.id === "js-languages");
    expect(at, "an element with id js-languages").toBeGreaterThanOrEqual(0);
    expect(headings[at].level, "an h3: an h2 is a new row of the A-Z index").toBe(3);
    expect(headings[at].text).toBe("Languages and the strings scripts write");
    const h2s = headings.filter((h) => h.level === 2).map((h) => h.id);
    const before = headings.slice(0, at).filter((h) => h.level === 2).at(-1);
    expect(before?.id).toBe("js-modules");
    expect(h2s).toContain("js-without");
  });

  describe("the section", () => {
    const sectionText = () => {
      const start = page.body.search(/<h3\b[^>]*\bid="js-languages"/);
      expect(start, "#js-languages is an h3").toBeGreaterThanOrEqual(0);
      const rest = page.body.slice(start + 1);
      const end = rest.search(/<h[23]\b/);
      return flat(end === -1 ? rest : rest.slice(0, end));
    };

    it("says how a language is loaded: English in the entry, the others fetched for the pages that declare them, loadLocales()", () => {
      const s = sectionText();
      expect(s).toMatch(/loadLocales\(\)/);
      expect(s).toMatch(/English/);
      expect(s).toMatch(/lang/);
      expect(s).toMatch(/await loadLocales\(\)/);
    });

    it("gives the author route: data-luz-label-* on <html> or <body>, and registerLocale() before boot", () => {
      const s = sectionText();
      expect(s).toContain("data-luz-label-");
      expect(s).toMatch(/<html>|<body>/);
      expect(s).toMatch(/registerLocale\(/);
      expect(s).toMatch(/before/i);
    });

    it("says how to check the file: an import map with integrity (modulepreload is only a hint), on a page in that language only", () => {
      const s = sectionText();
      expect(s).toMatch(/import map/i);
      expect(s).toMatch(/integrity/);
      expect(s).toMatch(/modulepreload/);
      expect(s).toMatch(/hint/i);
    });

    it("lists the steps of a language: the JSON file, the files map, the budget row", () => {
      const s = sectionText();
      expect(s).toMatch(/i18n\/<code>\.json/);
      expect(s).toMatch(/budget/i);
    });
  });

  it("no longer says English and Spanish ship built in", () => {
    expect(text).not.toMatch(BUILT_IN);
  });
});

/* ---- components/timeline.html ----------------------------------------------- */

describe("components/timeline.html", () => {
  const text = flat(readPage("components/timeline.html").body);

  it("no longer says English and Spanish are what the buttons come in", () => {
    expect(text).not.toMatch(/English (and|or) Spanish/);
  });

  it("says the language of the page when LUZ ships it, or yours through registerLocale() and data-luz-label-*", () => {
    expect(text).toContain("the language of the page when LUZ ships it (English, Spanish)");
    expect(text).toMatch(/registerLocale\(\)[^.]*data-luz-label-\*/);
  });
});

/* ---- PRINCIPLES.md ---------------------------------------------------------- */

describe("PRINCIPLES.md", () => {
  const principles = read("PRINCIPLES.md");

  it("SR-7 says English is in the entry and every other language is a lazy file; nothing says both ship built in", () => {
    const bullet = principles.split("\n").find((line) => line.startsWith("- **Generated text comes from the dictionary"));
    expect(bullet, "the SR-7 bullet").toBeTruthy();
    expect(bullet).toMatch(/English is in the entry/);
    expect(bullet).toMatch(/lazy/);
    expect(bullet).toContain("loadLocales()");
    expect(bullet).not.toMatch(BUILT_IN);
  });

  it("the checklist says the strings come from the dictionary in the page's language, not in English and Spanish", () => {
    const line = principles.split("\n").find((l) => l.includes("Generated strings come from the i18n dictionary"));
    expect(line, "the checklist line").toBeTruthy();
    expect(line).not.toMatch(BUILT_IN);
  });
});

/* ---- EXCEPTIONS.md ---------------------------------------------------------- */

describe("EXCEPTIONS.md EX-010", () => {
  const row = read("EXCEPTIONS.md").split("\n").find((line) => line.startsWith("| EX-010 "));

  it("exists, and says when to remove it", () => {
    expect(row, "the EX-010 row").toBeTruthy();
    expect(row).toMatch(/Remove when/);
  });

  it("does not propose an i18n chunk that the entry and the chunks both import (SEC-CHUNK-2 forbids a chunk that imports)", () => {
    expect(row).not.toMatch(/an `i18n` chunk/);
    expect(row).not.toMatch(/both import/);
  });

  it("says it can go when a chunk may read core's dictionary without importing it", () => {
    expect(row).toContain("without importing it");
  });
});

/* ---- accessibility.html ----------------------------------------------------- */

describe("the accessibility statement names what the languages leave open", () => {
  const page = readPage("accessibility.html");
  const from = page.body.indexOf('id="h-a11y-known"');
  const known = page.body.slice(from, page.body.indexOf("<h2", from + 10) === -1 ? undefined : page.body.indexOf("<h2", from + 10));
  const items = [...known.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => flat(m[1]));
  const normal = (s) => s.replace(/`/g, "").replace(/\s+/g, " ");

  it("pins the statement of the legacy luz-theme-apply-btn buttons, word for word", () => {
    const statement = normal(
      "On a page in another language, the Apply theme / Applied buttons of the legacy custom-theme markup (`luz-theme-apply-btn`) are in English until the first theme change, unless the page sets `data-luz-label-apply-theme` and `data-luz-label-theme-applied`. Not tested with a screen reader.",
    );
    expect(items.some((item) => item.includes(statement)), "a known issue with that text").toBe(true);
  });

  it("says that a language LUZ does not ship falls back to English (WCAG 3.1.2) and gives the author route", () => {
    const item = items.find((i) => /3\.1\.2/.test(i) && /English/.test(i) && /data-luz-label-/.test(i));
    expect(item, "a known issue that names 3.1.2, English and data-luz-label-*").toBeTruthy();
    expect(item).toMatch(/registerLocale\(/);
    expect(item).toMatch(/<html>|<body>/);
  });

  it("says that a language file that cannot load leaves the labels in English inside a page in another language", () => {
    const item = items.find((i) => /language file/i.test(i) && /English/.test(i));
    expect(item, "a known issue about a language file that does not load").toBeTruthy();
    expect(item).toMatch(/screen reader/i);
  });

  it("keeps saying that NVDA, JAWS, VoiceOver and TalkBack have not been tried, and never claims the labels are never in English", () => {
    const text = flat(page.body);
    expect(text).toMatch(/NVDA, JAWS, VoiceOver, TalkBack/);
    expect(text).not.toMatch(/none in English/i);
  });
});

/* ---- SECURITY.md ------------------------------------------------------------ */

describe("SECURITY.md, the CSP", () => {
  it("has a paragraph saying a hash or nonce CSP without 'strict-dynamic' blocks the language chunk and the page falls back to English", () => {
    const paragraphs = read("SECURITY.md").split(/\n\s*\n/);
    const found = paragraphs.find((p) => /strict-dynamic/.test(p) && /nonce|hash/i.test(p) && /language/i.test(p) && /English/.test(p));
    expect(found, "a paragraph with strict-dynamic, nonce or hash, language and English").toBeTruthy();
  });
});

/* ---- the A-Z page ----------------------------------------------------------- */

describe("the A-Z page stays under the page ceiling", () => {
  it("renders, with relative links as the Pages build writes it, in less than the 'docs page HTML' ceiling of budgets.json (less a margin for the asset tags Vite adds)", () => {
    const { budgets } = JSON.parse(read("budgets.json"));
    const row = budgets.find((b) => b.glob === "docs/**/*.html");
    expect(row, "the docs page HTML row of budgets.json").toBeTruthy();
    const site = scanSite(`${root}apps/docs`, root);
    const { rendered } = buildSite(site);
    const route = "/docs/a-z/";
    const html = relativizeLinks(rendered.get(route), route, new Set(rendered.keys()));
    // The built file is a little larger than the generator's: Vite writes the script and link tags (96 bytes in 2026-10)
    const ASSET_TAGS = 256;
    expect(Buffer.byteLength(html) + ASSET_TAGS, `the A-Z page is ${Buffer.byteLength(html)} bytes`).toBeLessThanOrEqual(row.max);
  });
});

/* ---- the changeset ---------------------------------------------------------- */

describe(".changeset/core-languages.md", () => {
  const text = read(".changeset/core-languages.md");
  const [, front, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text) ?? [];

  it("releases @luz-ds/core as a minor", () => {
    expect(front, "front matter").toBeTruthy();
    expect(front).toMatch(/^"@luz-ds\/core": minor$/m);
  });

  it("has a Breaking: paragraph that tells a standalone consumer to await loadLocales()", () => {
    const paragraph = body.split(/\n\s*\n/).find((p) => p.startsWith("Breaking:"));
    expect(paragraph, "a paragraph that starts with Breaking:").toBeTruthy();
    expect(paragraph).toContain("loadLocales()");
    expect(paragraph).toContain("@luz-ds/core/i18n");
  });
});
