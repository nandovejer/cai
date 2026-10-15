/**
 * LUZ check: the rules of misuse and of accessibility (f5-ai-ready.md 5.5 and
 * 5.6; the answers of accessibility-engineer Q1).
 *
 *   misuse/host-element    a class that has `hosts` on an element that matches none
 *   misuse/modifier-alone  `--modifier` without the class it modifies
 *   misuse/part-orphan     `__part` with no element of its block around it (a warning)
 *   misuse/state-class     an `is-*` class LUZ's script sets, written in markup (a warning)
 *   a11y/role-on-generic   a widget role, or onclick, on a <div> or <span> (a warning)
 *   a11y/link-no-href      an <a> with a class that sits on <a>, and no href (a warning)
 *
 * The elements a class may sit on are the `hosts` of its manifest entry, never
 * a table here (D13). What a template or a framework computes is left alone:
 * a token with `{ } $ : @ [`, a tag that is not a lowercase HTML name, a class
 * the page binds, an attribute whose value is a template expression. An
 * element under `[inert]` (the stage of a do and don't) is not judged for
 * hosts, roles or links.
 */
import { finding } from "../report.js";
import { classAttribute, classTokens } from "./shared.js";

const TEMPLATE = /\{\{|<%|\$\{/;
const COMPUTED = /[{}$<%@(]/;
const CLASS_BINDING = /^(?:[:@]|v-bind:|x-bind:|\[|ng-)?(?:ng)?class(?:[:.\]].*)?$/;
const HTML_NAME = /^[a-z][a-z0-9]*$/;
const SELECTOR = /^([a-z0-9]+)(?:\[([a-z-]+)(?:=(.+))?\])?$/;
const SPACE = /\s+/;
// The element each role is for (a heading is any h1 to h6)
const ROLES = new Map(
  ["button button", "link a", "checkbox input", "radio input", "textbox input", "switch input", "dialog dialog", "navigation nav", "table table", "heading h1", "list ul", "main main"].map((pair) => pair.split(" ")),
);

/** Is the attribute there, or bound by a framework (`:type`, `[type]`, `v-bind:type`)? */
const has = (attrs, name) => attrs.has(name) || attrs.has(`:${name}`) || attrs.has(`[${name}]`) || attrs.has(`v-bind:${name}`) || attrs.has(`x-bind:${name}`);

/** Does the element match a host selector: its tag, and the attribute test (a computed value may be anything)? */
function matches(selector, record) {
  const [, tag, attribute, value] = SELECTOR.exec(selector);
  if (tag !== record.name) return false;
  if (attribute === undefined) return true;
  const own = record.attrs.get(attribute);
  if (own === undefined) return has(record.attrs, attribute);
  return value === undefined || TEMPLATE.test(own.value) || own.value.toLowerCase() === value;
}

/**
 * Is `block` the tag or a class of an ancestor, or might an ancestor's
 * computed class be it? `memo` (block -> Map record -> answer for the record
 * and its ancestors) makes each element answer once, however deep the file.
 */
function inside(record, block, template, memo) {
  let table = memo.get(block);
  if (table === undefined) memo.set(block, (table = new Map()));
  const trail = [];
  let found = false;
  for (let ancestor = record.parent; ancestor !== null; ancestor = ancestor.parent) {
    const known = table.get(ancestor);
    if (known !== undefined) {
      found = known;
      break;
    }
    trail.push(ancestor);
    const attribute = classAttribute(ancestor, template);
    if (ancestor.name === block || (attribute !== undefined && (COMPUTED.test(attribute.value) || attribute.value.split(SPACE).includes(block)))) {
      found = true;
      break;
    }
  }
  for (const ancestor of trail) table.set(ancestor, found);
  return found;
}

/** The findings of the rules of misuse and accessibility for one markup file. */
export function misuseRules(ctx) {
  const { file, records, world, defined, template } = ctx;
  const found = [];
  const memo = new Map();
  for (const record of records) {
    const attribute = classAttribute(record, template);
    const tokens = attribute === undefined ? [] : [...new Set(classTokens(attribute.value, template))];
    const own = attribute === undefined ? null : { file, line: attribute.line, column: attribute.column };
    const plain = record.written === record.name && HTML_NAME.test(record.name) && !record.inert;
    let reported = false;

    if (plain) {
      for (const token of tokens) {
        const hosts = world.info.get(token)?.hosts;
        if (hosts === undefined || hosts.some((host) => matches(host, record))) continue;
        const names = [...new Set(hosts.map((host) => host.split("[")[0]))];
        found.push(finding("misuse/host-element", { ...own, vars: { name: token, tag: record.name, hosts: names } }));
        reported = true;
        break;
      }
    }

    if (tokens.length > 0) {
      let bound = null; // does the class attribute bring a class at run time? looked up when a modifier needs it
      for (const token of tokens) {
        const entry = world.info.get(token);
        if (entry === undefined) continue;
        if (entry.modifier !== undefined) {
          const block = token.slice(0, token.length - entry.modifier.length - 2);
          if (record.name !== block && !tokens.includes(block)) {
            bound ??= COMPUTED.test(attribute.value) || [...record.attrs.keys()].some((name) => name !== "class" && CLASS_BINDING.test(name));
            if (!bound) found.push(finding("misuse/modifier-alone", { ...own, vars: { modifier: token, block } }));
          }
        }
        if (entry.part !== undefined && !inside(record, entry.block, template, memo)) {
          found.push(finding("misuse/part-orphan", { ...own, vars: { name: token, block: entry.block } }));
        }
        if (token.startsWith("is-") && !defined.has(token)) found.push(finding("misuse/state-class", { ...own, vars: { name: token } }));
      }
    }

    if (!plain) continue;
    if ((record.name === "div" || record.name === "span") && !reported) {
      const role = record.attrs.get("role");
      const word = role === undefined ? "" : role.value.trim().toLowerCase().split(SPACE)[0];
      const onclick = record.attrs.get("onclick");
      if (ROLES.has(word)) {
        found.push(finding("a11y/role-on-generic", { file, line: role.line, column: role.column, vars: { role: word, tag: record.name, element: ROLES.get(word) } }));
      } else if (onclick !== undefined && !has(record.attrs, "tabindex")) {
        found.push(finding("a11y/role-on-generic:onclick", { file, line: onclick.line, column: onclick.column, vars: { attribute: "onclick", tag: record.name } }));
      }
    }
    if (record.name === "a" && !has(record.attrs, "href")) {
      const name = tokens.find((token) => world.info.get(token)?.hosts?.includes("a"));
      if (name !== undefined) found.push(finding("a11y/link-no-href", { file, line: record.line, column: record.column, vars: { tag: "a", name } }));
    }
  }
  return found;
}
