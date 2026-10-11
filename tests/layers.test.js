/**
 * Every published stylesheet puts its rules in a `cai.*` layer and repeats
 * the order statement first (scripts/cai-layers.js). A top-level layer name
 * or an unlayered rule would collide with the consumer's own layers, which
 * is what the container layer exists to prevent.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYERS, LAYER_ORDER } from "../scripts/cai-layers.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = (path) => `${root}${path}`;
const listed = (dir) => (existsSync(dist(dir)) ? readdirSync(dist(dir)).filter((f) => f.endsWith(".css")).map((f) => `${dir}/${f}`) : []);

const files = [
  "packages/tokens/dist/cai-tokens.css",
  "packages/tokens/dist/tokens.css",
  "packages/core/dist/cai.css",
  "packages/core/dist/base.css",
  "packages/platform/dist/platform.css",
  "packages/core/dist/print.css",
  "packages/core/dist/classless.css",
  ...listed("packages/core/dist/components").filter((f) => !f.endsWith(".min.css")),
  ...listed("packages/core/dist/themes").filter((f) => !f.endsWith(".min.css")),
].filter((f) => existsSync(dist(f)));

/** The top level of a stylesheet: [{ prelude, body | null }], comments removed. */
function topLevel(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    let depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) break;
      else if (text[i] === ";" && depth === 0) break;
    }
    const chunk = text.slice(start, i + 1).trim();
    i++;
    if (!chunk) continue;
    const open = chunk.indexOf("{");
    out.push(open === -1 ? { prelude: chunk.replace(/;$/, "").trim(), body: null } : { prelude: chunk.slice(0, open).trim(), body: chunk.slice(open + 1, -1) });
  }
  return out;
}

describe.skipIf(files.length === 0)("published stylesheets and the cai layers", () => {
  it("covers every package's CSS", () => {
    expect(files.some((f) => f.includes("tokens/dist"))).toBe(true);
    expect(files.some((f) => f.endsWith("cai.css"))).toBe(true);
    expect(files.some((f) => f.endsWith("platform.css"))).toBe(true);
  });

  for (const file of files) {
    it(`${file}: only cai.* layers, the order statement first, nothing unlayered but @font-face`, () => {
      const items = topLevel(readFileSync(dist(file), "utf-8"));
      const statement = items.find((it) => it.body === null && it.prelude.startsWith("@layer"));
      expect(statement, "an @layer order statement").toBeTruthy();
      expect(`${statement.prelude};\n`).toBe(LAYER_ORDER);
      expect(items.indexOf(statement), "the statement comes before any rule").toBe(items.findIndex((it) => !it.prelude.startsWith("@import") && !it.prelude.startsWith("@charset") && !it.prelude.startsWith("@font-face")));

      const stray = [];
      for (const { prelude, body } of items) {
        if (prelude.startsWith("@font-face") || prelude.startsWith("@charset") || prelude === statement.prelude) continue;
        const layer = prelude.match(/^@layer\s+([\w.-]+)$/)?.[1];
        if (body === null || !layer || !layer.startsWith("cai.") || !LAYERS.includes(layer.slice(4))) stray.push(prelude.slice(0, 80));
      }
      expect(stray).toEqual([]);
    });
  }

  it("the full bundle has the layers in the documented order", () => {
    const css = readFileSync(dist("packages/core/dist/cai.css"), "utf-8");
    const order = [...css.matchAll(/^@layer (cai\.[\w-]+) \{/gm)].map((m) => m[1]);
    expect(order).toEqual(["cai.settings", "cai.generic", "cai.elements", "cai.objects", "cai.components", "cai.utilities", "cai.print"]);
  });
});
