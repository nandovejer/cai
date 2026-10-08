/**
 * CAI — exceptions register (PRINCIPLES.md, "Exceptions").
 * Every `cai-exception: EX-nnn` comment in the source must have a row in
 * EXCEPTIONS.md; every row that names a file must find its comment there;
 * no row may except a red line (RL-n), only a strong rule (SR-n).
 *
 * Usage: node scripts/check-exceptions.js
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { dirname, resolve, relative, extname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = ["packages", "apps", "scripts", "tests"];
const SKIP = new Set(["node_modules", "dist", "fonts"]);
const EXTENSIONS = new Set([".js", ".css", ".html", ".json"]);
const COMMENT = /cai-exception:\s*(EX-\d{3})/g;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (EXTENSIONS.has(extname(name))) yield path;
  }
}

// Rows: | EX-001 | SR-3 | path/to/file.css or — | reason | date |
const rows = new Map();
const problems = [];
for (const line of readFileSync(resolve(root, "EXCEPTIONS.md"), "utf-8").split("\n")) {
  const cells = line.split("|").map((c) => c.trim());
  if (!/^EX-\d{3}$/.test(cells[1] ?? "")) continue;
  const [, id, rule, where] = cells;
  if (rows.has(id)) problems.push(`EXCEPTIONS.md: ${id} is listed twice`);
  if (!/^SR-\d+$/.test(rule)) problems.push(`EXCEPTIONS.md: ${id} excepts "${rule}" — only strong rules (SR-n) can have exceptions; red lines cannot`);
  rows.set(id, where.replace(/`/g, ""));
}

const found = new Map();
for (const dir of SCAN) {
  const base = resolve(root, dir);
  if (!existsSync(base)) continue;
  for (const path of files(base)) {
    for (const m of readFileSync(path, "utf-8").matchAll(COMMENT)) {
      const file = relative(root, path);
      if (!found.has(m[1])) found.set(m[1], new Set());
      found.get(m[1]).add(file);
      if (!rows.has(m[1])) problems.push(`${file}: ${m[1]} has no row in EXCEPTIONS.md`);
    }
  }
}

for (const [id, where] of rows) {
  if (!where || where === "—" || where === "-") continue;
  if (!found.get(id)?.has(where)) problems.push(`EXCEPTIONS.md: ${id} points at ${where}, which has no "cai-exception: ${id}" comment`);
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(`✓ exceptions: ${rows.size} registered, all consistent`);
