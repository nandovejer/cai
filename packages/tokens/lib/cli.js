/**
 * LUZ — `luz-tokens` command line (npx @luz-ds/tokens check-contrast <file.css>).
 * The commands live here as functions of (argv, files) → { code, stdout,
 * stderr }, so the tests run them without a shell; bin/luz-tokens.js only
 * connects them to the process.
 *
 * Exit codes: 0 every pair meets its minimum; 1 a pair fails, or a colour
 * could not be read (an unmeasured pair is never reported as fine); 2 the
 * command was used wrongly or a file could not be read.
 */
import { analyze } from "./check.js";
import { formatRatio } from "./contrast.js";
import { parseRules } from "./theme.js";

export const USAGE = `Usage: luz-tokens check-contrast <file.css> [more.css…] [--json]

Checks the colour pairs LUZ promises to keep readable, in light, dark and
high-contrast (and in every [data-theme="name"] your files define), with the
--luz-* tokens your files override, against WCAG 2.x: 4.5:1 for text, 3:1 for
text that is disabled, and for focus rings, field borders and icons.

  <file.css>   a stylesheet with your --luz-* overrides; list several in the
               order your page loads them
  --json       print the result as JSON (ok, checked, failures, warnings, unreadable, ignored)
  --strict     treat warnings (aims LUZ sets itself, stricter than WCAG) as failures
  --tokens <f> read LUZ's tokens from this file instead of the installed
               dist/tokens.css
  --help       show this text

Exit code 0 when every pair passes, 1 when one fails or cannot be read, 2 for
a usage or file error.`;

function parseArgs(argv) {
  const options = { files: [], json: false, strict: false, tokens: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") options.json = true;
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--tokens") options.tokens = argv[++i] ?? "";
    else if (arg.startsWith("--")) throw new Error(`unknown option ${arg}`);
    else options.files.push(arg);
  }
  return options;
}

/**
 * @param {string[]} argv arguments after the program name
 * @param {{ read(path: string): string, tokensPath: string }} env
 */
export function run(argv, env) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h" || command === "help") return { code: command ? 0 : 2, stdout: command ? `${USAGE}\n` : "", stderr: command ? "" : `${USAGE}\n` };
  if (command !== "check-contrast") return { code: 2, stdout: "", stderr: `Unknown command "${command}".\n\n${USAGE}\n` };

  let options;
  try {
    options = parseArgs(rest);
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${error.message}\n\n${USAGE}\n` };
  }
  if (options.help) return { code: 0, stdout: `${USAGE}\n`, stderr: "" };
  if (options.files.length === 0 || options.tokens === "") return { code: 2, stdout: "", stderr: `Name at least one CSS file.\n\n${USAGE}\n` };

  const sources = [];
  try {
    sources.push({ file: "tokens", rules: parseRules(env.read(options.tokens ?? env.tokensPath)) });
    for (const file of options.files) sources.push({ file, rules: parseRules(env.read(file)) });
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${error.message}\n` };
  }

  const { ok, modes, checked, failures, warnings, unreadable, ignored } = analyze(sources, { strict: options.strict });

  if (options.json) {
    const report = { ok, files: options.files, modes, checked, failures, warnings, unreadable, ignored };
    return { code: ok ? 0 : 1, stdout: `${JSON.stringify(report, null, 2)}\n`, stderr: "" };
  }

  const lines = [];
  // The same pair at the same ratio in several modes is one line
  const group = (list) => {
    const grouped = new Map();
    for (const f of list) {
      const key = `${f.foreground}|${f.background}|${f.minimum}|${f.ratio}`;
      if (grouped.has(key)) grouped.get(key).modes.push(f.mode);
      else grouped.set(key, { ...f, modes: [f.mode] });
    }
    return [...grouped.values()];
  };
  const grouped = group(failures);
  for (const [mark, list] of [["✗", grouped], ["!", group(warnings)]]) {
    for (const f of list) {
      lines.push(`${mark} ${f.modes.join(", ")}: ${f.foreground} on ${f.background} is ${formatRatio(f.ratio)}, ${mark === "!" ? "LUZ aims for" : "needs"} ${f.minimum}:1 (${f.kind})`);
      for (const o of f.overrides) lines.push(`    ${o.token}: ${o.value} is set in ${o.file}:${o.line}`);
    }
  }
  for (const u of unreadable) {
    lines.push(`? ${u.mode}: ${u.foreground} on ${u.background} was not measured: ${u.reason}`);
    for (const o of u.overrides) lines.push(`    ${o.token}: ${o.value} is set in ${o.file}:${o.line}`);
  }
  for (const i of ignored) lines.push(`! ${i.file}:${i.line} ${i.selector} ignored: ${i.reason}`);
  lines.push(ok ? `✓ contrast: ${checked} pairs in ${modes.length} modes (${modes.join(", ")}) meet WCAG 2.x${warnings.length ? `, ${group(warnings).length} warnings` : ""}` : `✗ contrast: ${grouped.size} pairs fail (${failures.length} of ${checked} measurements)${unreadable.length ? `, ${unreadable.length} could not be read` : ""} in ${modes.join(", ")}`);
  return { code: ok ? 0 : 1, stdout: `${lines.join("\n")}\n`, stderr: "" };
}
