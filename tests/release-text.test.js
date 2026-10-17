/**
 * F3 step 15, rules and release text (.claude/plans/specs/f3-package-model.md,
 * §7 the AGENTS.md rule, §8 the migration notes, §9 step 15). The files are read
 * as text; no browser, no build.
 *
 *   - AGENTS.md and PRINCIPLES.md §6 say the same thing: site is what can go in
 *     any section; page structure is never site; the kinds take site as optional
 *   - site's README says it too, and says the consent band is fixed at the bottom
 *   - VERSIONING.md does not list a class family that no longer ships
 *   - the changesets of F3 together carry the old -> new table of §8
 *   - the home page's "next" lists, in the three catalogs, have the same keys and
 *     no longer sell a feature grid that became a template
 *
 * Already true when this file was written (so no case here): the structure
 * page's table of parts, VERSIONING.md's layer list with `luz.app`, the four
 * package READMEs naming no `luz-site-*` block and stating the optional site
 * peer, the accessibility statement's no-JS states of search and consent, its
 * Ctrl+K before load and its consent band, and no screen reader named as tested.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");
/** The text between a heading line and the next line that starts with `until`. */
const between = (text, from, until) => {
  const start = text.indexOf(from);
  expect(start, `"${from}" is in the file`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + from.length);
  const end = rest.search(until);
  return end === -1 ? rest : rest.slice(0, end);
};

/* ---- The rule, in AGENTS.md and PRINCIPLES.md §6 ---------------------------- */

describe("the core / site rule (spec §7)", () => {
  const layering = between(read("AGENTS.md"), "## Package layering", /\n---\n/);

  it("AGENTS.md's package layering says site is what can go in any section", () => {
    expect(layering).toMatch(/site is what can go in any section/i);
  });

  it("AGENTS.md no longer sorts site by the data it needs or the page structure it holds", () => {
    expect(layering).not.toMatch(/needs data of the site/);
    expect(layering).not.toMatch(/page structure that holds other pieces/);
  });

  it("AGENTS.md says page structure (header, footer, hero) is never site", () => {
    expect(layering).toMatch(/page structure[^.]*is never `?site`?/i);
  });

  it('AGENTS.md\'s "Adding one" says a kind takes site as an optional peer, with `peerDependenciesMeta`', () => {
    expect(layering).toMatch(/literal peers[^\n]*on tokens and core[^\n]*site[^\n]*`peerDependenciesMeta`[^\n]*optional/);
    expect(layering).not.toMatch(/on tokens, core and site, site optional/);
  });

  describe("PRINCIPLES.md §6 \"Core or site\"", () => {
    const bullet = read("PRINCIPLES.md")
      .split("\n")
      .find((line) => line.startsWith("- **Core or site.**"));

    it("says the same: site is what can go in any section, and page structure is not site's", () => {
      expect(bullet, "the bullet exists").toBeTruthy();
      expect(bullet).toMatch(/can go in any section/i);
      expect(bullet).toMatch(/page structure[^.]*(never|not)[^.]*`?site`?/i);
      expect(bullet).not.toMatch(/needs data of the site/i);
    });

    it("names the four kinds, as optional users of site, with no chain that puts a kind after site", () => {
      for (const kind of ["landing", "cms", "app", "docs"]) expect(bullet, kind).toContain(`\`${kind}\``);
      expect(bullet).toMatch(/optional/i);
      expect(bullet).not.toMatch(/site\s*→\s*(cms|landing|app)/);
      expect(bullet).not.toMatch(/wordpress/i);
    });
  });
});

/* ---- site's README ---------------------------------------------------------- */

describe("@luz-ds/site's README says what site is now", () => {
  const readme = read("packages/site/README.md");

  it("sorts its pieces by the new rule, not by the data they need", () => {
    expect(readme).toMatch(/any section/i);
    expect(readme).not.toMatch(/needs data of the site/i);
  });

  it("points to the three kinds that hold the page structure, app included", () => {
    expect(readme).toContain("@luz-ds/landing");
    expect(readme).toContain("@luz-ds/cms");
    expect(readme).toContain("@luz-ds/app");
  });

  it("describes the cookie banner as a band fixed at the bottom of the window, not above the header", () => {
    const consent = between(readme, "## Cookie consent", /\n## /);
    expect(consent).not.toMatch(/above the header/i);
    expect(consent).toMatch(/bottom of the window/i);
  });
});

/* ---- VERSIONING.md ------------------------------------------------------------ */

describe("VERSIONING.md's public API", () => {
  it("does not list `.luz-site-*` classes: site's blocks are `<luz-*>` tags and `.luz-<tag>__*` parts", () => {
    const classes = read("VERSIONING.md")
      .split("\n")
      .find((line) => line.startsWith("| **Classes**"));
    expect(classes, "the Classes row exists").toBeTruthy();
    expect(classes).not.toMatch(/\.luz-site-\*/);
  });
});

/* ---- The changesets of F3: the migration table of spec §8 --------------------- */

describe("the F3 changesets carry the old -> new migration table", () => {
  const dir = `${root}.changeset/`;
  const lines = readdirSync(dir)
    .filter((file) => /^f3-.*\.md$/.test(file))
    .flatMap((file) => readFileSync(`${dir}${file}`, "utf-8").split("\n"));

  // A row passes when one line of some f3-*.md holds the old name and its replacement
  const ROWS = [
    ["<luz-site-search>", "<luz-search>"],
    ["luz-site-search-trigger", "luz-search__trigger"],
    ["luz-site-consent", "<luz-consent>"],
    ["luz-site-lang-switcher", "luz-lang-switch"],
    ["--luz-site-lang-switcher-top", "--luz-lang-switch-top"],
    ["luz-site-submenu", "<luz-submenu>"],
    ["luz-site-notice", "<luz-banner>"],
    ["luz-site-header", "luz-landing-header"],
    ["luz-site-header", "luz-cms-header"],
    ["--luz-site-header-h", "--luz-bar-h"],
    ["luz-site-hero", "luz-landing-hero"],
    ["luz-site-footer", "luz-landing-footer"],
    ["luz-site-footer", "luz-cms-footer"],
    ["luz-site-page--gradient", ".o-page", "luz-landing-glow"],
    ["luz-site-main", "luz-landing-main"],
    ["luz-site-content", ".o-container"],
    ["luz-site-section", "--band", ".luz-band"],
    ["luz-site-actions", ".o-actions"],
    ["luz-site-skip-link", ".luz-skip-link"],
    ["luz-site-image", ".luz-image"],
    ["luz-site-page-header", "luz-cms-page-header"],
    ["luz-landing-feature-grid", "o-grid--split"],
    ["@luz-ds/site/placeholders", /removed|no longer/],
  ];

  it("has at least one f3-*.md changeset", () => {
    expect(lines.length).toBeGreaterThan(0);
  });

  it("shows every removed class, tag and export with its replacement on one row", () => {
    const missing = ROWS.filter((row) =>
      !lines.some((line) => row.every((part) => (part instanceof RegExp ? part.test(line) : line.includes(part)))),
    ).map((row) => row.map(String).join("  ->  "));
    expect(missing).toEqual([]);
  });
});

/* ---- The home page's "next" lists ---------------------------------------------- */

describe("the home page's `adopt.next.*` strings, in en, es and ar", () => {
  const catalogs = Object.fromEntries(["en", "es", "ar"].map((lang) => [lang, JSON.parse(read(`apps/landing/i18n/${lang}.json`))]));
  const next = (lang) => Object.entries(catalogs[lang]).filter(([key]) => key.startsWith("adopt.next."));

  it("have the same keys in the three catalogs", () => {
    const keys = (lang) => next(lang).map(([key]) => key).sort();
    expect(keys("es")).toEqual(keys("en"));
    expect(keys("ar")).toEqual(keys("en"));
    expect(keys("en")).toEqual(expect.arrayContaining(["adopt.next.app", "adopt.next.cms", "adopt.next.landing"]));
  });

  it("do not sell a feature grid: it is a template on core's split grid, not a landing component", () => {
    const feature = /feature grid|rejilla de caracter[ií]sticas|شبكة الميزات/i;
    const offenders = ["en", "es", "ar"].flatMap((lang) => next(lang).filter(([, text]) => feature.test(text)).map(([key]) => `${lang}: ${key}`));
    expect(offenders).toEqual([]);
  });
});
