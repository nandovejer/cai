/**
 * LUZ check — the command line as a function: run(argv, env) -> { code,
 * stdout, stderr }, the shape of tokens/lib/cli.js, so tests run it without a
 * shell and src/main.js only connects it to the process.
 *
 *   env = { version, cwd, data }   the version of the package, the working
 *                            directory and (optional) the folder of the
 *                            bundled snapshot come in through env; this file
 *                            reads no environment variable. `data` defaults
 *                            to dist/data of this package, which is the
 *                            folder next to the bundle when it is installed.
 *
 * Exit codes: 0 nothing blocks; 1 at least one blocking finding (with
 * --strict, any warning), a file that could not be read as HTML or CSS
 * included; 2 the command was used wrongly, a configuration cannot be read,
 * or there is no file to read. run never throws: whatever fails inside it is
 * exit 2 and one sanitised line on stderr, never a stack trace.
 *
 * The rules are steps 9-11 of f5-ai-ready.md: those of names (classes,
 * elements, attributes) are rules/, the facts they read are manifests.js, and
 * parseFile() reports what the readers of html.js and css.js report
 * (parse/error). Paths, limits and symlinks are walk.js; the words are
 * messages.js; the escaping of anything that came from a file is sanitize.js.
 */
import { lstatSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigError, parseConfig } from "./config.js";
import { readCss } from "./css.js";
import { scan } from "./html.js";
import { PACKAGES as PACKAGE_ORDER, createFacts } from "./manifests.js";
import { buildReport, finding, formatJson, formatText } from "./report.js";
import { checkParsed, namesLuz } from "./rules/index.js";
import { createBudget } from "./rules/shared.js";
import { cleanText, displayPath } from "./sanitize.js";
import { collect, readLimited } from "./walk.js";

// dist/data of this package: from src/ and from the bundle in dist/ alike
const BUNDLED_DATA = fileURLToPath(new URL("../dist/data/", import.meta.url));
const NO_MANIFEST = "No LUZ manifest to read: the files name LUZ, and neither node_modules/@luz-ds nor the data bundled with luz-check has one; reinstall @luz-ds/check.";
const STYLE_TAG = /<style\b/i;

export const USAGE = `Usage: luz-check [paths…] [--json] [--strict] [--config <file>] [--theme <file.css>] [--ext .astro,.vue]
       luz-check agent
       luz-check --version | --help

Reads the HTML and CSS you wrote and says which LUZ classes, elements, load
order and theme colours are wrong. It runs offline and writes nothing. A path
is a file, a folder (read recursively: .html, .htm and .css) or a glob such as
"src/**/*.html"; with no path it reads the current folder.

  --json           print the report as JSON
  --strict         fail on a warning as well
  --config <file>  read this configuration instead of luz-check.json
  --theme <file>   a theme stylesheet (repeatable)
  --ext <list>     also read these extensions as HTML, such as .astro,.vue
  agent            print the accessibility reviewer
  --version        print the version
  --help           show this text

Limits: 1 MiB a file, 128 MiB, 5 000 entries and 64 folders deep. It never
follows a link; what it did not read is listed as skipped.

Exit code 0 when nothing blocks, 1 when a finding blocks, 2 for a usage error or nothing to read.

It reads source files only. It does not check names, labels, alt text,
headings or the language of a page, and a run with no findings says nothing
about them.`;

const VALUE_OPTIONS = new Set(["--config", "--theme", "--ext"]);
const EXTENSION = /^\.?[A-Za-z0-9]{1,16}$/;
const OPTION_HINT = "luz-check --help lists the options.";

/** The one text a person may see for something that came from outside: cut, then escaped. */
const shown = (value, max = 80) => displayPath([...String(value)].slice(0, max).join(""));

const usageError = (text) => ({ code: 2, stdout: "", stderr: `${text}\n` });

/**
 * @param {string[]} args
 * @returns {{ error: string } | { help: boolean, version: boolean, json: boolean, strict: boolean, config: string | null, themes: string[], ext: string[], paths: string[] }}
 */
function parseArgs(args) {
  const options = { help: false, version: false, json: false, strict: false, config: null, themes: [], ext: [], paths: [] };
  let onlyPaths = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (onlyPaths || !arg.startsWith("-") || arg === "-") {
      options.paths.push(arg);
      continue;
    }
    if (arg === "--") onlyPaths = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--version" || arg === "-v") options.version = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--strict") options.strict = true;
    else {
      const equals = arg.indexOf("=");
      const name = equals === -1 ? arg : arg.slice(0, equals);
      if (!VALUE_OPTIONS.has(name)) return { error: `Unknown option ${shown(arg, 40)}; ${OPTION_HINT}` };
      const value = equals === -1 ? args[++i] : arg.slice(equals + 1);
      if (value === undefined || value === "" || (equals === -1 && value.startsWith("-"))) return { error: `${name} needs a value; ${OPTION_HINT}` };
      if (name === "--config") options.config = value;
      else if (name === "--theme") options.themes.push(value);
      else {
        for (const part of value.split(",")) {
          const extension = part.trim();
          if (!EXTENSION.test(extension)) return { error: `--ext takes extensions such as .astro,.vue, not ${shown(extension, 20)}` };
          options.ext.push(extension.startsWith(".") ? extension : `.${extension}`);
        }
      }
    }
  }
  return options;
}

/** What the readers say about one file, and its elements or classes for the rules. */
function parseFile(file) {
  if (file.kind === "css") {
    const css = readCss(file.text, file.path);
    const errors = css.findings.map((problem) => ({ line: problem.line, column: problem.column, kind: "CSS" }));
    return { path: file.path, kind: file.kind, css, records: [], errors };
  }
  const records = [];
  const errors = [];
  for (const record of scan(file.text, file.path)) {
    if (record.type === "error") {
      errors.push({ line: record.line, column: record.column, kind: "HTML" });
      break;
    }
    records.push(record);
  }
  return { path: file.path, kind: file.kind, css: null, records, errors };
}

/** The classes some stylesheet of the run defines: a .css file or a <style> of a page. Read once, on the first need. */
function definedClasses(files) {
  let names = null;
  const build = () => {
    names = new Set();
    for (const file of files) {
      if (file.kind === "css") {
        for (const entry of readCss(file.text, file.path).classes) if (entry.defined) names.add(entry.name);
      } else if (STYLE_TAG.test(file.text)) {
        for (const record of scan(file.text, file.path)) {
          if (record.type !== "element" || record.name !== "style" || !record.text) continue;
          for (const entry of readCss(record.text, file.path).classes) if (entry.defined) names.add(entry.name);
        }
      }
    }
  };
  return {
    has(name) {
      if (names === null) build();
      return names.has(name);
    },
  };
}

/** luz-check.json of the working directory, or the file --config names. -> { config, file } */
function loadConfig(cwd, option) {
  const wanted = option === null ? resolve(cwd, "luz-check.json") : resolve(cwd, option);
  const name = displayPath(option === null ? "luz-check.json" : relative(resolve(cwd), wanted).split(sep).join("/") || ".");
  let stat;
  try {
    stat = lstatSync(wanted);
  } catch {
    if (option === null) return { config: parseConfig("{}"), file: null };
    throw new ConfigError(name, "was not found");
  }
  if (stat.isSymbolicLink()) throw new ConfigError(name, "is a link, which luz-check does not follow; name the file itself");
  if (!stat.isFile()) throw new ConfigError(name, "is not a file");
  const read = readLimited(wanted, 1 << 20);
  if (read.reason) throw new ConfigError(name, read.reason === "too-large" ? "is larger than 64 kB" : "could not be read");
  return { config: parseConfig(read.text, name), file: name };
}

function execute(argv, env) {
  if (!Array.isArray(argv) || argv.some((arg) => typeof arg !== "string")) return usageError(`luz-check takes text arguments; ${OPTION_HINT}`);
  // --help and --version answer first, whatever else is wrong with the line
  if (argv.includes("--help") || argv.includes("-h")) return { code: 0, stdout: `${USAGE}\n`, stderr: "" };
  const version = env && typeof env.version === "string" ? env.version : null;
  if (argv.includes("--version") || argv.includes("-v")) {
    if (version === null) return usageError("luz-check has no version here.");
    return { code: 0, stdout: `@luz-ds/check ${cleanText(version, 40)}\n`, stderr: "" };
  }
  const options = parseArgs(argv);
  if ("error" in options) return usageError(options.error);
  if (!env || typeof env.cwd !== "string" || version === null) return usageError("luz-check needs a working directory and a version.");
  const { cwd } = env;

  if (options.paths.length === 1 && options.paths[0] === "agent") {
    return usageError("luz-check agent is not available in this version; to read a folder named agent, write ./agent.");
  }

  const { config, file: configFile } = loadConfig(cwd, options.config);
  const strict = options.strict || config.strict;
  const inputs = options.paths.length > 0 ? options.paths : ["."];

  const extensions = [...new Set(options.ext)];
  const read = collect(inputs, { cwd, ext: extensions, ignore: config.ignore });
  if (read.missing.length > 0) {
    const names = read.missing.map((input) => shown(input)).join(", ");
    return usageError(`No file matches ${names}; luz-check reads .html, .htm and .css files and the extensions of --ext.`);
  }

  // Theme files are CSS the contrast check reads; they are read, and counted, like any other file
  const themes = [...config.themes, ...options.themes];
  for (const theme of themes) {
    if (!theme.toLowerCase().endsWith(".css")) return usageError(`Theme ${shown(theme)} is not a .css file.`);
  }
  const themed = themes.length > 0 ? collect(themes, { cwd, ignore: [] }) : { files: [], skipped: [], missing: [], ignored: 0 };
  if (themed.missing.length > 0) return usageError(`No theme file ${themed.missing.map((input) => shown(input)).join(", ")}.`);

  const byPath = new Map();
  for (const file of [...read.files, ...themed.files]) if (!byPath.has(file.path)) byPath.set(file.path, file);
  const skipped = [...read.skipped];
  for (const entry of themed.skipped) if (!skipped.some((s) => s.file === entry.file)) skipped.push(entry);
  const files = [...byPath.values()];

  if (files.length === 0) {
    const left = read.ignored > 0 ? ` (${read.ignored} left out by the ignore list)` : "";
    return usageError(`No HTML or CSS file to read${left}; luz-check reads .html, .htm and .css files and the extensions of --ext.`);
  }

  const data = typeof env.data === "string" && env.data !== "" ? env.data : BUNDLED_DATA;
  const facts = createFacts({ data });
  const defined = definedClasses(files);
  const startFile = createBudget();
  const manifests = [];
  const seen = new Set();
  const findings = [];
  for (const file of files) {
    const parsed = parseFile(file);
    for (const error of parsed.errors) {
      const key = file.kind === "template" ? "parse/error:template" : "parse/error";
      findings.push(finding(key, { file: file.path, line: error.line, column: error.column, vars: { kind: error.kind } }));
    }
    if (!namesLuz(parsed)) continue;
    const world = facts.forDirectory(dirname(resolve(cwd, file.path)));
    if (world.packages.length === 0) return usageError(NO_MANIFEST);
    for (const entry of world.packages) {
      const key = `${entry.package} ${entry.version} ${entry.source}`;
      if (!seen.has(key)) {
        seen.add(key);
        manifests.push(entry);
      }
    }
    for (const found of checkParsed(parsed, { world, defined, take: startFile() })) findings.push(found);
  }
  // A warning a config switched off is not reported; a blocking rule cannot be switched off
  const kept = findings.filter((found) => !(found.severity === "warn" && config.rules[found.rule] === "off"));
  const order = new Map(PACKAGE_ORDER.map((name, index) => [`@luz-ds/${name}`, index]));
  manifests.sort((a, b) => order.get(a.package) - order.get(b.package));
  const report = buildReport({
    version,
    files: files.map((file) => file.path),
    manifests,
    findings: kept,
    skipped,
    config: { file: configFile, off: Object.keys(config.rules) },
    ignored: read.ignored,
    strict,
  });
  return { code: report.ok ? 0 : 1, stdout: options.json ? formatJson(report) : formatText(report), stderr: "" };
}

/**
 * @param {string[]} argv arguments after the program name
 * @param {{ version: string, cwd: string }} env
 * @returns {{ code: number, stdout: string, stderr: string }}
 */
export function run(argv, env) {
  try {
    return execute(argv, env);
  } catch (error) {
    if (error instanceof ConfigError) return usageError(cleanText(error.message, 200));
    const detail = error && typeof error.message === "string" ? cleanText(error.message, 80) : "no detail";
    return usageError(`luz-check stopped (${detail}); no file was checked.`);
  }
}
