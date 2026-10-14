/**
 * The theme template (packages/core/src/themes/_template.css) is the starting
 * point of a consumer's theme. It must name every semantic token that the
 * three base modes define, in each of its three blocks, and nothing else, so
 * it never goes stale when a token is added or removed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const blocks = (css) => [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.replace(/\s+/g, " ").trim(), props: [...body.matchAll(/(--luz-[\w-]+)\s*:/g)].map((m) => m[1]) }));
// Shadows are primitives that a mode redraws; the template names them in dark and high contrast
const colours = (props) => props.filter((p) => !p.startsWith("--luz-shadow-"));

const semantic = blocks(readFileSync(resolve(root, "packages/tokens/src/semantic.css"), "utf-8"));
const template = blocks(readFileSync(resolve(root, "packages/core/src/themes/_template.css"), "utf-8"));

const MODES = [
  ["light", (b) => b.selector.startsWith(":root,") && b.selector.includes('[data-theme="light"]'), (b) => b.selector.startsWith('[data-theme="my-brand"],')],
  ["dark", (b) => b.selector.startsWith('[data-theme="dark"],'), (b) => b.selector === '[data-theme="my-brand"][data-mode="dark"]'],
  ["high-contrast", (b) => b.selector.startsWith('[data-theme="high-contrast"],'), (b) => b.selector === '[data-theme="my-brand"][data-mode="high-contrast"]'],
];

describe("theme template", () => {
  for (const [mode, isSemantic, isTemplate] of MODES) {
    it(`${mode}: names exactly the semantic tokens of the mode`, () => {
      const wanted = semantic.find(isSemantic);
      const got = template.find(isTemplate);
      expect(wanted, `${mode} block of semantic.css`).toBeTruthy();
      expect(got, `${mode} block of the template`).toBeTruthy();
      expect(colours(got.props).sort()).toEqual(colours(wanted.props).sort());
    });
  }

  it("uses one theme name, my-brand, and no other selector", () => {
    expect(template.map((b) => b.selector).filter((s) => !s.includes('data-theme="my-brand"'))).toEqual([]);
  });
});

describe("the themes page lists the tokens of the template", () => {
  it("names every semantic token of the template, and no other", () => {
    const page = readFileSync(resolve(root, "apps/docs/pages/tokens/themes.html"), "utf-8");
    const table = page.split('aria-label="Semantic tokens a theme sets"')[1].split("</table>")[0];
    const listed = [...table.matchAll(/<code>(--luz-[\w-]+)<\/code>/g)].map((m) => m[1]).sort();
    const light = template.find((b) => b.selector.startsWith('[data-theme="my-brand"],'));
    expect(listed).toEqual(colours(light.props).sort());
  });
});
