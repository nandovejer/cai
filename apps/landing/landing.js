/**
 * CAI landing — page glue.
 * Everything here is an enhancement: the color mode switcher is a native
 * radio group that works without JavaScript (:root:has() in the tokens),
 * and the example form's button opens a native popover.
 *
 * cai.js is deliberately not loaded: its auto-init applies the stored or
 * default custom theme to <html>, and this page shows the base color modes
 * (light, dark or high contrast), stored under the site's own key.
 */

import { initCopyButtons } from "/packages/core/dist/clipboard.js";
import { highlightBlock } from "/packages/core/dist/highlight.js";
import { initThemeCycle } from "/packages/core/dist/theme.js";
import { initSiteHeader } from "./site-header.js";

/* ---- Color mode ------------------------------------------------------- */

// Shared with the documentation page, so the choice follows the visitor
const MODES = ["light", "dark", "high-contrast"];
const MODE_KEY = "cai-site-mode";
const root = document.documentElement;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const prefersContrast = window.matchMedia("(prefers-contrast: more)");

function storedMode() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return MODES.includes(mode) ? mode : null;
  } catch (_) {
    return null;
  }
}

function osMode() {
  if (prefersContrast.matches) return "high-contrast";
  return prefersDark.matches ? "dark" : "light";
}

function setMode(mode, persist) {
  root.dataset.theme = mode;
  if (persist) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (_) {}
  }
  document.querySelectorAll('input[name="cai-theme"]').forEach((radio) => {
    radio.checked = radio.value === mode;
  });
}

function initModes() {
  setMode(storedMode() || osMode(), false);

  document.addEventListener("change", (e) => {
    const radio = e.target.closest?.('input[name="cai-theme"]');
    if (radio?.checked) setMode(radio.value, true);
  });

  // Follow the OS while the visitor has not chosen a mode
  [prefersDark, prefersContrast].forEach((query) => {
    query.addEventListener("change", () => {
      if (!storedMode()) setMode(osMode(), false);
    });
  });
}

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

/* ---- Example form ----------------------------------------------------- */

function initTryStatus() {
  // The popover shows the message without JavaScript. A screen reader may not
  // announce a popover opening, so the status region (always in the page,
  // empty) repeats its text. The popover itself has no role: one announcement.
  const note = document.getElementById("try-note");
  const status = document.getElementById("try-status");
  if (!note || !status) return;
  note.addEventListener("toggle", (e) => {
    status.textContent = e.newState === "open" ? note.textContent.trim() : "";
  });
}

/* ---- Boot -------------------------------------------------------------- */

initModes();
// One button that steps through the modes; the radios stay underneath
initThemeCycle();
initSiteHeader();
initTryStatus();
initCopy();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.cai-code-block").forEach(highlightBlock);
