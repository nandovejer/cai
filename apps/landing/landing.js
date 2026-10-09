/**
 * CAI landing — page glue.
 * Everything here is an enhancement: the color mode switcher is a native
 * radio group that works without JavaScript (:root:has() in the tokens).
 *
 * cai.js is deliberately not loaded: its auto-init applies the stored or
 * default custom theme to <html>, and this page shows the base color modes
 * (light, dark or high contrast), stored under the site's own key.
 */

import { initCopyButtons } from "/packages/core/dist/clipboard.js";
import { highlightBlock } from "/packages/core/dist/highlight.js";
import { initSiteHeader } from "./site-header.js";

/* ---- Copy buttons ----------------------------------------------------- */

function initCopy() {
  // The copied text is read from the code on screen, so it cannot drift
  document.querySelectorAll("[data-copy-from]").forEach((button) => {
    const source = document.getElementById(button.dataset.copyFrom);
    if (source) button.dataset.copy = source.textContent.trim();
  });
  // initCopyButtons() announces each copy in a polite live region
  initCopyButtons();
}

/* ---- Boot -------------------------------------------------------------- */

// Color mode, menu drawer and header height (shared with the docs)
initSiteHeader();
initCopy();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.cai-code-block").forEach(highlightBlock);
