/**
 * The small harness the rule tests of @luz-ds/check share (steps 10-11 of
 * f5-ai-ready.md): a document with LUZ's two base stylesheets, a temporary
 * project run through the CLI, and the words of a rule.
 *
 *   page(body, links)       a document; with the default `links` (tokens and
 *                           core, from node_modules) the body starts at line 10
 *   links(...lines)         `<link>` lines joined for the `links` argument
 *   linkTo(pkg, file)       the `<link>` of a file of a package in node_modules
 *   check(files, options)   writes `files` (name -> text) in a temporary
 *                           folder, runs the CLI with --json over `argv`
 *                           (default ["."]) and returns { dir, code, stdout,
 *                           stderr, data, findings }. Options: `installed`
 *                           (installPackages' options: node_modules in the
 *                           project), `snapshot` (miniSnapshot's options or a
 *                           folder), `argv`, `cwd` (a folder under the
 *                           project), `env`
 *   ofRule(result, prefix)  the findings whose rule id starts with prefix
 *   rulesOf(result, ...prefixes)  their ids, in the order reported
 *   wordsOf(rule, text)     is `text` the rendering of some template of the
 *                           rule in messages.js (the base id or a variant)
 */
import { expect } from "vitest";
import { checkModule } from "./check-modules.js";
import { checkJson, installPackages, key, miniSnapshot, workspace } from "./check-fixtures.js";

const messages = await checkModule("messages");

export const linkTo = (pkg, file) => `  <link rel="stylesheet" href="node_modules/@luz-ds/${pkg}/dist/${file}">`;
export const links = (...lines) => `${lines.join("\n")}\n`;

export const LINKS = links(linkTo("tokens", "luz-tokens.min.css"), linkTo("core", "luz.min.css"));

/** A document with LUZ's two base stylesheets (or `links`): the body starts at line 10 with the default. */
export const page = (body, withLinks = LINKS) =>
  `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>Page</title>\n${withLinks}</head>\n<body>\n${body}\n</body>\n</html>\n`;

export function check(files, { argv = ["."], installed = null, snapshot = {}, env = {}, cwd = null } = {}) {
  const dir = workspace(files);
  if (installed) installPackages(dir, installed);
  const data = typeof snapshot === "string" ? snapshot : miniSnapshot(snapshot);
  const result = checkJson(argv, cwd === null ? dir : `${dir}/${cwd}`, { data, ...env });
  if (result.data === null) expect.fail(`stdout is not JSON (exit ${result.code}, stderr: ${result.stderr.slice(0, 200)})`);
  return { dir, ...result, findings: result.data.findings };
}

export const ofRule = (result, prefix) => result.findings.filter((f) => f.rule.startsWith(prefix));
export const rulesOf = (result, ...prefixes) => result.findings.filter((f) => prefixes.some((p) => f.rule.startsWith(p))).map((f) => f.rule);
export const keysOf = (findings) => findings.map(key);

export function wordsOf(rule, text) {
  return Object.entries(messages.MESSAGES).some(([name, entry]) => {
    if (name.split(":")[0] !== rule) return false;
    const fragments = entry.template.split(/\{[A-Za-z][A-Za-z0-9]*\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`^${fragments.join(".+?")}$`).test(text);
  });
}
