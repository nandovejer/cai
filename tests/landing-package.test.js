/**
 * F3 step 10, @luz-ds/landing (.claude/plans/specs/f3-package-model.md, §1.5,
 * §3, §9 step 10 and decision D10). The sources are read as text; no browser,
 * no build. The browser half is tests/landing-header.spec.js,
 * landing-hero.spec.js, landing-footer.spec.js and landing-optional-site.spec.js.
 *
 *   - landing ships seven components: header, hero, footer, main, section, glow, stat (stat: F4, landing 0.2)
 *   - the feature grid is gone (D10): no class, no file, no page, no link; its
 *     template is a `ul.o-grid.o-grid--split`
 *   - the pieces core owns stay in core: stickiness (`.o-sticky`), the split
 *     grid and the row are not rewritten in landing
 *   - the home page and the docs footer are built on the landing and core
 *     classes, not on site's
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
/** Like `read`, but "" for a file that is not there yet, so the assertion says what is missing. */
const readOr = (path) => (existsSync(`${root}${path}`) ? read(path) : "");
const COMPONENTS = ["footer", "glow", "header", "hero", "main", "section", "stat"];

/** Every file under `dir` (relative to the repo), skipping what is generated or installed. */
function walk(dir, out = []) {
  for (const entry of readdirSync(`${root}${dir}`)) {
    if (["node_modules", "dist", "docs", ".git", "test-results"].includes(entry)) continue;
    const path = `${dir}/${entry}`;
    if (statSync(`${root}${path}`).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

/** CSS without comments, so a sentence that names a class is not a rule. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("landing ships the page structure of a landing page", () => {
  const sources = readdirSync(`${root}packages/landing/src/components`).filter((f) => f.endsWith(".css"));

  it("has exactly header, hero, footer, main, section, glow and stat", () => {
    expect(sources.map((f) => f.replace(/\.css$/, "")).sort()).toEqual(COMPONENTS);
  });

  it("imports each of them from index.css, and nothing else", () => {
    const imports = [...read("packages/landing/src/index.css").matchAll(/@import url\("\.\/components\/([\w-]+)\.css"\)/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual(COMPONENTS);
  });

  it("defines the classes of the spec: header, hero and footer with their parts", () => {
    const css = stripComments(sources.map((f) => read(`packages/landing/src/components/${f}`)).join("\n"));
    for (const name of [
      ".luz-landing-header",
      ".luz-landing-header__brand",
      ".luz-landing-header__actions",
      ".luz-landing-hero",
      ".luz-landing-hero__copy",
      ".luz-landing-hero__eyebrow",
      ".luz-landing-hero__title",
      ".luz-landing-hero__lead",
      ".luz-landing-hero__media",
      ".luz-landing-footer",
      ".luz-landing-main",
      ".luz-landing-section",
      ".luz-landing-glow",
      ".luz-landing-stat",
    ]) {
      expect(css, name).toMatch(new RegExp(`${name.replace(/[.]/g, "\\.")}(?![\\w-])`));
    }
  });

  it("leaves to core what core owns: no sticky, no grid columns, no row in landing's CSS", () => {
    const header = stripComments(readOr("packages/landing/src/components/header.css"));
    expect(header.length, "header.css exists").toBeGreaterThan(0);
    expect(header, "stickiness is core's .o-sticky").not.toMatch(/position\s*:\s*sticky/);
    const hero = stripComments(readOr("packages/landing/src/components/hero.css"));
    expect(hero.length, "hero.css exists").toBeGreaterThan(0);
    expect(hero, "the columns are core's .o-grid--split").not.toMatch(/grid-template-columns/);
    expect(hero, "the grid is core's .o-grid").not.toMatch(/display\s*:\s*grid/);
    expect(hero, "the measure of the columns is a property of core's grid").toMatch(/--luz-grid-min\s*:\s*24rem/);
  });

  it("names the bar for its panels: anchor-name and anchor-scope --luz-bar, and the language list opens at the bar", () => {
    const header = stripComments(readOr("packages/landing/src/components/header.css"));
    expect(header).toMatch(/anchor-name\s*:\s*--luz-bar/);
    expect(header).toMatch(/anchor-scope\s*:\s*--luz-bar/);
    expect(header).toMatch(/--luz-lang-switch-top\s*:\s*var\(--luz-bar-h\)/);
  });

  it("uses no `luz-site-*` class or property, and no property of the old site header", () => {
    const css = sources.map((f) => read(`packages/landing/src/components/${f}`)).join("\n");
    expect(css).not.toMatch(/luz-site-/);
  });
});

describe("D10: the feature grid is a template, not a pattern", () => {
  it("has no stylesheet in landing", () => {
    expect(existsSync(`${root}packages/landing/src/components/feature-grid.css`)).toBe(false);
  });

  it("is named nowhere in the sources the repository ships: packages, apps, scripts and dev", () => {
    const files = ["packages/landing/src", "packages/landing/README.md", "apps", "scripts", "dev"].flatMap((p) =>
      p.endsWith(".md") ? [p] : walk(p),
    );
    const offenders = files
      .filter((f) => /\.(css|html|js|json|md)$/.test(f))
      .flatMap((f) => read(f).split("\n").flatMap((line, i) => (/luz-landing-feature-grid|landing\/feature-grid/.test(line) ? [`${f}:${i + 1}`] : [])));
    expect(offenders).toEqual([]);
  });

  it("has no docs page of its own, and the landing templates give the block as a list on core's split grid", () => {
    expect(existsSync(`${root}apps/docs/pages/landing/feature-grid.html`)).toBe(false);
    const templates = read("apps/docs/pages/landing/templates.html");
    const block = templates.slice(templates.indexOf('id="feature-grid-block"'));
    expect(block.length, "the feature grid block stays in the templates").toBeGreaterThan(0);
    expect(block).toMatch(/&lt;ul class=&quot;o-grid o-grid--split&quot;/);
  });

  it("is a list on core's split grid on the home page", () => {
    const home = read("apps/landing/index.html");
    expect(home).toMatch(/<ul class="[^"]*\bo-grid--split\b[^"]*"/);
    expect(home).not.toMatch(/luz-landing-feature-grid/);
  });
});

describe("the landing docs area documents the structure that moved here", () => {
  for (const page of ["header", "hero", "footer", "section", "stat"]) {
    it(`has landing/${page}.html`, () => {
      expect(existsSync(`${root}apps/docs/pages/landing/${page}.html`), `apps/docs/pages/landing/${page}.html`).toBe(true);
    });
  }
});

describe("the home page and the docs footer are built on landing and core classes", () => {
  const home = read("apps/landing/index.html");

  it("the home page is an .o-page with a landing main, hero, sections and footer", () => {
    expect(home).toMatch(/<body class="[^"]*\bo-page\b/);
    expect(home).toMatch(/<main[^>]*class="[^"]*\bluz-landing-main\b/);
    expect(home).toMatch(/<section class="[^"]*\bluz-landing-hero\b[^"]*\bo-grid\b[^"]*\bo-grid--split\b|<section class="[^"]*\bo-grid\b[^"]*\bo-grid--split\b[^"]*\bluz-landing-hero\b/);
    expect(home).toMatch(/\bluz-landing-section\b/);
    expect(home).toMatch(/<footer[^>]*class="[^"]*\bluz-landing-footer\b|<footer[^>]*>\s*<div class="[^"]*\bluz-landing-footer\b/);
    expect(home).toMatch(/\bo-actions\b/);
  });

  it("no file of the home page or of the docs footer names a class of site's old blocks", () => {
    // `luz-site-` names the old blocks of site (`luz-site-mode` was the key of the stored colour mode, gone in F2)
    const old = /luz-site-(?!mode)/;
    const files = [
      "apps/landing/index.html",
      "apps/landing/landing.css",
      "apps/site/header.css",
      "apps/site/_partials/footer.html",
      "apps/docs/_partials/footer-links.html",
      "apps/docs/_layouts/not-found.html",
    ];
    const offenders = files.flatMap((f) => read(f).split("\n").flatMap((line, i) => (old.test(line) ? [`${f}:${i + 1}: ${line.trim().slice(0, 80)}`] : [])));
    expect(offenders).toEqual([]);
  });

  it("the docs footer partial is the landing footer", () => {
    const partial = read("apps/site/_partials/footer.html");
    expect(partial).toMatch(/\bluz-landing-footer\b/);
    expect(partial).toMatch(/\bo-container--inline\b/);
  });
});
