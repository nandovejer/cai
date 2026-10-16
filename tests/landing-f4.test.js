/**
 * F4 of .claude/plans/luz-home-docs-identity.md, @luz-ds/landing 0.2: what any landing
 * wants and nothing of LUZ. The sources are read as text; no browser, no build (the browser
 * half is landing-hero.spec.js, landing-footer.spec.js and landing-section.spec.js).
 *
 *   - hero.css has --centered and __media--bleed; section.css the head (__eyebrow, __title,
 *     __lead) and the title accent knob; footer.css __brand, __col, __col-title; glow.css
 *     --luz-landing-glow-x; stat.css (new) __value and __label
 *   - the package knows no LUZ data: no phrase, number or palette
 *   - the budget row of the landing CSS is unchanged (ideal 1024, max 2048) and the built
 *     file fits under it
 *   - the package ships components/stat.css, and its page /docs/landing/stat/ is a pattern page
 */
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
const readOr = (path) => (existsSync(`${root}${path}`) ? read(path) : "");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const src = (name) => stripComments(readOr(`packages/landing/src/components/${name}.css`));

describe("the sources of landing 0.2", () => {
  it("hero.css has the centred hero and the bleeding picture", () => {
    const hero = src("hero");
    expect(hero).toMatch(/\.luz-landing-hero--centered(?![\w-])/);
    expect(hero).toMatch(/\.luz-landing-hero__media--bleed(?![\w-])/);
  });

  it("the bleed never sizes itself in vw, which a visible scrollbar makes wider than the page (Playwright hides scrollbars, so the browser test cannot see it)", () => {
    const hero = src("hero");
    const block = hero.slice(hero.indexOf(".luz-landing-hero__media--bleed"));
    expect(block.length, "the bleed rule exists").toBeGreaterThan(0);
    expect(block).not.toMatch(/\b\d+(?:\.\d+)?[sld]?vw\b/);
  });

  it("section.css has the head: eyebrow, title and lead, and the accent knob for the em of a title", () => {
    const section = src("section");
    for (const part of ["eyebrow", "title", "lead"]) expect(section, part).toMatch(new RegExp(`\\.luz-landing-section__${part}(?![\\w-])`));
    expect(section).toMatch(/var\(\s*--luz-landing-title-accent\s*,\s*inherit\s*\)/);
    // The knob is read on the em of both kinds of title
    expect(section + src("hero")).toMatch(/\.luz-landing-hero__title\s+em/);
    expect(section).toMatch(/\.luz-landing-section__title\s+em/);
  });

  it("the head shares its declarations with the hero's (selector lists), it does not copy them", () => {
    const all = src("section") + src("hero");
    // The eyebrow of both in one rule
    expect(all).toMatch(/\.luz-landing-hero__eyebrow\s*,\s*\.luz-landing-section__eyebrow|\.luz-landing-section__eyebrow\s*,\s*\.luz-landing-hero__eyebrow/);
  });

  it("the head's Arabic rules: no letter-spacing, the sans for the eyebrow", () => {
    const all = src("section") + src("hero");
    expect(all).toMatch(/\.luz-landing-section__eyebrow:lang\(ar\)/);
    expect(all).toMatch(/\.luz-landing-section__title:lang\(ar\)/);
  });

  it("footer.css has the brand, the columns and their heading; the old row stays", () => {
    const footer = src("footer");
    for (const part of ["brand", "col", "col-title"]) expect(footer, part).toMatch(new RegExp(`\\.luz-landing-footer__${part}(?![\\w-])`));
    expect(footer, "the old row footer").toMatch(/\.luz-landing-footer\s*>\s*\.o-row/);
  });

  it("stat.css is a file of its own with the value (tabular figures) and the label", () => {
    expect(existsSync(`${root}packages/landing/src/components/stat.css`), "packages/landing/src/components/stat.css").toBe(true);
    const stat = src("stat");
    expect(stat).toMatch(/\.luz-landing-stat(?![\w-])/);
    expect(stat).toMatch(/\.luz-landing-stat__value(?![\w-])/);
    expect(stat).toMatch(/\.luz-landing-stat__label(?![\w-])/);
    expect(stat).toMatch(/tabular-nums/);
    expect(stat).toMatch(/var\(--luz-font-heading\)/);
    const index = read("packages/landing/src/index.css");
    expect(index).toMatch(/@import url\("\.\/components\/stat\.css"\)/);
  });

  it("glow.css reads --luz-landing-glow-x and no longer repeats its gradient for right-to-left", () => {
    const glow = src("glow");
    expect(glow).toMatch(/--luz-landing-glow-x/);
    expect(glow.match(/radial-gradient\(/g)?.length, "one radial gradient").toBe(1);
    expect(glow).not.toMatch(/:dir\(rtl\)/);
  });

  it("the package knows no LUZ data: no phrase, no number, no palette, no `luz-site-*`", () => {
    const css = ["hero", "section", "footer", "stat", "glow"].map(src).join("\n");
    expect(css).not.toMatch(/luz-site-/);
    expect(css, "no colour typed in the package: only tokens").not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/);
  });
});

describe("the budget of landing", () => {
  const row = JSON.parse(read("budgets.json")).budgets.find((b) => b.name === "landing CSS");

  it("is unchanged: ideal 1024, max 2048, on dist/landing.min.css", () => {
    expect(row).toEqual({ name: "landing CSS", file: "packages/landing/dist/landing.min.css", ideal: 1024, max: 2048 });
  });

  it("holds the built stylesheet, min+gzip, under its max", () => {
    const file = `${root}${row.file}`;
    expect(existsSync(file), "run pnpm landing:build").toBe(true);
    expect(gzipSync(readFileSync(file)).length).toBeLessThanOrEqual(row.max);
  });
});

describe("the package ships the stat component", () => {
  it("lists components/stat.css and its minified file in pack-files.txt", () => {
    const files = read("packages/landing/pack-files.txt").split("\n").map((l) => l.trim());
    expect(files).toContain("dist/components/stat.css");
    expect(files).toContain("dist/components/stat.min.css");
  });

  it("builds dist/components/stat.css", () => {
    expect(existsSync(`${root}packages/landing/dist/components/stat.css`)).toBe(true);
    expect(existsSync(`${root}packages/landing/dist/components/stat.min.css`)).toBe(true);
  });

  it("and the built landing.css has it, in the luz.landing layer", () => {
    const css = readOr("packages/landing/dist/landing.css");
    expect(css).toMatch(/\.luz-landing-stat__value/);
    expect(css).toMatch(/--luz-landing-glow-x/);
  });
});

describe("the docs page of the stat", () => {
  const file = "apps/docs/pages/landing/stat.html";
  const page = readOr(file);

  it("exists, as a pattern page of the landing area", () => {
    expect(existsSync(`${root}${file}`), file).toBe(true);
    expect(page).toMatch(/^<!-- luz:page\n/);
    expect(page).toMatch(/^area: landing$/m);
    expect(page).toMatch(/^group: patterns$/m);
    expect(page).toMatch(/^title: .+$/m);
    expect(page).toMatch(/^description: .{20,}$/m);
    expect(page).toMatch(/^toc: h2,h3$/m);
    expect(page).toMatch(/^files: .*stat/m);
  });

  it("is the pattern `landing-stat`: a docs-component with the example, known issues, and the Code and Design tabs", () => {
    expect(page).toContain('<div class="docs-component" id="p-landing-stat">');
    expect(page).toContain('<h2 id="example">Example</h2>');
    expect(page).toContain('<h2 id="known-issues">Known issues</h2>');
    expect(page).toContain('<nav class="luz-tabs docs-view-tabs" aria-label="');
    for (const id of ["code-panel", "design-panel", "markup", "variants", "how", "no-js", "keyboard", "when", "when-not", "do-dont", "content", "contrast", "tokens"]) {
      expect(page, id).toContain(`id="${id}"`);
    }
  });

  it("shows the stat in its example", () => {
    expect(page).toMatch(/class="luz-landing-stat"/);
    expect(page).toMatch(/luz-landing-stat__value/);
    expect(page).toMatch(/luz-landing-stat__label/);
  });
});

describe("the docs of the other additions", () => {
  const mentions = [
    ["landing/hero.html", ["luz-landing-hero--centered", "luz-landing-hero__media--bleed"]],
    ["landing/section.html", ["luz-landing-section__eyebrow", "luz-landing-section__title", "luz-landing-section__lead", "--luz-landing-title-accent", "--luz-landing-glow-x"]],
    ["landing/footer.html", ["luz-landing-footer__brand", "luz-landing-footer__col"]],
    ["landing/templates.html", ["luz-landing-stat", "luz-landing-hero--centered", "luz-landing-section__title", "luz-landing-footer__col"]],
  ];
  for (const [page, names] of mentions) {
    it(`${page} documents ${names.join(", ")}`, () => {
      const html = readOr(`apps/docs/pages/${page}`);
      for (const name of names) expect(html, name).toContain(name);
    });
  }
});
