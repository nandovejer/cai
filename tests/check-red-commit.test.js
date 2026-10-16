/**
 * The `red-commit` CI job (F7 step 5, spec f7-open-source.md): a pull request
 * that changes packages/, apps/ or scripts/ must carry a `test:` commit that
 * touches tests/ and fails on its own on top of the base. The decision (which
 * commits, which files, which runner, skipped?) is a pure function; the git and
 * worktree part is a thin wrapper that this file does not test.
 *
 * CONTRACT for the implementer, scripts/check-red-commit.js (ES module;
 * importing it has no side effect: it runs `main()` only as the entry point):
 *
 *   export function decide({ commits, files })
 *     commits: the commits of the PR, oldest first:
 *              [{ sha, subject, files: string[] }]  (files = paths that commit changes)
 *     files:   every path the PR changes against its base, string[]
 *
 *     returns exactly one of
 *       { skip: true, reason }        nothing to prove:
 *            - `files` has no path under packages/, apps/ or scripts/
 *              (reason says "packages/, apps/ or scripts/"), or
 *            - the FIRST commit's subject is `docs:` or `chore:` (with an optional
 *              scope and `!`: `docs(core): ...`); the reason names that type.
 *            The first rule is checked first. Skipping is always printed, so the
 *            reason is a non-empty sentence.
 *       { error }                     the PR must have a red commit and has none:
 *            - no commit with the type `test` (`test:`, `test(scope):`, `test!:`)
 *              whose files include a path under tests/, or
 *            - the first such commit changes no `*.test.js` and no `*.spec.js`
 *              (only helpers or fixtures): there is nothing to run.
 *            `error` is a sentence that says "test:" and tests/ (the first case)
 *            or "*.test.js" and "*.spec.js" (the second).
 *       { run: [{ runner, files }] }  what to run on the red commit, alone on top of
 *            the base: runner "vitest" for the commit's `tests/**\/*.test.js`,
 *            runner "playwright" for its `tests/**\/*.spec.js`; each only when it has
 *            files; vitest first; the files in the order the commit lists them.
 *            Paths in subdirectories of tests/ (tests/helpers/x.test.js) count.
 *
 *   export function findTestCommit(commits)
 *     the first commit of `commits` (oldest first) whose subject is of type `test`
 *     and whose files include a path under tests/; undefined when there is none.
 *     The wrapper checks that commit out alone on top of the base.
 *
 *   CLI: node scripts/check-red-commit.js <base> <head>
 *     with fewer than two arguments it prints a line starting with "Usage" and
 *     exits with a non-zero code, and touches nothing.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(repo, "scripts/check-red-commit.js");

async function load() {
  if (!existsSync(script)) throw new Error("scripts/check-red-commit.js does not exist");
  return import("../scripts/check-red-commit.js");
}

const commit = (subject, files, sha = subject.replace(/\W+/g, "-")) => ({ sha, subject, files });
const RED = commit("test: a failing test", ["tests/thing.test.js"]);
const GREEN = commit("feat: the change", ["packages/core/src/thing.js"]);
const PR = (commits) => ({ commits, files: [...new Set(commits.flatMap((c) => c.files))] });

describe("decide: when there is nothing to prove", () => {
  it("skips a PR that touches no file in packages/, apps/ or scripts/, and says so", async () => {
    const { decide } = await load();
    const r = decide(PR([commit("test: only tests", ["tests/x.test.js"]), commit("docs: words", ["README.md", "dev/TESTING.md", "docs/index.html", ".github/labels.yml"])]));
    expect(r.skip).toBe(true);
    expect(r.reason).toContain("packages/, apps/ or scripts/");
    expect(r.run).toBeUndefined();
  });

  it.each(["docs: explain the thing", "chore: regenerate dist", "docs(core): scoped", "chore(deps)!: breaking chore"])("skips a PR whose first commit is `%s`", async (subject) => {
    const { decide } = await load();
    const r = decide(PR([commit(subject, ["README.md"]), RED, GREEN]));
    expect(r.skip).toBe(true);
    expect(r.reason).toMatch(/docs:|chore:/);
  });

  it("does not skip when only a later commit is docs: or chore:", async () => {
    const { decide } = await load();
    const r = decide(PR([RED, GREEN, commit("docs: afterwards", ["README.md"]), commit("chore: rebuild", ["docs/index.html"])]));
    expect(r.skip).toBeUndefined();
  });

  it("does not treat a type that merely starts with docs or chore as skippable", async () => {
    const { decide } = await load();
    const r = decide(PR([commit("docsfix: not a type", ["packages/core/src/a.js"]), RED]));
    expect(r.skip).toBeUndefined();
  });

  it("checks the paths before the first commit: no source file wins over everything", async () => {
    const { decide } = await load();
    const r = decide(PR([RED]));
    expect(r.skip).toBe(true);
    expect(r.reason).toContain("packages/, apps/ or scripts/");
  });
});

describe("decide: what must run", () => {
  it("runs vitest on the *.test.js of the red commit, alone", async () => {
    const { decide } = await load();
    expect(decide(PR([RED, GREEN]))).toEqual({ run: [{ runner: "vitest", files: ["tests/thing.test.js"] }] });
  });

  it("runs Playwright on the *.spec.js of the red commit", async () => {
    const { decide } = await load();
    const red = commit("test: a failing spec", ["tests/thing.spec.js"]);
    expect(decide(PR([red, GREEN]))).toEqual({ run: [{ runner: "playwright", files: ["tests/thing.spec.js"] }] });
  });

  it("runs both, vitest first, each with its files in the order of the commit, subdirectories included", async () => {
    const { decide } = await load();
    const red = commit("test(core): both kinds", ["tests/b.spec.js", "tests/helpers/x.test.js", "tests/a.test.js", "tests/a.spec.js"]);
    expect(decide(PR([red, GREEN]))).toEqual({
      run: [
        { runner: "vitest", files: ["tests/helpers/x.test.js", "tests/a.test.js"] },
        { runner: "playwright", files: ["tests/b.spec.js", "tests/a.spec.js"] },
      ],
    });
  });

  it("leaves out the helpers, fixtures and non-test files of the red commit", async () => {
    const { decide } = await load();
    const red = commit("test: with fixtures", ["tests/fixtures/page.html", "tests/helpers/design-tokens.js", "tests/thing.test.js", "tests/notes.md", "README.md"]);
    expect(decide(PR([red, GREEN]))).toEqual({ run: [{ runner: "vitest", files: ["tests/thing.test.js"] }] });
  });

  it("takes the first test commit, not the later ones", async () => {
    const { decide } = await load();
    const later = commit("test: more", ["tests/later.test.js"], "later");
    expect(decide(PR([RED, GREEN, later]))).toEqual({ run: [{ runner: "vitest", files: ["tests/thing.test.js"] }] });
  });

  it("accepts test(scope): and test!: as the type", async () => {
    const { decide } = await load();
    expect(decide(PR([commit("test(site)!: scoped", ["tests/a.test.js"]), GREEN])).run).toEqual([{ runner: "vitest", files: ["tests/a.test.js"] }]);
    expect(decide(PR([commit("test!: bang", ["tests/a.test.js"]), GREEN])).run).toEqual([{ runner: "vitest", files: ["tests/a.test.js"] }]);
  });

  it("accepts a feat: commit before the test commit (the wrapper tests the red commit alone)", async () => {
    const { decide } = await load();
    expect(decide(PR([GREEN, RED])).run).toEqual([{ runner: "vitest", files: ["tests/thing.test.js"] }]);
  });
});

describe("decide: a PR that changes source with no red commit", () => {
  it("is an error when no commit is `test:`", async () => {
    const { decide } = await load();
    const r = decide(PR([GREEN, commit("fix: another", ["packages/core/src/b.js"])]));
    expect(r.error).toMatch(/test:/);
    expect(r.error).toContain("tests/");
    expect(r.run).toBeUndefined();
    expect(r.skip).toBeUndefined();
  });

  it("is an error when the `test:` commit touches nothing in tests/", async () => {
    const { decide } = await load();
    const r = decide(PR([commit("test: says tests, touches code", ["packages/core/src/a.js"]), GREEN]));
    expect(r.error).toMatch(/test:/);
  });

  it("is an error when something touches tests/ but is not a `test:` commit", async () => {
    const { decide } = await load();
    const r = decide(PR([commit("feat: change and its test together", ["packages/core/src/a.js", "tests/a.test.js"])]));
    expect(r.error).toMatch(/test:/);
  });

  it("is an error when the `test:` commit changes only helpers or fixtures: there is nothing to run", async () => {
    const { decide } = await load();
    const r = decide(PR([commit("test: only a fixture", ["tests/fixtures/a.json", "tests/helpers/b.js"]), GREEN]));
    expect(r.error).toContain("*.test.js");
    expect(r.error).toContain("*.spec.js");
  });
});

describe("findTestCommit", () => {
  it("returns the first `test:` commit that touches tests/", async () => {
    const { findTestCommit } = await load();
    const first = commit("test: first", ["tests/a.test.js"], "aaa");
    expect(findTestCommit([commit("test: touches nothing", ["README.md"]), first, commit("test: second", ["tests/b.test.js"])])).toBe(first);
  });

  it("returns undefined when there is none", async () => {
    const { findTestCommit } = await load();
    expect(findTestCommit([GREEN])).toBeUndefined();
    expect(findTestCommit([])).toBeUndefined();
  });
});

describe("node scripts/check-red-commit.js", () => {
  it("prints its usage and fails without <base> and <head>", () => {
    expect(existsSync(script), "scripts/check-red-commit.js exists").toBe(true);
    const r = spawnSync(process.execPath, [script], { encoding: "utf-8", cwd: repo });
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/^Usage/m);
  });
});
