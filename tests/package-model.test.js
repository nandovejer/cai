/**
 * F3, the package model (.claude/plans/specs/f3-package-model.md, §3.1, §5, §9 step 1).
 * The sources are read as text; no browser, no build.
 *
 *   (a) layering: a lower package never names a higher one
 *   (b) names: no block is shipped by two packages
 *   (c) peers: a kind of site takes site as an optional peer
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SITE_KINDS } from "../scripts/luz-packages.js";
import { blocksOfCss } from "./helpers/css-blocks.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const SITE_TAGS = ["search", "consent", "lang-switch", "submenu", "banner"];

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
    expect(offenders(["tokens", "core"], /luz-(?:site|landing|cms|app)-/)).toEqual([]);
    expect(offenders(["tokens", "core"], tags)).toEqual([]);
  });

  it("site names no kind of site", () => {
    expect(offenders(["site"], /luz-(?:landing|cms|app)-/)).toEqual([]);
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
