/**
 * LUZ check: the registry of rules and how a run applies them (f5-ai-ready.md
 * 5.5, 5.6). One module per family of rules, each a function of a context to
 * findings; the ids, the severity and the words are messages.js.
 *
 *   namesLuz(parsed)       does this file name anything of LUZ's? A file that
 *                          does not is judged by no rule of names and makes
 *                          the tool read no manifest
 *   checkParsed(parsed, ctx) the findings of one file
 *
 * `parsed` is { path, kind, records, error, css, styleClasses } as cli.js
 * reads a file once; `ctx` is { world, defined, take, doc } where `doc` is
 * what a markup file links (rules/load.js documentOf). load/no-stylesheet is
 * about the whole run and is cli.js's.
 */
import { elementRules } from "./element.js";
import { stylesheetClasses, unknownClasses } from "./class.js";
import { loadRules } from "./load.js";
import { misuseRules } from "./misuse.js";

const LUZ_FILE = /(?:^|[/@])luz[-.a-z]*\.(?:css|js)(?:[?#]|$)/i;
const PREFIXED = /(?:^|[ \t\n\r\f])(?:luz|o|u)-/;

/** Does a markup or stylesheet file name a LUZ class, tag, attribute or file? */
export function namesLuz(parsed) {
  if (parsed.css !== null) return parsed.css.classes.some((entry) => entry.name.startsWith("luz-"));
  for (const record of parsed.records) {
    if (record.name.startsWith("luz-")) return true;
    for (const [name, attribute] of record.attrs) {
      if (name.startsWith("data-luz-")) return true;
      if ((name === "class" || name === "classname") && PREFIXED.test(attribute.value)) return true;
      if ((name === "href" || name === "src") && (attribute.value.includes("@luz-ds/") || LUZ_FILE.test(attribute.value))) return true;
    }
  }
  return false;
}

/** @returns {object[]} the findings of the rules of names for one parsed file */
export function checkParsed(parsed, ctx) {
  const base = { file: parsed.path, world: ctx.world, defined: ctx.defined, take: ctx.take };
  if (parsed.css !== null) return stylesheetClasses({ ...base, css: parsed.css });
  const markup = { ...base, records: parsed.records, template: parsed.kind === "template", doc: ctx.doc };
  return [...unknownClasses(markup), ...elementRules(markup), ...loadRules(markup), ...misuseRules(markup)];
}
