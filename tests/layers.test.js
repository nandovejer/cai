/**
 * Every published stylesheet puts its rules in a `luz.*` layer and repeats
 * the order statement first (scripts/luz-layers.js). A top-level layer name
 * or an unlayered rule would collide with the consumer's own layers, which
 * is what the container layer exists to prevent.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYERS, LAYER_ORDER } from "../scripts/luz-layers.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = (path) => `${root}${path}`;
const listed = (dir) => (existsSync(dist(dir)) ? readdirSync(dist(dir)).filter((f) => f.endsWith(".css")).map((f) => `${dir}/${f}`) : []);

const files = [
  "packages/tokens/dist/luz-tokens.css",
  "packages/tokens/dist/tokens.css",
  "packages/core/dist/luz.css",
  "packages/core/dist/base.css",
  "packages/site/dist/site.css",
  "packages/landing/dist/landing.css",
  "packages/cms/dist/cms.css",
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

describe.skipIf(files.length === 0)("published stylesheets and the luz layers", () => {
  it("covers every package's CSS", () => {
    expect(files.some((f) => f.includes("tokens/dist"))).toBe(true);
    expect(files.some((f) => f.endsWith("luz.css"))).toBe(true);
    expect(files.some((f) => f.endsWith("site.css"))).toBe(true);
    expect(files.some((f) => f.endsWith("landing.css"))).toBe(true);
    expect(files.some((f) => f.endsWith("cms.css"))).toBe(true);
  });

  for (const file of files) {
    it(`${file}: only luz.* layers, the order statement first, nothing unlayered but @font-face`, () => {
      const items = topLevel(readFileSync(dist(file), "utf-8"));
      const statement = items.find((it) => it.body === null && it.prelude.startsWith("@layer"));
      expect(statement, "an @layer order statement").toBeTruthy();
      expect(`${statement.prelude};\n`).toBe(LAYER_ORDER);
      expect(items.indexOf(statement), "the statement comes before any rule").toBe(items.findIndex((it) => !it.prelude.startsWith("@import") && !it.prelude.startsWith("@charset") && !it.prelude.startsWith("@font-face")));

      const stray = [];
      for (const { prelude, body } of items) {
        if (prelude.startsWith("@font-face") || prelude.startsWith("@charset") || prelude === statement.prelude) continue;
        const layer = prelude.match(/^@layer\s+([\w.-]+)$/)?.[1];
        if (body === null || !layer || !layer.startsWith("luz.") || !LAYERS.includes(layer.slice(4))) stray.push(prelude.slice(0, 80));
      }
      expect(stray).toEqual([]);
    });
  }

  it("the full bundle has the layers in the documented order", () => {
    const css = readFileSync(dist("packages/core/dist/luz.css"), "utf-8");
    const order = [...css.matchAll(/^@layer (luz\.[\w-]+) \{/gm)].map((m) => m[1]);
    expect(order).toEqual(["luz.settings", "luz.generic", "luz.elements", "luz.objects", "luz.components", "luz.utilities", "luz.print"]);
  });
});
