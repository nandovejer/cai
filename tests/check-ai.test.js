/**
 * F5 step 14, the drift gate of the files for agents
 * (.claude/plans/specs/f5-ai-ready.md section 3, RL-19; section 10 row 14).
 *
 * RL-19: what an agent reads is generated from what a person reads. The gate
 * has three layers; this file pins the third, the one that does not exist yet:
 *
 *   node scripts/check-ai.js        (`pnpm check:ai`, after `pnpm build`)
 *
 *   It reads the repository it sits in (the folder above its own `scripts/`,
 *   whatever the working directory), writes nothing in it, leaves no temporary
 *   folder behind, opens no connection, and compares bytes:
 *
 *     1. `classes.json` of every package, and `custom-elements.json` of core
 *        and site, regenerated from the CSS and JS of `packages/<p>/dist`
 *        (scripts/ai-manifests.js) against the files beside them;
 *     2. `docs/llms.txt`, `docs/llms-full.txt`, every `docs/examples/<area>/
 *        <slug>.html` and every `docs/manifests/<pkg>/*.json` against what
 *        scripts/docs-site/ai.js renders from `apps/docs` (SITE_URL, PAGES_CSP
 *        and the versions of the packages, as the pages build uses them) and
 *        against the manifests of the packages;
 *     3. `node scripts/ai-readme.js --check` (the "For AI agents" block of
 *        each README);
 *     4. the snapshot `tests/fixtures/check/agent.md` against the agent
 *        `@luz-ds/check` builds.
 *
 *   Exit 0 and a line that starts with ✓ on stdout when all is as generated.
 *   Exit 1 otherwise, and on stderr one line per stale file that names it by
 *   its path from the repository root, with `/`, and a line that says what to
 *   run (`pnpm build`, `pnpm pages:build`). Every stale file is listed, not
 *   the first one. A package that is not built is exit 1 naming
 *   `packages/<p>/dist` and `pnpm build`, never a stack trace.
 *
 * The behaviour runs on a copy of the repository in a temporary folder: the
 * script reads its root from its own location (like check-generated.js and
 * check-size.js). The copy is made right by writing, with the repository's own
 * generators, what the pages build would have written, so each case differs
 * from a passing workspace by exactly one change.
 *
 * Also here (section 10 row 14): the root `check:ai` script, `qa-release.js`
 * and `ci.yml` run it, the accessibility statement says so in one line, and
 * the changesets of the manifests.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PACKAGES } from "../scripts/luz-packages.js";
import { exampleDocuments, manifestAssets, renderLlmsFull, renderLlmsTxt } from "../scripts/docs-site/ai.js";
import { scanSite } from "../scripts/docs-site/site.js";
import { PAGES_CSP, SITE_URL } from "../vite.config.js";
import { capabilitiesOf } from "./helpers/js-capabilities.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8");
const exists = (path) => existsSync(join(repo, path));
/** The text without comments, so a word in one is not a use of it. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const SCRIPT = "scripts/check-ai.js";

/* ---- The source: what it may import and do ------------------------------------ */

describe("scripts/check-ai.js, as source", () => {
  const source = () => (exists(SCRIPT) ? read(SCRIPT) : "");

  it("exists", () => {
    expect(exists(SCRIPT), `${SCRIPT} exists`).toBe(true);
  });

  it("imports only node: built-ins and files of the repository, each by a literal", () => {
    const found = capabilitiesOf(source());
    expect(found.problems).toEqual([]);
    expect(found.imports.length, "it imports something").toBeGreaterThan(0);
    const outside = [...found.imports, ...found.dynamic].filter((s) => !(s.startsWith("node:") || s.startsWith("./") || s.startsWith("../")));
    expect(outside, "a package from node_modules or a computed specifier").toEqual([]);
  });

  it("imports no built-in that reaches a network, a thread or another machine, and no fetch, eval or socket", () => {
    const found = capabilitiesOf(source());
    const names = found.imports.map((s) => s.replace(/^node:/, ""));
    const FORBIDDEN = ["http", "https", "http2", "net", "tls", "dns", "dgram", "worker_threads", "cluster", "vm", "inspector"];
    expect(names.filter((n) => FORBIDDEN.includes(n))).toEqual([]);
    expect(found.calls).toEqual([]);
    expect(found.members.filter((m) => m !== "process.env")).toEqual([]);
  });

  it("starts no package manager, bundler or shell: it compares, it does not build", () => {
    const text = code(source());
    expect(text).not.toMatch(/["'`](?:pnpm|npm|npx|yarn)(?:\.cmd)?["'`]/);
    expect(text).not.toMatch(/\bshell\s*:\s*true\b/);
    expect(text).not.toMatch(/\b(?:exec|execSync)\s*\(/);
  });

  it("says in its header that it keeps RL-19, and that it needs `pnpm build`", () => {
    const header = source().split("*/")[0] ?? "";
    expect(header).toMatch(/RL-19|red line 19/i);
    expect(header).toMatch(/pnpm build/);
  });

  it("names the four things it compares", () => {
    const text = source();
    for (const needle of ["classes.json", "custom-elements.json", "llms.txt", "llms-full.txt", "ai-readme", "tests/fixtures/check/agent.md"]) {
      expect(text, needle).toContain(needle);
    }
    expect(text, "it renders with the generator of the pages build").toMatch(/docs-site\/ai\.js/);
  });
});

/* ---- The behaviour, on a copy of the repository -------------------------------- */

const SKIP = (path) => path.split(sep).includes("node_modules");
const sha = (buffer) => createHash("sha1").update(buffer).digest("hex");

/** path -> hash of every file under `dir`, relative and with `/`. */
function snapshot(dir, base = dir, out = new Map()) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) snapshot(path, base, out);
    else out.set(relative(base, path).split(sep).join("/"), sha(readFileSync(path)));
  }
  return out;
}

describe("node scripts/check-ai.js, on a copy of the repository", () => {
  let ws;
  let scratch;

  const put = (path, text) => {
    mkdirSync(dirname(join(ws, path)), { recursive: true });
    writeFileSync(join(ws, path), text);
  };
  const readWs = (path) => readFileSync(join(ws, path));

  const run = (env = {}) => {
    const r = spawnSync(process.execPath, [join(ws, SCRIPT)], {
      cwd: scratch,
      encoding: "utf-8",
      env: { ...process.env, ...env },
      timeout: 150_000,
    });
    return { status: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
  };

  /** Apply `change` (a list of [path, bytes | null | Function]), run, and put every file back. */
  const withChanges = (changes, then) => {
    const before = changes.map(([path]) => [path, existsSync(join(ws, path)) ? readWs(path) : null]);
    try {
      for (const [path, change] of changes) {
        if (change === null) rmSync(join(ws, path), { force: true });
        else {
          mkdirSync(dirname(join(ws, path)), { recursive: true });
          const old = existsSync(join(ws, path)) ? readWs(path) : Buffer.alloc(0);
          writeFileSync(join(ws, path), typeof change === "function" ? change(old) : change);
        }
      }
      return then();
    } finally {
      for (const [path, bytes] of before) {
        if (bytes === null) rmSync(join(ws, path), { force: true });
        else writeFileSync(join(ws, path), bytes);
      }
    }
  };
  /** The same bytes and one more line: the smallest change that is not a whitespace-free edit. */
  const stale = (old) => Buffer.concat([old, Buffer.from("\n")]);
  const failedNaming = (result, files) => {
    expect(result.status, `exit code; stderr was:\n${result.err}`).toBe(1);
    for (const file of files) expect(result.err, `names ${file}`).toContain(file);
    expect(result.err, "no stack trace").not.toMatch(/\n\s+at .*[(:]\d+:\d+/);
  };

  beforeAll(() => {
    ws = mkdtempSync(join(tmpdir(), "luz-check-ai-"));
    scratch = mkdtempSync(join(tmpdir(), "luz-check-ai-cwd-"));
    for (const dir of ["scripts", "apps", "packages", "docs", "tests/fixtures/check", ".claude/agents"]) {
      if (exists(dir)) cpSync(join(repo, dir), join(ws, dir), { recursive: true, filter: (source) => !SKIP(source) });
    }
    for (const file of ["package.json", "vite.config.js", "pnpm-workspace.yaml", "budgets.json"]) {
      if (exists(file)) cpSync(join(repo, file), join(ws, file));
    }
    symlinkSync(join(repo, "node_modules"), join(ws, "node_modules"), "dir");

    // What the pages build would write, so a copy that is not yet rebuilt in the
    // repository is still a passing workspace: one change at a time from here.
    const site = scanSite(join(ws, "apps/docs"), ws);
    put("docs/llms.txt", renderLlmsTxt(site, { siteUrl: SITE_URL }));
    put("docs/llms-full.txt", renderLlmsFull(site, { siteUrl: SITE_URL }));
    const versions = Object.fromEntries(PACKAGES.map((name) => [name, JSON.parse(readWs(`packages/${name}/package.json`)).version]));
    for (const doc of exampleDocuments(site, { csp: PAGES_CSP, versions, root: ws })) put(`docs${doc.route}`, doc.html);
    for (const { route, from } of manifestAssets(ws)) put(`docs${route}`, readWs(from));
  }, 120_000);

  afterAll(() => {
    rmSync(ws, { recursive: true, force: true });
    rmSync(scratch, { recursive: true, force: true });
  });

  const needsScript = () => {
    if (!exists(SCRIPT)) throw new Error(`${SCRIPT} does not exist`);
  };

  it("exits 0 on a workspace that is as generated, with a line that starts with ✓ and nothing on stderr", () => {
    needsScript();
    const r = run();
    expect(r.err).toBe("");
    expect(r.status).toBe(0);
    expect(r.out.trim().split("\n").at(-1)).toMatch(/^✓ /);
  }, 150_000);

  it("reads the repository it sits in, not the working directory: the same result from any folder", () => {
    needsScript();
    // run() uses an empty folder as cwd; here the script is run from the workspace root too
    const r = spawnSync(process.execPath, [join(ws, SCRIPT)], { cwd: ws, encoding: "utf-8", timeout: 150_000 });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  }, 150_000);

  it("writes nothing in the repository, passing or failing, and leaves no temporary folder behind", () => {
    needsScript();
    const tmp = mkdtempSync(join(tmpdir(), "luz-check-ai-tmp-"));
    try {
      const before = snapshot(ws);
      const env = { TMPDIR: tmp, TMP: tmp, TEMP: tmp };
      expect(run(env).status).toBe(0);
      withChanges([["docs/llms.txt", stale]], () => expect(run(env).status).toBe(1));
      expect(snapshot(ws)).toEqual(before);
      expect(readdirSync(tmp), "files or folders left in the temporary directory").toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 300_000);

  /* ---- layer 1: the manifests of the packages ---------------------------------- */

  it("fails, naming each one, when classes.json of a package or custom-elements.json differs from what its dist generates", () => {
    needsScript();
    const files = [...PACKAGES.map((name) => `packages/${name}/dist/classes.json`), "packages/core/dist/custom-elements.json", "packages/site/dist/custom-elements.json"];
    const r = withChanges(files.map((path) => [path, stale]), run);
    failedNaming(r, files);
  }, 150_000);

  it("fails on a class added to a manifest by hand", () => {
    needsScript();
    const path = "packages/core/dist/classes.json";
    const r = withChanges(
      [
        [
          path,
          (old) => {
            const manifest = JSON.parse(old.toString("utf-8"));
            manifest.classes.push({ name: "luz-written-by-hand", kind: "component", layer: "luz.components", files: ["luz.css"], defined: true, block: "luz-written-by-hand" });
            return `${JSON.stringify(manifest, null, 2)}\n`;
          },
        ],
      ],
      run,
    );
    failedNaming(r, [path]);
    expect(r.err).not.toContain("packages/site/dist/classes.json");
  }, 150_000);

  it("fails, naming packages/<p>/dist and `pnpm build`, when a package is not built", () => {
    needsScript();
    const dist = join(ws, "packages/landing/dist");
    renameSync(dist, `${dist}.away`);
    try {
      const r = run();
      failedNaming(r, ["packages/landing/dist"]);
      expect(r.err).toContain("pnpm build");
    } finally {
      renameSync(`${dist}.away`, dist);
    }
  }, 150_000);

  /* ---- layer 2: llms.txt, llms-full.txt, examples, manifests on Pages ------------ */

  it("fails when docs/llms.txt is not what the pages render, and names it and not its neighbours", () => {
    needsScript();
    const r = withChanges([["docs/llms.txt", stale]], run);
    failedNaming(r, ["docs/llms.txt"]);
    expect(r.err).not.toContain("docs/llms-full.txt");
    expect(r.err, "says what to run").toContain("pnpm pages:build");
  }, 150_000);

  it("fails when docs/llms-full.txt is not what the pages render", () => {
    needsScript();
    const r = withChanges([["docs/llms-full.txt", stale]], run);
    failedNaming(r, ["docs/llms-full.txt"]);
    expect(r.err).not.toContain("docs/llms.txt");
  }, 150_000);

  it("fails when an example differs from the page it is made from", () => {
    needsScript();
    const path = "docs/examples/components/button.html";
    const r = withChanges([[path, stale]], run);
    failedNaming(r, [path]);
  }, 150_000);

  it("fails when a copy of a manifest on Pages differs from the package's own file", () => {
    needsScript();
    const path = "docs/manifests/core/classes.json";
    const r = withChanges([[path, stale]], run);
    failedNaming(r, [path]);
    expect(r.err).not.toContain("packages/core/dist/classes.json");
  }, 150_000);

  it("fails when a generated file is missing from docs/", () => {
    needsScript();
    const r = withChanges([["docs/llms.txt", null], ["docs/manifests/site/custom-elements.json", null]], run);
    failedNaming(r, ["docs/llms.txt", "docs/manifests/site/custom-elements.json"]);
  }, 150_000);

  it("fails on an example that no page produces any more", () => {
    needsScript();
    const path = "docs/examples/components/page-that-was-deleted.html";
    const r = withChanges([[path, "<!doctype html>\n<title>old</title>\n"]], run);
    failedNaming(r, [path]);
  }, 150_000);

  it("passes when the pages build output is stale in a way that is not an AI file: another page of docs/ is not its business", () => {
    needsScript();
    const r = withChanges([["docs/docs/accessibility/index.html", stale]], run);
    expect(r.err).toBe("");
    expect(r.status).toBe(0);
  }, 150_000);

  /* ---- layer 3: READMEs, the agent ------------------------------------------------ */

  it("fails, naming the README, when a 'For AI agents' block is not what ai-readme --check writes", () => {
    needsScript();
    const path = "packages/core/README.md";
    const r = withChanges(
      [[path, (old) => Buffer.from(old.toString("utf-8").replace("<!-- luz:ai-agents:end -->", "A line written by hand.\n<!-- luz:ai-agents:end -->"))]],
      run,
    );
    failedNaming(r, [path]);
    expect(r.err).not.toContain("packages/site/README.md");
  }, 150_000);

  it("fails, naming the snapshot, when tests/fixtures/check/agent.md is not the agent the package builds", () => {
    needsScript();
    const path = "tests/fixtures/check/agent.md";
    const r = withChanges([[path, stale]], run);
    failedNaming(r, [path]);
  }, 150_000);
});

/* ---- The real repository ---------------------------------------------------------- */

describe("pnpm check:ai on this repository", () => {
  // Like the dist-dependent suites: without a built dist/ there is nothing to compare
  const built = PACKAGES.every((name) => exists(`packages/${name}/dist/classes.json`)) && exists("packages/check/dist/luz-check.js");

  it.skipIf(!built)("passes: dist/, docs/, the READMEs and the agent snapshot are as the generators write them", () => {
    expect(exists(SCRIPT), `${SCRIPT} exists`).toBe(true);
    const r = spawnSync(process.execPath, [join(repo, SCRIPT)], { cwd: repo, encoding: "utf-8", timeout: 150_000 });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(r.stdout.trim().split("\n").at(-1)).toMatch(/^✓ /);
  }, 150_000);
});

/* ---- Where it runs ------------------------------------------------------------------ */

describe("check:ai is a script, a step of qa-release and a step of CI", () => {
  it("the root package.json has check:ai, next to check:generated", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    expect(scripts["check:ai"]).toBe("node scripts/check-ai.js");
    expect(scripts["check:generated"]).toBe("node scripts/check-generated.js");
  });

  it("scripts/qa-release.js has a step that runs `pnpm check:ai`, always, after the build and before the browsers", () => {
    const source = read("scripts/qa-release.js");
    const block = source.slice(source.indexOf("const steps = ["));
    const lines = block.slice(0, block.indexOf("\n];")).split("\n");
    const at = lines.flatMap((line, i) => (line.includes('"check:ai"') ? [i] : []));
    expect(at, "one step runs check:ai").toHaveLength(1);
    const line = lines[at[0]];
    expect(line, "not skipped by --fast or --skip-ui").not.toMatch(/args\.has\(/);
    expect(line).toMatch(/cmd:\s*\[pnpm,\s*"check:ai"\]/);
    expect(line, "its name cites the red line").toMatch(/RL-19/);
    const build = lines.findIndex((l) => /\[pnpm,\s*"build"\]/.test(l));
    const browsers = lines.findIndex((l) => l.includes("playwright"));
    expect(build, "the build step").toBeGreaterThanOrEqual(0);
    expect(at[0]).toBeGreaterThan(build);
    expect(at[0]).toBeLessThan(browsers);
  });

  it(".github/workflows/ci.yml runs `pnpm check:ai` in the job that builds, after `pnpm build`", () => {
    const workflow = read(".github/workflows/ci.yml");
    const start = workflow.indexOf("\n  build-and-test:");
    expect(start, "the build-and-test job").toBeGreaterThan(-1);
    const rest = workflow.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[\w-]+:\s*\n/);
    const job = next === -1 ? rest : rest.slice(0, next + 1);
    const build = job.search(/^\s*run:\s*pnpm build\s*$/m);
    const gate = job.search(/^\s*run:\s*pnpm check:ai\s*$/m);
    expect(build, "pnpm build in the job").toBeGreaterThan(-1);
    expect(gate, "pnpm check:ai in the job").toBeGreaterThan(build);
  });
});

/* ---- The accessibility statement -------------------------------------------------- */

describe("the accessibility statement says the files for agents are checked", () => {
  const html = read("apps/docs/pages/accessibility.html");
  const section = (id) => {
    const start = html.indexOf(`id="${id}"`);
    expect(start, `#${id}`).toBeGreaterThan(-1);
    const rest = html.slice(start);
    const end = rest.slice(1).search(/<h2\b/);
    return end === -1 ? rest : rest.slice(0, end + 1);
  };
  const items = (block) => [...block.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());

  it("has one line in 'What is checked on every change' about llms.txt and the manifests, and that a stale one fails", () => {
    const lines = items(section("h-a11y-checked")).filter((text) => /llms\.txt/.test(text));
    expect(lines, "one list item names llms.txt").toHaveLength(1);
    const [line] = lines;
    expect(line).toMatch(/classes\.json/);
    expect(line).toMatch(/regenerat|generated from/i);
    expect(line).toMatch(/fail|differ|stale|does not match/i);
    expect(line.length, "one line, not a paragraph").toBeLessThanOrEqual(420);
  });

  it("does not turn that check into a claim of accessibility", () => {
    const [line = ""] = items(section("h-a11y-checked")).filter((text) => /llms\.txt/.test(text));
    expect(line).not.toMatch(/\bis accessible\b|\bconforms\b|\bcompliant\b|\bpasses WCAG\b/i);
  });

  it("keeps the bullet of step 13 in 'What has not been tested': the reviewer and luz-check read source", () => {
    const lines = items(section("h-a11y-not-tested")).filter((text) => /luz-check/.test(text));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("A run with no findings does not mean a page is accessible.");
  });
});

/* ---- The changesets ---------------------------------------------------------------- */

describe("the changesets of the manifests", () => {
  const dir = `${repo}.changeset/`;
  const changesets = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((file) => {
      const text = readFileSync(`${dir}${file}`, "utf-8");
      const head = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      const bumps = [...head.matchAll(/^["']?(@luz-ds\/[\w-]+)["']?\s*:\s*(major|minor|patch)\s*$/gm)].map((m) => ({ name: m[1], level: m[2] }));
      return { file, body: text.replace(/^---[\s\S]*?\n---/, "").trim(), bumps };
    });

  it.each(PACKAGES)("@luz-ds/%s has a minor changeset that says it now exports ./classes.json", (name) => {
    const own = changesets.filter((c) => c.bumps.some((b) => b.name === `@luz-ds/${name}` && b.level === "minor") && c.body.includes("./classes.json"));
    expect(own.map((c) => c.file), `a minor changeset for @luz-ds/${name} that names ./classes.json`).not.toEqual([]);
  });

  it.each(["core", "site"])("@luz-ds/%s has a minor changeset that says it now exports ./custom-elements.json", (name) => {
    const own = changesets.filter((c) => c.bumps.some((b) => b.name === `@luz-ds/${name}` && b.level === "minor") && c.body.includes("./custom-elements.json"));
    expect(own.map((c) => c.file)).not.toEqual([]);
  });

  it("the changeset of the manifests is additive: no Breaking: paragraph, and it says there is no runtime or style change", () => {
    const own = changesets.filter((c) => c.body.includes("./classes.json") && c.bumps.some((b) => b.level === "minor" && b.name !== "@luz-ds/check"));
    expect(own.length).toBeGreaterThan(0);
    for (const c of own) {
      expect(c.body, `${c.file} has no Breaking: paragraph`).not.toMatch(/^Breaking:/m);
      expect(c.body, `${c.file} says no runtime or style change`).toMatch(/No runtime or style change/);
    }
  });

  it("is coupled to @luz-ds/check, whatever the level (the snapshot it carries is of this release)", () => {
    const own = changesets.filter((c) => c.body.includes("./classes.json") && c.bumps.some((b) => b.level === "minor" && b.name !== "@luz-ds/check"));
    for (const c of own) expect(c.bumps.map((b) => b.name), c.file).toContain("@luz-ds/check");
  });
});
