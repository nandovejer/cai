/**
 * LUZ docs site: what each rule of @luz-ds/check finds, in words, for the
 * table of "Working with AI" (/docs/get-started/ai/#rules). Development
 * tooling: nothing here ships, and the check bundle never imports it.
 *
 * The ids, the severities and the messages are the registry of
 * packages/check/src/messages.js; this file adds the one thing it does not
 * have, a sentence on what a rule finds. `ruleRows()` joins them and throws,
 * naming the rule, when one side has no counterpart, so a rule added to the
 * checker fails the docs build until its sentence is written (RL-19).
 */
import { MESSAGES } from "../../packages/check/src/messages.js";

/** What a rule finds: one sentence of 20 to 240 characters, a text of its own, no placeholder. */
export const RULE_FINDS = {
  "a11y/link-no-href": "An <a> that has a class made for links and no href, so it is not a link and a keyboard cannot reach it.",
  "a11y/role-on-generic": "A widget role, or onclick, on a <div> or <span> where a native element such as <button> does the same with the keyboard.",
  "attr/unknown-hook": "A data-luz-* attribute on an element that no package reads: usually a misspelling of one it does.",
  "class/reserved-prefix": "A stylesheet of yours that defines a class starting with luz-, the prefix LUZ keeps for itself.",
  "class/unknown": "A class starting with luz- that no classes.json lists, or an o- or u- class a typo away from one LUZ has.",
  "class/unknown-in-css": "A selector in your stylesheet that names a .luz-* class no classes.json lists.",
  "css/important": "!important in a declaration, in a custom property too; a rule outside the layers already wins over LUZ.",
  "css/knob-in-px": "--luz-type-base or --luz-space-unit set in px, which ignores the text size the reader chose.",
  "css/literal-colour": "A colour written out in a declaration (hex, rgb, hsl and the other functions) instead of a token.",
  "css/literal-size": "A px or rem length in font-size, margin, padding, gap or border-radius instead of a space, text or radius token.",
  "css/private-token": "A --luz-* property that one component sets for itself, set or read outside that component.",
  "css/unknown-token": "A --luz-* property that no package declares, set or read: usually a misspelling.",
  "element/unknown": "A <luz-*> tag that no custom-elements.json declares and that is not the block of a class.",
  "element/unknown-attribute": "An attribute on a LUZ element that its custom-elements.json does not declare; global, aria-*, data-* and framework attributes are left alone.",
  "file/skipped": "A path the check did not read, such as a symlink or a file that is too large; the finding says why.",
  "load/layer-statement": "A <style> that declares the layers after the first LUZ stylesheet, when the order of the layers is already fixed.",
  "load/no-stylesheet": "Checked files that load no LUZ stylesheet at all, so a class can only be told from your own by its name.",
  "load/order": "LUZ stylesheets linked out of order; the order is tokens, core, site, then the package for your kind of site.",
  "load/package-missing": "A class or tag from a package whose stylesheet the page does not load, such as a site class with no site stylesheet.",
  "load/tokens-missing": "A page that links core, site or a package for one kind of site and does not link @luz-ds/tokens.",
  "misuse/host-element": "A class on an element it is not made for, such as a button class on a <div>; classes.json lists each class's elements.",
  "misuse/modifier-alone": "A modifier such as luz-btn--primary on an element that does not also have the class it modifies.",
  "misuse/part-orphan": "A part such as luz-card__title with no element of its block around it.",
  "misuse/state-class": "An is-* class that LUZ's own script sets, written in the markup.",
  "parse/error": "A file that ends inside a comment, tag, string or brace, so the rest of it cannot be read.",
  "theme/advisory": "A note on how the colour check ran: the file order it used, a token no colour mode can place, a wide-gamut colour it does not measure, or sets of colour tokens past its limit.",
  "theme/contrast": "A foreground and background pair in your colour token files that is under its WCAG contrast minimum in light, dark or high contrast.",
  "theme/unreadable": "A LUZ colour token, in a file that sets colour tokens, whose value cannot be read as an sRGB colour, so its contrast cannot be measured.",
};

/**
 * One row per rule id of the checker (a variant key `id:variant` is its id's
 * row), sorted: [{ id, severity, finds }]. Throws, naming the rule, when the
 * registry and the sentences do not match, or a sentence is not one.
 */
export function ruleRows() {
  const ids = [...new Set(Object.keys(MESSAGES).map((key) => key.split(":")[0]))].sort();
  const problems = [];
  for (const id of ids) if (!Object.hasOwn(RULE_FINDS, id)) problems.push(`${id} is a rule of messages.js with no sentence in RULE_FINDS`);
  for (const id of Object.keys(RULE_FINDS)) if (!ids.includes(id)) problems.push(`${id} has a sentence in RULE_FINDS and is no rule of messages.js`);
  const seen = new Map();
  for (const id of ids) {
    const text = RULE_FINDS[id];
    if (typeof text !== "string") continue;
    if (text.length < 20 || text.length > 240) problems.push(`${id}: its sentence is ${text.length} characters, it is 20 to 240`);
    if (/[{}]/.test(text)) problems.push(`${id}: its sentence has a placeholder`);
    if (seen.has(text)) problems.push(`${id}: its sentence is the one of ${seen.get(text)}`);
    seen.set(text, id);
    if (!Object.hasOwn(MESSAGES, id)) problems.push(`${id}: messages.js has only variants of it, no base message with its severity`);
  }
  if (problems.length) throw new Error(`scripts/docs-site/ai-rules.js: ${problems.join("; ")}`);
  return ids.map((id) => ({ id, severity: MESSAGES[id].severity, finds: RULE_FINDS[id] }));
}
