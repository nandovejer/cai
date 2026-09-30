/**
 * CAI Design System — Tarball contract check
 * Verifies what each publishable package would ship, without publishing:
 *   - the file list matches the committed snapshot (packages/<name>/pack-files.txt)
 *   - LICENSE is present, and every font folder carries a font licence text
 *   - no sources, source maps or dotfiles leak
 *   - no workspace: protocol in runtime dependency fields
 *   - every static exports target exists
 *
 * Usage: node scripts/check-pack.js            (run `pnpm build` first)
 *        node scripts/check-pack.js --update   (rewrite the snapshots)
 */

import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const update = process.argv.includes("--update");
const PACKAGES = ["tokens", "core", "platform"];

let failed = false;
const fail = (pkg, message) => {
  console.error(`✗ ${pkg}: ${message}`);
  failed = true;
};

function exportTargets(exportsField) {
  if (typeof exportsField === "string") return [exportsField];
  return Object.values(exportsField ?? {}).flatMap(exportTargets);
}

for (const name of PACKAGES) {
  const pkgRoot = resolve(repoRoot, "packages", name);
  const manifest = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8"));

  const [{ files }] = JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: pkgRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  const paths = files.map((f) => f.path).sort();

  // --- Snapshot ---
  const snapshotPath = resolve(pkgRoot, "pack-files.txt");
  const listing = `${paths.join("\n")}\n`;
  if (update) {
    writeFileSync(snapshotPath, listing, "utf-8");
    console.log(`✓ ${name}: snapshot updated (${paths.length} files)`);
  } else if (!existsSync(snapshotPath)) {
    fail(name, "pack-files.txt is missing — run with --update");
  } else {
    const expected = readFileSync(snapshotPath, "utf-8").split("\n").filter(Boolean);
    const added = paths.filter((p) => !expected.includes(p));
    const removed = expected.filter((p) => !paths.includes(p));
    if (added.length) fail(name, `unexpected files in tarball:\n    ${added.join("\n    ")}`);
    if (removed.length) fail(name, `files missing from tarball:\n    ${removed.join("\n    ")}`);
  }

  // --- Licences ---
  if (!paths.includes("LICENSE")) fail(name, "LICENSE is not shipped");
  const fontDirs = new Set(paths.filter((p) => p.endsWith(".woff2")).map((p) => dirname(p)));
  for (const dir of fontDirs) {
    const covered = paths.some(
      (p) => /\/LICENSE-[^/]+\.txt$/.test(p) && (dir === dirname(p) || dir.startsWith(`${dirname(p)}/`)),
    );
    if (!covered) fail(name, `${dir} ships fonts without their licence text`);
  }

  // --- Leaks ---
  const leaks = paths.filter(
    (p) => p.endsWith(".map") || p.startsWith("src/") || p.split("/").some((s) => s.startsWith(".")),
  );
  if (leaks.length) fail(name, `files that must not be published:\n    ${leaks.join("\n    ")}`);

  // --- Manifest ---
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (String(range).startsWith("workspace:")) {
        fail(name, `${field}.${dep} uses the workspace: protocol (${range})`);
      }
    }
  }
  for (const target of exportTargets(manifest.exports)) {
    if (target.includes("*")) continue;
    if (!paths.includes(target.replace(/^\.\//, ""))) {
      fail(name, `exports target ${target} is not in the tarball`);
    }
  }

  if (!update) console.log(`✓ ${name}: ${paths.length} files checked`);
}

if (failed) process.exit(1);
