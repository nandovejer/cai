/**
 * The table "Which check covers which red line" in PRINCIPLES.md names, for
 * each of RL-1 to RL-18, the files that check it. This test keeps the table
 * honest: every line appears once, and every file it names exists.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const principles = readFileSync(resolve(root, "PRINCIPLES.md"), "utf-8");

const section = principles.split("### Which check covers which red line")[1]?.split(/^## /m)[0] ?? "";
const rows = section
  .split("\n")
  .filter((l) => /^\|\s*RL-\d+\s*\|/.test(l))
  .map((l) => l.split("|").map((c) => c.trim()))
  .map(([, line, checks, limit]) => ({ line, checks, limit }));

describe("PRINCIPLES.md: which check covers which red line", () => {
  it("has the table", () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it("lists RL-1 to RL-18 once each, in order, as many as the red lines of the file", () => {
    const listed = rows.map((r) => r.line);
    expect(listed).toEqual(Array.from({ length: 18 }, (_, i) => `RL-${i + 1}`));
    // The numbered red lines above the table are the same eighteen
    const block = principles.split("## Red lines")[1].split("### Which check")[0];
    const numbered = [...block.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
    expect(numbered).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it("names at least one existing file for every line, and says what the check does not see", () => {
    for (const row of rows) {
      const files = [...row.checks.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      expect(files.length, `${row.line} names a check`).toBeGreaterThan(0);
      for (const file of files) expect(existsSync(resolve(root, file)), `${row.line}: ${file} exists`).toBe(true);
      expect(row.limit.length, `${row.line} says what it does not see`).toBeGreaterThan(5);
    }
  });
});
