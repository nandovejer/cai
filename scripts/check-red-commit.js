/**
 * LUZ — the red commit (PRINCIPLES.md SR-9; spec f7-open-source.md, step 5).
 *
 * A pull request that changes packages/, apps/ or scripts/ must carry a `test:`
 * commit that touches tests/ and fails on its own, on top of the base. This
 * script proves it: it checks that commit out alone in a temporary worktree on
 * top of the base, builds the base, and runs the commit's test files (vitest for
 * `*.test.js`, Playwright chromium for `*.spec.js`), expecting them to FAIL.
 *
 * The decision (which commit, which files, which runner, skipped?) is the pure
 * `decide()`, unit-tested; the git and worktree part is `main()`, a thin wrapper.
 * Importing this module has no side effect.
 *
 * Usage: node scripts/check-red-commit.js <base> <head>
 * Exit code: 0 when skipped or when the test commit is red on the base, 1 when
 * the pull request has no red commit, or its tests pass on the base.
 *
 * It runs the repository's own tools (pnpm install, build, test) on the base
 * and on one commit of the pull request: in CI that is a job with a read-only
 * token and no secrets, and `pull_request` (never `pull_request_target`).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_DIRS = ["packages/", "apps/", "scripts/"];

/** `type(scope)!: subject` -> "type", or null when the subject is not a conventional one. */
function typeOf(subject) {
  return /^([a-z]+)(?:\([^)]*\))?!?:/.exec(subject ?? "")?.[1] ?? null;
}

const inTests = (file) => file.startsWith("tests/");

/** The first commit (oldest first) of type `test` that changes a file in tests/. */
export function findTestCommit(commits) {
  return commits.find((c) => typeOf(c.subject) === "test" && c.files.some(inTests));
}

export function decide({ commits, files }) {
  if (!files.some((f) => SOURCE_DIRS.some((dir) => f.startsWith(dir)))) {
    return { skip: true, reason: "The pull request changes nothing in packages/, apps/ or scripts/, so there is no behaviour to prove with a failing test." };
  }
  const firstType = typeOf(commits[0]?.subject);
  if (firstType === "docs" || firstType === "chore") {
    return { skip: true, reason: `The first commit is \`${firstType}:\`, a change with no behaviour to prove with a failing test.` };
  }

  const red = findTestCommit(commits);
  if (!red) {
    return { error: "A pull request that changes packages/, apps/ or scripts/ needs a commit `test:` that changes a file in tests/ and fails without the change. Add it as the first commit (see CONTRIBUTING.md)." };
  }

  const outside = red.files.filter((f) => !inTests(f));
  if (outside.length) {
    return { error: `The \`test:\` commit ${red.sha.slice(0, 7)} must contain only tests, and it also changes ${outside.join(", ")}. Move those files to the commit that makes the test pass.` };
  }

  const vitest = red.files.filter((f) => inTests(f) && f.endsWith(".test.js"));
  const playwright = red.files.filter((f) => inTests(f) && f.endsWith(".spec.js"));
  if (!vitest.length && !playwright.length) {
    return { error: `The \`test:\` commit ${red.sha.slice(0, 7)} changes only helpers or fixtures in tests/: it needs at least one *.test.js or *.spec.js file to run and fail.` };
  }
  return {
    run: [
      ...(vitest.length ? [{ runner: "vitest", files: vitest }] : []),
      ...(playwright.length ? [{ runner: "playwright", files: playwright }] : []),
    ],
  };
}

/* ---- git and worktree (not unit-tested) --------------------------------------------- */

const SAFE_REF = /^[\w][\w./~^-]*$/;
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function git(cwd, ...argv) {
  const r = spawnSync("git", argv, { cwd, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${argv.join(" ")} failed: ${(r.stderr || r.stdout || "").trim()}`);
  return r.stdout;
}

/** A NUL-separated list (`-z`): a name with a newline or a quote stays one name. */
const nulList = (text) => text.split("\0").filter(Boolean);

function commitsOf(cwd, base, head) {
  const shas = git(cwd, "rev-list", "--reverse", "--no-merges", `${base}..${head}`).split("\n").filter(Boolean);
  return shas.map((sha) => ({
    sha,
    subject: git(cwd, "show", "-s", "--format=%s", sha).trim(),
    files: nulList(git(cwd, "diff-tree", "-r", "-z", "--no-commit-id", "--name-only", "--no-renames", sha)),
  }));
}

/** Run a command in `cwd`, output on ours; returns its exit status (null if it could not start). */
function run(cwd, command, argv, env = {}) {
  const r = spawnSync(command, argv, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  return r.error ? null : r.status;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function main(argv) {
  const [base, head] = argv;
  if (!base || !head) {
    console.error("Usage: node scripts/check-red-commit.js <base> <head>");
    return 2;
  }
  if (!SAFE_REF.test(base) || !SAFE_REF.test(head)) {
    console.error("Usage: node scripts/check-red-commit.js <base> <head>  (a commit or branch name, not an option)");
    return 2;
  }
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

  const commits = commitsOf(repo, base, head);
  const files = nulList(git(repo, "diff", "--name-only", "-z", "--no-renames", `${base}...${head}`));
  const decision = decide({ commits, files });

  if (decision.skip) {
    console.log(`red-commit: skipped. ${decision.reason}`);
    return 0;
  }
  if (decision.error) {
    console.error(`red-commit: ${decision.error}`);
    return 1;
  }

  const red = findTestCommit(commits);
  console.log(`red-commit: the test commit is ${red.sha.slice(0, 7)} "${red.subject}"; checking it out alone on top of ${base}.`);

  const tmp = mkdtempSync(join(tmpdir(), "luz-red-commit-"));
  const tree = join(tmp, "tree");
  let worktree = false;
  try {
    git(repo, "worktree", "add", "--detach", tree, base);
    worktree = true;
    try {
      git(tree, "cherry-pick", "--no-commit", red.sha);
    } catch (error) {
      console.error(`red-commit: the test commit ${red.sha.slice(0, 7)} does not apply on top of the base alone (does it depend on an earlier commit of the pull request?).\n${error.message}`);
      return 1;
    }

    const steps = [
      ["install", [pnpm, "install", "--frozen-lockfile", "--prefer-offline"]],
      // The suites that read dist/ are skipped without it, and a skipped suite is not red
      ["build", [pnpm, "build"]],
    ];
    for (const [name, [command, ...args]] of steps) {
      if (run(tree, command, args) !== 0) {
        console.error(`red-commit: could not ${name} the base in the worktree; this is not a red test, it is a broken setup.`);
        return 1;
      }
    }

    let allRed = true;
    for (const { runner, files: testFiles } of decision.run) {
      let command;
      let args;
      if (runner === "vitest") {
        [command, args] = [pnpm, ["exec", "vitest", "run", ...testFiles]];
      } else {
        // Only Chromium: the firefox and webkit projects are the maintainer's (AGENTS.md section 6)
        const install = run(tree, pnpm, ["exec", "playwright", "install", ...(process.env.CI ? ["--with-deps"] : []), "chromium"]);
        if (install !== 0) {
          console.error("red-commit: could not install Chromium for Playwright.");
          return 1;
        }
        [command, args] = [pnpm, ["exec", "playwright", "test", "--project=chromium", "--project=chromium-nojs", "--reporter=line", "--retries=0", ...testFiles.map(escapeRegExp)]];
      }
      console.log(`\nred-commit: ${runner} on ${testFiles.join(", ")} (expected to fail)`);
      const status = run(tree, command, args, { CI: "true" });
      if (status === null) {
        console.error(`red-commit: ${runner} could not start.`);
        return 1;
      }
      if (status === 0) {
        console.error(`red-commit: ${runner} PASSES on the base. The \`test:\` commit must fail without the change.`);
        allRed = false;
      } else {
        console.log(`red-commit: ${runner} fails on the base (exit ${status}), as a red commit should.`);
      }
    }
    if (allRed) console.log("\nred-commit: the test commit is red on the base.");
    return allRed ? 0 : 1;
  } finally {
    if (worktree) spawnSync("git", ["worktree", "remove", "--force", tree], { cwd: repo, stdio: "ignore" });
    rmSync(tmp, { recursive: true, force: true });
    spawnSync("git", ["worktree", "prune"], { cwd: repo, stdio: "ignore" });
  }
}

const isEntry = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry) process.exit(main(process.argv.slice(2)));
