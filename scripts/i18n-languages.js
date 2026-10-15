/**
 * LUZ Design System — the languages of core
 *
 * A language is a JSON file, packages/core/src/i18n/<code>.json, and the
 * module a page runs (dist/i18n-<code>.js) is always written by the build:
 * `export default` of what this file validated, through JSON.stringify.
 * Bytes a contributor wrote never run (f6-languages.md, security review).
 *
 * The schema: the keys are exactly the keys of English (plus one optional
 * `$header` object that never reaches the module); the values are strings
 * with the same {placeholders} as English, at most 3 x the English value + 40
 * characters, with no raw line or paragraph separator, no bidi override
 * (U+202A to U+202E, raw or escaped: the parsed value has the character
 * either way), no markup, no address ("://", "www.", "@"). The isolates
 * U+2066 to U+2069 are allowed, and required around {column}, {mode} and
 * {lang} in a right-to-left language.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Primary subtags written right to left. */
const RTL = new Set(["ar", "fa", "he", "ur", "ps", "sd", "ug", "yi", "dv", "ckb"]);
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const FORBIDDEN = [
  [/\u2028|\u2029/, "a raw line or paragraph separator (U+2028, U+2029)"],
  [/[\u202a-\u202e]/, "a bidi override (U+202A to U+202E); only the isolates U+2066 to U+2069 are allowed"],
  [/:\/\//, 'a URL ("://")'],
  [/www\./i, 'a web address ("www.")'],
  [/@/, 'an "@" (an address or a handle)'],
  [/[<&]/, 'markup ("<" or "&"): strings are written with textContent'],
];

const placeholdersOf = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** The `en` dictionary of packages/core/src/i18n.js, as { key: value }. */
export function englishOf(source) {
  const start = /\ben\s*:\s*\{/.exec(source);
  if (!start) throw new Error("i18n.js has no `en: {` dictionary");
  const out = {};
  const row = /^\s*([A-Za-z_$][\w$]*)\s*:\s*("(?:[^"\\\n]|\\.)*"),?\s*$/;
  for (const line of source.slice(start.index + start[0].length).split("\n")) {
    if (/^\s*\},?\s*$/.test(line)) break;
    const m = row.exec(line);
    if (m) out[m[1]] = JSON.parse(m[2]);
  }
  return out;
}

/** The problems of a parsed language file against English, as readable lines; [] when valid. */
export function languageProblems(dict, en, { code = "xx" } = {}) {
  if (dict === null || typeof dict !== "object" || Array.isArray(dict)) return ["the file is not a JSON object"];
  const problems = [];
  const own = Object.keys(dict).filter((k) => k !== "$header");
  for (const key of Object.keys(en)) if (!own.includes(key)) problems.push(`missing key "${key}"`);
  for (const key of own) if (!Object.hasOwn(en, key)) problems.push(`extra key "${key}" (only $header and the keys of en)`);
  for (const key of own.filter((k) => Object.hasOwn(en, k))) {
    const value = dict[key];
    if (typeof value !== "string") {
      problems.push(`"${key}" is not a string`);
      continue;
    }
    if (!value.trim()) problems.push(`"${key}" is empty`);
    if (placeholdersOf(value).join() !== placeholdersOf(en[key]).join()) {
      problems.push(`"${key}" has placeholders {${placeholdersOf(value)}}, English has {${placeholdersOf(en[key])}}`);
    }
    if (value.length > 3 * en[key].length + 40) problems.push(`"${key}" is ${value.length} characters, over 3 x English + 40`);
    for (const [re, what] of FORBIDDEN) if (re.test(value)) problems.push(`"${key}" has ${what}`);
    if (RTL.has(code)) {
      const bare = value.replace(/[\u2066-\u2068]\{(?:column|mode|lang)\}\u2069/g, "");
      if (/\{(?:column|mode|lang)\}/.test(bare)) problems.push(`"${key}": in a right-to-left language {column}, {mode} and {lang} sit in an isolate (U+2066 to U+2068 ... U+2069)`);
    }
  }
  if (Object.hasOwn(dict, "$header")) {
    const header = dict.$header;
    if (header === null || typeof header !== "object" || Array.isArray(header)) {
      problems.push("$header is not an object");
    } else {
      for (const [field, value] of Object.entries(header)) {
        if (typeof value !== "string") problems.push(`$header.${field} is not a string`);
        else if (/@|:\/\/|www\./i.test(value)) problems.push(`$header.${field} names an address: write the GitHub handle, never an e-mail`);
        else if (["author", "reviewer"].includes(field) && !HANDLE.test(value)) problems.push(`$header.${field} is not a GitHub handle`);
      }
    }
  }
  return problems;
}

/**
 * Read and validate every packages/core/src/i18n/<code>.json.
 * @returns {{ languages: { code: string, strings: object }[], failures: string[] }}
 *   failures: one line per problem, each naming the file
 */
export function readLanguages(srcRoot) {
  const dir = join(srcRoot, "i18n");
  const en = englishOf(readFileSync(join(srcRoot, "i18n.js"), "utf-8"));
  const languages = [];
  const failures = [];
  const names = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  for (const name of names) {
    const code = name.slice(0, -".json".length);
    const where = `src/i18n/${name}`;
    if (!/^[a-z]{2,3}$/.test(code)) {
      failures.push(`${where}: the file name is a primary language subtag (two or three letters, lower case)`);
      continue;
    }
    let dict;
    try {
      dict = JSON.parse(readFileSync(join(dir, name), "utf-8"));
    } catch (error) {
      failures.push(`${where}: not valid JSON (${error.message})`);
      continue;
    }
    const problems = languageProblems(dict, en, { code });
    failures.push(...problems.map((p) => `${where}: ${p}`));
    if (!problems.length) {
      const strings = { ...dict };
      delete strings.$header;
      languages.push({ code, strings });
    }
  }
  return { languages, failures };
}

/** The text of dist/i18n-<code>.js: `export default` of the strings, and nothing else. */
export function moduleOf(strings) {
  // The isolates are written as escapes: a reader of the file sees what they are
  const json = JSON.stringify(strings, null, 2).replace(/[\u2066-\u2069]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
  return `export default ${json};\n`;
}
