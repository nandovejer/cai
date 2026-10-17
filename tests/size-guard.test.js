/**
 * The guard of scripts/check-size.js and the files it guards, for the lazy
 * chunks of @luz-ds/site (.claude/plans/specs/f3-package-model.md section 2.3,
 * 9 step 7; security requirements R1 and R2, rows SEC-CHUNK-1 and SEC-CHUNK-2):
 *   - every chunk of every package imports nothing, static or dynamic;
 *   - site.min.js has no static import, and its dynamic imports are exactly
 *     "./search.min.js", "./consent.min.js" and "./mode.min.js", each a string literal;
 *   - any import() whose argument is not a literal fails;
 *   - a bare specifier still fails (red line 1).
 * The guard runs on a copy of the repository in a temporary folder (it reads
 * ../budgets.json, ../PRINCIPLES.md and ../packages from its own location),
 * and the real built files are checked against the same rules.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  it("site.min.js has no static import and loads exactly the three chunks, each by a literal specifier", () => {
    const code = read("packages/site/dist/site.min.js");
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(dynamicTargets(code)).toEqual(["./consent.min.js", "./mode.min.js", "./search.min.js"]);
    expect(code.match(IMPORT_CALL)).toHaveLength(3);
  });

  it.each(["search", "consent", "mode"])("%s.min.js imports nothing, static or dynamic", (name) => {
    const code = read(`packages/site/dist/${name}.min.js`);
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(code.match(IMPORT_CALL)).toBeNull();
  });

  it("the sources follow: site.js names the chunks as literals, and the chunks import nothing (SEC-CHUNK-1)", () => {
    const loader = read("packages/site/src/site.js");
    expect(dynamicTargets(loader)).toEqual(["./consent.js", "./mode.js", "./search.js"]);
    expect(loader.match(IMPORT_CALL)).toHaveLength(3);
    expect(loader).not.toMatch(/import\.meta/);
    for (const name of ["search", "consent", "mode"]) {
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

  it("has a row for the mode chunk, the size of the consent one (a new row, no other ceiling raised)", () => {
    expect(budgets.find((b) => b.name === "site JS lazy chunk: mode")).toEqual({ name: "site JS lazy chunk: mode", file: "packages/site/dist/mode.min.js", ideal: 1024, max: 1536 });
    expect(principles).toMatch(/^\| `site` JS lazy chunk: `mode`[^\n]*\| 1\.5 kB \|$/m);
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

  it("appends the three AI-ready rows after the docs page row, then the docs package row (F6a), the language chunk row (F6), the mode chunk row (F1), the four rows of the home's light (F3) and nothing else", () => {
    expect(budgets).toHaveLength(BEFORE.length + 10);
    expect(budgets.at(BEFORE.length - 1).name).toBe(last);
    expect(budgets.slice(BEFORE.length + 3).map((b) => b.name)).toEqual([
      "docs CSS",
      "core JS lazy chunk: i18n-es",
      "site JS lazy chunk: mode",
      "home light controller JS",
      "home light visual: globe",
      "home light visual: city",
      "home light visual: map",
    ]);
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

  it("budgets llms.txt and llms-full.txt, each uncompressed: ideal 400 KiB, ceiling 448 KiB", () => {
    // Ideal re-fixed once on 2026-10-15 after the F5 pages (was 384 KiB); the ceiling is unchanged and never raised (RL-17).
    expect(budgets[BEFORE.length + 1]).toEqual({
      name: "llms.txt and llms-full.txt (each, uncompressed)",
      glob: "docs/**/*.txt",
      compression: "none",
      ideal: 400 * KiB,
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

  it("budgets the docs package CSS after the manifests row and before the language and light rows: ideal 2 KiB, ceiling 4 KiB, a new row and no other ceiling raised (F6a)", () => {
    // The light rows stay last (tests/home-light.test.js) and i18n-es stays right before the mode chunk, so this is the first free place.
    expect(budgets[BEFORE.length + 3]).toEqual({ name: "docs CSS", file: "packages/docs/dist/docs.min.css", ideal: 2 * KiB, max: 4 * KiB });
  });

  it("has the docs row in the PRINCIPLES.md table right after the manifests row, with the same ideal and ceiling", () => {
    expect(table[BEFORE.length + 2][0], "the row before it").toMatch(/manifests|Each manifest/i);
    const [name, floor, ideal, , ceiling] = table[BEFORE.length + 3];
    expect(name).toMatch(/^`docs` CSS/);
    expect(floor).toBe("\u2014");
    expect(ideal).toBe("\u2264 2 kB");
    expect(ceiling).toBe("4 kB");
  });

  it("repeats the rows in the PRINCIPLES.md table, in the same order, after \"Each docs page\"", () => {
    expect(table).toHaveLength(BEFORE.length + 10);
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

/* ---- The language chunks of core (F6, f6-languages.md 3, 4 and the review answers) ---- */

describe("the language chunks of core", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;
  const lines = read("PRINCIPLES.md").split("\n");
  const header = lines.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
  const table = lines
    .slice(header + 2)
    .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const KiB = 1024;
  const kib = (cell) => Math.round(parseFloat(cell.replace(/^\u2264\s*/, "")) * KiB);
  const present = (path) => {
    expect(existsSync(join(repo, path)), `${path} is built: run pnpm core:build`).toBe(true);
    return read(path);
  };

  it("budgets i18n-es as the row after the AI-ready ones, the one before the mode chunk: ideal 0.75 kB, ceiling 1 kB, fixed once and never raised (RL-17)", () => {
    // The spec's estimate was 510 B gzip for the 25 keys; x1.5 the ideal, x2 the ceiling, the proportion of table-sort
    expect(budgets.find((b) => b.name === "core JS lazy chunk: i18n-es")).toEqual({
      name: "core JS lazy chunk: i18n-es",
      file: "packages/core/dist/i18n-es.min.js",
      ideal: 768,
      max: 1024,
    });
  });

  it("repeats it in the PRINCIPLES.md table, before the mode chunk row: warns above 0.75 kB, ceiling 1 kB", () => {
    const at = table.findIndex((cells) => /^`core` JS lazy chunk: `i18n-es`/.test(cells[0]));
    const last = table[at];
    expect(at, "the i18n-es row is in the table").toBeGreaterThan(-1);
    expect(table[at + 1][0], "the row after it").toMatch(/^`site` JS lazy chunk: `mode`/);
    expect(last[1]).toBe("\u2014");
    expect(kib(last[2])).toBe(768);
    expect(kib(last[3])).toBe(768);
    expect(kib(last.at(-1))).toBe(1024);
    expect(table).toHaveLength(budgets.length);
  });

  it("keeps the ceiling of the entry at 8 kB and the entry no larger than before F6: 8,179 B gzip, under 8,192", () => {
    expect(budgets.find((b) => b.file === "packages/core/dist/luz.min.js").max).toBe(8192);
    const size = sizeOf("packages/core/dist/luz.min.js");
    expect(size).toBeLessThanOrEqual(8179);
    expect(size).toBeLessThan(8192);
  });

  it("the language file is a chunk: it imports nothing, static or dynamic, and fits its ceiling", () => {
    const code = present("packages/core/dist/i18n-es.min.js");
    expect(STATIC.test(code), "a static import or export-from").toBe(false);
    expect(code.match(IMPORT_CALL)).toBeNull();
    expect(sizeOf("packages/core/dist/i18n-es.min.js")).toBeLessThanOrEqual(1024);
  });

  it.each(["luz.min.js", "i18n.min.js"])("%s loads it by a literal specifier, and every import() in it is a literal", (name) => {
    const code = present(`packages/core/dist/${name}`);
    expect(dynamicTargets(code)).toContain("./i18n-es.min.js");
    expect(code.match(IMPORT_CALL)?.length ?? 0, "an import() whose argument is not a literal").toBe(dynamicTargets(code).length);
  });

  it("the sources follow: i18n.js names the language file as a literal, in the one file the module is", () => {
    // comments out: the explanation of a rule may say "import()" without calling it
    const source = read("packages/core/src/i18n.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(dynamicTargets(source)).toEqual(["./i18n-es.js"]);
    expect(source.match(IMPORT_CALL)).toHaveLength(1);
    expect(source).not.toMatch(/^import\b/m);
    expect(source).not.toMatch(/import\.meta/);
  });

  it("every file a minified core module loads lazily has a row of its own", () => {
    const rows = new Set(budgets.filter((b) => b.file).map((b) => b.file));
    const dist = join(repo, "packages/core/dist");
    const files = readdirSync(dist).filter((f) => f.endsWith(".min.js"));
    expect(files).toContain("i18n-es.min.js");
    for (const name of files) {
      for (const target of dynamicTargets(read(`packages/core/dist/${name}`))) {
        expect(rows.has(`packages/core/dist/${target.slice(2)}`), `${name} loads ${target}, which has no row in budgets.json`).toBe(true);
      }
    }
  });
});

/* ---- The guard on a temporary copy ------------------------------------- */

const LOADER = 'document.querySelector("luz-search")&&import("./search.min.js");document.querySelector("luz-consent")&&import("./consent.min.js");document.querySelector("luz-mode")&&import("./mode.min.js");';
const CHUNK = (tag) => `customElements.get("${tag}")||customElements.define("${tag}",class extends HTMLElement{});`;

describe("scripts/check-size.js on a copy of the repository", () => {
  let dir;

  /** A repository with the four site files; `files` overrides the content of any of them. */
  function build(files = {}) {
    const content = { "site.min.js": LOADER, "search.min.js": CHUNK("luz-search"), "consent.min.js": CHUNK("luz-consent"), "mode.min.js": CHUNK("luz-mode"), ...files };
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

  it("passes a loader that imports only its three chunks by literal specifiers, and chunks that import nothing", () => {
    const { status, output } = build();
    expect(output).not.toMatch(/✗/);
    expect(status).toBe(0);
  });

  it("fails a loader with a static import", () => {
    const { status, output } = build({ "site.min.js": `import "./search.min.js";${LOADER}` });
    expect(status).toBe(1);
    expect(output).toMatch(/site\.min\.js/);
  });

  it("fails a loader that imports a file other than the three chunks", () => {
    const { status, output } = build({ "site.min.js": `${LOADER}import("./other.min.js");` });
    expect(status).toBe(1);
    expect(output).toMatch(/other\.min\.js/);
  });

  it.each(["search", "consent", "mode"])("fails a loader that is missing the %s chunk", (missing) => {
    const loader = LOADER.split(";").filter((part) => part && !part.includes(`./${missing}.min.js`)).join(";") + ";";
    expect(loader).not.toContain(`./${missing}.min.js`);
    const { status, output } = build({ "site.min.js": loader });
    expect(status).toBe(1);
    expect(output).toContain(`${missing}.min.js`);
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

  it("fails the mode chunk with an import, as any other chunk", () => {
    const { status, output } = build({ "mode.min.js": `${CHUNK("luz-mode")}import("./x.min.js");` });
    expect(status).toBe(1);
    expect(output).toMatch(/mode\.min\.js/);
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

describe("scripts/check-size.js on a copy of the repository, with a language chunk of core", () => {
  let dir;
  const ENTRY = 'document.querySelector("th[data-luz-sort]")&&import("./table-sort.min.js");document.documentElement.lang&&import("./i18n-es.min.js");';
  const SORT = "export function initTableSort(){}";
  const LANGUAGE = 'export default{play:"Reproducir",pause:"Pausar"};';

  /** A repository with core's three files; `files` overrides any; `unbudgeted` lists files without a row. */
  function build(files = {}, unbudgeted = []) {
    const content = { "luz.min.js": ENTRY, "table-sort.min.js": SORT, "i18n-es.min.js": LANGUAGE, ...files };
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "packages/core/dist"), { recursive: true });
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    const rows = Object.keys(content)
      .filter((name) => !unbudgeted.includes(name))
      .map((name, i) => ({ name: `core JS row ${i}`, file: `packages/core/dist/${name}`, max: 2048 }));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: rows }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", ...rows.map((r) => `| ${r.name} | - | - | - | 2 kB |`)].join("\n") + "\n",
    );
    for (const [name, code] of Object.entries(content)) writeFileSync(join(dir, "packages/core/dist", name), code);
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-core-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes an entry that loads its language by a literal, and a language that is only data", () => {
    const { status, output } = build();
    expect(output).not.toMatch(/\u2717/);
    expect(status).toBe(0);
  });

  it("fails a language chunk that imports another file, dynamically", () => {
    const { status, output } = build({ "i18n-es.min.js": `import("./table-sort.min.js");${LANGUAGE}` });
    expect(status).toBe(1);
    expect(output).toMatch(/i18n-es\.min\.js/);
  });

  it("fails a language chunk with a static import, and with a re-export", () => {
    for (const code of ['import "./table-sort.min.js";', 'export * from "./table-sort.min.js";']) {
      const { status, output } = build({ "i18n-es.min.js": `${code}${LANGUAGE}` });
      expect(status, code).toBe(1);
      expect(output, code).toMatch(/i18n-es\.min\.js/);
    }
  });

  it("fails a language chunk that has no budget row, and says which", () => {
    const { status, output } = build({}, ["i18n-es.min.js"]);
    expect(status).toBe(1);
    expect(output).toMatch(/i18n-es\.min\.js[^\n]*no budget/);
  });

  it("fails a language chosen by the page: an import() built from the language is not a literal (SEC-CHUNK-1)", () => {
    const { status, output } = build({ "luz.min.js": `${ENTRY}import("./i18n-"+document.documentElement.lang+".min.js");` });
    expect(status).toBe(1);
    expect(output).toMatch(/literal/i);
  });
});


/* ---- The home's light: apps/landing/light/ (F3, SEC-CHUNK-1 and SEC-CHUNK-2) ---- */

describe("scripts/check-size.js on a copy of the repository, with the home's light", () => {
  let dir;
  const LIGHT = 'const load={globe:()=>import("./globe.js"),city:()=>import("./city.js"),map:()=>import("./map.js")};customElements.get("home-light")||customElements.define("home-light",class extends HTMLElement{});';
  const VISUAL = (tag) => `customElements.get("${tag}")||customElements.define("${tag}",class extends HTMLElement{});`;

  /** A repository with the four files of the light; `files` overrides any of them. */
  function build(files = {}) {
    const content = { "light.js": LIGHT, "globe.js": VISUAL("home-globe"), "city.js": VISUAL("home-city"), "map.js": VISUAL("home-map"), ...files };
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "apps/landing/light"), { recursive: true });
    mkdirSync(join(dir, "packages"), { recursive: true }); // check-size reads the packages of the repository: none here
    cpSync(join(repo, "scripts/check-size.js"), join(dir, "scripts/check-size.js"));
    const rows = Object.keys(content).map((name, i) => ({ name: `home light row ${i}`, file: `apps/landing/light/${name}`, max: 2048 }));
    writeFileSync(join(dir, "budgets.json"), JSON.stringify({ budgets: rows }));
    writeFileSync(
      join(dir, "PRINCIPLES.md"),
      ["| Artifact | Warns below | Ideal | Warns above | Ceiling |", "| --- | --- | --- | --- | --- |", ...rows.map((r) => `| ${r.name} | - | - | - | 2 kB |`)].join("\n") + "\n",
    );
    for (const [name, code] of Object.entries(content)) writeFileSync(join(dir, "apps/landing/light", name), code);
    const run = spawnSync(process.execPath, [join(dir, "scripts/check-size.js")], { encoding: "utf-8" });
    return { status: run.status, output: run.stdout + run.stderr };
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-size-guard-light-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes a loader that imports only globe.js, city.js and map.js by literals, and visuals that import nothing", () => {
    const { status, output } = build();
    expect(output).not.toMatch(/✗/);
    expect(status).toBe(0);
  });

  it("fails light.js with an import() of another file", () => {
    const { status, output } = build({ "light.js": `${LIGHT}import("./other.js");`, "other.js": VISUAL("home-other") }); // budgeted, so only SEC-CHUNK-1 can object
    expect(status).toBe(1);
    expect(output).toContain("other.js");
  });

  it("fails light.js with a static import", () => {
    const { status, output } = build({ "light.js": `import "./globe.js";${LIGHT}` }); // globe.js is budgeted, so only SEC-CHUNK-2 can object
    expect(status).toBe(1);
    expect(output).toMatch(/light\.js/);
  });

  it.each([
    ["a variable", `${LIGHT}import(location.hash.slice(1));`],
    ["a concatenation", `${LIGHT}import("./"+document.title+".js");`],
    ["a template literal with a value", `${LIGHT}import(\`./\${document.title}.js\`);`],
  ])("fails an import() in light.js whose argument is %s, and says it is not a literal", (_, code) => {
    const { status, output } = build({ "light.js": code });
    expect(status).toBe(1);
    expect(output).toMatch(/literal/i);
  });

  it.each(["globe", "city", "map"])("fails a light.js that does not load %s.js", (missing) => {
    const loader = LIGHT.replace(new RegExp(`,?${missing}:\\(\\)=>import\\("\\./${missing}\\.js"\\)`), "");
    expect(loader).not.toContain(`./${missing}.js`);
    const { status, output } = build({ "light.js": loader });
    expect(status).toBe(1);
    expect(output).toContain(`${missing}.js`);
  });

  it.each([
    ["a static import", 'import "./x.js";'],
    ["a dynamic import", 'import("./city.js");'],
    ["a re-export", 'export * from "./x.js";'],
  ])("fails a visual with %s", (_, code) => {
    // x.js has a budget row, so only SEC-CHUNK-2 can object
    const { status, output } = build({ "globe.js": `${VISUAL("home-globe")}${code}`, "x.js": VISUAL("home-x") });
    expect(status).toBe(1);
    expect(output).toMatch(/globe\.js/);
  });

  it("fails a visual that imports a bare specifier (red line 1)", () => {
    const { status, output } = build({ "map.js": `import "lit";${VISUAL("home-map")}` });
    expect(status).toBe(1);
    expect(output).toMatch(/map\.js/);
  });
});
