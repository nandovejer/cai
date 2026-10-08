/**
 * CAI — size budgets (PRINCIPLES.md §7, red line 17). Fails when a built
 * artifact is larger than its min+gzip `max` in budgets.json; warns when it
 * is above `ideal` or below `floor`. Run after `pnpm build`.
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
const kB = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

for (const { name, file, floor, ideal, max } of budgets) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    console.error(`✗ ${name}: ${file} not found — run pnpm build first`);
    failed = true;
    continue;
  }
  const size = gzipSync(readFileSync(path), { level: 9 }).length;
  const line = `${name}: ${kB(size)} (max ${kB(max)})`;
  if (size > max) {
    console.error(`✗ ${line} — over the ceiling: optimise or remove, never raise it`);
    failed = true;
  } else if (ideal && size > ideal) {
    console.warn(`! ${line} — above the ideal ${kB(ideal)}, review before adding more`);
  } else if (floor && size < floor) {
    console.warn(`! ${line} — below ${kB(floor)}, a theme or scale is probably missing`);
  } else {
    console.log(`✓ ${line}`);
  }
}
process.exit(failed ? 1 : 0);
