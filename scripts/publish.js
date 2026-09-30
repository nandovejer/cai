/**
 * CAI Design System — Publisher
 * Publishes each package whose current version is not on the registry yet,
 * lowest layer first. Already-published versions are skipped, so the script
 * is safe to re-run; any real failure stops the release.
 *
 * Tarballs are created with `pnpm pack` (rewrites the workspace: protocol)
 * and uploaded with `npm publish` (OIDC trusted publishing + provenance).
 *
 * Usage: node scripts/publish.js [--dry-run]   (run `pnpm build` first)
 */

import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

// Order matters: a layer is only published after the one it depends on.
const PACKAGES = ["tokens", "core", "platform"];

function isPublished(name, version) {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version", "--json"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch (error) {
    // Only "not found" means unpublished; anything else must stop the release
    if (/E404/.test(`${error.stdout}${error.stderr}`)) return false;
    throw error;
  }
}

for (const dir of PACKAGES) {
  const pkgRoot = resolve(repoRoot, "packages", dir);
  const { name, version } = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8"));

  if (isPublished(name, version)) {
    console.log(`– ${name}@${version} already published, skipping`);
    continue;
  }

  const outDir = mkdtempSync(join(tmpdir(), "cai-pack-"));
  execFileSync("pnpm", ["pack", "--pack-destination", outDir], { cwd: pkgRoot, stdio: "inherit" });
  const tarball = join(outDir, readdirSync(outDir).find((f) => f.endsWith(".tgz")));

  const args = ["publish", tarball, "--access", "public", "--provenance"];
  if (dryRun) args.push("--dry-run");
  execFileSync("npm", args, { stdio: "inherit" });
  console.log(`✓ ${name}@${version} ${dryRun ? "would be published" : "published"}`);
}
