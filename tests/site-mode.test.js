/**
 * <luz-mode> of @luz-ds/site, the parts that need no browser
 * (.claude/plans/luz-home-docs-identity.md section 3.3, F1; the behaviour is
 * in tests/site-mode.spec.js):
 *   - the phase of the day, from the local hour: the boundaries are 5, 7.5,
 *     12, 17.5, 20.5 and 22.5;
 *   - mode.js is a lazy chunk like search.js and consent.js: it imports
 *     nothing (SEC-CHUNK-2), site.js loads it by a literal specifier
 *     (SEC-CHUNK-1), scripts/build-site.js and scripts/check-size.js know it;
 *   - its row in budgets.json and in the table of PRINCIPLES.md section 8,
 *     the same size as consent's, and no other site row moves;
 *   - its header comment feeds custom-elements.json (@element, @attr, @fires).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(repo, rel), "utf-8");
const MODE = "packages/site/src/mode.js";
/** The text of mode.js; a missing file is the assertion that fails, not an ENOENT. */
const readMode = () => {
  expect(existsSync(join(repo, MODE)), `${MODE} exists`).toBe(true);
  return read(MODE);
};

/**
 * mode.js, loaded in Node: the chunk guards `customElements`, as search.js and consent.js do.
 * The `class extends HTMLElement` sits inside that guard too (as consent.js does), not only
 * the `define` call: Node has no HTMLElement.
 */
async function load() {
  expect(existsSync(join(repo, MODE)), `${MODE} exists`).toBe(true);
  return import("../packages/site/src/mode.js");
}

/* ---- The phase of the day ------------------------------------------------ */

describe("phaseOf(hour): the phase from the local wall-clock hour (minutes as a fraction)", () => {
  // [hour, phase]: each side of every boundary of the spec
  const CASES = [
    [0, "night"],
    [0.5, "night"],
    [4, "night"],
    [4.99, "night"],
    [5, "dawn"],
    [6.25, "dawn"],
    [7.49, "dawn"],
    [7.5, "morning"],
    [9.5, "morning"],
    [11.99, "morning"],
    [12, "afternoon"],
    [14, "afternoon"],
    [17.49, "afternoon"],
    [17.5, "sunset"],
    [19, "sunset"],
    [20.49, "sunset"],
    [20.5, "dusk"],
    [21.25, "dusk"],
    [22.49, "dusk"],
    [22.5, "night"],
    [23.75, "night"],
    [23.99, "night"],
    [24, "night"],
  ];

  it.each(CASES)("%s -> %s", async (hour, phase) => {
    const { phaseOf } = await load();
    expect(typeof phaseOf, "phaseOf is a named export of mode.js").toBe("function");
    expect(phaseOf(hour)).toBe(phase);
  });

  it("can be imported where there is no DOM: the class is built behind the guard, not only the define call", async () => {
    expect(typeof globalThis.HTMLElement, "this suite runs in Node").toBe("undefined");
    const mod = await load();
    expect(Object.keys(mod)).toContain("phaseOf");
  });

  it("answers with the six phases and no other word", async () => {
    const { phaseOf } = await load();
    const seen = new Set();
    for (let minute = 0; minute < 24 * 60; minute++) seen.add(phaseOf(minute / 60));
    expect([...seen].sort()).toEqual(["afternoon", "dawn", "dusk", "morning", "night", "sunset"]);
  });

  it("turns at the minute, not before: 04:59 is night, 05:00 is dawn", async () => {
    const { phaseOf } = await load();
    expect(phaseOf(4 + 59 / 60)).toBe("night");
    expect(phaseOf(5 + 0 / 60)).toBe("dawn");
    expect(phaseOf(7 + 30 / 60)).toBe("morning");
    expect(phaseOf(22 + 30 / 60)).toBe("night");
  });
});

/* ---- The chunk follows the rules of the other two -------------------------- */

const IMPORT_CALL = /\bimport\s*\(/g;
const LITERAL_IMPORT = /\bimport\s*\(\s*(["'])(\.\/[\w.-]+\.js)\1\s*\)/g;
const STATIC = /(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/;
/** JS without its comments: a header may say "import" in words. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

describe("mode.js is a lazy chunk that imports nothing", () => {
  it("has no static import or export-from, and no import() (SEC-CHUNK-2)", () => {
    const source = code(readMode());
    expect(STATIC.test(source), "a static import or export-from").toBe(false);
    expect(source.match(IMPORT_CALL), "a dynamic import").toBeNull();
    expect(source).not.toMatch(/import\.meta/);
  });

  it("defines <luz-mode> behind a guard, so a second copy of the module does not throw", () => {
    const source = code(readMode());
    expect(source).toMatch(/customElements\.define\(\s*["']luz-mode["']/);
    expect(source).toMatch(/customElements\.get\(\s*["']luz-mode["']\s*\)/);
  });

  it("writes no text of its own: its labels are the radios' (SR-7)", () => {
    const source = code(readMode());
    expect(source).not.toMatch(/\.(?:textContent|innerText|innerHTML|outerHTML)\s*=/);
    expect(source).not.toMatch(/insertAdjacentHTML|document\.write/);
  });

  it("stores under core's key, `luz-theme`, and nowhere else", () => {
    const source = code(readMode());
    expect(source).toMatch(/["']luz-theme["']/);
    expect(source).not.toMatch(/luz-site-mode/);
  });
});

describe("site.js, the build and the size guard know the chunk", () => {
  it("site.js loads it by a literal import(\"./mode.js\"), for the tag luz-mode", () => {
    const loader = read("packages/site/src/site.js");
    expect([...loader.matchAll(LITERAL_IMPORT)].map((m) => m[2]).sort()).toContain("./mode.js");
    expect(loader).toMatch(/["']luz-mode["']\s*:\s*\(\)\s*=>\s*import\(\s*["']\.\/mode\.js["']\s*\)/);
    expect(code(loader).match(IMPORT_CALL)).toHaveLength(3);
  });

  it("scripts/build-site.js lists mode.js among the chunks", () => {
    const build = read("scripts/build-site.js");
    const chunks = /chunks:\s*\[([^\]]*)\]/.exec(build)?.[1] ?? "";
    expect([...chunks.matchAll(/["']([\w.-]+\.js)["']/g)].map((m) => m[1])).toEqual(["search.js", "consent.js", "mode.js"]);
  });

  it("scripts/check-size.js expects the third chunk of the loader", () => {
    const guard = read("scripts/check-size.js");
    const loaders = /const LOADERS = \{([^;]*)\};/.exec(guard)?.[1] ?? "";
    expect(loaders).toContain("./mode.min.js");
    expect(loaders).toContain("./search.min.js");
    expect(loaders).toContain("./consent.min.js");
  });

  it("package.json exports it as ./mode and lists its files as side effects", () => {
    const manifest = JSON.parse(read("packages/site/package.json"));
    expect(manifest.exports["./mode"]).toBe("./dist/mode.js");
    expect(manifest.sideEffects).toEqual(expect.arrayContaining(["./dist/mode.js", "./dist/mode.min.js"]));
  });

  it("has a stylesheet of its own, imported by the package index, in the luz.site layer's component list", () => {
    expect(existsSync(join(repo, "packages/site/src/components/mode.css")), "components/mode.css").toBe(true);
    expect(read("packages/site/src/components/mode.css")).toMatch(/(?<![.\w#-])luz-mode(?![\w-])/);
    expect(read("packages/site/src/index.css")).toMatch(/@import url\("\.\/components\/mode\.css"\)/);
  });

  it("scripts/smoke-consumer.js probes dist/mode.js for its phaseOf() export, as it does for consent's getConsent()", () => {
    const smoke = read("scripts/smoke-consumer.js");
    expect(smoke).toMatch(/\[site \+ "\/dist\/mode\.js"\]:\s*\[\s*"phaseOf"\s*\]/);
    expect(smoke).toMatch(/\[site \+ "\/dist\/consent\.js"\]:\s*\[\s*"getConsent"\s*\]/);
  });

  it("scripts/docs-site/snippets.js lists the chunk and says when a page needs it", () => {
    const snippets = read("scripts/docs-site/snippets.js");
    expect(snippets).toContain("mode.min.js");
    expect(snippets).toMatch(/["']mode\.min\.js["']\s*:\s*\[\s*["']site["']\s*,\s*["'][^"']*luz-mode/);
  });
});

/* ---- The budget ------------------------------------------------------------- */

describe("the budget of the mode chunk", () => {
  const budgets = JSON.parse(read("budgets.json")).budgets;

  it("has the row `site JS lazy chunk: mode`: dist/mode.min.js, ideal 1 kB, ceiling 1.5 kB", () => {
    expect(budgets.find((b) => b.name === "site JS lazy chunk: mode")).toEqual({
      name: "site JS lazy chunk: mode",
      file: "packages/site/dist/mode.min.js",
      ideal: 1024,
      max: 1536,
    });
  });

  it("leaves the other site rows as they were (a new row, never a raised ceiling)", () => {
    const site = budgets.filter((b) => /^site /.test(b.name) && b.name !== "site JS lazy chunk: mode");
    expect(site).toEqual([
      { name: "site CSS", file: "packages/site/dist/site.min.css", ideal: 2048, max: 4096 },
      { name: "site JS", file: "packages/site/dist/site.min.js", ideal: 1024, max: 2048 },
      { name: "site JS lazy chunk: search", file: "packages/site/dist/search.min.js", ideal: 2048, max: 2560 },
      { name: "site JS lazy chunk: consent", file: "packages/site/dist/consent.min.js", ideal: 1024, max: 1536 },
    ]);
  });

  it("repeats the row in the table of PRINCIPLES.md section 8, with the ceiling of 1.5 kB", () => {
    expect(read("PRINCIPLES.md")).toMatch(/^\| `site` JS lazy chunk: `mode`[^\n]*\| ≤ 1 kB \| 1 kB \| 1\.5 kB \|$/m);
  });
});

/* ---- The header comment: custom-elements.json is made from it ----------------- */

describe("the header of mode.js", () => {
  const header = () => /^\s*\/\*\*([\s\S]*?)\*\//.exec(readMode())?.[1] ?? "";
  const lines = () => header().split("\n").map((l) => l.replace(/^[\s*]*/, "").trimEnd());

  it("declares the element: @element luz-mode - description", () => {
    const element = lines().filter((l) => l.startsWith("@element"));
    expect(element).toHaveLength(1);
    expect(element[0]).toMatch(/^@element\s+luz-mode\s+-\s+\S.{10,}/);
  });

  it("declares the event: @fires luz-mode:change {CustomEvent} - description", () => {
    const fires = lines().filter((l) => l.startsWith("@fires"));
    expect(fires).toHaveLength(1);
    expect(fires[0]).toMatch(/^@fires\s+luz-mode:change\s+\{[^}]+\}\s+-\s+\S/);
  });

  it("declares its four attributes with @attr: remember, by, for and light-attr", () => {
    const names = lines()
      .filter((l) => /^@attr(ibute)?\b/.test(l))
      .map((l) => /^@attr(?:ibute)?\s+\{[^}]+\}\s+(?:\[([\w-]+)=[^\]]*\]|([\w-]+))\s+-\s+\S/.exec(l))
      .map((m) => m?.[1] ?? m?.[2]);
    expect(names.sort()).toEqual(["by", "for", "light-attr", "remember"]);
  });

  it("dispatches the event it declares, with that name, bubbling", () => {
    const source = code(readMode());
    expect(source).toMatch(/new\s+CustomEvent\(\s*["']luz-mode:change["']/);
    expect(source).toMatch(/bubbles:\s*true/);
  });
});
