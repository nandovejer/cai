/**
 * LUZ check: the rules of elements and attributes (f5-ai-ready.md 5.5, 5.6).
 *
 *   element/unknown            a <luz-*> tag that is in no custom-elements
 *                              manifest and is not the block of a class
 *   element/unknown-attribute  an attribute that a <luz-*> element does not
 *                              declare, and that is not global, aria-*,
 *                              data-* (other than data-luz-*), a label
 *                              override or a framework's
 *   attr/unknown-hook          a data-luz-* attribute on any other element
 *                              that no manifest knows (a heuristic: it reads
 *                              the CSS and JS of the packages, so a warning)
 *
 * A tag that is blamed is not also blamed for its attributes, and an element
 * that a manifest declares is left to element/unknown-attribute, so a name is
 * reported once. Names are looked up in Set and Map only.
 */
import { finding } from "../report.js";
import { closest } from "../suggest.js";
import { isEcho, packageOfName } from "./shared.js";

// The global attributes of HTML, and the few a template language puts on any tag
const GLOBAL = new Set([
  "accesskey", "anchor", "autocapitalize", "autocorrect", "autofocus", "class", "contenteditable", "dir", "draggable", "enterkeyhint",
  "exportparts", "hidden", "id", "inert", "inputmode", "is", "itemid", "itemprop", "itemref", "itemscope", "itemtype", "key", "lang",
  "nonce", "part", "popover", "ref", "role", "slot", "spellcheck", "style", "tabindex", "title", "translate", "virtualkeyboardpolicy",
  "writingsuggestions",
]);
// What a framework or a template adds: v-*, x-*, hx-*, ng-*, on*
const FRAMEWORK_PREFIX = ["v-", "x-", "hx-", "ng-", "on"];
// The first character of a binding: @click, :prop, *ngIf, [prop], (event), #ref, {…}, .prop
const BINDING = "@:*[(#{.";
// A plain HTML attribute name; anything else is a template's and is not read
const PLAIN = /^[a-z_][a-z0-9_.-]*$/;

function isAccepted(name, declared) {
  if (declared.has(name) || GLOBAL.has(name)) return true;
  if (name.startsWith("aria-")) return true;
  if (name.startsWith("data-")) return !name.startsWith("data-luz-") || name.startsWith("data-luz-label-");
  if (!PLAIN.test(name)) return true;
  if (FRAMEWORK_PREFIX.some((prefix) => name.startsWith(prefix))) return true;
  return BINDING.includes(name[0]);
}

/** The findings of the tags and attributes of one markup file. */
export function elementRules(ctx) {
  const { file, records, world, take } = ctx;
  const found = [];
  for (const record of records) {
    const tag = record.name;
    // A name a template computes (<luz-{{ kind }}>) is read up to its first brace: it is not a tag to judge
    if (tag.endsWith("-")) continue;
    const declared = tag.startsWith("luz-") ? world.tags.get(tag) : undefined;
    if (tag.startsWith("luz-") && declared === undefined && !world.blocks.has(tag)) {
      const near = isEcho(tag) && take("element/unknown") ? closest(tag, world.tagNames) : null;
      const where = { file, line: record.line, column: record.column };
      if (near === null) found.push(finding("element/unknown:none", { ...where, vars: { tag, package: packageOfName(tag) } }));
      else found.push(finding("element/unknown", { ...where, vars: { tag, closest: near }, suggestion: `<${near}>` }));
      continue;
    }
    for (const [name, attribute] of record.attrs) {
      const where = { file, line: attribute.line, column: attribute.column };
      if (declared !== undefined) {
        if (isAccepted(name, declared.attributes)) continue;
        const near = isEcho(name) && take("element/unknown-attribute") ? closest(name, declared.attributes) : null;
        if (near === null) found.push(finding("element/unknown-attribute:none", { ...where, vars: { attribute: name, tag } }));
        else found.push(finding("element/unknown-attribute", { ...where, vars: { attribute: name, tag, closest: near }, suggestion: near }));
      } else if (name.startsWith("data-luz-") && !name.startsWith("data-luz-label-") && !world.hooks.has(name)) {
        found.push(finding("attr/unknown-hook", { ...where, vars: { attribute: name } }));
      }
    }
  }
  return found;
}
