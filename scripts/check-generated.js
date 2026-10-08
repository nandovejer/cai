/**
 * CAI — generated files are never edited by hand (PRINCIPLES.md, red line 14).
 *
 * docs/ is the GitHub Pages build and is committed. This script builds the
 * site again into a temporary folder and compares it, file by file, with
 * docs/: a hand edit, or a source change committed without rebuilding, fails.
 * (dist/ is not committed: .gitignore keeps it out, and CI and the release
 * always build it fresh, so a hand edit there cannot ship.)
 *
 * Usage: node scripts/check-generated.js   (after `pnpm build`)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = resolve(root, "docs");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
const list = (dir) => (existsSync(dir) ? [...walk(dir)].map((p) => relative(dir, p)).sort() : []);

/** Paths (relative to docs/) that git ignores: not part of the published site. */
function ignoredOf(paths) {
  if (!paths.length) return new Set();
  let output = "";
  try {
    output = execFileSync("git", ["check-ignore", "--no-index", "--stdin"], {
      cwd: root,
      input: paths.map((p) => `docs/${p}`).join("\n"),
      encoding: "utf-8",
    });
  } catch (error) {
    output = error.stdout ?? ""; // exit 1: nothing is ignored
  }
  return new Set(output.split("\n").filter(Boolean).map((p) => relative("docs", p)));
}
const published = (paths) => {
  const ignored = ignoredOf(paths);
  return paths.filter((p) => !ignored.has(p));
};

const out = mkdtempSync(join(tmpdir(), "cai-pages-"));
try {
  execFileSync("pnpm", ["exec", "vite", "build", "--mode", "pages", "--logLevel", "error"], {
    cwd: root,
    env: { ...process.env, CAI_PAGES_OUT: out },
    stdio: ["ignore", "ignore", "inherit"],
  });

  const fresh = published(list(out));
  const committed = published(list(docs));
  const problems = [
    ...fresh.filter((p) => !committed.includes(p)).map((p) => `missing from docs/: ${p}`),
    ...committed.filter((p) => !fresh.includes(p)).map((p) => `not produced by the build: docs/${p}`),
    ...fresh
      .filter((p) => committed.includes(p))
      .filter((p) => !readFileSync(join(out, p)).equals(readFileSync(join(docs, p))))
      .map((p) => `differs from a fresh build: docs/${p}`),
  ];

  if (problems.length) {
    console.error(`✗ docs/ is not the output of the Pages build:\n  ${problems.join("\n  ")}`);
    console.error("  Never edit docs/ by hand: change apps/ or packages/, run `pnpm pages:build` and commit the result.");
    process.exit(1);
  }
  console.log(`✓ docs/ matches a fresh Pages build (${fresh.length} files)`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
