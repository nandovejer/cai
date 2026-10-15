/**
 * What the tests of core's languages read from the source (F6, .claude/plans/
 * specs/f6-languages.md, "Review answers (2026-10-15)"):
 *
 *   enDictionary(text)        the `en` object of packages/core/src/i18n.js, as
 *                             { key: value } (English stays in the entry)
 *   objectAfter(text, re)     the { key: value } of the first `{ … }` that
 *                             follows the match of `re` (string values only)
 *   languageProblems(dict, en, { code })
 *                             every way a language file of
 *                             packages/core/src/i18n/<code>.json breaks the
 *                             schema, as readable lines; [] when it is valid
 *   languageFiles()           the codes of packages/core/src/i18n/*.json
 *
 * The schema is the security-auditor's list: the keys are exactly the keys of
 * `en` (plus one optional `$header` object that never reaches the built
 * module), the values are strings with the same {placeholders} as English, at
 * most 3 x the English value + 40 characters long, with no raw U+2028 or
 * U+2029, no bidi override U+202A to U+202E (raw or escaped: the parsed value
 * has the character either way), no "://", no "www." and no "@". The isolates
 * U+2066 to U+2069 are allowed, and required around {column}, {mode} and
 * {lang} in a right-to-left language.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const coreSrc = join(repo, "packages/core/src");
export const languagesDir = join(coreSrc, "i18n");

/** Primary subtags written right to left. */
export const RTL = new Set(["ar", "fa", "he", "ur", "ps", "sd", "ug", "yi", "dv", "ckb"]);

/** Index of the `}` that closes the `{` at `open`; strings and comments are skipped. */
function closing(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i += 1; i < text.length && text[i] !== c; i += 1) if (text[i] === "\\") i += 1;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
    } else if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error("unbalanced braces");
}

/** { key: value } of the object literal that opens right after the first match of `re`. */
export function objectAfter(text, re) {
  const match = re.exec(text);
  if (!match) throw new Error(`${re} not found`);
  const open = text.indexOf("{", match.index + match[0].length - 1);
  const body = text.slice(open + 1, closing(text, open));
  const out = {};
  for (const [, key, quoted] of body.matchAll(/(?:^|[\s,])([A-Za-z_$][\w$]*|"[^"\n]+")\s*:\s*("(?:[^"\\\n]|\\.)*")/g)) {
    out[key.replace(/^"|"$/g, "")] = JSON.parse(quoted);
  }
  return out;
}

/** The English dictionary, from the text of packages/core/src/i18n.js. */
export function enDictionary(text) {
  return objectAfter(text, /\ben\s*:\s*\{/);
}

export const placeholdersOf = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** The language codes that have a JSON source. */
export function languageFiles() {
  return existsSync(languagesDir)
    ? readdirSync(languagesDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -".json".length))
        .sort()
    : [];
}

const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const FORBIDDEN = [
  [/\u2028|\u2029/, "a raw line or paragraph separator (U+2028, U+2029)"],
  [/[\u202A-\u202E]/, "a bidi override (U+202A to U+202E); only the isolates U+2066 to U+2069 are allowed"],
  [/:\/\//, 'a URL ("://")'],
  [/www\./i, 'a web address ("www.")'],
  [/@/, 'an "@" (an address or a handle)'],
  [/[<&]/, 'markup ("<" or "&"): strings are written with textContent'],
];

/** The problems of a language file against `en`; `code` is the language's primary subtag. */
export function languageProblems(dict, en, { code = "xx" } = {}) {
  const problems = [];
  if (dict === null || typeof dict !== "object" || Array.isArray(dict)) return ["the file is not a JSON object"];
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

/** The text of a file of packages/core/src. */
export const readCore = (name) => readFileSync(join(coreSrc, name), "utf-8");
