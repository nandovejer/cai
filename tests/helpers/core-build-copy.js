/**
 * A copy of the repository that scripts/build-core.js can run in, so a test
 * can change a source file and build without touching packages/core/dist.
 * The script reads everything relative to its own location: the copy holds
 * scripts/, packages/core (src and the manifests), the package.json of every
 * package, the sources of check (ai-manifests.js reads them) and a link to the
 * node_modules of the repository.
 *
 *   const tree = copyOfCore();       // in beforeAll
 *   tree.build()                     // { status, output }
 *   tree.write("packages/core/src/i18n/es.json", text)
 *   tree.read("packages/core/dist/i18n-es.js")
 *   tree.remove()                    // in afterAll
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repo = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function copyOfCore() {
  const dir = mkdtempSync(join(tmpdir(), "luz-core-build-"));
  const keep = (path) => !/(^|\/)(node_modules|dist)(\/|$)/.test(path.slice(repo.length));
  cpSync(join(repo, "scripts"), join(dir, "scripts"), { recursive: true, filter: keep });
  cpSync(join(repo, "package.json"), join(dir, "package.json"));
  mkdirSync(join(dir, "packages"));
  for (const name of readdirSync(join(repo, "packages"))) {
    const manifest = join(repo, "packages", name, "package.json");
    if (!existsSync(manifest)) continue;
    mkdirSync(join(dir, "packages", name), { recursive: true });
    cpSync(manifest, join(dir, "packages", name, "package.json"));
    if (name === "core" || name === "check") cpSync(join(repo, "packages", name, "src"), join(dir, "packages", name, "src"), { recursive: true, filter: keep });
  }
  cpSync(join(repo, "packages/core/README.md"), join(dir, "packages/core/README.md"));
  symlinkSync(join(repo, "node_modules"), join(dir, "node_modules"));

  const at = (path) => join(dir, path);
  return {
    dir,
    at,
    build() {
      const run = spawnSync(process.execPath, [at("scripts/build-core.js")], { cwd: dir, encoding: "utf-8", timeout: 60_000 });
      return { status: run.status, output: `${run.stdout}${run.stderr}` };
    },
    write: (path, text) => writeFileSync(at(path), text),
    read: (path) => readFileSync(at(path), "utf-8"),
    exists: (path) => existsSync(at(path)),
    remove: () => rmSync(dir, { recursive: true, force: true }),
  };
}
