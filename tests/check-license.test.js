/**
 * `pnpm check:license` (F7 step 1, spec f7-open-source.md): the licence gate.
 *
 * CONTRACT for the implementer, scripts/check-license.js (ES module; importing
 * it has no side effect, it runs `main()` only when it is the entry point):
 *
 *   export const ALLOWED: string[]
 *       the SPDX ids of the spec, exactly: MIT, ISC, BSD-2-Clause, BSD-3-Clause,
 *       Apache-2.0, 0BSD, BlueOak-1.0.0, Python-2.0, CC0-1.0, Unlicense, MIT-0
 *
 *   export function allowedLicence(spdx): boolean
 *       true for an allowed id; for an SPDX expression "A OR B" (parentheses
 *       allowed) when at least one side is allowed; for "A AND B" only when
 *       both are. false for anything else, and for undefined, null, "" and
 *       "UNKNOWN".
 *
 *   export function parseImporters(lockText): [{ importer, name, version }]
 *       the DIRECT dependencies of every importer of a pnpm-lock.yaml v9
 *       (dependencies, devDependencies, optionalDependencies), in file order.
 *       `version` has its peer suffix removed ("4.13.0(playwright-core@1.63.0)"
 *       -> "4.13.0"). Workspace links (`version: link:...`) are not listed.
 *
 *   export function collectDependencies(root): [{ name, version, licence, usedBy }]
 *       parseImporters(<root>/pnpm-lock.yaml), the licence read from the
 *       installed <root>/<importer>/node_modules/<name>/package.json
 *       (`license`; "UNKNOWN" when the file or the field is missing). One
 *       entry per name@version, `usedBy` the importers ("." for the root), in
 *       lock order, no duplicates. Sorted by name, then version.
 *
 *   export function checkPackages(root): string[]
 *       the problems of the published packages: every <root>/packages/<dir>/
 *       package.json that is not `private` must have "license": "MIT", a
 *       LICENSE file with exactly the text of <root>/LICENSE and no non-empty
 *       `dependencies`. Each problem is one sentence that names the package
 *       (its `name`) and says licence / LICENSE / dependencies. [] when fine.
 *
 *   export function renderReport(entries): string
 *       the markdown of dev/LICENSES.md: a "generated" notice that says the
 *       list is dev-only (nothing here ships), and a table
 *         | Name | Version | Licence | Used by |
 *         | --- | --- | --- | --- |
 *         | vite | 6.4.3 | MIT | . |
 *       one row per entry, sorted by name then version whatever the order of
 *       `entries`, `usedBy` joined by ", ", ending with a newline.
 *
 *   export function reportStatus(root): { upToDate: boolean, expected: string }
 *       expected = renderReport(collectDependencies(root)); upToDate when
 *       <root>/dev/LICENSES.md exists and equals it.
 *
 *   CLI: node scripts/check-license.js [--update] [--root <dir>]
 *       (root defaults to the repository). Exit 1, with each problem on
 *       stdout/stderr, when: a package problem, a dependency whose licence is
 *       not allowed (named with its licence), or dev/LICENSES.md out of date
 *       (the message names `dev/LICENSES.md` and `--update`). `--update`
 *       rewrites dev/LICENSES.md and exits 0, unless a package problem or a
 *       disallowed licence remains (an update never legitimises one).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(repo, "scripts/check-license.js");

async function load() {
  if (!existsSync(script)) throw new Error("scripts/check-license.js does not exist");
  return import("../scripts/check-license.js");
}

/* ---- Fixtures ----------------------------------------------------------- */

const temps = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const MIT = "MIT License\n\nCopyright (c) 2026 Somebody\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\n";

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

/**
 * A repository: LICENSE, packages, a pnpm-lock.yaml and the installed
 * package.json of each dependency. `deps`: [{ name, version, licence, importer, peer }].
 */
function fixture({ packages = { a: {} }, deps = [{ name: "vite", version: "6.4.3", licence: "MIT" }] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "luz-license-"));
  temps.push(root);
  put(root, "LICENSE", MIT);
  for (const [dir, extra] of Object.entries(packages)) {
    const { license = "MIT", licenseText = MIT, private: priv, ...fields } = extra;
    put(root, `packages/${dir}/package.json`, JSON.stringify({ name: `@x/${dir}`, version: "0.0.0", license, ...(priv ? { private: true } : {}), ...fields }, null, 2));
    if (licenseText !== null) put(root, `packages/${dir}/LICENSE`, licenseText);
  }
  const byImporter = new Map();
  for (const d of deps) {
    const importer = d.importer ?? ".";
    if (!byImporter.has(importer)) byImporter.set(importer, []);
    byImporter.get(importer).push(d);
    if (d.installed !== false) put(root, `${importer === "." ? "" : `${importer}/`}node_modules/${d.name}/package.json`, JSON.stringify({ name: d.name, version: d.version, ...(d.licence ? { license: d.licence } : {}) }));
  }
  const lock = ["lockfileVersion: '9.0'", "", "importers:", ""];
  for (const [importer, list] of byImporter) {
    lock.push(`  ${importer}:`, "    devDependencies:");
    for (const d of list) lock.push(`      ${d.name.startsWith("@") ? `'${d.name}'` : d.name}:`, "        specifier: ^1.0.0", `        version: ${d.version}${d.peer ?? ""}`);
    lock.push("");
  }
  lock.push("packages:", "", "snapshots:", "");
  put(root, "pnpm-lock.yaml", lock.join("\n"));
  return root;
}

const cli = (root, ...args) => {
  const r = spawnSync(process.execPath, [script, "--root", root, ...args], { encoding: "utf-8", cwd: root });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};

/* ---- The allowlist -------------------------------------------------------- */

describe("the allowlist", () => {
  it("is the list of the spec", async () => {
    const { ALLOWED } = await load();
    expect([...ALLOWED].sort()).toEqual(["0BSD", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "BlueOak-1.0.0", "CC0-1.0", "ISC", "MIT", "MIT-0", "Python-2.0", "Unlicense"]);
  });

  it.each(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "BlueOak-1.0.0", "Python-2.0", "CC0-1.0", "Unlicense", "MIT-0"])("allows %s", async (id) => {
    const { allowedLicence } = await load();
    expect(allowedLicence(id)).toBe(true);
  });

  it.each(["GPL-3.0", "GPL-3.0-or-later", "AGPL-3.0", "LGPL-2.1", "MPL-2.0", "CC-BY-4.0", "OFL-1.1", "UNLICENSED", "SEE LICENSE IN LICENSE.md", "UNKNOWN", "MITX"])("rejects %s", async (id) => {
    const { allowedLicence } = await load();
    expect(allowedLicence(id)).toBe(false);
  });

  it.each([undefined, null, ""])("rejects a missing licence (%j)", async (value) => {
    const { allowedLicence } = await load();
    expect(allowedLicence(value)).toBe(false);
  });
});

describe("SPDX expressions", () => {
  it.each(["(MIT OR Apache-2.0)", "MIT OR GPL-3.0", "GPL-3.0 OR MIT", "(GPL-3.0 OR (BSD-3-Clause OR LGPL-2.1))", "MIT AND ISC"])("allows %s", async (expr) => {
    const { allowedLicence } = await load();
    expect(allowedLicence(expr)).toBe(true);
  });

  it.each(["GPL-3.0 OR LGPL-2.1", "(GPL-3.0 OR AGPL-3.0)", "MIT AND GPL-3.0", "(MIT AND GPL-3.0)"])("rejects %s", async (expr) => {
    const { allowedLicence } = await load();
    expect(allowedLicence(expr)).toBe(false);
  });
});

/* ---- Dev tools accepted by name -------------------------------------------------- */

/**
 * Exports (decided with the owner, option a): `ACCEPTED_DEV`, an object keyed by package name,
 * each value `{ licence, why }`; and `acceptedDependency(entry)`, true when
 * allowedLicence(entry.licence) or ACCEPTED_DEV[entry.name].licence equals entry.licence.
 * A dev-only tool that is never published or served (RL-13 covers what ships).
 */
describe("dev tools accepted by name", () => {
  it("MPL-2.0 stays off the allowlist", async () => {
    const { allowedLicence, ALLOWED } = await load();
    expect(allowedLicence("MPL-2.0")).toBe(false);
    expect(ALLOWED).not.toContain("MPL-2.0");
  });

  it("accepts @axe-core/playwright under MPL-2.0 only, with a reason", async () => {
    const { ACCEPTED_DEV, acceptedDependency } = await load();
    expect(Object.keys(ACCEPTED_DEV)).toEqual(["@axe-core/playwright"]);
    expect(ACCEPTED_DEV["@axe-core/playwright"].licence).toBe("MPL-2.0");
    expect(ACCEPTED_DEV["@axe-core/playwright"].why.length).toBeGreaterThan(20);
    expect(acceptedDependency({ name: "@axe-core/playwright", version: "4.13.0", licence: "MPL-2.0", usedBy: ["."] })).toBe(true);
  });

  it("rejects the same name under another licence", async () => {
    const { acceptedDependency } = await load();
    for (const licence of ["GPL-3.0", "AGPL-3.0", "MPL-1.1", "UNKNOWN", "(MPL-2.0 AND GPL-3.0)", undefined]) {
      expect(acceptedDependency({ name: "@axe-core/playwright", version: "4.13.0", licence }), String(licence)).toBe(false);
    }
  });

  it("rejects another name under MPL-2.0, including look-alikes", async () => {
    const { acceptedDependency } = await load();
    for (const name of ["axe-core", "@axe-core/playwright-extra", "@axe-core/react", "playwright", "x@axe-core/playwright"]) {
      expect(acceptedDependency({ name, version: "1.0.0", licence: "MPL-2.0", usedBy: ["."] }), name).toBe(false);
    }
  });

  it("still accepts an allowed licence under any name", async () => {
    const { acceptedDependency } = await load();
    expect(acceptedDependency({ name: "vite", version: "6.4.3", licence: "MIT", usedBy: ["."] })).toBe(true);
    expect(acceptedDependency({ name: "copyleft", version: "2.0.0", licence: "GPL-3.0", usedBy: ["."] })).toBe(false);
  });
});

/* ---- The lock file ----------------------------------------------------------- */

describe("parseImporters", () => {
  const LOCK = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true

importers:

  .:
    devDependencies:
      '@axe-core/playwright':
        specifier: ^4.13.0
        version: 4.13.0(playwright-core@1.63.0)
      vite:
        specifier: ^6.4.3
        version: 6.4.3(@types/node@22.20.4)

  apps/docs:
    dependencies:
      '@luz-ds/core':
        specifier: workspace:*
        version: link:../../packages/core
      picocolors:
        specifier: ^1.0.0
        version: 1.1.1
    optionalDependencies:
      fsevents:
        specifier: ^2.3.0
        version: 2.3.3

packages:

  vite@6.4.3:
    resolution: {integrity: sha512-x}
`;

  it("lists the direct dependencies of every importer, in file order, with the peer suffix removed", async () => {
    const { parseImporters } = await load();
    expect(parseImporters(LOCK)).toEqual([
      { importer: ".", name: "@axe-core/playwright", version: "4.13.0" },
      { importer: ".", name: "vite", version: "6.4.3" },
      { importer: "apps/docs", name: "picocolors", version: "1.1.1" },
      { importer: "apps/docs", name: "fsevents", version: "2.3.3" },
    ]);
  });

  it("reads the real lock file of the repository", async () => {
    const { parseImporters } = await load();
    const entries = parseImporters(readFileSync(join(repo, "pnpm-lock.yaml"), "utf-8"));
    expect(entries.length).toBeGreaterThan(5);
    expect(entries.some((e) => e.name === "vitest" && e.importer === ".")).toBe(true);
    expect(entries.every((e) => !e.version.includes("(") && !e.version.startsWith("link:"))).toBe(true);
  });
});

describe("collectDependencies", () => {
  it("reads the licence of each installed package and merges a package used by two importers", async () => {
    const { collectDependencies } = await load();
    const root = fixture({
      deps: [
        { name: "vite", version: "6.4.3", licence: "MIT" },
        { name: "@scope/tool", version: "1.2.0", licence: "(MIT OR Apache-2.0)" },
        { name: "vite", version: "6.4.3", licence: "MIT", importer: "apps/docs" },
      ],
    });
    expect(collectDependencies(root)).toEqual([
      { name: "@scope/tool", version: "1.2.0", licence: "(MIT OR Apache-2.0)", usedBy: ["."] },
      { name: "vite", version: "6.4.3", licence: "MIT", usedBy: [".", "apps/docs"] },
    ]);
  });

  it("calls a package that is not installed, or has no licence field, UNKNOWN", async () => {
    const { collectDependencies } = await load();
    const root = fixture({
      deps: [
        { name: "ghost", version: "1.0.0", licence: "MIT", installed: false },
        { name: "nolicence", version: "1.0.0" },
      ],
    });
    expect(collectDependencies(root).map((e) => [e.name, e.licence])).toEqual([
      ["ghost", "UNKNOWN"],
      ["nolicence", "UNKNOWN"],
    ]);
  });

  it("finds an allowed licence, or an accepted dev tool, for every dependency of this repository", async () => {
    const { collectDependencies, allowedLicence, acceptedDependency } = await load();
    const entries = collectDependencies(repo);
    expect(entries.length).toBeGreaterThan(5);
    expect(entries.filter((e) => !(allowedLicence(e.licence) || acceptedDependency(e))).map((e) => `${e.name}@${e.version}: ${e.licence}`)).toEqual([]);
  });
});

/* ---- The published packages ----------------------------------------------------- */

describe("checkPackages", () => {
  it("accepts a package that is MIT, has the repository's LICENSE and no dependencies", async () => {
    const { checkPackages } = await load();
    expect(checkPackages(fixture({ packages: { a: {}, b: { dependencies: {} } } }))).toEqual([]);
  });

  it("fails a package with a dependency, naming the package", async () => {
    const { checkPackages } = await load();
    const problems = checkPackages(fixture({ packages: { a: {}, b: { dependencies: { left: "^1.0.0" } } } }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("@x/b");
    expect(problems[0]).toMatch(/dependenc/i);
  });

  it("fails a package whose licence is not MIT", async () => {
    const { checkPackages } = await load();
    const problems = checkPackages(fixture({ packages: { a: { license: "ISC" } } }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("@x/a");
    expect(problems[0]).toMatch(/licen[cs]e/i);
  });

  it("fails a package with no LICENSE file", async () => {
    const { checkPackages } = await load();
    const problems = checkPackages(fixture({ packages: { a: { licenseText: null } } }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("@x/a");
    expect(problems[0]).toMatch(/LICENSE/);
  });

  it("fails a package whose LICENSE is not the text of the repository's", async () => {
    const { checkPackages } = await load();
    const problems = checkPackages(fixture({ packages: { a: { licenseText: `${MIT}\nAnd a clause of my own.\n` } } }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("@x/a");
    expect(problems[0]).toMatch(/LICENSE/);
  });

  it.each([
    ["optionalDependencies", { left: "^1.0.0" }],
    ["bundleDependencies", ["left"]],
    ["bundledDependencies", ["left"]],
  ])("fails a package with a non-empty %s (red line 1), naming the package and the field", async (field, value) => {
    const { checkPackages } = await load();
    const problems = checkPackages(fixture({ packages: { a: {}, b: { [field]: value } } }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("@x/b");
    expect(problems[0]).toContain(field);
  });

  it.each([
    ["optionalDependencies", {}],
    ["bundleDependencies", []],
    ["bundledDependencies", []],
    ["dependencies", {}],
  ])("accepts an empty %s", async (field, value) => {
    const { checkPackages } = await load();
    expect(checkPackages(fixture({ packages: { a: { [field]: value } } }))).toEqual([]);
  });

  it("accepts peerDependencies and devDependencies (they ship nothing)", async () => {
    const { checkPackages } = await load();
    expect(checkPackages(fixture({ packages: { a: { peerDependencies: { "@luz-ds/core": "^0.1.0" }, devDependencies: { vite: "^6.0.0" } } } }))).toEqual([]);
  });

  it("does not look at a private package", async () => {
    const { checkPackages } = await load();
    expect(checkPackages(fixture({ packages: { a: {}, internal: { license: "UNLICENSED", licenseText: null, private: true, dependencies: { x: "1" } } } }))).toEqual([]);
  });

  it("finds nothing to fix in the published packages of this repository", async () => {
    const { checkPackages } = await load();
    expect(checkPackages(repo)).toEqual([]);
  });
});

/* ---- The Pages site: third-party code in docs/assets (RL-13) ------------------------- */

/**
 * Export: `checkPagesSite(root): string[]`, the problems of <root>/docs/assets: a .js file (any
 * depth) that holds the Vite module-preload polyfill (the two markers `link[rel="modulepreload"]`
 * and `MutationObserver` in one file) needs <root>/docs/LICENSE-vite.txt beside the site. Each
 * problem names the file (relative to root) and `docs/LICENSE-vite.txt`. [] when there is no
 * docs/assets, no such file, or the notice exists. The CLI prints these problems and exits 1.
 */
const POLYFILL = 'const e=document.createElement("link").relList;for(const o of document.querySelectorAll(\'link[rel="modulepreload"]\'))r(o);new MutationObserver(o=>{for(const s of o)s.type})';

/**
 * Also: a built .js file that holds Vite's `__vitePreload` helper (MIT code that stays in the
 * bundle even without the polyfill) needs the same notice. A file is reported once, whatever
 * markers it holds. The notice must be real: its text contains "MIT License" and "Vite" (or is
 * Vite's own LICENSE.md); an empty or unrelated docs/LICENSE-vite.txt is a problem that names it.
 */
const HELPER = 'const _="modulepreload",d=function(e,t,n){return Promise.all(e.map(r=>import(r)))},__vitePreload=d;export{__vitePreload as _};';
const NOTICE = "MIT License\n\nCopyright (c) 2019-present, VoidZero Inc. and Vite contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\n";

describe("checkPagesSite: the __vitePreload helper and the notice", () => {
  it("fails a built file with the helper when docs/LICENSE-vite.txt is missing, naming the file and the notice", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/index-AbC.js", HELPER);
    const problems = checkPagesSite(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("docs/assets/index-AbC.js");
    expect(problems[0]).toContain("docs/LICENSE-vite.txt");
  });

  it("is quiet when the helper has its notice beside it", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/index-AbC.js", HELPER);
    put(root, "docs/LICENSE-vite.txt", NOTICE);
    expect(checkPagesSite(root)).toEqual([]);
  });

  it("accepts Vite's own LICENSE.md as the notice", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/index-AbC.js", HELPER);
    put(root, "docs/LICENSE-vite.txt", readFileSync(join(repo, "node_modules/vite/LICENSE.md"), "utf-8"));
    expect(checkPagesSite(root)).toEqual([]);
  });

  it.each([["empty", ""], ["only white space", "  \n\n"], ["unrelated text", "Do what you like.\n"], ["MIT without Vite", "MIT License\n\nCopyright (c) someone else\n"], ["Vite without MIT", "Vite contributors\n"]])("rejects a notice that is %s, naming it", async (_label, text) => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/index-AbC.js", HELPER);
    put(root, "docs/LICENSE-vite.txt", text);
    const problems = checkPagesSite(root);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toContain("docs/LICENSE-vite.txt");
  });

  it("rejects an empty notice even when the file holds only the polyfill markers", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/site-header-AbC.js", POLYFILL);
    put(root, "docs/LICENSE-vite.txt", "");
    expect(checkPagesSite(root).join("\n")).toContain("docs/LICENSE-vite.txt");
  });

  it("reports a file that holds both the helper and the polyfill once", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/both.js", `${HELPER}${POLYFILL}`);
    expect(checkPagesSite(root)).toHaveLength(1);
  });

  it("ignores a docs/assets file that only mentions the word, in a non-.js file or without the helper name", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/notes.txt", HELPER);
    put(root, "docs/assets/own.js", "export const preload = () => {};");
    expect(checkPagesSite(root)).toEqual([]);
  });

  it("the command fails on a helper with no notice and passes once the notice is there", () => {
    const root = fixture();
    put(root, "docs/assets/index-AbC.js", HELPER);
    expect(cli(root, "--update").code).toBe(1);
    put(root, "docs/LICENSE-vite.txt", NOTICE);
    const ok = cli(root, "--update");
    expect(ok.code, ok.out).toBe(0);
  });
});

describe("checkPagesSite", () => {
  it("is quiet when there is no docs/assets, or nothing third-party in it", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    expect(checkPagesSite(root)).toEqual([]);
    put(root, "docs/assets/own-1.js", "export const a = new MutationObserver(() => {});");
    put(root, "docs/assets/own-2.js", 'document.querySelector(\'link[rel="modulepreload"]\');');
    expect(checkPagesSite(root)).toEqual([]);
  });

  it("fails a built file with the Vite polyfill when docs/LICENSE-vite.txt is missing, naming the file and the notice", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/deep/site-header-AbC.js", `import"./x.js";${POLYFILL}`);
    const problems = checkPagesSite(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("docs/assets/deep/site-header-AbC.js");
    expect(problems[0]).toContain("docs/LICENSE-vite.txt");
  });

  it("accepts the same file once docs/LICENSE-vite.txt is there", async () => {
    const { checkPagesSite } = await load();
    const root = fixture();
    put(root, "docs/assets/site-header-AbC.js", POLYFILL);
    put(root, "docs/LICENSE-vite.txt", "MIT License\n\nCopyright (c) 2019-present, VoidZero Inc. and Vite contributors\n");
    expect(checkPagesSite(root)).toEqual([]);
  });

  it("the command fails on it and names the notice; with the notice it passes", () => {
    const root = fixture();
    put(root, "docs/assets/site-header-AbC.js", POLYFILL);
    const failing = cli(root, "--update");
    expect(failing.code).toBe(1);
    expect(failing.out).toContain("docs/LICENSE-vite.txt");
    put(root, "docs/LICENSE-vite.txt", NOTICE);
    const ok = cli(root, "--update");
    expect(ok.code, ok.out).toBe(0);
  });
});

/* ---- The report ------------------------------------------------------------------ */

describe("renderReport", () => {
  const ENTRIES = [
    { name: "vite", version: "6.4.3", licence: "MIT", usedBy: [".", "apps/docs"] },
    { name: "@scope/tool", version: "1.2.0", licence: "(MIT OR Apache-2.0)", usedBy: ["."] },
  ];

  it("writes a table of name, version, licence and used by, one row per entry", async () => {
    const { renderReport } = await load();
    const text = renderReport(ENTRIES);
    expect(text).toContain("| Name | Version | Licence | Used by |");
    expect(text).toContain("| --- | --- | --- | --- |");
    expect(text).toContain("| vite | 6.4.3 | MIT | ., apps/docs |");
    expect(text).toContain("| @scope/tool | 1.2.0 | (MIT OR Apache-2.0) | . |");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("says it is generated and dev-only, so nothing in it ships", async () => {
    const { renderReport } = await load();
    const text = renderReport(ENTRIES);
    expect(text).toMatch(/generated/i);
    expect(text).toMatch(/dev(elopment)?[- ]only/i);
    expect(text).toMatch(/ship/i);
    expect(text).toContain("check:license");
  });

  it("is the same whatever the order of the entries, sorted by name", async () => {
    const { renderReport } = await load();
    const a = renderReport(ENTRIES);
    expect(renderReport([...ENTRIES].reverse())).toBe(a);
    expect(a.indexOf("@scope/tool")).toBeLessThan(a.indexOf("| vite "));
  });
});

describe("reportStatus", () => {
  it("is out of date when dev/LICENSES.md is missing, in step once written, out of date after an edit", async () => {
    const { reportStatus } = await load();
    const root = fixture();
    const missing = reportStatus(root);
    expect(missing.upToDate).toBe(false);
    expect(missing.expected).toContain("| vite | 6.4.3 | MIT | . |");
    put(root, "dev/LICENSES.md", missing.expected);
    expect(reportStatus(root).upToDate).toBe(true);
    put(root, "dev/LICENSES.md", `${missing.expected}| hand | 1.0.0 | MIT | . |\n`);
    expect(reportStatus(root).upToDate).toBe(false);
  });

  it("is out of date when a dependency is added to the lock file", async () => {
    const { reportStatus } = await load();
    const root = fixture();
    put(root, "dev/LICENSES.md", reportStatus(root).expected);
    const grown = fixture({ deps: [{ name: "vite", version: "6.4.3", licence: "MIT" }, { name: "esbuild", version: "0.25.12", licence: "MIT" }] });
    put(grown, "dev/LICENSES.md", readFileSync(join(root, "dev/LICENSES.md"), "utf-8"));
    expect(reportStatus(grown).upToDate).toBe(false);
  });

  it("dev/LICENSES.md of this repository is in step with its lock file", async () => {
    const { reportStatus } = await load();
    expect(existsSync(join(repo, "dev/LICENSES.md")), "dev/LICENSES.md exists").toBe(true);
    expect(reportStatus(repo).upToDate, "run: node scripts/check-license.js --update").toBe(true);
  });
});

/* ---- The command ------------------------------------------------------------------- */

describe("node scripts/check-license.js", () => {
  it("is the `check:license` script of package.json", () => {
    expect(JSON.parse(readFileSync(join(repo, "package.json"), "utf-8")).scripts["check:license"]).toBe("node scripts/check-license.js");
  });

  it("fails when dev/LICENSES.md is missing and says to run --update; --update writes it and the next run passes", () => {
    const root = fixture();
    const first = cli(root);
    expect(first.code).toBe(1);
    expect(first.out).toContain("dev/LICENSES.md");
    expect(first.out).toContain("--update");
    const update = cli(root, "--update");
    expect(update.code, update.out).toBe(0);
    expect(readFileSync(join(root, "dev/LICENSES.md"), "utf-8")).toContain("| vite | 6.4.3 | MIT | . |");
    const again = cli(root);
    expect(again.code, again.out).toBe(0);
  });

  it("fails on a dependency whose licence is not allowed, even after --update, and names it", () => {
    const root = fixture({ deps: [{ name: "vite", version: "6.4.3", licence: "MIT" }, { name: "copyleft", version: "2.0.0", licence: "GPL-3.0" }] });
    const update = cli(root, "--update");
    expect(update.code).toBe(1);
    expect(update.out).toContain("copyleft");
    expect(update.out).toContain("GPL-3.0");
    expect(cli(root).code).toBe(1);
  });

  it("fails on a published package with a dependency", () => {
    const root = fixture({ packages: { a: { dependencies: { left: "^1.0.0" } } } });
    const r = cli(root, "--update");
    expect(r.code).toBe(1);
    expect(r.out).toContain("@x/a");
  });

  it("passes on this repository", () => {
    const r = spawnSync(process.execPath, [script], { encoding: "utf-8", cwd: repo });
    expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
  });
});

/* ---- The data a DATA entry names carries its origin note ------------------------------ */

describe("the files of the DATA entries", () => {
  // The land is the countries of the home's globe (Natural Earth 1:110m admin-0), in globe-data.js; globe.js is code only
  const GLOBE = "apps/landing/light/globe-data.js";
  const WITHOUT = "// the globe\nexport const LAND = [[0, 0, 1, 1]];\n";
  const WITH = "// Land: Natural Earth 1:110m admin-0 countries, public domain (naturalearthdata.com terms of use)\nexport const LAND = [[0, 0, 1, 1]];\n";

  it("fails a file a DATA entry names when it lacks its origin note, and names the file", () => {
    const root = fixture();
    put(root, GLOBE, WITHOUT);
    const failing = cli(root, "--update");
    expect(failing.code, failing.out).toBe(1);
    expect(failing.out).toContain(GLOBE);
    expect(failing.out).toMatch(/Natural Earth/);
  });

  it("passes the same file once the note (the origin and the licence) is there", () => {
    const root = fixture();
    put(root, GLOBE, WITH);
    const ok = cli(root, "--update");
    expect(ok.code, ok.out).toBe(0);
  });

  it("is quiet when the file is not there at all (a repository without the home's light)", () => {
    const root = fixture();
    const ok = cli(root, "--update");
    expect(ok.code, ok.out).toBe(0);
  });

  it("fails a note that names the origin but not the licence", () => {
    const root = fixture();
    put(root, GLOBE, "// Land: Natural Earth 1:110m\nexport const LAND = [];\n");
    const failing = cli(root, "--update");
    expect(failing.code, failing.out).toBe(1);
    expect(failing.out).toContain(GLOBE);
  });

  it("no longer asks globe.js for a note: it is code, the data is in globe-data.js", () => {
    const root = fixture();
    put(root, "apps/landing/light/globe.js", WITHOUT);
    const ok = cli(root, "--update");
    expect(ok.code, ok.out).toBe(0);
  });

  it("names the 1:110m countries in globe-data.js in dev/LICENSES.md of this repository", () => {
    const line = readFileSync(join(repo, "dev/LICENSES.md"), "utf-8")
      .split("\n")
      .find((l) => /Natural Earth/.test(l));
    expect(line, "a Natural Earth line").toBeDefined();
    expect(line).toContain("Natural Earth 1:110m");
    expect(line).toMatch(/countries/i);
    expect(line).toContain("apps/landing/light/globe-data.js");
    expect(line).not.toMatch(/1:50m|land polygons|globe\.js(?!-)/);
    expect(line).toMatch(/public domain/);
  });
});
