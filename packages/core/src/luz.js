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
import { loadLocales, t } from "./i18n.js";

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
export { t, getLang, registerLocale, loadLocales } from "./i18n.js";
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

if (typeof document !== "undefined") {
  // Starts at module evaluation: the file of the page's language is on its way
  // while the DOM is still being read. undefined on a page in English.
  let language = loadLocales();

  /**
   * Two waves. Wave 1 writes no string and never waits: it is what a visitor
   * uses at once (theme, scroll spy, copy handlers, dialogs, tabs, the click
   * of the color-mode button), and it does not set data-luz-js, so no control
   * is revealed before it works. Wave 2 writes the strings of its scripts
   * (code block names, players, the cycle button's name, sortable tables,
   * timelines): it runs when the language has arrived, or after two seconds,
   * and then the page is marked as enhanced. On a page in English both waves
   * run in the same task.
   */
  const boot = () => {
    warnIfTokensMissing();
    const defer = true;
    initThemeSystem(defer);
    initThemeCycle(document, defer);
    initSidebar();
    initCopyButtons(defer);
    initModals();
    initTabs(document, defer);
    const strings = () => {
      initThemeCycle();
      initHighlight();
      initPlayers();
      // A sortable heading loads its module on demand: its own chunk, its own budget
      if (document.querySelector("th[data-luz-sort]")) {
        import("./table-sort.js").then((m) => m.initTableSort(document, t));
      }
      // So does a timeline: the chunk defines <luz-timeline>; t gives it the strings of registerLocale()
      if (document.querySelector("luz-timeline")) import("./timeline.js").then((m) => m.initTimeline(document, t));
    };
    // A lang that arrived with the rest of the document (a script that ran early)
    language ||= loadLocales();
    if (language) Promise.race([language, new Promise((done) => setTimeout(done, 2000))]).then(strings);
    else strings();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
