/**
 * LUZ — release QA runner (what the /qa-release skill runs).
 * Runs, in order, the checks CI runs plus the Playwright suites, records
 * each result, and writes an evidence report to test-results/qa-release/.
 * Then lists what no script can decide: the manual and the browser reviews.
 *
 * It never runs the `firefox` or `webkit` Playwright projects: those need the
 * owner's permission (AGENTS.md section 6) and go through firefox-reviewer and
 * safari-reviewer.
 *
 * Usage: node scripts/qa-release.js [--skip-ui] [--fast]
 *   --skip-ui  skip the Playwright suites (lint, checks and unit tests only)
 *   --fast     skip `pnpm build` and `check:generated` (the packages are
 *              already built; do not use for a release); `check:ai` always runs
 * Exit code: 0 when every step passed, 1 when one failed.
 */
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

/** Run a command, capture its output; never throws. */
function run(command, argv, options = {}) {
  const started = Date.now();
  const result = spawnSync(command, argv, { cwd: root, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, ...options });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return { code: result.status ?? 1, output, seconds: Math.round((Date.now() - started) / 100) / 10 };
}
const git = (...argv) => (spawnSync("git", argv, { cwd: root, encoding: "utf-8" }).stdout ?? "").trim();

/* ---- Steps ----------------------------------------------------------------- */

const UI = ["--project=chromium", "--project=chromium-nojs", "--reporter=line", "--workers=3"];
const steps = [
  ...(args.has("--fast") ? [] : [{ name: "Build (tokens, core, site, landing, cms, app)", cmd: [pnpm, "build"] }]),
  { name: "Lint CSS (stylelint: RL-5, 8, 10, 11, SR-3, SR-4)", cmd: [pnpm, "lint:css"] },
  { name: "Lint JS (ESLint: RL-3, HTML sinks)", cmd: [pnpm, "lint:js"] },
  { name: "Size budgets (RL-17)", cmd: [pnpm, "check:size"] },
  { name: "Shipped strings (SR-1)", cmd: [pnpm, "check:strings"] },
  { name: "Exceptions register", cmd: [pnpm, "check:exceptions"] },
  { name: "Tarball contents", cmd: [pnpm, "check:pack"] },
  { name: "Token contrast (RL-7)", cmd: [pnpm, "check:contrast"] },
  ...(args.has("--fast") ? [] : [{ name: "Generated files (RL-14: docs/ is the Pages build)", cmd: [pnpm, "check:generated"] }]),
  { name: "Files for AI agents (RL-19: manifests, llms.txt, examples, READMEs, agent)", cmd: [pnpm, "check:ai"] },
  { name: "Unit tests", cmd: [pnpm, "test:unit"] },
  ...(args.has("--skip-ui") ? [] : [{ name: "Playwright: chromium and chromium-nojs", cmd: [pnpm, "exec", "playwright", "test", ...UI] }]),
];

console.log(`QA release: ${steps.length} steps\n`);
const results = [];
for (const step of steps) {
  process.stdout.write(`… ${step.name}`);
  const r = run(step.cmd[0], step.cmd.slice(1), { env: { ...process.env, CI: "" } });
  results.push({ ...step, ...r });
  console.log(`\r${r.code === 0 ? "✓" : "✗"} ${step.name} (${r.seconds}s)`);
}

/* ---- Facts the report states ------------------------------------------------ */

const summary = (r) => {
  // Drop pnpm's own "> package script" banner lines
  const lines = r.output.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith(">"));
  const counts = lines.filter((l) => /\b\d+ (passed|failed|flaky|skipped)\b|Tests\s+\d+|✓ .*:|! .*:/.test(l));
  return ((counts.length ? counts : lines).slice(-4).join(" · ") || "no output").replace(/\|/g, "\\|");
};

const lastTag = git("describe", "--tags", "--abbrev=0");
const base = lastTag || "main";
const changed = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
const dirty = git("status", "--short").split("\n").filter(Boolean);
const uiFiles = changed.filter((f) => /^packages\/(core|site|landing|cms|app|tokens|check)\/src\//.test(f) || /^packages\/core\/src\/(components|elements)\//.test(f));
const components = [...new Set(uiFiles.filter((f) => /components\/[\w-]+\.(css|js)$/.test(f)).map((f) => f.match(/components\/([\w-]+)\./)[1]).filter((n) => !n.startsWith("_") && n !== "index"))].sort();
const changesets = existsSync(join(root, ".changeset")) ? readdirSync(join(root, ".changeset")).filter((f) => f.endsWith(".md") && f !== "README.md") : [];
// Open Safari and Firefox reviews live in Claude's memory for this repo (AGENTS.md section 6).
const ledgerFile = join(homedir(), ".claude", "projects", root.replace(/[\\/]/g, "-"), "memory", "luz-browser-review-pending.md");
const ledger = existsSync(ledgerFile) ? readFileSync(ledgerFile, "utf-8") : null;
const openRows = ledger
  ? (ledger.split(/^## Open\s*$/m)[1] ?? "").split(/^## /m)[0].split("\n").filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}/.test(l))
  : [];
const snapshots = dirty.filter((l) => l.includes("-snapshots/"));

/* ---- Report ----------------------------------------------------------------- */

const failed = results.filter((r) => r.code !== 0);
const out = [];
out.push("# QA release evidence", "");
out.push("| | |", "| --- | --- |");
out.push(`| Date | ${new Date().toISOString()} |`);
out.push(`| Branch | ${git("rev-parse", "--abbrev-ref", "HEAD")} |`);
out.push(`| Commit | ${git("rev-parse", "--short", "HEAD")}${dirty.length ? ` (${dirty.length} uncommitted changes)` : ""} |`);
out.push(`| Compared with | ${lastTag ? `tag ${lastTag}` : "main (no tag yet)"} |`);
out.push(`| Node | ${process.version} |`);
out.push(`| Result | **${failed.length ? `${failed.length} of ${results.length} steps failed` : `all ${results.length} steps passed`}** |`, "");

out.push("## Automated steps", "", "| Step | Result | Time | Output |", "| --- | --- | --- | --- |");
for (const r of results) out.push(`| ${r.name} | ${r.code === 0 ? "pass" : "**FAIL**"} | ${r.seconds}s | ${summary(r)} |`);
out.push("");
for (const r of failed) out.push(`### Failure: ${r.name}`, "", "```text", r.output.split("\n").slice(-60).join("\n"), "```", "");

out.push("## Needs a person", "");
out.push("Nothing below was decided by a script.", "");
out.push("### Browsers (AGENTS.md section 6)", "");
out.push("- **Not run here:** the `firefox` and `webkit` Playwright projects. They run only with the owner's permission, through `firefox-reviewer` and `safari-reviewer`.");
if (ledger === null) out.push("- The pending list `luz-browser-review-pending.md` was not found in Claude's memory: ask what has not been reviewed.");
else if (openRows.length === 0) out.push("- The pending list has **no open rows**.");
else {
  out.push(`- The pending list has **${openRows.length} open row${openRows.length === 1 ? "" : "s"}**. The security audit gives no OK while any is open (AGENTS.md section 6):`);
  for (const row of openRows) {
    const cells = row.split("|").map((c) => c.trim());
    out.push(`  - ${cells[1]}: ${cells[2]} (missing: ${cells[4] || "?"})`);
  }
}
out.push("");
out.push("### Assistive technology (SR-6)", "");
out.push(`- Changed since ${base}: ${uiFiles.length} source files in \`packages/*/src\`${components.length ? `; components: ${components.map((c) => `\`${c}\``).join(", ")}` : ""}.`);
out.push("- Each changed component needs hand testing with NVDA + Firefox, VoiceOver + Safari, TalkBack + Chrome and Orca + Firefox. Fill one `tests/manual/SR-6-evidence-template.md` per component, and list in the accessibility statement only the pairs actually used.");
out.push("");
out.push("### Release hygiene", "");
out.push(`- Changesets waiting: ${changesets.length}${changesets.length ? ` (${changesets.slice(0, 8).join(", ")}${changesets.length > 8 ? ", …" : ""})` : ""}. Read them: do they say how to migrate?`);
out.push(`- Working tree: ${dirty.length ? `**${dirty.length} uncommitted changes**, so the evidence is not for a commit` : "clean"}.`);
if (snapshots.length) out.push(`- Visual snapshots changed (${snapshots.length}): look at each PNG in the diff before committing it.`);
out.push("- Accessibility statement (`apps/docs/pages/accessibility.html`): known issues and the tested combinations match this release?");
out.push("");

const dir = join(root, "test-results", "qa-release");
mkdirSync(dir, { recursive: true });
const file = join(dir, `report-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
writeFileSync(file, `${out.join("\n")}\n`);
console.log(`\n${failed.length ? `✗ ${failed.length} of ${results.length} steps failed` : `✓ all ${results.length} steps passed`}\nReport: ${file.replace(`${root}/`, "")}`);
process.exit(failed.length ? 1 : 0);
