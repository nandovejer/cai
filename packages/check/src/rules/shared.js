/**
 * LUZ check: what the rules of names share (f5-ai-ready.md 5.5).
 *
 *   packageOfName(name)       the package a name's prefix points at, for the
 *                             "see classes.json of @luz-ds/<package>" text
 *   isEcho(name)              is it a name that may be written in a message
 *   classAttribute(record, template)  the `class` attribute of an element
 *                             record ({ value, line, column }; `className` in
 *                             a template file), or undefined
 *   classTokens(value, template)      the tokens of a class value a rule may
 *                             judge: none for a template's computed value, and
 *                             not a token that holds `{ } $ : @ [`
 *   createBudget()            how many suggestions are worked out: a finding
 *                             past the caps of report.js is never printed, so
 *                             it does not need its nearest name
 *   toHex(value)              a colour the engine of tokens reads, as #rrggbb;
 *                             null for what has no such form (translucent,
 *                             not an sRGB notation): the one way a colour of a
 *                             file is ever written in a message
 */
import { parseColor } from "../../../tokens/lib/contrast.js";
import { echoName } from "../sanitize.js";

/** Per file and per rule, and in all: the caps of report.js, which never print more. */
export const SUGGESTIONS_PER_FILE = 200;
export const SUGGESTIONS_IN_ALL = 5000;

const PACKAGE_PREFIXES = [
  ["luz-landing-", "landing"],
  ["luz-cms-", "cms"],
  ["luz-app-", "app"],
  ["luz-docs-", "docs"],
  ["luz-site-", "site"],
];

export function packageOfName(name) {
  for (const [prefix, pkg] of PACKAGE_PREFIXES) if (name.startsWith(prefix)) return pkg;
  return "core";
}

export const isEcho = (name) => echoName(name) === name;

const TOKEN_SKIP = /[{}$:@[]/;
const VALUE_SKIP = /[{}$<%@(]/;
const SPACE = /[ \t\n\r\f]+/;

export const classAttribute = (record, template) => record.attrs.get("class") ?? (template ? record.attrs.get("classname") : undefined);

export function classTokens(value, template) {
  if (template && VALUE_SKIP.test(value)) return [];
  return value.split(SPACE).filter((token) => token.length >= 3 && !TOKEN_SKIP.test(token));
}

/** @returns {() => (rule: string) => boolean} a function that starts a file's count */
export function createBudget() {
  const total = new Map();
  return () => {
    const own = new Map();
    return (rule) => {
      const here = own.get(rule) ?? 0;
      const all = total.get(rule) ?? 0;
      if (here >= SUGGESTIONS_PER_FILE || all >= SUGGESTIONS_IN_ALL) return false;
      own.set(rule, here + 1);
      total.set(rule, all + 1);
      return true;
    };
  };
}

export function toHex(value) {
  try {
    const { r, g, b, a } = parseColor(value);
    return a === 1 ? `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}` : null;
  } catch {
    return null;
  }
}
