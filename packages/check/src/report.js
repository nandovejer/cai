/**
 * LUZ check: findings, the report and its two forms (f5-ai-ready.md 5.3,
 * 8 "Output escaping"; the review answers of security-auditor Q3).
 *
 *   finding(key, { file, line, column, vars, suggestion, details })
 *       one finding of a rule: `key` is a key of MESSAGES (a rule id or
 *       `<rule id>:<variant>`); the severity, the message and the docs URL
 *       come from messages.js, so no rule writes its own words.
 *   buildReport({ version, files, manifests, findings, skipped, config,
 *                 ignored, strict })
 *       the --json object: sorted, every path escaped, a skipped path also
 *       a `file/skipped` warning, capped at MAX_FINDINGS_PER_FILE a file and
 *       MAX_FINDINGS in all (`summary.truncated`). `ok` is true when nothing
 *       blocks (and, with `strict`, nothing warns); the counts are the
 *       totals before the caps, so a finding that was cut still counts.
 *   formatText(report), formatJson(report)
 *       `mark file:line:column rule  message`, then the summary line; or the
 *       object with two-space indentation and a final newline.
 *
 * The text never says a page is accessible or that it passes: it says what
 * it found in the files it read.
 */
import { MESSAGES, docsUrl, message } from "./messages.js";
import { cleanText, displayPath } from "./sanitize.js";

export const MAX_FINDINGS_PER_FILE = 200;
export const MAX_FINDINGS = 5000;

/** Code-unit order, so two machines sort alike (no locale). */
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// A finding with no position sorts after the ones that have one
const at = (value) => (typeof value === "number" ? value : Infinity);

/** @returns {{ rule: string, severity: "block" | "warn", file: string, line: number | null, column: number | null, message: string, suggestion: string | null, docs: string, details?: object }} */
export function finding(key, { file, line = null, column = null, vars = {}, suggestion = null, details } = {}) {
  const text = message(key, vars); // throws on an unknown key or a missing variable
  const rule = key.split(":")[0];
  const found = {
    rule,
    severity: MESSAGES[key].severity,
    file,
    line: line ?? null,
    column: column ?? null,
    message: text,
    suggestion: suggestion ?? null,
    docs: docsUrl(rule),
  };
  if (details !== undefined) found.details = details;
  return found;
}

const order = (a, b) => byText(a.file, b.file) || at(a.line) - at(b.line) || at(a.column) - at(b.column) || byText(a.rule, b.rule);

/** The findings to print: blocking before warnings under the caps, then in reading order. */
function capped(all) {
  const ranked = all.slice().sort((a, b) => (a.severity === b.severity ? order(a, b) : a.severity === "block" ? -1 : 1));
  const perFile = new Map();
  const kept = [];
  for (const found of ranked) {
    const count = perFile.get(found.file) ?? 0;
    if (count >= MAX_FINDINGS_PER_FILE || kept.length >= MAX_FINDINGS) continue;
    perFile.set(found.file, count + 1);
    kept.push(found);
  }
  return { kept: kept.sort(order), truncated: kept.length < all.length };
}

export function buildReport({ version, files = [], manifests = [], findings = [], skipped = [], config = {}, ignored = 0, strict = false }) {
  const shown = (path) => displayPath(path);
  const skippedList = skipped.map(({ file, reason }) => ({ file: shown(file), reason })).sort((a, b) => byText(a.file, b.file) || byText(a.reason, b.reason));
  const all = [
    ...findings.map((found) => ({ ...found, file: shown(found.file) })),
    ...skippedList.map(({ file, reason }) => finding("file/skipped", { file, vars: { reason } })),
  ];
  const blocking = all.filter((found) => found.severity === "block").length;
  const warnings = all.length - blocking;
  const { kept, truncated } = capped(all);
  const off = [...(config.off ?? [])].sort(byText);
  return {
    tool: "@luz-ds/check",
    version: cleanText(version, 40),
    ok: blocking === 0 && !(strict && warnings > 0),
    files: files.map(shown).sort(byText),
    manifests: manifests.map(({ package: name, version: has, source }) => ({ package: cleanText(name, 64), version: cleanText(has, 40), source: cleanText(source, 20) })),
    summary: { files: files.length, blocking, warnings, skipped: skippedList.length, ignored, off: off.length, truncated },
    config: { file: config.file === null || config.file === undefined ? null : shown(config.file), off },
    findings: kept,
    skipped: skippedList,
  };
}

const MARK = { block: "✗", warn: "!" };
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function formatText(report) {
  const lines = report.findings.map((found) => {
    const position = found.line === null ? "" : found.column === null ? `:${found.line}` : `:${found.line}:${found.column}`;
    return `${MARK[found.severity]} ${found.file}${position} ${found.rule}  ${found.message}`;
  });
  const { summary } = report;
  const parts = [`${report.ok ? "✓" : "✗"} ${summary.blocking} blocking and ${plural(summary.warnings, "warning")} in ${plural(summary.files, "file")}`];
  if (summary.ignored > 0) parts.push(`${summary.ignored} ignored`);
  if (summary.off > 0) parts.push(`${summary.off} off`);
  if (summary.truncated) parts.push("output cut, the totals above are complete");
  let line = parts.join(", ");
  if ((summary.ignored > 0 || summary.off > 0) && report.config.file !== null) line += ` (${report.config.file})`;
  if (!report.ok && summary.blocking === 0) line += " (--strict: a warning fails)";
  if (report.manifests.length > 0) line += ` (manifests: ${report.manifests.map((m) => `${m.package} ${m.version} from ${m.source}`).join(", ")})`;
  lines.push(line);
  return `${lines.join("\n")}\n`;
}

export function formatJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}
