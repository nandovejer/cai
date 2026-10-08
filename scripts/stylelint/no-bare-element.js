/**
 * CAI stylelint plugin — red line 11 (PRINCIPLES.md): no bare-element rule
 * outside :where() in packages/.
 *
 * A selector is "bare" when, once every :where(…) group is removed, it still
 * contains a type selector (`body`, `a:hover`, `ul li`) and nothing that
 * scopes it: no class, id or attribute selector. `:where(a)`, `.cai-x a`,
 * `[popover]` and `:where(dialog)::backdrop` pass; `a`, `summary:hover` and
 * `:is(h1, h2)` do not. Keyframe selectors are ignored.
 *
 * No dependency: a small scanner instead of a selector parser.
 */
import stylelint from "stylelint";

const ruleName = "cai/no-bare-element";
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (selector) =>
    `Bare-element selector "${selector}": wrap it in :where() (red line 11)`,
});

/** Remove strings, attribute contents and every :where(…) and :not(…) group
 * (neither scopes the subject: `li:not(.x)` still styles every li). */
function stripWhere(selector) {
  let s = selector
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
    // Arguments that are not selectors: :lang(en), :dir(rtl), :nth-child(2n of …)
    .replace(/:(lang|dir|nth-[\w-]+|state)\([^)]*\)/g, ":$1")
    .replace(/\[[^\]]*\]/g, "[]");
  for (let i = s.search(/:(where|not)\(/); i !== -1; i = s.search(/:(where|not)\(/)) {
    let depth = 0;
    let j = s.indexOf("(", i);
    for (; j < s.length; j++) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")" && --depth === 0) break;
    }
    s = s.slice(0, i) + s.slice(j + 1);
  }
  return s;
}

/** True when a selector (one item of a selector list) is a bare-element selector. */
export function isBare(selector) {
  const s = stripWhere(selector);
  if (/[.#[]/.test(s)) return false;
  // A type selector starts a compound: at the start, after a combinator or
  // after the "(" of a functional pseudo-class. Pseudo-element and
  // pseudo-class names (after ":") are not types.
  return /(^|[\s>+~(,])(?<!:)[a-zA-Z][\w-]*/.test(s.replace(/::?[\w-]+/g, ""));
}

const rule = (enabled) => (root, result) => {
  if (!enabled) return;
  root.walkRules((node) => {
    if (node.parent?.type === "atrule" && /keyframes$/i.test(node.parent.name)) return;
    for (const selector of node.selectors) {
      if (isBare(selector)) {
        stylelint.utils.report({ result, ruleName, node, message: messages.rejected(selector), word: selector });
      }
    }
  });
};

rule.ruleName = ruleName;
rule.messages = messages;

export default stylelint.createPlugin(ruleName, rule);
