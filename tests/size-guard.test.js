/**
 * The guard of scripts/check-size.js and the files it guards, for the lazy
 * chunks of @luz-ds/site (.claude/plans/specs/f3-package-model.md section 2.3,
 * 9 step 7; security requirements R1 and R2, rows SEC-CHUNK-1 and SEC-CHUNK-2):
 *   - every chunk of every package imports nothing, static or dynamic;
 *   - site.min.js has no static import, and its dynamic imports are exactly
 *     "./search.min.js" and "./consent.min.js", each a string literal;
 *   - any import() whose argument is not a literal fails;
 *   - a bare specifier still fails (red line 1).
 * The guard runs on a copy of the repository in a temporary folder (it reads
 * ../budgets.json, ../PRINCIPLES.md and ../packages from its own location),
 * and the real built files are checked against the same rules.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8");

/* ---- The real files ---------------------------------------------------- */

const IMPORT_CALL = /\bimport\s*\(/g;
const LITERAL_IMPORT = /\bimport\s*\(\s*(["'])(\.\/[\w.-]+\.js)\1\s*\)/g;
/** Static imports and re-exports, `import "x"`, `import x from "x"`, `export … from "x"`. */
const STATIC = /(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/;

const dynamicTargets = (code) => [...code.matchAll(LITERAL_IMPORT)].map((m) => m[2]).sort();
const sizeOf = (path) => gzipSync(readFileSync(join(repo, path)), { level: 9 }).length;

describe("the built site files", () => {
  it("site.min.js has no static import and loads exactly the two chunks, each by a literal specifier", () => {
    const code = read("packages/site/dist/site.min.js");
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(dynamicTargets(code)).toEqual(["./consent.min.js", "./search.min.js"]);
    expect(code.match(IMPORT_CALL)).toHaveLength(2);
  });

  it.each(["search", "consent"])("%s.min.js imports nothing, static or dynamic", (name) => {
    const code = read(`packages/site/dist/${name}.min.js`);
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(code.match(IMPORT_CALL)).toBeNull();
  });

  it("the sources follow: site.js names the chunks as literals, and the chunks import nothing (SEC-CHUNK-1)", () => {
    const loader = read("packages/site/src/site.js");
    expect(dynamicTargets(loader)).toEqual(["./consent.js", "./search.js"]);
    expect(loader.match(IMPORT_CALL)).toHaveLength(2);
    expect(loader).not.toMatch(/import\.meta/);
    for (const name of ["search", "consent"]) {
      const source = read(`packages/site/src/${name}.js`);
      expect(STATIC.test(source), `${name}.js static import`).toBe(false);
      expect(source.match(IMPORT_CALL), `${name}.js dynamic import`).toBeNull();
    }
  });

  it("the entry is much smaller than before (it no longer bundles the search), and the search chunk fits its ceiling", () => {
    expect(sizeOf("packages/site/dist/site.min.js")).toBeLessThanOrEqual(1024);
    expect(sizeOf("packages/site/dist/search.min.js")).toBeLessThanOrEqual(2560);
  });
});

/* ---- The budgets ------------------------------------------------------- */

describe("budgets.json and PRINCIPLES.md section 8", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const principles = read("PRINCIPLES.md");

  it("has a row for the search chunk, with a ceiling of 2.5 kB", () => {
    expect(budgets.find((b) => b.name === "site JS lazy chunk: search")).toMatchObject({ file: "packages/site/dist/search.min.js", ideal: 2048, max: 2560 });
    expect(principles).toMatch(/^\| `site` JS lazy chunk: `search`[^\n]*\| 2\.5 kB \|$/m);
  });

  it("calls the consent file a lazy chunk, with the same file and ceiling", () => {
    expect(budgets.find((b) => b.name.startsWith("site JS lazy chunk: consent"))).toMatchObject({ file: "packages/site/dist/consent.min.js", ideal: 1024, max: 1536 });
    expect(principles).toMatch(/^\| `site` JS lazy chunk: `consent`[^\n]*\| 1\.5 kB \|$/m);
  });

  it("keeps the site entry row, with its ceiling of 2 kB unchanged", () => {
    expect(budgets.find((b) => b.name === "site JS")).toMatchObject({ file: "packages/site/dist/site.min.js", ideal: 1024, max: 2048 });
  });

  it("keeps the budgets and the PRINCIPLES table in step, as check-size does", () => {
    const run = spawnSync(process.execPath, [join(repo, "scripts/check-size.js")], { encoding: "utf-8" });
    expect(run.stderr).not.toMatch(/PRINCIPLES\.md budget table/);
  });
});

/* ---- The rows F5 adds (.claude/plans/specs/f5-ai-ready.md section 9) ---- */

describe("the AI-ready rows of budgets.json and PRINCIPLES.md section 8", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const principles = read("PRINCIPLES.md").split("\n");
  const KiB = 1024;
  const header = principles.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
  const table = principles
    .slice(header + 2)
    .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const last = "docs page HTML (each, uncompressed)";

  /** The ceilings committed before F5: RL-17, never raised, never removed. */
  const BEFORE = [
    ["tokens CSS", 5 * KiB],
    ["core CSS", 15 * KiB],
    ["core classless CSS (a file of its own)", 3 * KiB],
    ["core JS (entry, lazy chunks excluded)", 8 * KiB],
    ["core JS lazy chunk: midi", 4 * KiB],
    ["core JS lazy chunk: table-sort", 2 * KiB],
    ["core JS lazy chunk: timeline", 3 * KiB],
    ["site CSS", 4 * KiB],
    ["site JS", 2 * KiB],
    ["site JS lazy chunk: search", 2.5 * KiB],
    ["site JS lazy chunk: consent", 1.5 * KiB],
    ["landing CSS", 2 * KiB],
    ["cms CSS", 4 * KiB],
    ["app CSS", 2 * KiB],
    [last, 80 * KiB],
  ];

  it("keeps the ceiling of every row that existed, and its place at the top of the list", () => {
    expect(budgets.slice(0, BEFORE.length).map((b) => [b.name, b.max])).toEqual(BEFORE);
  });

  it("appends exactly three rows after the docs page row", () => {
    expect(budgets).toHaveLength(BEFORE.length + 3);
    expect(budgets.at(BEFORE.length - 1).name).toBe(last);
  });

  it("budgets the check CLI bundle, gzipped: ideal 36 KiB, ceiling 40 KiB", () => {
    // Fixed once on 2026-10-15 from the measured 33,899 B; never raised afterwards (RL-17).
    // The row was created from an estimate (16 / 24 KiB) before it ever shipped; no released ceiling moved.
    expect(budgets[BEFORE.length]).toEqual({
      name: "check CLI (packages/check/dist/luz-check.js)",
      file: "packages/check/dist/luz-check.js",
      ideal: 36 * KiB,
      max: 40 * KiB,
    });
  });

  it("budgets llms.txt and llms-full.txt, each uncompressed: ideal 384 KiB, ceiling 448 KiB", () => {
    expect(budgets[BEFORE.length + 1]).toEqual({
      name: "llms.txt and llms-full.txt (each, uncompressed)",
      glob: "docs/**/*.txt",
      compression: "none",
      ideal: 384 * KiB,
      max: 448 * KiB,
    });
  });

  it("budgets the manifests on Pages, each uncompressed: ideal 48 KiB, ceiling 64 KiB", () => {
    expect(budgets[BEFORE.length + 2]).toEqual({
      name: "manifests (each, uncompressed)",
      glob: "docs/manifests/**/*.json",
      compression: "none",
      ideal: 48 * KiB,
      max: 64 * KiB,
    });
  });

  it("repeats the three rows in the PRINCIPLES.md table, in the same order, after \"Each docs page\"", () => {
    expect(table).toHaveLength(BEFORE.length + 3);
    expect(table[BEFORE.length - 1][0]).toMatch(/^Each docs page/);
    const [cli, text, manifests] = table.slice(BEFORE.length);
    expect(cli[0]).toMatch(/check/);
    expect(cli[0]).toMatch(/luz-check\.js/);
    expect(text[0]).toMatch(/llms\.txt/);
    expect(text[0]).toMatch(/llms-full\.txt/);
    expect(manifests[0]).toMatch(/manifests/i);
  });

  it("states in the table the same ceilings and ideals as budgets.json (the units are the table's own)", () => {
    const kib = (cell) => Math.round(parseFloat(cell) * KiB);
    const rows = table.slice(BEFORE.length);
    expect(rows.map((cells) => kib(cells.at(-1)))).toEqual(budgets.slice(BEFORE.length).map((b) => b.max));
    // column 2 is the ideal ("≤ 36 kB"), column 3 where the warning starts
    expect(rows.map((cells) => kib(cells[2].replace(/^≤\s*/, "")))).toEqual(budgets.slice(BEFORE.length).map((b) => b.ideal));
  });
});

/* ---- The guard on a temporary copy ------------------------------------- */

const LOADER = 'document.querySelector("luz-search")&&import("./search.min.js");document.querySelector("luz-consent")&&import("./consent.min.js");';
const CHUNK = (tag) => `customElements.get("${tag}")||customElements.define("${tag}",class extends HTMLElement{});`;

describe("scripts/check-size.js on a copy of the repository", () => {
  let dir;

  /** A repository with the three site files; `files` overrides the content of any of them. */
  function build(files = {}) {
    const content = { "site.min.js": LOADER, "search.min.js": CHUNK("luz-search"), "consent.min.js": CHUNK("luz-consent"), ...files };
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "packages/site/dist"), { recursive: true });
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    const rows = Object.keys(content).map((name, i) => ({ name: `site JS row ${i}`, file: `packages/site/dist/${name}`, max: 2048 }));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: rows }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", ...rows.map((r) => `| ${r.name} | - | - | - | 2 kB |`)].join("\n") + "\n",
    );
    for (const [name, code] of Object.entries(content)) writeFileSync(join(dir, "packages/site/dist", name), code);
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes a loader that imports only its two chunks by literal specifiers, and chunks that import nothing", () => {
    const { status, output } = build();
    expect(output).not.toMatch(/✗/);
    expect(status).toBe(0);
  });

  it("fails a loader with a static import", () => {
    const { status, output } = build({ "site.min.js": `import "./search.min.js";${LOADER}` });
    expect(status).toBe(1);
    expect(output).toMatch(/site\.min\.js/);
  });

  it("fails a loader that imports a file other than the two chunks", () => {
    const { status, output } = build({ "site.min.js": `${LOADER}import("./other.min.js");` });
    expect(status).toBe(1);
    expect(output).toMatch(/other\.min\.js/);
  });

  it("fails a loader that is missing one of the two chunks", () => {
    const { status, output } = build({ "site.min.js": 'document.querySelector("luz-search")&&import("./search.min.js");' });
    expect(status).toBe(1);
    expect(output).toMatch(/consent\.min\.js/);
  });

  it.each([
    ["a variable", `${LOADER}import(location.hash.slice(1));`],
    ["a concatenation", `${LOADER}import("./"+document.title+".min.js");`],
    ["a template literal with a value", `${LOADER}import(\`./\${document.title}.min.js\`);`],
  ])("fails an import() whose argument is %s, and says it is not a literal", (_, code) => {
    const { status, output } = build({ "site.min.js": code });
    expect(status).toBe(1);
    expect(output).toMatch(/literal/i);
  });

  it.each([
    ["a static import", 'import "./x.min.js";'],
    ["a dynamic import", 'import("./consent.min.js");'],
    ["a re-export", 'export * from "./x.min.js";'],
  ])("fails a chunk with %s", (_, code) => {
    const { status, output } = build({ "search.min.js": `${CHUNK("luz-search")}${code}` });
    expect(status).toBe(1);
    expect(output).toMatch(/search\.min\.js/);
  });

  it("still fails a bare specifier in a chunk (red line 1)", () => {
    const { status, output } = build({ "consent.min.js": `import "lit";${CHUNK("luz-consent")}` });
    expect(status).toBe(1);
    expect(output).toMatch(/"lit"/);
  });

  it("the copy reads its own files, not the repository's", () => {
    build();
    expect(existsSync(join(dir, "packages/site/dist/site.min.js"))).toBe(true);
  });
});
