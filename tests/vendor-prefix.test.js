/**
 * Safari 17 and iOS 17 ship `backdrop-filter` only with the -webkit- prefix.
 * Every `backdrop-filter` in a source stylesheet (packages/ and apps/) is
 * preceded, in the same rule, by a `-webkit-backdrop-filter` with the same
 * value, as components/modal.css does. In packages/ the line carries a
 * `stylelint-disable-next-line property-no-vendor-prefix` comment; apps/ does
 * not extend the standard config, so it needs none.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const SKIP = new Set(["node_modules", "dist", ".git"]);

/** Every .css file under `dir`, without dependencies or build output. */
function cssFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...cssFiles(path));
    else if (name.endsWith(".css")) out.push(path);
  }
  return out;
}

const dirs = [...readdirSync(join(root, "packages")).map((p) => join(root, "packages", p, "src")), join(root, "apps")].filter((d) => {
  try {
    return statSync(d).isDirectory();
  } catch {
    return false;
  }
});
const files = dirs.flatMap(cssFiles);

/** [{ file, body }] for each innermost `{ … }` block that declares backdrop-filter. */
function blocksWithBackdrop(file) {
  const css = readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...css.matchAll(/\{([^{}]*)\}/g)].map(([, body]) => ({ file, body })).filter(({ body }) => /(^|[;\s])backdrop-filter\s*:/.test(body));
}

const blocks = files.flatMap(blocksWithBackdrop);

describe("backdrop-filter keeps its -webkit- twin", () => {
  it("finds the backdrop-filter declarations it checks", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("puts -webkit-backdrop-filter, with the same value, before every backdrop-filter in its rule", () => {
    const bad = [];
    for (const { file, body } of blocks) {
      const decls = body.split(";").map((d) => d.trim());
      const at = decls.findIndex((d) => /^backdrop-filter\s*:/.test(d));
      const value = decls[at].replace(/^backdrop-filter\s*:\s*/, "").trim();
      const twin = decls.slice(0, at).findIndex((d) => /^-webkit-backdrop-filter\s*:/.test(d) && d.replace(/^-webkit-backdrop-filter\s*:\s*/, "").trim() === value);
      if (twin === -1) bad.push(`${file.replace(root, "")}: backdrop-filter: ${value}`);
    }
    expect(bad).toEqual([]);
  });
});
