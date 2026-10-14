/**
 * The CSS-only tags of @luz-ds/site: <luz-lang-switch>, <luz-submenu> and
 * <luz-banner> (.claude/plans/specs/f3-package-model.md section 2.2, step 8).
 * Their sources are read as text; no browser, no build.
 *
 *   - each lives in the stylesheet that carries its name;
 *   - a rule that names the tag puts the whole selector in :where() (red line
 *     11: `luz/no-bare-element` strips :where(), so `:where(luz-submenu) > details`
 *     is a bare `details` and is rejected, `:where(luz-submenu > details)` is not);
 *   - no rule uses :defined: the tag is never upgraded;
 *   - no `luz-site-*` name is left in them.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import { isBare } from "../scripts/stylelint/no-bare-element.js";
import { selectorsOf } from "./helpers/css-blocks.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const FILES = {
  "luz-lang-switch": "packages/site/src/components/lang-switch.css",
  "luz-submenu": "packages/site/src/components/submenu.css",
  "luz-banner": "packages/site/src/components/banner.css",
};
const read = (path) => readFileSync(`${root}${path}`, "utf-8");

/** Remove every :where(…) group, whatever it holds. */
function withoutWhere(selector) {
  let s = selector;
  for (let i = s.indexOf(":where("); i !== -1; i = s.indexOf(":where(")) {
    let depth = 0;
    let j = s.indexOf("(", i);
    for (; j < s.length; j++) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")" && --depth === 0) break;
    }
    s = s.slice(0, i) + s.slice(j + 1);
  }
  return s;
}

/** The tag as a type selector: not a class (`.luz-lang-switch__button`), not part of a longer name. */
const tagIn = (tag) => new RegExp(`(?<![.#\\w-])${tag}(?![\\w-])`);

describe("the three CSS-only tags have a stylesheet each, named after the tag", () => {
  for (const [tag, path] of Object.entries(FILES)) {
    it(`${tag} is styled by ${path}`, () => {
      expect(existsSync(`${root}${path}`), path).toBe(true);
    });
  }
});

describe("their selectors", () => {
  for (const [tag, path] of Object.entries(FILES)) {
    const css = existsSync(`${root}${path}`) ? read(path) : "";
    const selectors = selectorsOf(css).flatMap((prelude) => prelude.split(/,(?![^(]*\))/).map((s) => s.trim()));

    it(`${tag}: every rule that names the tag puts the whole selector in :where()`, () => {
      expect(selectors.length, `${path} has rules`).toBeGreaterThan(0);
      const named = selectors.filter((s) => tagIn(tag).test(s));
      expect(named.length, `${path} names <${tag}>`).toBeGreaterThan(0);
      const outside = named.filter((s) => tagIn(tag).test(withoutWhere(s)));
      expect(outside).toEqual([]);
    });

    it(`${tag}: no selector is a bare element once :where() is stripped (red line 11)`, () => {
      expect(selectors.filter(isBare)).toEqual([]);
    });

    it(`${tag}: never uses :defined, and keeps no \`luz-site-\` name`, () => {
      expect(css).not.toMatch(/:defined/);
      expect(css).not.toMatch(/luz-site-/);
    });
  }

  it("<luz-submenu> is selected structurally: details, summary and ul inside one :where(), no class", () => {
    const css = existsSync(`${root}${FILES["luz-submenu"]}`) ? read(FILES["luz-submenu"]) : "";
    expect(css).toMatch(/:where\(luz-submenu > details > summary\)/);
    expect(css).not.toMatch(/\.luz-submenu/);
    expect(css).not.toMatch(/\.luz-site-submenu/);
  });

  it("<luz-lang-switch> keeps its parts as classes and its property under the new name", () => {
    const css = existsSync(`${root}${FILES["luz-lang-switch"]}`) ? read(FILES["luz-lang-switch"]) : "";
    for (const part of ["button", "icon", "name", "menu", "title", "list", "link"]) expect(css, part).toContain(`.luz-lang-switch__${part}`);
    expect(css).toContain("--luz-lang-switch-top");
    expect(css).not.toContain("--luz-site-lang-switcher-top");
  });

  it("<luz-banner> takes its one variant from the attribute: tone=\"warning\"", () => {
    const css = existsSync(`${root}${FILES["luz-banner"]}`) ? read(FILES["luz-banner"]) : "";
    expect(css).toMatch(/\[tone=["']?warning["']?\]/);
    expect(css).not.toMatch(/luz-site-notice/);
  });
});

describe("stylelint (luz/no-bare-element) on the selectors of a CSS-only tag", () => {
  const lint = async (code) => {
    const { results } = await stylelint.lint({
      code,
      codeFilename: "packages/site/src/components/fixture.css",
      config: { plugins: [`${root}scripts/stylelint/no-bare-element.js`], rules: { "luz/no-bare-element": true } },
    });
    return results[0].warnings.map((w) => w.text);
  };

  it("rejects `:where(luz-submenu) > details`: the details is bare outside the :where()", async () => {
    const warnings = await lint(":where(luz-submenu) > details { margin: 0; }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(":where(luz-submenu) > details");
  });

  it("rejects the tag on its own as a type selector", async () => {
    expect(await lint("luz-banner { display: block; }")).toHaveLength(1);
    expect(await lint("luz-submenu > details > summary { margin: 0; }")).toHaveLength(1);
  });

  it("accepts the whole selector inside one :where(), with a pseudo-element or an attribute outside", async () => {
    expect(await lint(":where(luz-submenu > details > summary) { margin: 0; }")).toEqual([]);
    expect(await lint(":where(luz-submenu > details > summary)::after { content: \"\"; }")).toEqual([]);
    expect(await lint(":where(luz-banner)[tone=\"warning\"] { margin: 0; }")).toEqual([]);
    expect(await lint(":where(luz-banner > section) { margin: 0; }")).toEqual([]);
  });
});
