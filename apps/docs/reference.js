/**
 * CAI documentation page — page glue.
 * Wires the core behaviors the examples demonstrate, one module at a time.
 *
 * cai.js is deliberately not loaded: its auto-init applies the stored or
 * default custom theme to <html>, and this page shows the base color modes
 * (light, dark or high contrast), stored under the site's own key.
 * Everything here is an enhancement: the page reads and works without it.
 */

import { initCopyButtons } from "/packages/core/dist/clipboard.js";
import { highlightBlock } from "/packages/core/dist/highlight.js";
import { initTabs } from "/packages/core/dist/tabs.js";
import { initModals } from "/packages/core/dist/modal.js";
import { initPlayers } from "/packages/core/dist/player.js";
import { initSidebar } from "/packages/core/dist/sidebar.js";

/* ---- Color mode ------------------------------------------------------- */

// Shared with the home page, so the choice follows the visitor
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
  // The native radios show the mode (and set it without JavaScript)
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

/* ---- Small enhancements ----------------------------------------------- */

function initFolds() {
  // The long reference lists are native <details>, open in the markup so they
  // read without JS. On a narrow screen they start closed, to keep the page a
  // reasonable length; opening one is the browser's own behavior.
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const target = document.getElementById(window.location.hash.slice(1));
  document.querySelectorAll("details[data-fold-narrow]").forEach((details) => {
    // eslint-disable-next-line no-restricted-syntax -- RL-3: sets the initial state only; opening and closing stay native
    if (!details.contains(target)) details.open = false;
  });
  // Folding moves everything below it: go back to the requested section
  if (target) target.scrollIntoView();
}

function initRangeOutputs() {
  document.querySelectorAll('input[type="range"][data-output]').forEach((input) => {
    const output = document.getElementById(input.dataset.output);
    if (!output) return;
    input.addEventListener("input", () => {
      output.textContent = input.value;
    });
  });
}

function initMidiSource() {
  // A build does not rewrite data-* URLs. new URL(…, import.meta.url) is
  // plain ESM, and it is also what makes the build emit the file.
  const player = document.querySelector('.cai-player[data-type="midi"]');
  if (player) {
    player.dataset.src = new URL(
      "../platform-docs/assets/sample.mid",
      import.meta.url,
    ).href;
  }
}

function syncLoadedMedia() {
  // mountPlayer() reads the duration on "loadedmetadata" only, and a video
  // with preload="metadata" can have it before this module runs.
  document.querySelectorAll(".cai-player video, .cai-player audio").forEach((media) => {
    if (media.readyState >= 1) media.dispatchEvent(new window.Event("loadedmetadata"));
  });
}

/* ---- Boot -------------------------------------------------------------- */

initModes();
initFolds();
initCopyButtons();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.cai-code-block").forEach(highlightBlock);
initTabs();
initModals();
initRangeOutputs();
// The page navigation only: the sidebar specimen's links stay inert
const nav = document.getElementById("docs-nav");
if (nav) initSidebar(nav);
initMidiSource();
initPlayers();
syncLoadedMedia();
