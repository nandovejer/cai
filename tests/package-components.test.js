/**
 * F3, one stylesheet per component (.claude/plans/specs/f3-package-model.md,
 * §4 and §9 step 2; the unit half of the acceptance, the browser half is a
 * Playwright comparison).
 *
 * buildPackage() writes dist/components/<name>.css and <name>.min.css for
 * every src/components/<name>.css whose name does not start with `_`, each
 * in the package's own layer; `_print.css` is emitted as dist/print.css.
 * Core already does this; site and the kinds of site follow.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LAYER_ORDER } from "../scripts/luz-layers.js";
import { SITE_KINDS } from "../scripts/luz-packages.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const PACKAGES = ["site", ...SITE_KINDS];

const list = (dir, filter) => (existsSync(`${root}${dir}`) ? readdirSync(`${root}${dir}`).filter(filter).sort() : []);
const isCss = (f) => f.endsWith(".css") && !f.endsWith(".min.css");
const blocks = (css, layer) => css.match(new RegExp(`^@layer luz\\.${layer} \\{$`, "gm")) ?? [];

for (const name of PACKAGES) {
  const src = `packages/${name}/src/components`;
  const dist = `packages/${name}/dist`;
  const manifest = JSON.parse(readFileSync(`${root}packages/${name}/package.json`, "utf-8"));
  const wanted = list(src, (f) => isCss(f) && !f.startsWith("_"));
  const built = existsSync(`${root}${dist}/${name}.css`);

  describe(`@luz-ds/${name}: one stylesheet per component`, () => {
    it("has components to ship", () => {
      expect(wanted.length).toBeGreaterThan(0);
    });

    it("exports ./components/* from dist/components, as core does", () => {
      expect(manifest.exports["./components/*"]).toBe("./dist/components/*");
    });

    it("lists every component, plain and minified, in pack-files.txt", () => {
      const packed = readFileSync(`${root}packages/${name}/pack-files.txt`, "utf-8").split("\n").filter(Boolean);
      const expected = wanted.flatMap((f) => [`dist/components/${f}`, `dist/components/${f.replace(/\.css$/, ".min.css")}`]);
      expect(expected.filter((path) => !packed.includes(path))).toEqual([]);
    });

    it.skipIf(!built)("dist/components holds exactly the components of src/components", () => {
      expect(list(`${dist}/components`, isCss)).toEqual(wanted);
    });

    it.skipIf(!built)("each component also has a minified file", () => {
      const minified = list(`${dist}/components`, (f) => f.endsWith(".min.css"));
      expect(minified).toEqual(wanted.map((f) => f.replace(/\.css$/, ".min.css")));
      for (const f of minified) expect(readFileSync(`${root}${dist}/components/${f}`, "utf-8").length, f).toBeGreaterThan(0);
    });

    it.skipIf(!built)("each component starts with the layer order and has one luz layer block", () => {
      const bad = [];
      for (const f of wanted) {
        const file = `${root}${dist}/components/${f}`;
        const css = existsSync(file) ? readFileSync(file, "utf-8") : "";
        if (!css.startsWith(LAYER_ORDER) || blocks(css, name).length !== 1) bad.push(f);
      }
      expect(bad).toEqual([]);
    });

    it.skipIf(!built)("each component is the part of the bundle that its source adds", () => {
      const bundle = readFileSync(`${root}${dist}/${name}.css`, "utf-8");
      const missing = [];
      for (const f of wanted) {
        const file = `${root}${dist}/components/${f}`;
        const rules = existsSync(file)
          ? readFileSync(file, "utf-8")
              .replace(LAYER_ORDER, "")
              .replace(new RegExp(`^@layer luz\\.${name} \\{\\n`), "")
              .replace(/\n\}\n$/, "")
              .trim()
          : "";
        if (!rules || !bundle.includes(rules)) missing.push(f);
      }
      expect(missing).toEqual([]);
    });
  });
}

describe("@luz-ds/site: the print stylesheet", () => {
  const built = existsSync(`${root}packages/site/dist/site.css`);

  it("is emitted as dist/print.css, not as a component", () => {
    expect(existsSync(`${root}packages/site/src/components/_print.css`)).toBe(true);
    const packed = readFileSync(`${root}packages/site/pack-files.txt`, "utf-8").split("\n");
    expect(packed).toContain("dist/print.css");
  });

  it.skipIf(!built)("dist/print.css starts with the layer order and is in luz.site", () => {
    expect(existsSync(`${root}packages/site/dist/print.css`), "dist/print.css exists").toBe(true);
    const css = readFileSync(`${root}packages/site/dist/print.css`, "utf-8");
    expect(css.startsWith(LAYER_ORDER)).toBe(true);
    expect(blocks(css, "site")).toHaveLength(1);
    expect(css).toContain("@media print");
  });
});
