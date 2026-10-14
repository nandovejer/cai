/**
 * <luz-timeline> as a piece of the package (.claude/plans/specs/timeline.md,
 * "Loading and size"): its budget row, its published export, its row in
 * PRINCIPLES.md section 8, its CSS in the components layer, the loader line in
 * the entry. The behaviour is in tests/timeline.spec.js.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");
const coreDist = resolve(root, "packages/core/dist");
const distBuilt = existsSync(resolve(coreDist, "luz.js"));

describe("timeline: size and publication", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;

  it("has its own budget row: ideal 2 kB, ceiling 3 kB", () => {
    const row = budgets.find((b) => b.file === "packages/core/dist/timeline.min.js");
    expect(row, "a row for timeline.min.js in budgets.json").toBeDefined();
    expect(row.name).toBe("core JS lazy chunk: timeline");
    expect(row.ideal).toBe(2048);
    expect(row.max).toBe(3072);
  });

  it("never raises the ceiling of the core entry", () => {
    expect(budgets.find((b) => b.file === "packages/core/dist/luz.min.js").max).toBe(8192);
  });

  it("has its row in PRINCIPLES.md section 8", () => {
    expect(/\| `core` JS lazy chunk: `timeline` \| — \| ≤ 2 kB \| 2 kB \| 3 kB \|/.test(read("PRINCIPLES.md")), "the timeline row in section 8").toBe(true);
  });

  it("is exported as @luz-ds/core/timeline", () => {
    expect(JSON.parse(read("packages/core/package.json")).exports["./timeline"]).toBe("./dist/timeline.js");
  });
});

describe("timeline: sources", () => {
  it("has its module and its stylesheet, and the stylesheet is imported by the components", () => {
    expect(existsSync(resolve(root, "packages/core/src/timeline.js"))).toBe(true);
    expect(existsSync(resolve(root, "packages/core/src/components/timeline.css"))).toBe(true);
    expect(read("packages/core/src/components/index.css")).toMatch(/@import\s+["']\.\/timeline\.css["']/);
  });

  it("styles the element before it is defined, so nothing jumps when it upgrades", () => {
    expect(read("packages/core/src/components/timeline.css")).toContain("luz-timeline:not(:defined)");
  });

  it("builds its rail with DOM APIs only (no HTML sink)", () => {
    expect(read("packages/core/src/timeline.js")).not.toMatch(/\b(innerHTML|outerHTML|insertAdjacentHTML|eval)\b|document\.write/);
  });
});

describe.skipIf(!distBuilt)("timeline: dist", () => {
  it("is a lazy chunk of its own, loaded by presence from the entry, and luz.js does not contain its code", () => {
    expect(existsSync(resolve(coreDist, "timeline.js"))).toBe(true);
    expect(existsSync(resolve(coreDist, "timeline.min.js"))).toBe(true);
    expect(read("packages/core/dist/timeline.js")).toContain("luz-timeline");
    expect(read("packages/core/dist/luz.js")).toMatch(/querySelector\(["']luz-timeline["']\)/);
    expect(read("packages/core/dist/luz.js")).toMatch(/import\(["']\.\/timeline\.js["']\)/);
    expect(read("packages/core/dist/luz.min.js")).toContain("./timeline.min.js");
  });

  it("puts the stylesheet in luz.css", () => {
    expect(read("packages/core/dist/luz.css").includes("luz-timeline"), "luz-timeline in dist/luz.css").toBe(true);
  });
});
