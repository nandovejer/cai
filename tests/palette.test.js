/**
 * CAI — the colour palette is CAI's own.
 * The primitives in packages/tokens/tokens.json are computed by
 * scripts/build-palette.js. Until 2026 they were IBM Carbon's palette
 * (Apache-2.0); CARBON lists every value the repository used then, taken from
 * the git history of tokens.json, so that none of them comes back, as a hex
 * or as an rgb() triple, in the tokens or in any source the packages and the
 * apps ship.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { palette, render } from "../scripts/build-palette.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf-8");

const CARBON = `
  edf5ff d0e2ff a6c8ff 78a9ff 4589ff 0f62fe 0043ce 002d9c 001d6c 001141
  f4f4f4 e0e0e0 c6c6c6 a8a8a8 8d8d8d 6f6f6f 525252 393939 262626 161616
  defbe6 a7f0ba 6fdc8c 42be65 24a148 198038 0e6027
  fff1f1 ffd7d9 ffb3b8 ff8389 fa4d56 da1e28 a2191f
  fcf4d6 fddc69 f1c21b d2a106 b28600 684e00
  d9fbfb 9ef0f0 3ddbd9 009d9a 007d79 005d5d
  f6f2ff e8daff be95ff a56eff 8a3ffc 6929c4
`.trim().split(/\s+/);

const triple = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const TRIPLES = CARBON.map((hex) => triple(hex).join(","));

/** Every #rrggbb and rgb()/rgba() triple in a text, lower-cased. */
function coloursIn(text) {
  const hexes = [...text.matchAll(/#([0-9a-f]{6})\b/gi)].map((m) => m[1].toLowerCase());
  const rgbs = [...text.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)].map((m) => `${m[1]},${m[2]},${m[3]}`);
  return { hexes, rgbs };
}

const SKIP = new Set(["node_modules", "dist", ".git"]);
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
const SOURCES = ["packages/tokens/src", "packages/core/src", "packages/platform/src", "apps", "scripts"]
  .flatMap((dir) => [...walk(resolve(root, dir))])
  .filter((path) => [".css", ".html", ".svg", ".js", ".json"].includes(extname(path)))
  .concat([resolve(root, "README.md"), resolve(root, "packages/tokens/tokens.json")]);

describe("palette", () => {
  it("tokens.json holds exactly what scripts/build-palette.js computes", () => {
    const source = read("packages/tokens/tokens.json");
    expect(render(source)).toBe(source);
  });

  it("no primitive is a Carbon value", () => {
    const clashes = Object.entries(palette()).flatMap(([family, steps]) =>
      Object.entries(steps)
        .filter(([, { value }]) => CARBON.includes(value.slice(1).toLowerCase()))
        .map(([step, { value }]) => `--cai-${family}-${step}: ${value}`),
    );
    expect(clashes).toEqual([]);
  });

  it("no source file uses a Carbon colour, as hex or as rgb()", () => {
    const found = [];
    for (const path of SOURCES) {
      const { hexes, rgbs } = coloursIn(readFileSync(path, "utf-8"));
      for (const hex of hexes) if (CARBON.includes(hex)) found.push(`${relative(root, path)}: #${hex}`);
      for (const rgb of rgbs) if (TRIPLES.includes(rgb)) found.push(`${relative(root, path)}: rgb(${rgb})`);
    }
    expect(found).toEqual([]);
  });

  it("every translucent tint in the tokens is a CAI primitive", () => {
    const primitives = Object.values(palette()).flatMap((steps) =>
      Object.values(steps).map(({ value }) => triple(value.slice(1)).join(",")),
    );
    const allowed = new Set([...primitives, "0,0,0", "255,255,255"]);
    const { rgbs } = coloursIn(read("packages/tokens/src/semantic.css"));
    expect(rgbs.filter((rgb) => !allowed.has(rgb))).toEqual([]);
  });
});
