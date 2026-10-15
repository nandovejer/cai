/**
 * F5 step 6, the "For AI agents" block of each README
 * (.claude/plans/specs/f5-ai-ready.md section 4, 4.1, 4.2, decision D9, and the
 * security-auditor's answer to Q1: conditions a, b and c).
 *
 * Contract of `scripts/ai-readme.js`:
 *
 *   exports  START, END                the two marker comments
 *            breakingChanges(changelog)  { version, versions, items }
 *            renderAiSection({ name, manifest, changelog, siteUrl })
 *            applyAiSection(readme, block)
 *   CLI      node scripts/ai-readme.js --check   exit 0 when every block is right,
 *                                                exit 1 and name each stale README
 *            node scripts/ai-readme.js --write   rewrites the blocks, and nothing else
 *   Importing the module runs nothing; only running it as the entry does.
 *
 * The pure functions are tested on strings. The CLI is tested on a temporary copy
 * of `scripts/` and a small workspace (it reads `packages/*` relative to its own
 * location, like check-size.js), so no real README is touched.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8");
const SCRIPT = "scripts/ai-readme.js";
const SITE = "https://example.test/luz/";

const START = "<!-- luz:ai-agents:start -->";
const END = "<!-- luz:ai-agents:end -->";

/* ---- Changelogs, as `changeset version` writes them -------------------- */

const FIRST_RELEASE = `# @luz-ds/core

## 0.1.0

### Minor Changes

- 1a2b3c4: First release of LUZ, formerly CAI.
`;

const FIRST_WITH_BREAKING = `# @luz-ds/core

## 0.1.0

### Minor Changes

- 1a2b3c4: Rename every class.

  Breaking: every \`.cai-*\` class is now \`.luz-*\`.
`;

const TWO_VERSIONS = `# @luz-ds/core

## 0.2.0

### Minor Changes

- 9f8e7d6: Rename the \`.luz-btn--big\` modifier to \`.luz-btn--lg\`.

  Breaking: replace \`.luz-btn--big\` with \`.luz-btn--lg\`.

  Both names are listed in the migration table.

- 0a0a0a0: A new \`.luz-badge\` component.

### Patch Changes

- 2b2b2b2: Fix the focus ring of \`.luz-tag\`.
- Updated dependencies [3c3c3c3]:
  - @luz-ds/tokens@0.2.0

## 0.1.0

### Minor Changes

- 1a2b3c4: First release of LUZ.

  Breaking: this older note must not be listed.
`;

const MAJOR = `# @luz-ds/site

## 1.0.0

### Major Changes

- 7d7d7d7: Remove \`<luz-banner>\`.

### Minor Changes

- 8e8e8e8: Add \`<luz-lang-switch>\`.

## 0.1.0

### Major Changes

- 6c6c6c6: An old major, not listed.
`;

const QUIET = `# @luz-ds/core

## 0.1.1

### Patch Changes

- 4d4d4d4: Fix a typo in a docs page.

## 0.1.0

### Minor Changes

- 1a2b3c4: First release of LUZ.
`;

/* ---- The module under test --------------------------------------------- */

let mod = null;
let loadError = null;
beforeAll(async () => {
  try {
    mod = await import(pathToFileURL(join(repo, SCRIPT)).href);
  } catch (error) {
    loadError = error;
  }
});
const lib = () => {
  expect(existsSync(join(repo, SCRIPT)), `${SCRIPT} exists`).toBe(true);
  expect(loadError, `${SCRIPT} imports without error`).toBeNull();
  return mod;
};

const manifest = (name, version, peers = {}, optional = []) => ({
  name: `@luz-ds/${name}`,
  version,
  peerDependencies: peers,
  peerDependenciesMeta: Object.fromEntries(optional.map((p) => [p, { optional: true }])),
});
const CORE = manifest("core", "0.1.0", { "@luz-ds/tokens": "^0.1.0" });
const LANDING = manifest("landing", "0.1.0", { "@luz-ds/core": "^0.1.0", "@luz-ds/site": "^0.1.0", "@luz-ds/tokens": "^0.1.0" }, ["@luz-ds/site"]);
const render = (name, man, changelog) => lib().renderAiSection({ name, manifest: man, changelog, siteUrl: SITE });

/* ---- breakingChanges: what is read from a changelog --------------------- */

describe("breakingChanges(changelog) reads the top version of a changelog", () => {
  it("has nothing to read without a changelog: no version, no items", () => {
    expect(lib().breakingChanges(null)).toEqual({ version: null, versions: 0, items: [] });
  });

  it("reads the first release: one version section, no items", () => {
    expect(lib().breakingChanges(FIRST_RELEASE)).toEqual({ version: "0.1.0", versions: 1, items: [] });
  });

  it("lists a bullet under Major Changes, without its commit hash", () => {
    const { version, versions, items } = lib().breakingChanges(MAJOR);
    expect(version).toBe("1.0.0");
    expect(versions).toBe(2);
    expect(items).toEqual(["Remove `<luz-banner>`."]);
  });

  it("lists a bullet of any section that has a paragraph starting with Breaking:, the text as written", () => {
    const { items } = lib().breakingChanges(FIRST_WITH_BREAKING);
    expect(items).toEqual(["Rename every class.\n\nBreaking: every `.cai-*` class is now `.luz-*`."]);
  });

  it("keeps a multi-line bullet whole, de-indented, and leaves the other bullets and sections out", () => {
    const { version, versions, items } = lib().breakingChanges(TWO_VERSIONS);
    expect(version).toBe("0.2.0");
    expect(versions).toBe(2);
    expect(items).toEqual([
      "Rename the `.luz-btn--big` modifier to `.luz-btn--lg`.\n\nBreaking: replace `.luz-btn--big` with `.luz-btn--lg`.\n\nBoth names are listed in the migration table.",
    ]);
  });

  it("reads the top version only: a Breaking: or a Major Changes of an older version is not listed", () => {
    const old = lib().breakingChanges(TWO_VERSIONS).items.join("\n");
    expect(old).not.toMatch(/older note/);
    expect(lib().breakingChanges(MAJOR).items.join("\n")).not.toMatch(/old major/);
  });

  it("finds no item in a top version of patches, and still counts the sections", () => {
    expect(lib().breakingChanges(QUIET)).toEqual({ version: "0.1.1", versions: 2, items: [] });
  });

  it("removes the hash from every item, never from the middle of a sentence", () => {
    const text = "# x\n\n## 2.0.0\n\n### Major Changes\n\n- abcdef0: Use `a1b2c3d` as the id.\n";
    expect(lib().breakingChanges(text).items).toEqual(["Use `a1b2c3d` as the id."]);
  });
});

/* ---- renderAiSection: the text of the block ----------------------------- */

describe("renderAiSection({ name, manifest, changelog, siteUrl })", () => {
  it("is a block between the two markers, each on a line of its own, headed 'For AI agents'", () => {
    const block = render("core", CORE, FIRST_RELEASE);
    const lines = block.trimEnd().split("\n");
    expect(lines[0]).toBe(START);
    expect(lines.at(-1)).toBe(END);
    expect(lines.filter((l) => l === START)).toHaveLength(1);
    expect(lines.filter((l) => l === END)).toHaveLength(1);
    expect(lines.find((l) => l.startsWith("#"))).toBe("## For AI agents");
  });

  it("starts with the package, its version and the beta warning, before anything else", () => {
    const block = render("core", CORE, FIRST_RELEASE);
    const first = block.split("\n").slice(1).find((l) => l.trim() !== "" && !l.startsWith("#"));
    expect(first).toMatch(/@luz-ds\/core/);
    expect(first).toMatch(/0\.1\.0/);
    expect(first).toMatch(/beta: any release may break anything/);
  });

  it("puts the breaking changes of this version right after the version, before what to read", () => {
    const block = render("core", CORE, TWO_VERSIONS);
    const heading = block.search(/^### Breaking changes/m);
    expect(heading, "a '### Breaking changes' heading").toBeGreaterThan(-1);
    expect(block.indexOf("0.1.0")).toBeLessThan(heading);
    expect(heading).toBeLessThan(block.indexOf("classes.json"));
  });

  it("states that nothing was released when there is no changelog", () => {
    const block = render("core", manifest("core", "0.0.0"), null);
    expect(block).toContain("Not released yet: 0.0.0 is the workspace's placeholder; the first release is 0.1.0. Nothing is deprecated and nothing breaks.");
  });

  it("states the first release, with the migration note, when there is one version and no breaking item", () => {
    const block = render("core", CORE, FIRST_RELEASE);
    expect(block).toContain("First release of `@luz-ds/core`. Nothing breaks inside @luz-ds. Coming from `@cai-ds/*`: see the migration note in `CHANGELOG.md`.");
  });

  it("lists the items of the top version, each item's first line as its heading", () => {
    const block = render("core", CORE, TWO_VERSIONS);
    expect(block).toMatch(/^#### Rename the `\.luz-btn--big` modifier to `\.luz-btn--lg`\.$/m);
    expect(block).toContain("Breaking: replace `.luz-btn--big` with `.luz-btn--lg`.");
    expect(block).toContain("Both names are listed in the migration table.");
    expect(block).not.toMatch(/First release of/);
    expect(block).not.toMatch(/A new `\.luz-badge` component/);
    expect(block).not.toMatch(/Fix the focus ring/);
    expect(block).not.toMatch(/older note/);
  });

  it("lists the items of a first release that has a Breaking: paragraph, instead of the first-release sentence", () => {
    const block = render("core", CORE, FIRST_WITH_BREAKING);
    expect(block).toMatch(/^#### Rename every class\.$/m);
    expect(block).toContain("Breaking: every `.cai-*` class is now `.luz-*`.");
    expect(block).not.toMatch(/First release of `@luz-ds\/core`/);
  });

  it("does not print the commit hash of an item", () => {
    const block = render("core", CORE, TWO_VERSIONS);
    expect(block).not.toMatch(/9f8e7d6/);
  });

  it("lists a Major Changes bullet of the top version as breaking", () => {
    const block = render("site", manifest("site", "1.0.0"), MAJOR);
    expect(block).toMatch(/^#### Remove `<luz-banner>`\.$/m);
    expect(block).not.toMatch(/old major/);
  });

  it("says there is no breaking change when a later version section has none", () => {
    const block = render("core", manifest("core", "0.1.1"), QUIET);
    expect(block).toContain("No breaking changes in 0.1.1.");
    expect(block).not.toMatch(/^####/m);
  });

  it("links the changelog on GitHub for older versions whenever a changelog exists", () => {
    for (const changelog of [FIRST_RELEASE, TWO_VERSIONS, QUIET]) {
      expect(render("core", CORE, changelog)).toMatch(/https:\/\/github\.com\/nandovejer\/luz\/blob\/main\/packages\/core\/CHANGELOG\.md/);
    }
  });

  it("names what to read first, with its path in the package or on the site", () => {
    const block = render("core", CORE, FIRST_RELEASE);
    expect(block).toMatch(/`dist\/classes\.json`/);
    expect(block).toMatch(/`dist\/custom-elements\.json`/);
    expect(block).toContain(`${SITE}llms.txt`);
    expect(block).toContain(`${SITE}llms-full.txt`);
    expect(block).toContain(`${SITE}examples/`);
    // in the order the spec gives: the class list first, the examples last
    expect(block.indexOf("classes.json")).toBeLessThan(block.indexOf("custom-elements.json"));
    expect(block.indexOf("custom-elements.json")).toBeLessThan(block.indexOf("llms.txt"));
    expect(block.indexOf("llms-full.txt")).toBeLessThan(block.indexOf("examples/"));
  });

  it("names custom-elements.json only for the packages that define a tag (core and site)", () => {
    expect(render("site", manifest("site", "0.1.0", { "@luz-ds/core": "^0.1.0" }), FIRST_RELEASE)).toMatch(/custom-elements\.json/);
    expect(render("landing", LANDING, FIRST_RELEASE)).not.toMatch(/custom-elements\.json/);
    expect(render("tokens", manifest("tokens", "0.1.0"), FIRST_RELEASE)).not.toMatch(/custom-elements\.json/);
  });

  it("says what a package needs loaded first, and what is optional, from its peer dependencies", () => {
    const block = render("landing", LANDING, FIRST_RELEASE);
    expect(block).toMatch(/needs[^\n]*@luz-ds\/tokens[^\n]*@luz-ds\/core[^\n]*first/);
    expect(block).toMatch(/@luz-ds\/site[^\n]*optional/);
    expect(render("core", CORE, FIRST_RELEASE)).toMatch(/needs[^\n]*@luz-ds\/tokens[^\n]*first/);
  });

  it("says how to run the check and how to copy the accessibility reviewer", () => {
    const block = render("core", CORE, FIRST_RELEASE);
    expect(block).toMatch(/npx @luz-ds\/check /);
    expect(block).toMatch(/npx @luz-ds\/check agent/);
  });

  it("states no count and nothing that needs dist/ to be built", () => {
    const block = render("core", CORE, FIRST_RELEASE);
    expect(block).not.toMatch(/\b\d+\s+(classes|components|elements|files|tokens|properties|pages)\b/i);
  });

  it("is a function of its arguments: the same input gives the same text", () => {
    expect(render("core", CORE, TWO_VERSIONS)).toBe(render("core", CORE, TWO_VERSIONS));
  });
});

/* ---- applyAiSection: the README around the block ------------------------- */

describe("applyAiSection(readme, block)", () => {
  const block = () => render("core", CORE, FIRST_RELEASE);
  const README = "# @luz-ds/core\n\nIntro.\n\n## Install\n\nText.\n\n## License\n\nMIT\n";

  it("inserts the block immediately before '## License' when the markers are absent", () => {
    const next = lib().applyAiSection(README, block());
    expect(next).toContain(`${block().trimEnd()}\n\n## License\n\nMIT\n`);
    expect(next.startsWith("# @luz-ds/core\n\nIntro.\n\n## Install\n\nText.\n\n")).toBe(true);
    expect(next.split(START)).toHaveLength(2);
  });

  it("replaces what is between the markers, and leaves every other byte alone", () => {
    const old = `# T\n\nBefore.\n\n${START}\nOLD TEXT\n${END}\n\nAfter.\n\n## License\n\nMIT\n`;
    const next = lib().applyAiSection(old, block());
    expect(next).not.toMatch(/OLD TEXT/);
    expect(next.startsWith("# T\n\nBefore.\n\n")).toBe(true);
    expect(next.endsWith("\n\nAfter.\n\n## License\n\nMIT\n")).toBe(true);
    expect(next.split(START)).toHaveLength(2);
    expect(next.split(END)).toHaveLength(2);
  });

  it("is idempotent: applying the same block twice gives the first result", () => {
    const once = lib().applyAiSection(README, block());
    expect(lib().applyAiSection(once, block())).toBe(once);
  });
});

/* ---- The script as a program, on a copy of the workspace ----------------- */

describe("node scripts/ai-readme.js", () => {
  let dir;

  const put = (path, text) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  const README = (name) => `# @luz-ds/${name}\n\nIntro of ${name}.\n\n## License\n\nMIT\n`;
  const run = (...args) => {
    expect(existsSync(join(dir, SCRIPT)), `${SCRIPT} exists`).toBe(true);
    const r = spawnSync(process.execPath, [join(dir, SCRIPT), ...args], { cwd: dir, encoding: "utf-8" });
    return { status: r.status, out: r.stdout, err: r.stderr };
  };
  /** Every file under dir, with its content. */
  const snapshot = (base = dir, out = new Map()) => {
    for (const entry of readdirSync(base)) {
      const path = join(base, entry);
      if (statSync(path).isDirectory()) snapshot(path, out);
      else out.set(relative(dir, path).split("\\").join("/"), readFileSync(path, "utf-8"));
    }
    return out;
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "luz-ai-readme-"));
    if (existsSync(join(repo, "scripts"))) cpSync(join(repo, "scripts"), join(dir, "scripts"), { recursive: true });
    put("package.json", JSON.stringify({ name: "@luz-ds/monorepo", private: true, type: "module" }));
    put("README.md", "# LUZ\n\nThe root README is not generated.\n\n## License\n\nMIT\n");
    put("packages/core/package.json", JSON.stringify(CORE));
    put("packages/core/README.md", README("core"));
    put("packages/core/CHANGELOG.md", TWO_VERSIONS);
    put("packages/core/dist/luz.css", ".luz-btn{}\n");
    put("packages/tokens/package.json", JSON.stringify(manifest("tokens", "0.0.0")));
    put("packages/tokens/README.md", README("tokens"));
    put(".changeset/a.md", '---\n"@luz-ds/core": minor\n---\n\nSomething.\n');
    put("docs/index.html", "<!doctype html>\n");
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("--write puts the block before '## License' of each package README, from its package.json and CHANGELOG.md", () => {
    const { status, err } = run("--write");
    expect(err).toBe("");
    expect(status).toBe(0);
    const core = readFileSync(join(dir, "packages/core/README.md"), "utf-8");
    expect(core).toMatch(new RegExp(`${START}\\n[\\s\\S]*${END}\\n\\n## License\\n\\nMIT\\n$`));
    expect(core).toContain("## For AI agents");
    expect(core).toMatch(/@luz-ds\/core[^\n]*0\.1\.0/);
    expect(core).toContain("Breaking: replace `.luz-btn--big` with `.luz-btn--lg`.");
    const tokens = readFileSync(join(dir, "packages/tokens/README.md"), "utf-8");
    expect(tokens).toContain("Not released yet: 0.0.0 is the workspace's placeholder");
  });

  it("--write changes nothing but packages/*/README.md: not the root README, a changelog, a changeset, dist/ or docs/", () => {
    const before = snapshot();
    expect(run("--write").status).toBe(0);
    const after = snapshot();
    const changed = [...new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path));
    expect(changed.sort()).toEqual(["packages/core/README.md", "packages/tokens/README.md"]);
    for (const path of changed) expect(path).toMatch(/^packages\/[^/]+\/README\.md$/);
  });

  it("--write keeps the rest of the README, and a second --write changes nothing", () => {
    run("--write");
    const once = snapshot();
    expect(run("--write").status).toBe(0);
    expect(snapshot()).toEqual(once);
    expect(once.get("packages/core/README.md").startsWith("# @luz-ds/core\n\nIntro of core.\n\n")).toBe(true);
  });

  it("--write replaces a block between the markers when the changelog moved on", () => {
    run("--write");
    put("packages/core/CHANGELOG.md", QUIET);
    put("packages/core/package.json", JSON.stringify(manifest("core", "0.1.1", { "@luz-ds/tokens": "^0.1.0" })));
    expect(run("--write").status).toBe(0);
    const core = readFileSync(join(dir, "packages/core/README.md"), "utf-8");
    expect(core).toContain("No breaking changes in 0.1.1.");
    expect(core).not.toMatch(/luz-btn--big/);
    expect(core.split(START)).toHaveLength(2);
  });

  it("--check exits 0 when every block is what --write would write", () => {
    run("--write");
    const { status, err } = run("--check");
    expect(err).toBe("");
    expect(status).toBe(0);
  });

  it("--check exits 1 and names the README when its block is missing", () => {
    const { status, err } = run("--check");
    expect(status).toBe(1);
    expect(err).toMatch(/packages\/core\/README\.md/);
    expect(err).toMatch(/packages\/tokens\/README\.md/);
    expect(err).toMatch(/--write/);
  });

  it("--check exits 1 when only one README block is stale, and names that one", () => {
    run("--write");
    put("packages/core/CHANGELOG.md", QUIET);
    put("packages/core/package.json", JSON.stringify(manifest("core", "0.1.1", { "@luz-ds/tokens": "^0.1.0" })));
    const { status, err } = run("--check");
    expect(status).toBe(1);
    expect(err).toMatch(/packages\/core\/README\.md/);
    expect(err).not.toMatch(/packages\/tokens\/README\.md/);
  });

  it("--check writes nothing", () => {
    const before = snapshot();
    run("--check");
    expect(snapshot()).toEqual(before);
  });

  it("without a flag, or with an unknown one, exits non-zero and writes nothing", () => {
    const before = snapshot();
    for (const args of [[], ["--fix"]]) {
      const { status, err } = run(...args);
      expect(status).not.toBe(0);
      expect(err).toMatch(/--check/);
    }
    expect(snapshot()).toEqual(before);
  });
});

/* ---- Security conditions of the review (Q1 a, b, c) ---------------------- */

describe("the script's capabilities (security-auditor Q1, condition a)", () => {
  const source = () => {
    expect(existsSync(join(repo, SCRIPT)), `${SCRIPT} exists`).toBe(true);
    return read(SCRIPT);
  };
  const specifiers = (code) => [
    ...[...code.matchAll(/(?:^|[;}\s])(?:import|export)\b[^"'();]*?\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...code.matchAll(/(?:^|[;}\s])import\s*["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...code.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
  ];

  it("imports only node: built-ins and files of this repository, never a package", () => {
    const code = source();
    const found = specifiers(code);
    expect(found.length, "it imports something").toBeGreaterThan(0);
    for (const specifier of found) {
      expect(specifier, `"${specifier}" is a node: built-in or a relative file`).toMatch(/^(node:[a-z_/]+|\.{1,2}\/[\w./-]+)$/);
      if (specifier.startsWith(".")) expect(existsSync(join(repo, "scripts", specifier)), `${specifier} exists`).toBe(true);
    }
  });

  it("has no import() with a computed argument, no require, and no eval", () => {
    const code = source();
    expect(code.match(/\bimport\s*\(/g) ?? []).toHaveLength([...code.matchAll(/\bimport\s*\(\s*["'][^"']+["']\s*\)/g)].length);
    expect(code).not.toMatch(/\brequire\s*\(/);
    expect(code).not.toMatch(/\beval\s*\(|\bnew Function\b/);
  });

  it("uses no process spawning, network, VM, worker or environment access", () => {
    const code = source();
    for (const forbidden of ["child_process", "node:net", "node:http", "node:https", "node:dns", "node:dgram", "node:tls", "node:vm", "worker_threads", "node:cluster"]) {
      expect(code, forbidden).not.toContain(forbidden);
    }
    expect(code).not.toMatch(/\bfetch\s*\(/);
    expect(code).not.toMatch(/process\.env/);
  });

  it("never deletes, renames or appends: it writes with writeFileSync only", () => {
    const code = source();
    expect(code).not.toMatch(/\b(rmSync|rmdirSync|unlinkSync|renameSync|appendFileSync|cpSync|copyFileSync|symlinkSync|chmodSync)\b/);
    expect(code).not.toMatch(/\bfs\.promises\b|\bnode:fs\/promises\b/);
  });

  it("is not a no-op: it can write a README (the writes are in a file the CLI test pins to packages/*/README.md)", () => {
    expect(source()).toMatch(/writeFileSync/);
  });
});

/* ---- The release flow (4.2; Q1 b) --------------------------------------- */

describe("the release flow runs ai-readme in the version step, without lifecycle hooks", () => {
  const pkg = JSON.parse(read("package.json"));

  it("the root package.json has a release:version script: changeset version, then ai-readme --write", () => {
    expect(pkg.scripts["release:version"]).toBe("changeset version && node scripts/ai-readme.js --write");
  });

  it("has no prerelease:version or postrelease:version script (pnpm runs those hooks; --ignore-scripts does not cover them)", () => {
    expect(pkg.scripts).not.toHaveProperty("prerelease:version");
    expect(pkg.scripts).not.toHaveProperty("postrelease:version");
  });

  it("the version job of publish.yml runs `pnpm release:version`, not `pnpm changeset version`", () => {
    const workflow = read(".github/workflows/publish.yml");
    expect(workflow).toMatch(/^\s*version:\s*pnpm release:version\s*$/m);
    expect(workflow).not.toMatch(/^\s*version:\s*pnpm changeset version/m);
  });

  it("still installs with --ignore-scripts in the job that holds the write token", () => {
    expect(read(".github/workflows/publish.yml")).toMatch(/pnpm install --frozen-lockfile --ignore-scripts/);
  });

  it(".changeset/README.md documents the Breaking: paragraph, and that a breaking change in 0.x is a minor", () => {
    const text = read(".changeset/README.md");
    expect(text).toMatch(/`Breaking:`/);
    expect(text).toMatch(/paragraph[^\n]*`Breaking:`|`Breaking:`[^\n]*paragraph/i);
    expect(text).toMatch(/\bminor\b/i);
    expect(text).toMatch(/migrate/i);
  });

  it("every changeset that bumps a package to major has a paragraph that starts with Breaking: (D9)", () => {
    const bad = [];
    for (const file of readdirSync(join(repo, ".changeset")).filter((f) => f.endsWith(".md") && f !== "README.md")) {
      const text = read(`.changeset/${file}`);
      const [, front = "", body = ""] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
      if (/:\s*major\s*$/m.test(front) && !/^Breaking:/m.test(body)) bad.push(file);
    }
    expect(bad).toEqual([]);
  });
});

/* ---- The real READMEs ---------------------------------------------------- */

describe("the READMEs of the packages", () => {
  const packages = readdirSync(join(repo, "packages")).filter((p) => existsSync(join(repo, "packages", p, "package.json")) && existsSync(join(repo, "packages", p, "README.md")));

  it("there are packages with a README to check", () => {
    expect(packages).toEqual(expect.arrayContaining(["tokens", "core", "site", "landing", "cms", "app"]));
  });

  it.each(["tokens", "core", "site", "landing", "cms", "app"])("%s has one block, between the markers, right before '## License'", (name) => {
    const text = read(`packages/${name}/README.md`);
    expect(text.split(START), "start markers").toHaveLength(2);
    expect(text.split(END), "end markers").toHaveLength(2);
    expect(text.indexOf(START)).toBeLessThan(text.indexOf(END));
    expect(text).toMatch(new RegExp(`${END}\\n\\n## License\\n`));
    expect(text).toContain("## For AI agents");
  });

  it("each block states the version of its package.json", () => {
    for (const name of packages) {
      const { version } = JSON.parse(read(`packages/${name}/package.json`));
      const text = read(`packages/${name}/README.md`);
      const inside = text.slice(text.indexOf(START), text.indexOf(END));
      expect(inside, name).toContain(version);
    }
  });

  it("the root README is not generated", () => {
    expect(read("README.md")).not.toContain(START);
  });

  it("`node scripts/ai-readme.js --check` passes on the repository, with no build needed", () => {
    expect(existsSync(join(repo, SCRIPT)), `${SCRIPT} exists`).toBe(true);
    const r = spawnSync(process.execPath, [join(repo, SCRIPT), "--check"], { cwd: repo, encoding: "utf-8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});
