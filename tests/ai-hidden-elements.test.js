/**
 * F8 security audit, hardening: htmlToText() leaves out what the page itself
 * hides.
 *
 * The converter for llms-full.txt and for each page's index.md (the "Copy
 * page as Markdown" of the rail) already leaves out the demos
 * ([data-docs-specimen]), what is [inert] or [aria-hidden="true"], and the
 * docs' furniture. An element with the `hidden` attribute (the Try it form
 * `<form class="docs-try" hidden>` is one: the page's script shows it) is not
 * on screen for anyone without that script, so the text an agent reads must not
 * carry it either: it would be a copy of something the page does not say.
 *
 * What this file checks:
 *   - htmlToText() drops an element with `hidden` (any spelling) and what is
 *     inside it, and keeps the text before and after it;
 *   - a `<form hidden>` is dropped, not thrown at (<form> has no sentence in
 *     ai.js, but nothing inside a hidden element is read);
 *   - renderPageMarkdown() and renderLlmsFull() do the same on a page;
 *   - the visible text next to it stays in both.
 *
 * Out of scope here: hidden="until-found" (the inactive tab panels of core's
 * tabs.js are visited by find-in-page; whether they are page text is a
 * separate decision).
 *
 * Files under test:
 *   scripts/docs-site/ai.js
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { htmlToText, renderLlmsFull, renderPageMarkdown } from "../scripts/docs-site/ai.js";
import { scanSite } from "../scripts/docs-site/site.js";

const FORM = '<form class="docs-try" hidden><p>HIDDEN-FORM-TEXT only the page script shows.</p><label>Label <input type="checkbox"></label></form>';

describe("htmlToText: an element with [hidden] is not text", () => {
  it("leaves out a hidden <form> and what is inside it, and keeps the paragraphs around it", () => {
    const text = htmlToText(`<p>BEFORE-TEXT</p>${FORM}<p>AFTER-TEXT</p>`, { file: "hidden-form.html" });
    expect(text).not.toContain("HIDDEN-FORM-TEXT");
    expect(text).not.toContain("Label");
    expect(text).toContain("BEFORE-TEXT");
    expect(text).toContain("AFTER-TEXT");
  });

  it.each([
    ["hidden", "<div hidden>"],
    ['hidden=""', '<div hidden="">'],
    ['hidden="hidden"', '<div hidden="hidden">'],
  ])("leaves out a <div %s> with its paragraphs", (_name, open) => {
    const text = htmlToText(`<p>BEFORE-TEXT</p>${open}<p>HIDDEN-DIV-TEXT</p><ul><li>HIDDEN-ITEM</li></ul></div><p>AFTER-TEXT</p>`, { file: "hidden-div.html" });
    expect(text).not.toContain("HIDDEN-DIV-TEXT");
    expect(text).not.toContain("HIDDEN-ITEM");
    expect(text).toContain("BEFORE-TEXT");
    expect(text).toContain("AFTER-TEXT");
  });

  it("leaves out a paragraph that is itself [hidden]", () => {
    const text = htmlToText("<p>BEFORE-TEXT</p><p hidden>HIDDEN-PARAGRAPH</p><p>AFTER-TEXT</p>", { file: "hidden-p.html" });
    expect(text).not.toContain("HIDDEN-PARAGRAPH");
    expect(text).toContain("BEFORE-TEXT");
    expect(text).toContain("AFTER-TEXT");
  });
});

/* ---- a page, through the two renderers ---------------------------------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixtureSite(body) {
  const repoRoot = mkdtempSync(join(tmpdir(), "luz-ai-hidden-"));
  temps.push(repoRoot);
  const dir = join(repoRoot, "apps/docs");
  const files = {
    "site.json": JSON.stringify({ areas: [{ id: "tokens", label: "Tokens", slug: "tokens" }] }),
    "pages/index.html": "<!-- luz:page\ntitle: LUZ documentation\ndescription: The hub, for the tests.\narea: hub\n-->\n<p>HUB-ONLY-TEXT</p>\n",
    "pages/tokens/notes.html": `<!-- luz:page\ntitle: Notes\ndescription: A page with something hidden, for the tests.\narea: tokens\n-->\n${body}\n`,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  const site = scanSite(dir, repoRoot);
  const page = site.pages.find((p) => p.route === "/docs/tokens/notes/");
  if (!page) throw new Error("the fixture page /docs/tokens/notes/ was not scanned");
  return { site, page };
}

function expectOnlyVisible(text) {
  expect(text).toContain("VISIBLE-TEXT");
  expect(text).toContain("VISIBLE-AFTER");
  expect(text).not.toContain("HIDDEN-DIV-TEXT");
  expect(text).not.toContain("HIDDEN-FORM-TEXT");
}

describe("a page with a [hidden] element", () => {
  const URL = "https://example.test/luz/";
  const DIV = '<h2 id="notes">Notes</h2>\n<p>VISIBLE-TEXT is on screen.</p>\n<div hidden><p>HIDDEN-DIV-TEXT</p></div>\n<p>VISIBLE-AFTER is on screen too.</p>';
  const WITH_FORM = `${DIV}\n${FORM}`;

  it("renderPageMarkdown (the page's index.md) has the visible text and not what a [hidden] div holds", () => {
    const { site, page } = fixtureSite(DIV);
    expectOnlyVisible(renderPageMarkdown(site, page, { siteUrl: URL }));
  });

  it("renderLlmsFull has the visible text and not what a [hidden] div holds", () => {
    const { site } = fixtureSite(DIV);
    expectOnlyVisible(renderLlmsFull(site, { siteUrl: URL }));
  });

  it("renderPageMarkdown writes a page with a hidden Try it form, without the form's text", () => {
    const { site, page } = fixtureSite(WITH_FORM);
    expectOnlyVisible(renderPageMarkdown(site, page, { siteUrl: URL }));
  });

  it("renderLlmsFull writes a page with a hidden Try it form, without the form's text", () => {
    const { site } = fixtureSite(WITH_FORM);
    expectOnlyVisible(renderLlmsFull(site, { siteUrl: URL }));
  });
});
