/**
 * LUZ — size budgets (PRINCIPLES.md §7, red line 17). Fails when a built
 * artifact is larger than its min+gzip `max` in budgets.json; warns when it
 * is above `ideal` or below `floor`. Run after `pnpm build`.
 *
 * A budget with a `glob` instead of a `file` applies to each file it
 * matches ("dir/**\/*.ext"): the docs pages, each measured as raw bytes
 * (`"compression": "none"`) in the committed docs/ (which check:generated
 * proves equal to a fresh build).
 *
 * A `file` budget of a package that does not exist yet (no
 * packages/<name>/package.json) passes vacuously with a note; once the package
 * exists, a missing file fails ("run pnpm build first").
 *
 * Two more guards keep the ceiling honest:
 *   - each `max` equals the ceiling in the PRINCIPLES.md table (same order),
 *     which changes only with its own changeset, so budgets.json cannot be
 *     raised quietly;
 *   - every chunk a budgeted JS file imports lazily is budgeted too, and it
 *     imports no other file statically;
 *   - no published packages/*\/dist/*.min.js imports a bare specifier (an
 *     inlined or missing dependency would escape its budget);
 *   - the lazy chunks (SEC-CHUNK-1, SEC-CHUNK-2): every import() of a
 *     published .min.js names a string literal; every chunk (a file another
 *     one imports lazily, in any package, and site's search, consent and
 *     mode) imports nothing, static or dynamic; site.min.js, the presence
 *     loader, has no static import, and its dynamic imports are exactly its
 *     three chunks. The same holds for the home's light, which no build
 *     touches: apps/landing/light/light.js loads exactly globe.js, globe.js
 *     loads exactly globe-data.js, and globe-data.js imports nothing (a file
 *     that is a loader may import its own chunks, lazily, and nothing else).
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
  const code = readFileSync(path, "utf-8");
  for (const [, from, bare] of code.matchAll(/(?:^|[;}\s])(?:import|export)\b[^"'();]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']|(?:^|[;}\s])import\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    const file = from ?? bare;
    if (!budgeted.has(resolve(dirname(path), file))) {
      console.error(`✗ ${relative(root, path)} imports ${file} statically, which has no budget: bundle it into the budgeted file`);
      failed = true;
    }
  }
  for (const [, target] of code.matchAll(/import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)) {
    const chunk = resolve(dirname(path), target);
    if (!budgeted.has(chunk)) {
      console.error(`✗ ${file} lazy-loads ${relative(root, chunk)}, which has no budget`);
      failed = true;
    }
  }
}

// --- No published .min.js imports another package (RL-1) ---
// A bare specifier ("@luz-ds/core/…", "lit") in a file a CDN serves would
// fail there, or pull in a dependency. Every packages/*/dist/*.min.js may
// import only its own relative files.
const SPECIFIERS = [
  /(?:^|[;}\s])(?:import|export)\b[^"'();]*?\bfrom\s*["']([^"']+)["']/g,
  /(?:^|[;}\s])import\s*["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
];
// --- The lazy chunks (security.md, Phase F3) ---
// SEC-CHUNK-1: every import() names a string literal, never a URL built
// from the page. SEC-CHUNK-2: a chunk is one file that loads nothing (so
// one integrity hash covers it), and the loader loads exactly its chunks.
// These replace the "one self-contained file" rule of the phase 4 review
// (answer 5b), which a loader with chunks cannot keep.
const IMPORT_CALL = /\bimport\s*\(/g;
const LITERAL_IMPORT = /\bimport\s*\(\s*(["'])([^"'`]+)\1\s*\)/g;
const STATIC_IMPORT = /(?:^|[;}\s])(?:import\b(?!\s*[(.])|export\b[^"'();]*?\bfrom\b)/;
const LOADERS = {
  "packages/site/dist/site.min.js": ["./consent.min.js", "./mode.min.js", "./search.min.js"],
  // The home's light (apps/landing/light/): served as written, no build, so the same rules hold for its sources
  "apps/landing/light/light.js": ["./globe.js"],
  "apps/landing/light/globe.js": ["./globe-data.js"],
};
const LIGHT = ["light.js", "globe.js", "globe-data.js"].map((name) => `apps/landing/light/${name}`);
const chunks = new Set(Object.entries(LOADERS).flatMap(([loader, targets]) => targets.map((t) => relative(root, resolve(root, dirname(loader), t)))));
const published = [];
for (const pkg of readdirSync(resolve(root, "packages"))) {
  const dist = resolve(root, "packages", pkg, "dist");
  if (!existsSync(dist)) continue;
  for (const name of readdirSync(dist).filter((f) => f.endsWith(".min.js"))) {
    const file = `packages/${pkg}/dist/${name}`;
    const code = readFileSync(resolve(root, file), "utf-8");
    published.push([file, code]);
    for (const [, , target] of code.matchAll(LITERAL_IMPORT)) {
      if (/^\.{1,2}\//.test(target)) chunks.add(relative(root, resolve(root, dirname(file), target)));
    }
  }
}
for (const file of LIGHT.filter((f) => existsSync(resolve(root, f)))) {
  const code = readFileSync(resolve(root, file), "utf-8");
  published.push([file, code]);
  for (const [, , target] of code.matchAll(LITERAL_IMPORT)) {
    if (/^\.{1,2}\//.test(target)) chunks.add(relative(root, resolve(root, dirname(file), target)));
  }
}
for (const [file, code] of published) {
  for (const specifier of SPECIFIERS.flatMap((re) => [...code.matchAll(re)].map((m) => m[1]))) {
    if (!/^\.{1,2}\//.test(specifier)) {
      console.error(`✗ ${file} imports "${specifier}": a published file imports only its own relative files (red line 1)`);
      failed = true;
    }
  }
  const calls = code.match(IMPORT_CALL)?.length ?? 0;
  const targets = [...code.matchAll(LITERAL_IMPORT)].map((m) => m[2]);
  if (calls !== targets.length) {
    console.error(`✗ ${file} has an import() whose argument is not a string literal: a lazy chunk is named, never built (SEC-CHUNK-1)`);
    failed = true;
  }
  // A chunk that is itself a loader (globe.js) answers to the loader's rules below
  if (chunks.has(file) && !LOADERS[file] && (calls || STATIC_IMPORT.test(code))) {
    console.error(`✗ ${file} is a lazy chunk and imports a file: a chunk imports nothing, static or dynamic (SEC-CHUNK-2)`);
    failed = true;
  }
  const expected = LOADERS[file];
  if (expected) {
    if (STATIC_IMPORT.test(code)) {
      console.error(`✗ ${file} has a static import: the loader imports its chunks lazily, and nothing else (SEC-CHUNK-2)`);
      failed = true;
    }
    for (const target of new Set(targets)) {
      if (!expected.includes(target)) {
        console.error(`✗ ${file} imports ${target}: the loader imports only ${expected.join(" and ")} (SEC-CHUNK-1)`);
        failed = true;
      }
    }
    for (const target of expected.filter((t) => !targets.includes(t))) {
      console.error(`✗ ${file} does not import ${target}: the loader must load each of its chunks (SEC-CHUNK-1)`);
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
  // A package that is not created yet has nothing to measure: its row passes
  // vacuously, with a note, until packages/<name>/package.json exists. From
  // then on a missing file is a failure like any other (the row is not weakened).
  const pkg = /^packages\/([^/]+)\//.exec(file)?.[1];
  if (pkg && !existsSync(resolve(root, "packages", pkg, "package.json"))) {
    console.log(`- ${name}: packages/${pkg} has no package.json yet, not measured`);
    continue;
  }
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
