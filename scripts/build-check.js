/**
 * LUZ Check — dist builder
 * Bundles packages/check/src/main.js into one file, the bin of
 * @luz-ds/check (f5-ai-ready.md 5.1, 8 "Supply chain"):
 *
 *   packages/check/dist/luz-check.js
 *
 * esbuild, as scripts/build-package.js: Node, ESM, node20, every `node:`
 * built-in left as an import. Not minified (people and the security audit
 * read it), no source map, and nothing in it that changes between runs: the
 * paths in its comments are relative to the repository, and the shebang is
 * the one line esbuild writes first. `packages: "external"` keeps a bare
 * import an import, which tests/check-capabilities.test.js then rejects,
 * instead of inlining a file of node_modules into a published tool.
 *
 * buildCheck({ outdir }) writes <outdir>/luz-check.js and returns esbuild's
 * metafile, so a test reads exactly what `pnpm build` would write; importing
 * this file builds nothing.
 *
 * Usage: node scripts/build-check.js (from the repo root)
 */

import { chmodSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = resolve(repoRoot, "packages", "check", "src", "main.js");
const defaultOutdir = resolve(repoRoot, "packages", "check", "dist");

/**
 * @param {object} [options]
 * @param {string} [options.outdir] where luz-check.js is written (default: packages/check/dist, emptied first)
 * @returns {Promise<{ outfile: string, metafile: object }>}
 */
export async function buildCheck({ outdir = defaultOutdir } = {}) {
  const folder = resolve(outdir);
  // Only the package's own dist is emptied, so removed outputs never linger
  if (folder === defaultOutdir) rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  const outfile = resolve(folder, "luz-check.js");

  const { metafile } = await esbuild.build({
    entryPoints: [entry],
    outfile,
    absWorkingDir: repoRoot,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    metafile: true,
    banner: { js: "#!/usr/bin/env node" },
    minify: false,
    legalComments: "inline",
    logLevel: "warning",
  });
  chmodSync(outfile, 0o755);
  return { outfile, metafile };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { outfile } = await buildCheck();
  console.log(`✓ Check CLI bundled → ${outfile}`);
}
