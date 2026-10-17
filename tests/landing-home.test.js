/**
 * The files of the new home (F5 of .claude/plans/luz-home-docs-identity.md,
 * section 3.6): what apps/landing/landing.js and landing.css may and may not
 * hold. The page itself is tests/landing.spec.js; the numbers in its copy are
 * tests/landing-numbers.test.js; the catalogs are tests/landing-i18n.test.js.
 *
 *  - landing.js has no mode logic: <luz-mode> is the only writer of the colour
 *    mode and of the light (F2); the page asks it to preview, and listens to it.
 *  - landing.css is the home's own and tokens only: no literal colour, no
 *    primitive colour token, and none of the rules the head of a section,
 *    @luz-ds/landing 0.2, already has.
 *  - the template links the stylesheets of the packages it builds on, and
 *    writes the sections of the map in order.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
/** Source without its comments, so a comment may talk about what the code must not do. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("apps/landing/landing.js: no mode logic", () => {
  const js = code(read("apps/landing/landing.js"));

  it("does not write the colour mode or the light, read the system's preferences, or keep a choice", () => {
    for (const forbidden of [
      /data-theme/,
      /data-light/,
      /dataset\.(theme|light)\b/,
      /\bluz-theme\b/,
      /localStorage|sessionStorage/,
      /matchMedia|prefers-color-scheme|prefers-contrast/,
      /\.mode\s*=[^=]/,
    ]) {
      expect(js, String(forbidden)).not.toMatch(forbidden);
    }
  });

  it("talks to <luz-mode> through its API and its event: preview() and luz-mode:change", () => {
    expect(js).toMatch(/\.preview\(/);
    expect(js).toContain("luz-mode:change");
    expect(js).toContain("--day-t");
  });

  it("has no HTML sink", () => {
    expect(js).not.toMatch(/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write|\beval\(|new Function/);
  });
});

describe("apps/landing/landing.css: the home's own, on tokens", () => {
  const css = code(read("apps/landing/landing.css"));
  const families = Object.keys(JSON.parse(read("packages/tokens/tokens.json")).color);

  it("has no literal colour", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/(?<![\w-])(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/);
  });

  it("reads no primitive colour token: only the semantic ones", () => {
    for (const family of families) expect(css, family).not.toMatch(new RegExp(`--luz-${family}-\\d`));
  });

  it("does not redo the head of a section, the hero's type or the stat: they are @luz-ds/landing's", () => {
    for (const selector of [".landing-h2", ".landing-lead", ".landing-points", ".landing-point__title", ".luz-landing-section__title", ".luz-landing-section__eyebrow", ".luz-landing-section__lead", ".luz-landing-hero__title", ".luz-landing-hero__lead", ".luz-landing-stat__value"]) {
      expect(css, selector).not.toContain(selector);
    }
  });

  it("uses the semantic type steps, not a typed size, for the type scale samples", () => {
    expect(css).not.toMatch(/font-size:\s*\d/);
  });
});

describe("apps/landing/index.html: the template of the home", () => {
  const html = read("apps/landing/index.html");

  it("links the landing package's stylesheet before the home's own, and keeps the light's", () => {
    const at = (needle) => html.indexOf(needle);
    expect(at("/packages/landing/dist/landing.css")).toBeGreaterThan(-1);
    expect(at("/packages/landing/dist/landing.css")).toBeLessThan(at("/apps/landing/landing.css"));
    expect(at("/apps/landing/light/light.css")).toBeGreaterThan(-1);
  });

  it("writes the nine sections as direct children of main, in the order of the map (Q27)", () => {
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    const ids = [...main.matchAll(/<section\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["hero", "light", "why", "inside", "native", "modes", "type", "fit", "start"]);
    expect(main.match(/<h1\b/g)).toHaveLength(1);
  });

  it("types no number, no version and no colour in the copy: the counts are {n:…} in the catalogs, the version is the build's", () => {
    expect(html).not.toMatch(/data-count/);
    expect(html).not.toMatch(/style="[^"]*(#[0-9a-fA-F]{3,8}|rgb\(|hsl\()/);
  });

  it("the three mode cards are scopes: data-theme on a div, one each", () => {
    for (const mode of ["light", "dark", "high-contrast"]) {
      expect(html.match(new RegExp(`<div\\b[^>]*\\sdata-theme="${mode}"`, "g")) ?? [], mode).toHaveLength(1);
    }
  });
});
