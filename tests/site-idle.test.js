/**
 * Firefox review (2026-10-16): a pending dynamic `import()` delays the `load`
 * event in Gecko (load at 3052 ms with search.min.js held 3 s; Chromium: 26 ms).
 * The loader's idle trigger fired before `load`, so the chunk import itself held
 * the page's load back. The idle helper in packages/site/src/site.js waits for
 * `load` when the document is not complete. The behaviour is checked in
 * Chromium by tests/site-loader.spec.js (load is not delayed by a held chunk);
 * Chromium never showed the problem, so this source-level guard is the one that
 * is red today.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(repo, "packages/site/src/site.js"), "utf-8");

/** The `idle` helper: from `const idle` to the blank line after it. */
const idle = () => {
  const at = source.search(/const idle\b/);
  if (at < 0) return "";
  const end = source.indexOf("\n\n", at);
  return source.slice(at, end < 0 ? undefined : end);
};

describe("the loader's idle helper waits for the load event", () => {
  it("exists, and still prefers requestIdleCallback with a 1 s timeout, read at call time (Safari has none)", () => {
    expect(idle()).toMatch(/window\.requestIdleCallback\s*\?/);
    expect(idle()).toMatch(/timeout:\s*1000/);
    expect(idle()).toMatch(/setTimeout\(/);
  });

  it("registers a load listener when the document is not complete, and runs at once when it is", () => {
    const h = idle();
    expect(h).toMatch(/document\.readyState\s*===?\s*["']complete["']|document\.readyState\s*!==?\s*["']complete["']/);
    expect(h).toMatch(/addEventListener\(\s*["']load["']/);
    expect(h).toMatch(/\{\s*once:\s*true\s*\}/);
  });
});
