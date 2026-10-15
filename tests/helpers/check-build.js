/**
 * Builds the bundle of @luz-ds/check into a temporary folder, through the
 * builder's own export, so a test reads what `pnpm build` would write and
 * never a stale packages/check/dist.
 *
 * The contract it relies on (f5-ai-ready.md 5.1, step 7):
 *
 *   scripts/build-check.js
 *     export async function buildCheck({ outdir } = {})
 *       -> { outfile, metafile }
 *     writes <outdir>/luz-check.js (default outdir: packages/check/dist);
 *     `metafile` is esbuild's metafile of that build. Importing the script
 *     builds nothing: it builds when it is the script that node runs.
 *
 * A build that cannot happen is reported in `error`, not thrown, so each
 * test fails on its own assertion and says what is missing.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const BUILDER = `${root}scripts/build-check.js`;
export const BUNDLE = "luz-check.js";

const folders = [];

/**
 * @param {string} label  for the folder name only
 * @returns {Promise<{ error: string | null, outdir: string, outfile: string, code: string, metafile: object | null }>}
 */
export async function buildCheckTo(label = "build") {
  const outdir = mkdtempSync(join(tmpdir(), `luz-check-${label}-`));
  folders.push(outdir);
  const result = { error: null, outdir, outfile: join(outdir, BUNDLE), code: "", metafile: null };
  if (!existsSync(BUILDER)) return { ...result, error: "scripts/build-check.js does not exist" };
  let mod;
  try {
    mod = await import(/* @vite-ignore */ BUILDER);
  } catch (error) {
    return { ...result, error: `scripts/build-check.js does not load: ${error.message}` };
  }
  if (typeof mod.buildCheck !== "function") return { ...result, error: "scripts/build-check.js does not export buildCheck()" };
  try {
    const built = await mod.buildCheck({ outdir });
    result.metafile = built?.metafile ?? null;
    if (built?.outfile && built.outfile !== result.outfile) return { ...result, error: `buildCheck() answered outfile ${built.outfile}, not ${result.outfile}` };
  } catch (error) {
    return { ...result, error: `buildCheck() failed: ${error.message}` };
  }
  if (!existsSync(result.outfile)) return { ...result, error: `buildCheck({ outdir }) did not write ${BUNDLE} in outdir` };
  return { ...result, code: readFileSync(result.outfile, "utf-8") };
}

let first;
/** One shared build per test file (the module registry is per file). */
export function builtOnce() {
  first ??= buildCheckTo("a");
  return first;
}

export function removeBuilds() {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
}
