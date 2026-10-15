/**
 * LUZ check: every word the tool says about a file, in one place (f5-ai-ready.md
 * 8, the review answers of ux-designer "Message rule" and of security-auditor
 * Q3). `pnpm check:strings` does not scan this package, so
 * tests/check-messages.test.js is the rule: one sentence, no full stop, it
 * starts with the named thing, exactly one `;` and after it a fix clause that
 * starts with a fixed verb, at most 120 characters. English only.
 *
 *   MESSAGES  { [key]: { severity: "block" | "warn", template, sample } }
 *             `key` is a rule id, or `<rule id>:<variant>` when one rule has
 *             two texts (`class/unknown:none`: no class is close enough). The
 *             template has `{name}` placeholders; `sample` gives a value for
 *             each, so a test can render every message.
 *   message(key, vars)  the template with the variables in. Throws on an unknown
 *             key and on a missing variable, so a typo is loud.
 *
 * What a message may echo from a file (security-auditor Q3): a value is
 * written only when it is a name of the echo alphabet
 * (^[A-Za-z0-9_:.\-/]{1,64}$) or a #rrggbb colour; anything else is written
 * `<an unreadable name>`. A rule gives a list of element names as an array
 * (`hosts: ["a", "button"]`), written `<a>, <button>`. A message that would
 * pass MAX_MESSAGE shortens its values (with …) until it fits, so the
 * fix clause is never the part that is cut.
 *
 * A rule that counts files has a `:one` entry that `message()` takes when the
 * count is "1" (`load/no-stylesheet:one`).
 *
 * A key of a rule that blocks may be a variant that only warns
 * (`parse/error:template`: a template file is not HTML a browser reads;
 * `class/unknown:newer`: the page loads a LUZ release newer than the checker
 * knows). The rule id of its finding is the base id.
 *
 * The variables of each rule are what its implementation passes (steps 9-11
 * of the plan); a rule may add a variant here with its test.
 */
import { echoName } from "./sanitize.js";

export const MAX_MESSAGE = 120;

const COLOUR = /^#[0-9a-fA-F]{6}$/;

/** @type {Record<string, { severity: "block" | "warn", template: string, sample: Record<string, string | string[]> }>} */
export const MESSAGES = {
  // ---- blocks ----
  "parse/error": {
    severity: "block",
    template: "{kind} is cut short here; add the missing end of the comment, tag, string or brace",
    sample: { kind: "HTML" },
  },
  "parse/error:template": {
    severity: "warn",
    template: "{kind} may be cut short here, or a template tag breaks it; add the missing end of the tag, comment or string",
    sample: { kind: "HTML" },
  },
  "class/unknown": {
    severity: "block",
    template: ".{name} is not a LUZ class; the closest is .{closest}",
    sample: { name: "luz-btn-primary", closest: "luz-btn--primary" },
  },
  "class/unknown:none": {
    severity: "block",
    template: ".{name} is not a LUZ class; see classes.json of @luz-ds/{package}",
    sample: { name: "luz-btn-primary", package: "core" },
  },
  "class/unknown:newer": {
    severity: "warn",
    template: ".{name} is not in LUZ {known}, and the page loads {linked}; see classes.json of @luz-ds/{package}",
    sample: { name: "luz-shiny-new-thing", known: "0.1.0", linked: "0.2.0", package: "core" },
  },
  "element/unknown": {
    severity: "block",
    template: "<{tag}> is not a LUZ element; the closest is <{closest}>",
    sample: { tag: "luz-serach", closest: "luz-search" },
  },
  "element/unknown:none": {
    severity: "block",
    template: "<{tag}> is not a LUZ element; see custom-elements.json of @luz-ds/{package}",
    sample: { tag: "luz-serach", package: "site" },
  },
  "element/unknown-attribute": {
    severity: "block",
    template: "{attribute} is not an attribute of <{tag}>; the closest is {closest}",
    sample: { attribute: "data-luz-src", tag: "luz-search", closest: "data-luz-search-src" },
  },
  "element/unknown-attribute:none": {
    severity: "block",
    template: "{attribute} is not an attribute of <{tag}>; see custom-elements.json for the ones it reads",
    sample: { attribute: "data-luz-src", tag: "luz-search" },
  },
  "load/tokens-missing": {
    severity: "block",
    template: "{package} is linked and @luz-ds/tokens is not; add @luz-ds/tokens before it",
    sample: { package: "core" },
  },
  "load/package-missing": {
    severity: "block",
    template: ".{name} is in @luz-ds/{package}, which this page does not load; add its stylesheet after core",
    sample: { name: "luz-banner", package: "site" },
  },
  "load/package-missing:tag": {
    severity: "block",
    template: "<{tag}> is in @luz-ds/{package}, which this page does not load; add its stylesheet after core",
    sample: { tag: "luz-banner", package: "site" },
  },
  "load/layer-statement": {
    severity: "block",
    template: "<{tag}> declares the layers after the LUZ link; move it before the first LUZ stylesheet",
    sample: { tag: "style" },
  },
  "misuse/host-element": {
    severity: "block",
    template: ".{name} is on <{tag}>; use {hosts}",
    sample: { name: "luz-btn", tag: "div", hosts: ["a", "button", "input"] },
  },
  "misuse/modifier-alone": {
    severity: "block",
    template: ".{modifier} needs .{block} on the same element; add .{block}",
    sample: { modifier: "luz-btn--primary", block: "luz-btn" },
  },
  "theme/contrast": {
    severity: "block",
    template: "{mode}: {foreground} on {background} is {ratio}:1, needs {minimum}:1 ({kind}); change one of the two",
    sample: { mode: "light", foreground: "--luz-text-muted", background: "--luz-surface", ratio: "3.1", minimum: "4.5", kind: "text" },
  },
  "theme/unreadable": {
    severity: "block",
    template: "{token} is set to a colour the check cannot read; write the sRGB value as #rrggbb",
    sample: { token: "--luz-brand-fill" },
  },

  // ---- warnings ----
  "load/order": {
    severity: "warn",
    template: "{first} is linked before {second}; move {second} before {first}",
    sample: { first: "core", second: "tokens" },
  },
  "load/no-stylesheet": {
    severity: "warn",
    template: "{count} checked files load no LUZ stylesheet; add the LUZ links to the page or its layout",
    sample: { count: "3" },
  },
  "load/no-stylesheet:one": {
    severity: "warn",
    template: "{count} checked file loads no LUZ stylesheet; add the LUZ links to the page or its layout",
    sample: { count: "1" },
  },
  "class/unknown-in-css": {
    severity: "warn",
    template: ".{name} is not a LUZ class; the closest is .{closest}",
    sample: { name: "luz-btn-primary", closest: "luz-btn--primary" },
  },
  "class/unknown-in-css:none": {
    severity: "warn",
    template: ".{name} is not a LUZ class; see classes.json of @luz-ds/{package}",
    sample: { name: "luz-btn-primary", package: "core" },
  },
  "class/reserved-prefix": {
    severity: "warn",
    template: ".{name} starts with luz-, the prefix LUZ keeps for itself; change it to your own prefix",
    sample: { name: "luz-promo" },
  },
  "misuse/state-class": {
    severity: "warn",
    template: ".{name} is a state that LUZ's script sets; remove it from the markup",
    sample: { name: "is-open" },
  },
  "misuse/part-orphan": {
    severity: "warn",
    template: ".{name} is a part of .{block}; add an element with .{block} around it",
    sample: { name: "luz-card__title", block: "luz-card" },
  },
  "a11y/role-on-generic": {
    severity: "warn",
    template: "{role} is a role set on <{tag}>; use <{element}> instead",
    sample: { role: "button", tag: "div", element: "button" },
  },
  "a11y/role-on-generic:onclick": {
    severity: "warn",
    template: "{attribute} on <{tag}> does not work from the keyboard; use <button> instead",
    sample: { attribute: "onclick", tag: "div" },
  },
  "a11y/link-no-href": {
    severity: "warn",
    template: "<{tag}> has .{name} and no href; add an href, or use <button> for an action",
    sample: { tag: "a", name: "luz-btn" },
  },
  "attr/unknown-hook": {
    severity: "warn",
    template: "{attribute} is not a data-luz-* attribute that LUZ reads; remove it or check the spelling",
    sample: { attribute: "data-luz-themee" },
  },
  "css/literal-colour": {
    severity: "warn",
    template: "{property} is set to {value}; use a token, such as var({token})",
    sample: { property: "color", value: "#1a5fb4", token: "--luz-brand-fill" },
  },
  "css/literal-size": {
    severity: "warn",
    template: "{property} is {value}; use a --luz-space-*, --luz-text-* or --luz-radius-* token",
    sample: { property: "margin", value: "16px" },
  },
  "css/knob-in-px": {
    severity: "warn",
    template: "{property} is in px, which ignores the browser's text size; use rem",
    sample: { property: "--luz-type-base" },
  },
  "css/important": {
    severity: "warn",
    template: "{property} is set with !important; remove it, a rule outside a layer already wins",
    sample: { property: "color" },
  },
  "css/private-token": {
    severity: "warn",
    template: "{token} belongs to one component; use a token that LUZ sets on :root",
    sample: { token: "--luz-seek" },
  },
  "css/unknown-token": {
    severity: "warn",
    template: "{token} is not a LUZ token; the closest is {closest}",
    sample: { token: "--luz-brand-fil", closest: "--luz-brand-fill" },
  },
  "css/unknown-token:none": {
    severity: "warn",
    template: "{token} is not a LUZ token; see the token pages of the docs",
    sample: { token: "--luz-brand-fil" },
  },
  "file/skipped": {
    severity: "warn",
    template: "{reason} kept this path from being read; see luz-check --help for the limits",
    sample: { reason: "symlink" },
  },
  "theme/advisory": {
    severity: "warn",
    template: "{source} order is used for the theme files; use --theme to set the order",
    sample: { source: "alphabetical" },
  },
};

export const SITE_URL = "https://nandovejer.github.io/luz/";

// Where a finding sends the reader: a route of the docs site and a fragment
// that is an id on it. The rules table of "Working with AI" (step 13) is the
// page for the rules that have no page of their own.
const AI = "docs/get-started/ai/#rules";
const READ = "docs/get-started/how-to-read/";
const DOCS = {
  "parse/error": AI,
  "class/unknown": `${READ}#classes`,
  "class/unknown-in-css": `${READ}#classes`,
  "class/reserved-prefix": `${READ}#classes`,
  "element/unknown": `${READ}#elements`,
  "element/unknown-attribute": `${READ}#attributes`,
  "attr/unknown-hook": `${READ}#attributes`,
  "load/tokens-missing": "docs/get-started/#which-level",
  "load/package-missing": "docs/get-started/#which-level",
  "load/no-stylesheet": "docs/get-started/#which-level",
  "load/order": "docs/get-started/layers/#order",
  "load/layer-statement": "docs/get-started/layers/#order",
  "misuse/host-element": `${READ}#classes`,
  "misuse/modifier-alone": `${READ}#classes`,
  "misuse/state-class": `${READ}#public`,
  "misuse/part-orphan": `${READ}#classes`,
  "a11y/role-on-generic": AI,
  "a11y/link-no-href": AI,
  "css/literal-colour": `${READ}#tokens`,
  "css/literal-size": `${READ}#tokens`,
  "css/knob-in-px": `${READ}#tokens`,
  "css/important": "docs/get-started/layers/#unlayered",
  "css/private-token": `${READ}#public`,
  "css/unknown-token": `${READ}#tokens`,
  "file/skipped": AI,
  "theme/contrast": "docs/tokens/contrast/#checks",
  "theme/unreadable": "docs/tokens/contrast/#reads",
  "theme/advisory": "docs/tokens/contrast/#reads",
};

/** The URL of the docs for a rule id (a variant key is read as its rule). */
export function docsUrl(rule) {
  const base = String(rule).split(":")[0];
  if (!Object.hasOwn(DOCS, base)) throw new Error(`no docs for the rule ${echoName(base)}`);
  return `${SITE_URL}${DOCS[base]}`;
}

/** One value, as it may be echoed. */
function echoed(value) {
  if (Array.isArray(value)) return value.map((item) => `<${echoName(item)}>`).join(", ");
  const text = String(value);
  if (COLOUR.test(text)) return text.toLowerCase();
  return echoName(text);
}

/** Cut each value to an equal share of `room` characters, so the fix clause is never the part that goes. */
function fit(values, room) {
  const share = Math.max(2, Math.floor(room / values.length));
  return values.map((value) => (value.length > share ? `${value.slice(0, share - 1)}…` : value));
}

/**
 * @param {string} key a key of MESSAGES
 * @param {Record<string, string | number | string[]>} vars
 * @returns {string} the message, at most MAX_MESSAGE characters
 */
export function message(key, vars) {
  if (typeof key !== "string" || !Object.hasOwn(MESSAGES, key)) throw new Error(`no message for the key ${echoName(key)}`);
  const given = vars && typeof vars === "object" ? vars : {};
  // A count of 1 reads in the singular, from the `:one` entry of the same rule
  const one = `${key}:one`;
  const { template } = MESSAGES[given.count === "1" && Object.hasOwn(MESSAGES, one) ? one : key];
  const parts = template.split(/\{([A-Za-z][A-Za-z0-9]*)\}/);
  // parts alternates text, name, text, name…
  let values = [];
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    if (!Object.hasOwn(given, name) || given[name] === undefined || given[name] === null) throw new Error(`the message ${key} needs the variable ${name}`);
    values.push(echoed(given[name]));
  }
  const fixed = parts.reduce((sum, text, i) => (i % 2 === 0 ? sum + text.length : sum), 0);
  if (fixed + values.reduce((sum, value) => sum + value.length, 0) > MAX_MESSAGE) values = fit(values, Math.max(values.length, MAX_MESSAGE - fixed));
  let out = "";
  for (let i = 0; i < parts.length; i++) out += i % 2 === 0 ? parts[i] : values[(i - 1) / 2];
  return out.length > MAX_MESSAGE ? `${out.slice(0, MAX_MESSAGE - 1)}…` : out;
}
