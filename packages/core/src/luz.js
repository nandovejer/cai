/**
 * LUZ Design System — luz.js (entry)
 * Re-exports the public API and auto-initializes every behavior when
 * loaded in a page: <script type="module" src=".../luz.js"></script>.
 *
 * For granular usage import the individual modules instead:
 *   import { applyTheme } from "@luz-ds/core/theme";
 *   import { mountPlayer } from "@luz-ds/core/player";
 *   import { initTabs } from "@luz-ds/core/tabs";
 */

import { initThemeSystem, initThemeCycle } from "./theme.js";
import { initSidebar } from "./sidebar.js";
import { initCopyButtons } from "./clipboard.js";
import { initModals } from "./modal.js";
import { initHighlight } from "./highlight.js";
import { initPlayers } from "./player.js";
import { initTabs } from "./tabs.js";
import { t } from "./i18n.js";

export {
  MODES,
  getCustomThemes,
  getStoredTheme,
  getStoredMode,
  getInitialTheme,
  applyTheme,
  applyMode,
  initThemeSystem,
  initThemeCycle,
} from "./theme.js";
export { initSidebar } from "./sidebar.js";
export { copyToClipboard, initCopyButtons } from "./clipboard.js";
export { initModals, supportsCommands } from "./modal.js";
export { highlightBlock, initHighlight } from "./highlight.js";
export {
  initSeekbar,
  wrapHTMLMedia,
  bindPlayerUI,
  mountPlayer,
  mountMidiPlayer,
  initPlayers,
} from "./player.js";
export { activateTab, initTabs } from "./tabs.js";
export { t, getLang, registerLocale } from "./i18n.js";
export {
  formatTime,
  isCustomTheme,
  isValidMode,
  calculateProgress,
  escapeHtml,
} from "./utils.js";

/* ============================================================
   AUTO-INIT
   ============================================================ */

// The tokens layer is a required peer: without it every var(--luz-*) is empty.
function warnIfTokensMissing() {
  const probe = getComputedStyle(document.documentElement).getPropertyValue(
    "--luz-surface-page",
  );
  if (!probe.trim()) {
    console.warn(
      "[luz] @luz-ds/tokens is not loaded. Load luz-tokens.css before luz.css.",
    );
  }
}

function boot() {
  warnIfTokensMissing();
  initThemeSystem();
  initThemeCycle();
  initSidebar();
  initCopyButtons();
  initModals();
  initHighlight();
  initPlayers();
  initTabs();
  // A sortable heading loads its module on demand: its own chunk, its own budget
  if (document.querySelector("th[data-luz-sort]")) {
    import("./table-sort.js").then((m) => m.initTableSort(document, t));
  }
  // So does a timeline: the chunk defines <luz-timeline>; t gives it the strings of registerLocale()
  if (document.querySelector("luz-timeline")) import("./timeline.js").then((m) => m.initTimeline(document, t));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
