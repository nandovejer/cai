/**
 * CAI Design System — Syntax highlight
 * Lightweight tokenizer with no dependencies for documentation code blocks.
 * Supports HTML, CSS, JS/JSX, JSON and shell (bash, sh, shell).
 *
 * Importing this module has no side effects; call initHighlight() to
 * enhance every pre.cai-code-block on the page, or highlightBlock(pre)
 * for a single block. Copy-button clicks are handled by clipboard.js
 * (initCopyButtons).
 */

import { escapeHtml } from "./utils.js";
import { t } from "./i18n.js";

/**
 * One pass over the raw code: the first rule that matches at a position wins,
 * and every piece is escaped exactly once. Earlier versions chained
 * replace() calls over escaped HTML, so a later rule could match inside the
 * markup an earlier one had added (the keyword `class` in `<span class=…>`).
 */
function tokenize(code, rules) {
  const pattern = new RegExp(rules.map(([, source]) => `(${source})`).join("|"), "gm");
  let html = "";
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    if (match[0] === "") continue;
    const rule = match.slice(1).findIndex((group) => group !== undefined);
    html += escapeHtml(code.slice(last, match.index));
    html += `<span class="${rules[rule][0]}">${escapeHtml(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(code.slice(last));
}

/* Six classes, one per --cai-code-* token: tok-comment, tok-keyword,
   tok-name (tags, selectors, functions, commands), tok-property (attributes,
   CSS and JSON properties, flags, variables), tok-string, tok-literal
   (numbers, units, colours, booleans, entities). Rules are tried in order. */
const STRING = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'`;
const NUMBER = String.raw`\b\d+(?:\.\d+)?`;

const CSS_RULES = [
  ["tok-comment", String.raw`\/\*[\s\S]*?\*\/`],
  ["tok-string", STRING],
  ["tok-keyword", String.raw`@[\w-]+|!important`],
  ["tok-name", String.raw`^[ \t]*[^\s@{}/][^{};]*(?=\{)|[\w-]+(?=\()`],
  ["tok-property", String.raw`--[\w-]+|(?<=^[ \t]*|[{;(]\s*)[\w-]+(?=\s*:)`],
  ["tok-literal", String.raw`#[\da-fA-F]{3,8}\b|${NUMBER}(?:%|[a-z]+)?`],
];

const HTML_RULES = [
  ["tok-comment", String.raw`<!--[\s\S]*?-->`],
  ["tok-keyword", String.raw`<![^>]*>`],
  ["tok-name", String.raw`<\/?[\w-]+`],
  ["tok-property", String.raw`(?<=<[\w-]+\s[^<>]*)[\w:.@-]+(?=[\s=/>])`],
  ["tok-string", String.raw`"[^"]*"|'[^']*'`],
  ["tok-literal", String.raw`&#?\w+;`],
];

const JS_RULES = [
  ["tok-comment", String.raw`\/\/.*|\/\*[\s\S]*?\*\/`],
  ["tok-string", String.raw`${STRING}|\x60(?:[^\x60\\]|\\.)*\x60`],
  ["tok-keyword", String.raw`\b(?:import|export|default|from|const|let|var|return|function|class|extends|new|if|else|for|of|in|while|async|await|try|catch|throw|typeof|this)\b|=>`],
  ["tok-literal", String.raw`\b(?:true|false|null|undefined)\b|${NUMBER}`],
  ["tok-name", String.raw`[\w$]+(?=\s*\()|\b[A-Z][\w$]*`],
];

const SH_RULES = [
  ["tok-comment", String.raw`(?<=^|\s)#.*`],
  ["tok-string", String.raw`"(?:[^"\\]|\\.)*"|'[^']*'`],
  ["tok-keyword", String.raw`\b(?:if|then|elif|else|fi|for|in|do|done|while|case|esac|export)\b`],
  ["tok-property", String.raw`\$\{?\w+\}?|(?<=\s)--?[\w-]+`],
  ["tok-name", String.raw`(?<=^[ \t]*|[|;&][ \t]*)[\w./-]+`],
];

const LANGS = {
  css: CSS_RULES,
  html: HTML_RULES,
  js: JS_RULES,
  jsx: JS_RULES,
  json: [["tok-property", `(?:${STRING})(?=\\s*:)`], ...JS_RULES],
  bash: SH_RULES,
  sh: SH_RULES,
  shell: SH_RULES,
};

/**
 * Highlight a single pre.cai-code-block element (language via data-lang).
 */
export function highlightBlock(pre) {
  const code = pre.querySelector("code");
  if (!code) return;
  const lang = pre.dataset.lang || "txt";
  const raw = code.textContent;

  code.innerHTML = LANGS[lang] ? tokenize(raw, LANGS[lang]) : escapeHtml(raw);
}

/**
 * Enhance every pre.cai-code-block: aria-label, copy button, highlighting.
 */
export function initHighlight() {
  document.querySelectorAll("pre.cai-code-block").forEach((pre, index) => {
    if (!pre.hasAttribute("aria-label")) {
      const lang = (pre.dataset.lang || "code").toUpperCase();
      pre.setAttribute("aria-label", t("codeExample", pre, { lang }));
    }

    if (!pre.querySelector(".cai-code-block__copy")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cai-copy-btn cai-code-block__copy";
      button.dataset.copy = pre.querySelector("code")?.textContent || "";
      button.setAttribute("aria-label", t("copyCode", pre, { n: index + 1 }));
      button.textContent = t("copy", pre);
      pre.appendChild(button);
    }

    highlightBlock(pre);
  });
}
