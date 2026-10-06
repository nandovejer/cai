/**
 * CAI — size budgets (PRINCIPLES.md §7). Fails when a built artifact is
 * larger than its min+gzip budget in budgets.json. Run after `pnpm build`.
 *
 * Usage: node scripts/check-size.js
 */
import { readFileSync, existsSync } from "fs";
import { gzipSync } from "zlib";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { budgets } = JSON.parse(readFileSync(resolve(root, "budgets.json"), "utf-8"));

let failed = false;
for (const { name, file, max } of budgets) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    console.error(`✗ ${name}: ${file} not found — run pnpm build first`);
    failed = true;
    continue;
  }
  const size = gzipSync(readFileSync(path), { level: 9 }).length;
  const ok = size <= max;
  console.log(`${ok ? "✓" : "✗"} ${name}: ${(size / 1024).toFixed(2)} kB of ${(max / 1024).toFixed(2)} kB`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
