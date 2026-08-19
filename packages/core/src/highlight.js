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

function highlightCSS(code) {
  return escapeHtml(code)
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
    .replace(
      /(var|@import|@media|@keyframes)/g,
      '<span class="tok-keyword">$1</span>',
    )
    .replace(/(--[\w-]+)(?=\s*[;:,)])/g, '<span class="tok-property">$1</span>')
    .replace(
      /(:\s*)(&#x27;[^&#x27;]*&#x27;|&quot;[^&quot;]*&quot;)/g,
      '$1<span class="tok-string">$2</span>',
    )
    .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="tok-string">$1</span>');
}

function highlightHTML(code) {
  return escapeHtml(code)
    .replace(/(<!--[\s\S]*?-->)/g, '<span class="tok-comment">$1</span>')
    .replace(/(&lt;\/?)([\w-]+)/g, '<span class="tok-tag">$1$2</span>')
    .replace(/\s([\w-]+)=(&quot;)/g, ' <span class="tok-attr">$1</span>=$2')
    .replace(
      /(&quot;)(.*?)(&quot;)/g,
      '<span class="tok-string">$1$2$3</span>',
    );
}

function highlightJS(code) {
  return escapeHtml(code)
    .replace(/(\/\/.*$)/gm, '<span class="tok-comment">$1</span>')
    .replace(
      /(import|export|from|const|let|var|return|function|class|new|if|else|=&gt;)/g,
      '<span class="tok-keyword">$1</span>',
    )
    .replace(
      /(&quot;[^&quot;]*&quot;|&#x27;[^&#x27;]*&#x27;|`[^`]*`)/g,
      '<span class="tok-string">$1</span>',
    )
    .replace(
      /([A-Z][a-zA-Z]+)(?=\s*[=(])/g,
      '<span class="tok-name">$1</span>',
    );
}

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
      pre.setAttribute("aria-label", `${lang} example`);
    }

    if (!pre.querySelector(".cai-code-block__copy")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cai-copy-btn cai-code-block__copy";
      button.dataset.copy = pre.querySelector("code")?.textContent || "";
      button.setAttribute("aria-label", `Copy code example ${index + 1}`);
      button.textContent = "Copy";
      pre.appendChild(button);
    }

    highlightBlock(pre);
  });
}
