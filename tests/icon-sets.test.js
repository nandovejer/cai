/**
 * Icon sets (F4 step 11, spec f4-customisation.md 4.2 to 4.4): the Icons
 * section of "Make it yours" (apps/docs/pages/get-started/make-it-yours.html,
 * the h2 with id "icons") recommends sets of icons and says how to use them.
 *
 * RL-13: everything LUZ publishes or serves is MIT and only MIT. The page
 * does not ship an icon, but a recommendation is a statement a reader acts
 * on, so it is held to the same rule by a machine:
 *
 *   - the recommended table is exactly five sets, each with the licence cell
 *     `MIT` and a link to the LICENSE file of its repository on github.com;
 *   - the excluded sets are listed, with why, and none of them is in the
 *     recommended table; only Octicons (an MIT LICENSE with a carve-out for
 *     the GitHub logos) says MIT, with its reason;
 *   - the five-line pattern, the notice that LUZ bundles and tests none of
 *     them, and the link to the Icon grid for the markup.
 *
 * Only the #icons section is read: the rest of the page is another test's.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { columnOf, escapeRe, linksOf, preOf, readPage, repo, sectionsOf, sentencesOf, tablesOf, textOf } from "./helpers/page-facts.js";

/** The sets the spec recommends (4.3), with the repository whose LICENSE was read. */
const RECOMMENDED = {
  Feather: "feathericons/feather",
  Heroicons: "tailwindlabs/heroicons",
  "Tabler Icons": "tabler/tabler-icons",
  Phosphor: "phosphor-icons/core",
  "Bootstrap Icons": "twbs/icons",
};
/** What the excluded table must name, and what its licence cell must say. */
const EXCLUDED = {
  Lucide: /\bISC\b/,
  Remix: /./,
  Material: /Apache/i,
  "Font Awesome": /CC BY/i,
  "Simple Icons": /CC0/i,
  Octicons: /\bMIT\b/,
};

const page = readPage("get-started/make-it-yours.html");
const icons = () => {
  const s = sectionsOf(page.body).get("icons");
  if (!s) throw new Error('make-it-yours.html has no <h2 id="icons">');
  return s.html;
};

const recommendedTable = () => {
  const t = tablesOf(icons()).find((tb) => columnOf(tb, /^set/i) >= 0 && columnOf(tb, /licen[cs]e/i) >= 0 && columnOf(tb, /^why/i) < 0);
  if (!t) throw new Error('#icons has no table with a "Set" and a "Licence" column and no "Why" column (the recommended sets)');
  return t;
};
const excludedTable = () => {
  const t = tablesOf(icons()).find((tb) => columnOf(tb, /^set/i) >= 0 && columnOf(tb, /licen[cs]e/i) >= 0 && columnOf(tb, /^why/i) >= 0);
  if (!t) throw new Error('#icons has no table with a "Set", a "Licence" and a "Why" column (the excluded sets)');
  return t;
};
const setOf = (t, row) => row.cells[columnOf(t, /^set/i)].text;
const licenceOf = (t, row) => row.cells[columnOf(t, /licen[cs]e/i)].text;

describe("the recommended sets", () => {
  it("are exactly Feather, Heroicons, Tabler Icons, Phosphor and Bootstrap Icons", () => {
    const t = recommendedTable();
    expect(t.rows.map((r) => setOf(t, r)).sort()).toEqual(Object.keys(RECOMMENDED).sort());
  });

  it("each have the licence cell exactly MIT", () => {
    const t = recommendedTable();
    for (const row of t.rows) expect(licenceOf(t, row), setOf(t, row)).toBe("MIT");
  });

  it("each link to the LICENSE file of their repository on github.com", () => {
    const t = recommendedTable();
    for (const row of t.rows) {
      const name = setOf(t, row);
      const repoPath = RECOMMENDED[name];
      expect(repoPath, `${name} is not a set of the spec`).toBeTruthy();
      const re = new RegExp(`^https://github\\.com/${escapeRe(repoPath)}/blob/[^/]+/LICENSE(?:[.-][\\w.-]+)?$`, "i");
      const links = row.cells.flatMap((c) => c.links);
      expect(links.some((l) => re.test(l.href)), `${name}: no link to https://github.com/${repoPath}/blob/<ref>/LICENSE`).toBe(true);
    }
  });

  it("do not include any set the page excludes", () => {
    const t = recommendedTable();
    const text = t.rows.map((r) => r.cells.map((c) => c.text).join(" ")).join(" ");
    for (const name of Object.keys(EXCLUDED)) expect(text, name).not.toMatch(new RegExp(escapeRe(name), "i"));
  });
});

describe("the excluded sets", () => {
  it("are Lucide, Remix, Material, Font Awesome, Simple Icons and Octicons, each with a reason", () => {
    const t = excludedTable();
    const why = columnOf(t, /^why/i);
    expect(t.rows.length).toBe(Object.keys(EXCLUDED).length);
    for (const name of Object.keys(EXCLUDED)) {
      const row = t.rows.find((r) => setOf(t, r).toLowerCase().includes(name.toLowerCase()));
      expect(row, `no row for ${name}`).toBeTruthy();
      expect(row.cells[why].text.length, `${name}: why is it out?`).toBeGreaterThan(0);
    }
  });

  it("say a licence that is not MIT, except Octicons, whose MIT LICENSE the page qualifies", () => {
    const t = excludedTable();
    for (const [name, licence] of Object.entries(EXCLUDED)) {
      const row = t.rows.find((r) => setOf(t, r).toLowerCase().includes(name.toLowerCase()));
      const cell = licenceOf(t, row);
      expect(cell, `${name}: licence`).toMatch(licence);
      if (name === "Octicons") {
        expect(row.cells[columnOf(t, /^why/i)].text, "Octicons: the carve-out").toMatch(/logo/i);
      } else {
        expect(cell, `${name} is excluded: its licence cell is not plain MIT`).not.toBe("MIT");
      }
    }
  });
});

describe("the pattern", () => {
  /** The list of five lines before the first table: the first <ol> or <ul> with five items. */
  const lines = () => {
    const before = icons().split(/<table\b/)[0];
    const lists = [...before.matchAll(/<(ol|ul)\b[^>]*>([\s\S]*?)<\/\1>/g)];
    const five = lists.map((l) => [...l[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((li) => textOf(li[1]))).find((items) => items.length === 5);
    if (!five) throw new Error("#icons has no list of five lines before its first table");
    return five;
  };

  it("is five lines, before the tables", () => {
    expect(lines()).toHaveLength(5);
  });

  it("1: an inline svg that takes currentColor", () => {
    expect(lines()[0]).toMatch(/currentColor/);
  });

  it('2: decorative, aria-hidden="true" and focusable="false"', () => {
    expect(lines()[1]).toContain('aria-hidden="true"');
    expect(lines()[1]).toContain('focusable="false"');
  });

  it("3: sized with em so it follows the text and the knobs", () => {
    expect(lines()[2]).toMatch(/\bem\b/);
    expect(lines()[2]).toMatch(/\d(?:\.\d+)?em\b/);
  });

  it('4: one <symbol> sprite in the same document, never <use href="https://', () => {
    expect(lines()[3]).toContain("<symbol>");
    expect(lines()[3]).toMatch(/same document/i);
    expect(lines()[3]).toMatch(/\bnever\b/i);
    expect(lines()[3]).toContain('<use href="https://');
  });

  it("5: status icons come with words, and brand logos are trademarks not to use as a status or an action", () => {
    const line = lines()[4];
    expect(line).toMatch(/status/i);
    expect(line).toMatch(/\bwords?\b/i);
    expect(line).toMatch(/brand logos?/i);
    expect(line).toMatch(/trademark/i);
  });

  it('never shows <use href="https:// as a working sample, and repeats no icon\'s markup', () => {
    for (const code of preOf(icons())) {
      expect(code).not.toContain('<use href="https://');
      expect(code, "an icon's drawing: use a <use href=\"#…\"> to a sprite, never a path").not.toMatch(/<path\b/);
    }
    for (const s of sentencesOf(textOf(icons()))) {
      if (s.includes('<use href="https://')) expect(s).toMatch(/\b(never|not|blocked)\b/i);
    }
  });

  it("shows em sizing and the two attributes in one short snippet", () => {
    const hit = preOf(icons()).find((c) => c.includes('aria-hidden="true"') && c.includes('focusable="false"') && /\d(?:\.\d+)?em\b/.test(c));
    expect(hit, "a <pre> with aria-hidden, focusable and an em size").toBeTruthy();
  });
});

describe("what LUZ does and does not do with these sets", () => {
  it("says it does not bundle them and does not test them", () => {
    const text = textOf(icons());
    expect(text).toMatch(/LUZ does not bundle these/);
    expect(text).toMatch(/does not test them/);
  });

  it("says the MIT notice of a set must be kept, and to check the licence file of the version taken", () => {
    const text = textOf(icons());
    expect(text).toMatch(/\bnotice\b/i);
    expect(text).toMatch(/licen[cs]e file/i);
  });

  it("links the Icon grid for the markup, which exists", () => {
    expect(linksOf(icons()).map((l) => l.href)).toContain("/docs/components/icon-grid/");
    expect(existsSync(join(repo, "apps/docs/pages/components/icon-grid.html"))).toBe(true);
  });
});
