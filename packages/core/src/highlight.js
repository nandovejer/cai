/**
 * CAI Design System — Syntax highlight
 * Lightweight tokenizer with no dependencies for documentation code blocks.
 * Supports HTML, CSS, and JS/JSX.
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

const CSS_RULES = [
  ["tok-comment", String.raw`\/\*[\s\S]*?\*\/`],
  ["tok-string", String.raw`"[^"\n]*"|'[^'\n]*'`],
  ["tok-keyword", String.raw`@(?:import|media|keyframes|layer|supports|container)\b|\bvar\b`],
  ["tok-property", String.raw`--[\w-]+(?=\s*[;:,)])`],
  ["tok-string", String.raw`#[0-9a-fA-F]{3,8}\b`],
];

const HTML_RULES = [
  ["tok-comment", String.raw`<!--[\s\S]*?-->`],
  ["tok-tag", String.raw`<\/?[\w-]+`],
  ["tok-attr", String.raw`(?<=\s)[\w-]+(?==)`],
  ["tok-string", String.raw`"[^"]*"`],
];

const JS_RULES = [
  ["tok-comment", String.raw`\/\/.*$|\/\*[\s\S]*?\*\/`],
  ["tok-string", String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\x60(?:[^\x60\\]|\\.)*\x60`],
  ["tok-keyword", String.raw`\b(?:import|export|from|const|let|var|return|function|class|new|if|else|async|await)\b|=>`],
  ["tok-name", String.raw`\b[A-Z][a-zA-Z]+(?=\s*[=(])`],
];

const highlightCSS = (code) => tokenize(code, CSS_RULES);
const highlightHTML = (code) => tokenize(code, HTML_RULES);
const highlightJS = (code) => tokenize(code, JS_RULES);

/**
 * Highlight a single pre.cai-code-block element (language via data-lang).
 */
export function highlightBlock(pre) {
  const code = pre.querySelector("code");
  if (!code) return;
  const lang = pre.dataset.lang || "txt";
  const raw = code.textContent;

  let highlighted;
  if (lang === "css") highlighted = highlightCSS(raw);
  else if (lang === "html") highlighted = highlightHTML(raw);
  else if (lang === "js" || lang === "jsx") highlighted = highlightJS(raw);
  else highlighted = escapeHtml(raw);

  code.innerHTML = highlighted;
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
