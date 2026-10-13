/**
 * Meter: the rules of .claude/plans/specs/icons-charts-data-grid.md section
 * 5b and its accessibility review (M1, M2). The CSS paints every state the
 * same (RL-15: no status colour the system did not choose), and the docs
 * never set low, high or optimum, never leave a meter unnamed that is
 * exposed, and never put a hidden bar in a cell with no text of its own.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { site } from "./helpers/docs-site.js";

const css = readFileSync(new URL("../packages/core/src/components/meter.css", import.meta.url), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("meter.css", () => {
  it("is native: no appearance of the browser, one block", () => {
    expect(css).toMatch(/\.cai-meter\s*\{[^}]*appearance:\s*none/);
    expect(css).toMatch(/\.cai-meter\s*\{[^}]*display:\s*block/);
    expect(css).toMatch(/\.cai-meter\s*\{[^}]*min-inline-size:\s*8rem/);
  });

  it("draws the three states of each engine in the brand colour, and no status colour", () => {
    expect(css).not.toMatch(/--cai-color-(success|warning|danger|info)/);
    const fill = /(::-webkit-meter-optimum-value[^{]*::-webkit-meter-suboptimum-value[^{]*::-webkit-meter-even-less-good-value|::-moz-meter-bar)\s*\{([^}]*)\}/g;
    const bodies = [...css.matchAll(fill)].map((m) => m[2]);
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    for (const body of bodies.slice(0, 2)) expect(body).toMatch(/background:\s*var\(--cai-brand-primary\)/);
    // The engine's states are not styled apart
    expect(css).not.toMatch(/(?<!:):-moz-meter-/);
  });

  it("keeps its border and fill in forced colors, one rule per engine", () => {
    const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
    expect(forced).toMatch(/border-color:\s*CanvasText/);
    expect(forced).toMatch(/::-moz-meter-bar\s*\{[^}]*Highlight/);
    expect(forced).toMatch(/::-webkit-meter-optimum-value[^{]*\{[^}]*Highlight/);
  });
});

/** Every <meter class="cai-meter" …> of the docs: the page, the tag and the markup before it in its cell. */
const meters = [];
for (const page of site.pages) {
  for (const m of page.body.matchAll(/<meter\b[^>]*class="[^"]*\bcai-meter\b[^"]*"[^>]*>/g)) {
    const before = page.body.slice(0, m.index);
    const cell = before.lastIndexOf("<td");
    const stage = before.lastIndexOf('class="docs-dodont__stage"');
    // A Do and don't example is a picture: its stage is inert and hidden as a whole
    const inStage = stage > before.lastIndexOf("</figure>");
    meters.push({ page, tag: m[0], inStage, inCell: cell > stage && cell > before.lastIndexOf("</td>"), beforeInCell: before.slice(cell).replace(/<[^>]+>/g, "").trim() });
  }
}

describe("meters in the docs", () => {
  it("has examples to check", () => {
    expect(meters.length).toBeGreaterThanOrEqual(5);
  });

  it("never sets low, high or optimum on a .cai-meter", () => {
    for (const { page, tag } of meters) expect(tag, page.file).not.toMatch(/\s(low|high|optimum)=/);
  });

  it("is hidden from assistive technology next to its figure, or has a name", () => {
    for (const { page, tag, inStage } of meters) {
      if (inStage) continue;
      const hidden = /aria-hidden="true"/.test(tag);
      const id = tag.match(/\sid="([^"]+)"/)?.[1];
      const named = /aria-label(ledby)?=/.test(tag) || (id && new RegExp(`<label[^>]*\\sfor="${id}"`).test(page.body));
      expect(hidden || named, `${page.file}: ${tag}`).toBe(true);
    }
  });

  it("puts a hidden bar in a cell that has the figure as text (M1): never an empty cell", () => {
    const inCell = meters.filter((m) => m.inCell && /aria-hidden="true"/.test(m.tag));
    expect(inCell.length).toBeGreaterThanOrEqual(3);
    for (const { page, beforeInCell } of inCell) expect(beforeInCell.length, page.file).toBeGreaterThan(0);
  });
});
