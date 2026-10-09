/**
 * CAI — size budgets (PRINCIPLES.md §7, red line 17). Fails when a built
 * artifact is larger than its min+gzip `max` in budgets.json; warns when it
 * is above `ideal` or below `floor`. Run after `pnpm build`.
 *
 * A budget with a `glob` instead of a `file` applies to each file it
 * matches ("dir/**\/*.ext"): the docs pages, each measured as raw bytes
 * (`"compression": "none"`) in the committed docs/ (which check:generated
 * proves equal to a fresh build).
 *
 * Two more guards keep the ceiling honest:
 *   - each `max` equals the ceiling in the PRINCIPLES.md table (same order),
 *     which changes only with its own changeset, so budgets.json cannot be
 *     raised quietly;
 *   - every chunk a budgeted JS file imports lazily is budgeted too.
 *
 * Usage: node scripts/check-size.js
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { gzipSync } from "zlib";
import { dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { budgets } = JSON.parse(readFileSync(resolve(root, "budgets.json"), "utf-8"));

let failed = false;
const kB = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

// --- The ceilings are the ones in PRINCIPLES.md ---
const principles = readFileSync(resolve(root, "PRINCIPLES.md"), "utf-8").split("\n");
const header = principles.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
const rows = principles
  .slice(header + 2)
  .filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
if (header === -1 || rows.length !== budgets.length) {
  console.error(`✗ PRINCIPLES.md budget table has ${rows.length} rows, budgets.json ${budgets.length}: keep them in step`);
  failed = true;
} else {
  rows.forEach((cells, i) => {
    const ceiling = Math.round(parseFloat(cells.at(-1)) * 1024);
    if (budgets[i].max !== ceiling) {
      console.error(`✗ ${budgets[i].name}: budgets.json max ${kB(budgets[i].max)} ≠ PRINCIPLES.md ceiling ${cells.at(-1)} (${cells[0]})`);
      failed = true;
    }
  });
}

// --- Every lazy chunk is budgeted ---
const budgeted = new Set(budgets.filter((b) => b.file).map((b) => resolve(root, b.file)));
for (const { file } of budgets.filter((b) => b.file?.endsWith(".js"))) {
  const path = resolve(root, file);
  if (!existsSync(path)) continue;
  for (const [, target] of readFileSync(path, "utf-8").matchAll(/import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)) {
    const chunk = resolve(dirname(path), target);
    if (!budgeted.has(chunk)) {
      console.error(`✗ ${file} lazy-loads ${relative(root, chunk)}, which has no budget`);
      failed = true;
    }
  }
}

/** Files matched by "dir/**\/*.ext", repo-relative, sorted. */
function globFiles(glob) {
  const [dir, ext] = /^(.*?)\/\*\*\/\*(\.[a-z]+)$/.exec(glob)?.slice(1) ?? [];
  if (!dir) throw new Error(`unsupported glob ${glob}: use "dir/**/*.ext"`);
  const out = [];
  const walk = (d) => {
    if (!existsSync(resolve(root, d))) return;
    for (const entry of readdirSync(resolve(root, d), { withFileTypes: true })) {
      const p = `${d}/${entry.name}`;
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(ext)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

const sizeOf = (path, compression) => (compression === "none" ? readFileSync(path).length : gzipSync(readFileSync(path), { level: 9 }).length);

for (const { name, glob, compression, floor, ideal, max } of budgets.filter((b) => b.glob)) {
  const sizes = globFiles(glob).map((f) => [f, sizeOf(resolve(root, f), compression)]).sort((a, b) => b[1] - a[1]);
  if (!sizes.length) {
    console.error(`✗ ${name}: nothing matches ${glob} — run pnpm pages:build first`);
    failed = true;
    continue;
  }
  const over = sizes.filter(([, size]) => size > max);
  for (const [f, size] of over) {
    console.error(`✗ ${name}: ${f} ${kB(size)} (max ${kB(max)}) — over the ceiling: split the page, never raise it`);
    failed = true;
  }
  const [largest, size] = sizes[0];
  const line = `${name}: ${sizes.length} files, largest ${largest} ${kB(size)} (max ${kB(max)})`;
  if (over.length) continue;
  if (ideal && size > ideal) console.warn(`! ${line} — above the ideal ${kB(ideal)}`);
  else if (floor && size < floor) console.warn(`! ${line} — below ${kB(floor)}`);
  else console.log(`✓ ${line}`);
}

for (const { name, file, floor, ideal, max } of budgets.filter((b) => b.file)) {
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
