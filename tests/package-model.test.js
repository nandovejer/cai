/**
 * F3, the package model (.claude/plans/specs/f3-package-model.md, §3.1, §5, §9 step 1).
 * The sources are read as text; no browser, no build.
 *
 *   (a) layering: a lower package never names a higher one
 *   (b) names: no block is shipped by two packages
 *   (c) peers: a kind of site takes site as an optional peer
 *   (d) site after F3 and F1: six components, the exports of spec §1.3, no placeholders
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SITE_KINDS } from "../scripts/luz-packages.js";
import { JPEG_LONG_SIDES, LONG_SIDES, RATIOS, VARIANTS, sizeOf } from "../scripts/build-placeholders.js";
import { LAYER_ORDER } from "../scripts/luz-layers.js";
import { blocksOfCss } from "./helpers/css-blocks.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const SITE_TAGS = ["search", "consent", "lang-switch", "submenu", "banner"];
// F1 of the identity plan adds <luz-mode> to site. It is not in SITE_TAGS: core's theme.js has a
// storage key spelled "luz-mode" (the mode of a custom theme), which the layering check would take for the tag
const SITE_COMPONENTS = [...SITE_TAGS, "mode"];

/** Source files (.css and .js) of packages/<name>/src, with their text. */
function sources(name, extensions = [".css", ".js"]) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "placeholders") walk(path);
      } else if (extensions.some((e) => entry.endsWith(e))) out.push({ path: path.slice(root.length), text: readFileSync(path, "utf-8") });
    }
  };
  walk(`${root}packages/${name}/src`);
  return out;
}

/** "path:line: text" for each line of the package's sources that matches. */
function offenders(names, pattern) {
  return names.flatMap((name) =>
    sources(name).flatMap(({ path, text }) =>
      text.split("\n").flatMap((line, i) => (pattern.test(line) ? [`${path}:${i + 1}: ${line.trim()}`] : [])),
    ),
  );
}

/* ---- (a) A lower package never names a higher one ------------------------ */

describe("layering: tokens < core < site < a kind of site", () => {
  it("tokens and core name no site block, no kind of site and none of site's five tags", () => {
    const tags = new RegExp(`luz-(?:${SITE_TAGS.join("|")})(?:__|--|(?![\\w-]))`);
    expect(offenders(["tokens", "core"], /luz-(?:site|landing|cms|app|docs)-/)).toEqual([]);
    expect(offenders(["tokens", "core"], tags)).toEqual([]);
  });

  it("site names no kind of site", () => {
    expect(offenders(["site"], /luz-(?:landing|cms|app|docs)-/)).toEqual([]);
  });

  // A kind may refine site's tags (`.luz-landing-header luz-lang-switch`),
  // but site's old `luz-site-*` classes go away in F3, and two kinds never
  // meet: no shared class (spec §1.8)
  const other = (kind) => SITE_KINDS.filter((k) => k !== kind).join("|");
  for (const kind of SITE_KINDS) {
    it(`${kind} names no \`luz-site-*\` class or property and no other kind of site`, () => {
      expect(offenders([kind], new RegExp(`luz-site-|luz-(?:${other(kind)})-`))).toEqual([]);
    });
  }
});

/* ---- (b) No block is shipped by two packages ------------------------------ */

describe("names: one package per block", () => {
  const packages = ["core", "site", ...SITE_KINDS];
  const owners = new Map();
  for (const name of packages) {
    for (const { path, text } of sources(name, [".css"])) {
      for (const block of blocksOfCss(text)) {
        if (!owners.has(block)) owners.set(block, new Map());
        const files = owners.get(block);
        files.set(name, [...(files.get(name) ?? []), path]);
      }
    }
  }

  it("reads the blocks of every package", () => {
    for (const name of packages) {
      expect([...owners.values()].some((files) => files.has(name)), `${name} defines at least one block`).toBe(true);
    }
  });

  it("no tag, component or object name is defined by two packages", () => {
    const shared = [...owners].filter(([, files]) => files.size > 1).map(([block, files]) => `${block}: ${[...files.keys()].join(" and ")}`);
    expect(shared).toEqual([]);
  });

  // The reader that (b) stands on: only the leftmost compound of a selector
  // defines a block, so a refinement of another package's tag is not a claim
  it("reads a block from the leftmost compound, through :where() and :is()", () => {
    const css = `
      :where(luz-submenu > details > summary) { color: red }
      :where(luz-banner)[tone="warning"], .luz-card__title--x { color: red }
      .o-stack.o-stack--lg > * { color: red }
      .luz-landing-header luz-lang-switch { color: red }
      :root:has(.o-sticky) .luz-cms-toc { color: red }
      @media (min-height: 30rem) { :is(.o-sticky) { position: sticky } }
    `;
    expect([...blocksOfCss(css)].sort()).toEqual(["luz-banner", "luz-card", "luz-landing-header", "luz-submenu", "o-stack", "o-sticky"]);
  });
});

/* ---- (c) A kind of site takes site as an optional peer -------------------- */

describe("peers: a kind of site works without site", () => {
  for (const kind of SITE_KINDS) {
    const manifest = JSON.parse(readFileSync(`${root}packages/${kind}/package.json`, "utf-8"));

    it(`${kind} requires tokens and core and lists site as an optional peer`, () => {
      expect(manifest.peerDependencies["@luz-ds/tokens"]).toBe("^0.1.0");
      expect(manifest.peerDependencies["@luz-ds/core"]).toBe("^0.1.0");
      expect(manifest.peerDependencies["@luz-ds/site"], "site stays a peer, with the literal range").toBe("^0.1.0");
      expect(manifest.peerDependenciesMeta?.["@luz-ds/site"]).toEqual({ optional: true });
    });

    it(`${kind} makes tokens and core required, never optional`, () => {
      expect(manifest.peerDependenciesMeta?.["@luz-ds/tokens"]).toBeUndefined();
      expect(manifest.peerDependenciesMeta?.["@luz-ds/core"]).toBeUndefined();
    });

    it(`${kind} keeps site as a workspace dev dependency (for the docs and the tests)`, () => {
      expect(manifest.devDependencies["@luz-ds/site"]).toBe("workspace:*");
    });
  }
});

/* ---- (d) site after F3 and F1: six components and nothing else (step 12) -------- */

describe("site after F1: six `<luz-*>` components", () => {
  const read = (path) => readFileSync(`${root}${path}`, "utf-8");
  const manifest = JSON.parse(read("packages/site/package.json"));
  const components = SITE_COMPONENTS.map((name) => `${name}.css`).sort();
  const minified = components.map((f) => f.replace(/\.css$/, ".min.css"));
  const list = (dir, keep) => (existsSync(`${root}${dir}`) ? readdirSync(`${root}${dir}`).filter(keep).sort() : []);
  const isCss = (f) => f.endsWith(".css") && !f.endsWith(".min.css");

  it("src/components holds the six components and `_print.css`, nothing else", () => {
    expect(list("packages/site/src/components", (f) => f.endsWith(".css"))).toEqual([...components, "_print.css"].sort());
  });

  it("index.css imports exactly those six files", () => {
    const imports = [...read("packages/site/src/index.css").matchAll(/@import url\("\.\/components\/([^"]+)"\)/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual([...components, "_print.css"].sort());
  });

  const built = existsSync(`${root}packages/site/dist/site.css`);

  it.skipIf(!built)("dist/components is exactly {search, consent, mode, lang-switch, submenu, banner}.css, plain and minified", () => {
    expect(list("packages/site/dist/components", isCss)).toEqual(components);
    expect(list("packages/site/dist/components", (f) => f.endsWith(".min.css"))).toEqual(minified);
  });

  it.skipIf(!built)("each built component starts with the layer order and has one `luz.site` block", () => {
    for (const f of components) {
      const css = existsSync(`${root}packages/site/dist/components/${f}`) ? read(`packages/site/dist/components/${f}`) : "";
      expect(css.startsWith(LAYER_ORDER), f).toBe(true);
      expect(css.match(/^@layer luz\.site \{$/gm) ?? [], f).toHaveLength(1);
    }
  });

  it("`exports` is exactly the list of spec 1.3, with no `./placeholders/*`", () => {
    expect(manifest.exports).toEqual({
      ".": "./dist/site.js",
      "./search": "./dist/search.js",
      "./consent": "./dist/consent.js",
      "./mode": "./dist/mode.js",
      "./css": "./dist/site.css",
      "./css/min": "./dist/site.min.css",
      "./print.css": "./dist/print.css",
      "./classes.json": "./dist/classes.json",
      "./custom-elements.json": "./dist/custom-elements.json",
      "./components/*": "./dist/components/*",
      "./package.json": "./package.json",
    });
  });

  it("`sideEffects` is the stylesheets and the files that define or load an element", () => {
    expect([...manifest.sideEffects].sort()).toEqual(
      ["*.css", "./dist/site.js", "./dist/site.min.js", "./dist/search.js", "./dist/search.min.js", "./dist/consent.js", "./dist/consent.min.js", "./dist/mode.js", "./dist/mode.min.js"].sort(),
    );
  });

  it("ships `dist` and the licence only, and describes its components", () => {
    expect(manifest.files).toEqual(["dist", "LICENSE"]);
    for (const word of ["search", "consent", "language", "submenu", "banner"]) expect(manifest.description.toLowerCase(), word).toContain(word);
    for (const word of ["shell", "header", "footer", "hero", "placeholder"]) expect(manifest.description.toLowerCase(), word).not.toContain(word);
  });

  it("pack-files.txt lists the six components, plain and minified, and no placeholder", () => {
    const packed = read("packages/site/pack-files.txt").split("\n").filter(Boolean);
    expect(packed.filter((f) => f.startsWith("dist/components/")).sort()).toEqual([...components, ...minified].sort().map((f) => `dist/components/${f}`));
    expect(packed.filter((f) => /placeholder/.test(f))).toEqual([]);
  });

  it("no source of site names a `luz-site-*` class or property: the page structure left in steps 4 to 11", () => {
    expect(offenders(["site"], /luz-site-/)).toEqual([]);
  });

  it("the print stylesheet hides what only works on a screen: the search, the consent band and the fallback link", () => {
    const css = read("packages/site/src/components/_print.css");
    for (const hidden of ["luz-search", "luz-consent", ".luz-search__trigger"]) expect(css, hidden).toContain(hidden);
  });
});

/* ---- (d) The placeholders are docs-only (D2, security: placeholders) ------- */

describe("the image placeholders are docs-only", () => {
  const read = (path) => readFileSync(`${root}${path}`, "utf-8");
  const dir = "apps/docs/assets/placeholders";

  it("site ships none: no source folder, no export, no build step, no file in the tarball list", () => {
    expect(existsSync(`${root}packages/site/src/placeholders`), "packages/site/src/placeholders").toBe(false);
    expect(/placeholder/.test(read("packages/site/package.json")), "package.json").toBe(false);
    expect(/placeholders/.test(read("scripts/build-site.js")), "scripts/build-site.js").toBe(false);
    expect(/placeholder/.test(read("packages/site/pack-files.txt")), "pack-files.txt").toBe(false);
    expect(existsSync(`${root}packages/site/dist/placeholders`) && readdirSync(`${root}packages/site/dist/placeholders`).length, "built site").toBeFalsy();
  });

  it("every placeholder the build promises is under apps/docs/assets/placeholders/", () => {
    const files = [];
    for (const prefix of Object.values(VARIANTS)) {
      files.push(`${prefix}.svg`);
      for (const [name, ratio] of Object.entries(RATIOS)) {
        for (const long of LONG_SIDES) {
          const [width] = sizeOf(ratio, long);
          files.push(`${prefix}-${name}-${width}.avif`, `${prefix}-${name}-${width}.webp`);
          if (JPEG_LONG_SIDES.includes(long)) files.push(`${prefix}-${name}-${width}.jpg`);
        }
      }
    }
    expect(files.filter((f) => !existsSync(`${root}${dir}/${f}`))).toEqual([]);
  });

  it("their MIT notice stays next to them: a LICENSE file in the same folder", () => {
    expect(existsSync(`${root}${dir}/LICENSE`), `${dir}/LICENSE`).toBe(true);
    const licence = existsSync(`${root}${dir}/LICENSE`) ? read(`${dir}/LICENSE`) : "";
    expect(/MIT License/.test(licence), "says MIT License").toBe(true);
    expect(/Creative Commons|SIL Open Font|Apache License|GNU/i.test(licence), "only MIT").toBe(false);
  });

  it("the script that renders them writes there, not into a package", () => {
    const script = read("scripts/build-placeholders.js");
    expect(script.includes("apps/docs/assets/placeholders"), "writes to apps/docs/assets/placeholders").toBe(true);
    expect(script.includes("packages/site"), "names no package").toBe(false);
  });

  it("no published stylesheet or package list points at them: no `url()` to a placeholder, no export", () => {
    const bad = [];
    for (const name of ["tokens", "core", "site", ...SITE_KINDS]) {
      for (const { path, text } of sources(name, [".css"])) if (/url\([^)]*placeholder/.test(text)) bad.push(path);
      const manifest = JSON.parse(read(`packages/${name}/package.json`));
      if (JSON.stringify(manifest.exports ?? {}).includes("placeholder")) bad.push(`packages/${name}/package.json exports`);
    }
    expect(bad).toEqual([]);
  });
});

/* ---- (e) core after F6: a language is a lazy file, a pattern export --------- */

describe("core after F6: the languages are published as a pattern export and their files are packed", () => {
  const read = (path) => readFileSync(`${root}${path}`, "utf-8");
  const manifest = JSON.parse(read("packages/core/package.json"));
  const packed = read("packages/core/pack-files.txt").split("\n").map((l) => l.trim());

  it('exports "./i18n/*" as "./dist/i18n-*.js", and keeps "./i18n" for the module with loadLocales()', () => {
    expect(manifest.exports["./i18n/*"]).toBe("./dist/i18n-*.js");
    expect(manifest.exports["./i18n"]).toBe("./dist/i18n.js");
  });

  it("packs dist/i18n-es.js and dist/i18n-es.min.js, and not the JSON source", () => {
    expect(packed).toContain("dist/i18n-es.js");
    expect(packed).toContain("dist/i18n-es.min.js");
    expect(packed.filter((f) => f.endsWith(".json") && f.includes("i18n"))).toEqual([]);
    expect(packed.filter((f) => f.startsWith("src/"))).toEqual([]);
  });

  it("needs no sideEffects entry: a language file has none and is reached by import() only", () => {
    expect(manifest.sideEffects.filter((f) => /i18n/.test(f))).toEqual([]);
  });

  it("the JSON sources are not in the tarball: `files` is dist and LICENSE", () => {
    expect(manifest.files).toEqual(["dist", "LICENSE"]);
  });
});

