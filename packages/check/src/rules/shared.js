/**
 * LUZ check: what the rules of names share (f5-ai-ready.md 5.5).
 *
 *   packageOfName(name)       the package a name's prefix points at, for the
 *                             "see classes.json of @luz-ds/<package>" text
 *   isEcho(name)              is it a name that may be written in a message
 *   createBudget()            how many suggestions are worked out: a finding
 *                             past the caps of report.js is never printed, so
 *                             it does not need its nearest name
 */
import { echoName } from "../sanitize.js";

/** Per file and per rule, and in all: the caps of report.js, which never print more. */
export const SUGGESTIONS_PER_FILE = 200;
export const SUGGESTIONS_IN_ALL = 5000;

const PACKAGE_PREFIXES = [
  ["luz-landing-", "landing"],
  ["luz-cms-", "cms"],
  ["luz-app-", "app"],
  ["luz-site-", "site"],
];

export function packageOfName(name) {
  for (const [prefix, pkg] of PACKAGE_PREFIXES) if (name.startsWith(prefix)) return pkg;
  return "core";
}

export const isEcho = (name) => echoName(name) === name;

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
