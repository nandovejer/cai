/**
 * Sortable tables in the docs (the accessibility review of
 * .claude/plans/specs/table-sort.md, T3 and T4b). A table that sorts in the
 * browser does not say its direction in its caption or its headings: after
 * one press they would be false. And a cell that is not a plain number or an
 * ISO date carries `data-sort-value`, or it sorts as text, in silence.
 */
import { describe, expect, it } from "vitest";
import { site } from "./helpers/docs-site.js";

/** The real tables (not the escaped code of a snippet) that have a sortable heading. */
const tables = [];
for (const page of site.pages) {
  for (const [html] of page.body.matchAll(/<table\b[\s\S]*?<\/table>/g)) {
    if (html.includes("data-luz-sort")) tables.push({ page, html });
  }
}

const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const PLAIN = /^(-?\d+(\.\d+)?(e[+-]?\d+)?|\d{4}-\d{2}-\d{2})$/i;

describe("tables with data-luz-sort in the docs", () => {
  it("has at least the Table page's example", () => {
    expect(tables.length).toBeGreaterThanOrEqual(1);
    expect(tables.map((t) => t.page.route)).toContain("/docs/components/table/");
  });

  it("T3: no direction in the caption or in a heading", () => {
    for (const { page, html } of tables) {
      const caption = html.match(/<caption>([\s\S]*?)<\/caption>/)?.[1] ?? "";
      expect(text(caption), page.file).not.toMatch(/ascending|descending|sorted by/i);
      for (const [, th] of html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)) {
        expect(text(th), page.file).not.toMatch(/ascending|descending|sorted by|[▲▼↑↓]/i);
      }
    }
  });

  it("T4b: a cell of a sortable column that is not a plain number or an ISO date has data-sort-value", () => {
    for (const { page, html } of tables) {
      const head = html.match(/<thead>([\s\S]*?)<\/thead>/)[1];
      const heads = [...head.matchAll(/<th\b([^>]*)>/g)].map((m) => /\bdata-luz-sort\b/.test(m[1]));
      const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
      for (const [, row] of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
        const cells = [...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)];
        cells.forEach(([, attrs, inner], i) => {
          if (!heads[i]) return;
          const value = text(inner);
          const looksNumeric = /^[\d.,\s€$%+-]+\s*[a-z%€$]*$/i.test(value) && /\d/.test(value);
          // Text columns need nothing; a number written with a separator, unit or currency needs the plain value
          if (looksNumeric && !PLAIN.test(value)) {
            expect(attrs, `${page.file}: "${value}"`).toMatch(/\bdata-sort-value="[^"]+"/);
          }
          const given = attrs.match(/\bdata-sort-value="([^"]*)"/)?.[1];
          if (given !== undefined) expect(given, `${page.file}: data-sort-value of "${value}"`).toMatch(PLAIN);
        });
      }
    }
  });

  it("one heading at most carries aria-sort, and a sortable heading is a column header", () => {
    for (const { page, html } of tables) {
      expect([...html.matchAll(/aria-sort="/g)].length, page.file).toBeLessThanOrEqual(1);
      for (const [, attrs] of html.matchAll(/<th\b([^>]*\bdata-luz-sort\b[^>]*)>/g)) {
        expect(attrs, page.file).toMatch(/scope="col"/);
      }
    }
  });
});
