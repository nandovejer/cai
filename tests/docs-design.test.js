/**
 * The Design tab of the component and pattern pages, and the token gallery,
 * say things about the tokens: a contrast ratio per mode, the tokens a
 * component reads, a colour's value in each mode. None of it is typed by hand
 * (a11y.md HUB-8): this test recomputes every figure from packages/tokens and
 * the component CSS, so a token change that is not carried to the docs fails
 * here, with the page and the row.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { site } from "./helpers/docs-site.js";
import { MODES, colorTokens, contrast, familyOf, formatRatio, resolveColor, tokensUsedBy } from "./helpers/design-tokens.js";

const viewPages = site.pages.filter(
  (p) => (p.meta.area === "components" && p.meta.group && p.meta.group !== "helpers") || (p.meta.area === "platform" && p.meta.group === "patterns"),
);
/** The HTML of a Design section: from its h3 to the next h3 or the panel's last line. */
const section = (page, id) => page.body.split(`<h3 id="${id}">`)[1].split(/<h3 |<p class="docs-view__xref">/)[0];
const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

describe("Design tab of every component and pattern page", () => {
  it("covers the 30 pages", () => {
    expect(viewPages).toHaveLength(30);
  });

  it("Do and don't: a Do then a Don't, labelled with a word, never a live barrier (a11y.md TAB-20)", () => {
    for (const page of viewPages) {
      const html = section(page, "do-dont");
      const items = [...html.matchAll(/<figure class="docs-dodont__item docs-dodont__item--(do|dont)">\s*<figcaption><strong class="docs-dodont__verdict">([^<]+)<\/strong>([^<]|<(?!\/figcaption>))+<\/figcaption>\s*(<div class="docs-dodont__stage"[^>]*>|<pre class="cai-code-block")/g)];
      expect(items.map((m) => [m[1], m[2]]), page.file).toEqual([["do", "Do"], ["dont", "Don't"]]);
      for (const m of items) {
        // The caption says why, in words a screen reader gets
        expect(text(m[0]).length, `${page.file} ${m[1]}`).toBeGreaterThan(30);
        // A live example is a picture: inert, hidden from assistive technology
        // (the caption describes it); a harmful one is code, never live
        if (m[4].startsWith("<div")) expect(m[4], `${page.file} ${m[1]}`).toBe('<div class="docs-dodont__stage" inert aria-hidden="true">');
      }
    }
  });

  it("Contrast and focus: every ratio is the one the tokens give, and a pair below its minimum says so", () => {
    let rows = 0;
    for (const page of viewPages) {
      const html = section(page, "contrast");
      expect(html, page.file).toMatch(/<strong>Focus:<\/strong>/);
      for (const [row] of html.matchAll(/<tr><td data-label="Part">[\s\S]*?<\/tr>/g)) {
        const cells = [...row.matchAll(/<td data-label="[^"]+"><div>([\s\S]*?)<\/div><\/td>/g)].map((m) => m[1]);
        const [part, pair, ...rest] = cells;
        const tokens = [...pair.matchAll(/<code>--cai-([\w-]+)<\/code>/g)].map((m) => m[1]);
        const [fg, ...bg] = tokens;
        const min = Number(rest.at(-1).replace(":1", ""));
        MODES.forEach((mode, i) => {
          const ratio = contrast(mode, fg, bg.join(" > "));
          const expected = ratio + 1e-9 >= min ? formatRatio(ratio) : `<strong>${formatRatio(ratio)}, fails</strong>`;
          expect(rest[i], `${page.file} "${text(part)}" in ${mode}`).toBe(expected);
        });
        rows++;
      }
    }
    expect(rows).toBeGreaterThan(100);
  });

  it("Tokens it uses: exactly the tokens the component's CSS reads, each under the page of its family", () => {
    for (const page of viewPages) {
      const html = section(page, "tokens");
      const listed = [];
      for (const [, route, dd] of html.matchAll(/<dt><a href="([^"]+)">[^<]+<\/a><\/dt><dd>([\s\S]*?)<\/dd>/g)) {
        for (const [, token] of dd.matchAll(/<code>(--cai-[\w-]+)<\/code>/g)) {
          expect(familyOf(token)[1], `${page.file} ${token}`).toBe(route);
          listed.push(token);
        }
      }
      const used = tokensUsedBy(page);
      expect([...listed].sort(), page.file).toEqual(used);
      expect(html, page.file).toContain(`The ${used.length} tokens`);
    }
  });
});

describe("Token gallery (a11y.md HUB-8)", () => {
  const color = site.byRoute.get("/docs/tokens/color/").body;

  it("shows every semantic colour with its job and its value in light, dark and high contrast, as text", () => {
    const cards = [...color.matchAll(/<li class="docs-token" id="cai-([\w-]+)">([\s\S]*?)<\/li>/g)];
    expect(cards.map((m) => `--cai-${m[1]}`)).toEqual(colorTokens());
    for (const [, name, card] of cards) {
      expect(card, name).toMatch(new RegExp(`<code class="u-select-all">--cai-${name}</code>\\s*<span class="docs-token__role">[^<]{8,}</span>`));
      const modes = [...card.matchAll(/<span class="docs-swatch" data-theme="([\w-]+)" style="--v: var\(--cai-([\w-]+)\)"><\/span>([^<]+)<code>([^<]+)<\/code>/g)];
      expect(modes.map((m) => [m[1], m[2], m[3].trim(), m[4]]), name).toEqual(
        MODES.map((mode, i) => [mode, name, ["Light", "Dark", "High contrast"][i], resolveColor(mode, name)]),
      );
    }
  });

  it("writes each shadow's value next to its specimen", () => {
    const shadows = site.byRoute.get("/docs/tokens/shadows/").body;
    const { shadow } = JSON.parse(readFileSync(new URL("../packages/tokens/tokens.json", import.meta.url), "utf-8"));
    for (const [step, { value }] of Object.entries(shadow)) {
      expect(shadows, step).toContain(`<code>--cai-shadow-${step}</code><br>${value}</div>`);
    }
  });
});
