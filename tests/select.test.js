/**
 * The select is two layers (components/select.css): the closed box for every
 * browser, and the open list inside @supports (appearance: base-select).
 * The first must not depend on the second, and the second must not leak out
 * of its @supports block.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../packages/core/src/components/select.css", import.meta.url), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
const START = "@supports (appearance: base-select) {";

/** The CSS with the balanced block that follows `start` cut out. */
function split(source, start) {
  const from = source.indexOf(start);
  let depth = 0;
  for (let i = from + start.length - 1; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return [source.slice(0, from) + source.slice(i + 1), source.slice(from, i + 1)];
  }
  throw new Error("unbalanced block");
}

const [layer1, layer2] = split(css, START);

describe("select.css layering", () => {
  it("has one @supports block for base-select", () => {
    expect(css.split(START)).toHaveLength(2);
  });

  it("keeps everything that needs base-select inside the @supports block", () => {
    expect(layer1).not.toMatch(/base-select|::picker|picker-icon|::checkmark|selectedcontent/);
    expect(layer2).toMatch(/::picker\(select\)/);
    expect(layer2).toMatch(/::picker-icon/);
    expect(layer2).toMatch(/::checkmark/);
  });

  it("draws the closed box without the second layer: border, arrow, focus, states", () => {
    expect(layer1).toMatch(/\.cai-select\s*{[^}]*appearance:\s*none/);
    expect(layer1).toMatch(/linear-gradient\([^)]*currentcolor/);
    for (const state of [":hover", ":focus-visible", ":disabled", '[aria-invalid="true"]', "[multiple]", "forced-colors"]) {
      expect(layer1, state).toContain(state);
    }
  });

  it("uses no literal colour or physical side, and no primitive token", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|var\(--cai-(gray|blue|red|green|yellow|purple)-\d+/);
    expect(css).not.toMatch(/\b(margin|padding|border)-(left|right)\b|\b(left|right):/);
  });
});
