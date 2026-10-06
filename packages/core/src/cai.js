/**
 * CAI Design System — cai.js (entry)
 * Re-exports the public API and auto-initializes every behavior when
 * loaded in a page: <script type="module" src=".../cai.js"></script>.
 *
 * For granular usage import the individual modules instead:
 *   import { applyTheme } from "@cai-ds/core/theme";
 *   import { mountPlayer } from "@cai-ds/core/player";
 *   import { initTabs } from "@cai-ds/core/tabs";
 */

import { initThemeSystem } from "./theme.js";
import { initSidebar } from "./sidebar.js";
import { initCopyButtons } from "./clipboard.js";
import { initModals } from "./modal.js";
import { initHighlight } from "./highlight.js";
import { initPlayers } from "./player.js";
import { initTabs } from "./tabs.js";

export {
  MODES,
  CUSTOM_THEMES,
  getStoredTheme,
  getStoredMode,
  getInitialTheme,
  applyTheme,
  applyMode,
  initThemeSystem,
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

// The tokens layer is a required peer: without it every var(--cai-*) is empty.
function warnIfTokensMissing() {
  const probe = getComputedStyle(document.documentElement).getPropertyValue(
    "--cai-bg-page",
  );
  if (!probe.trim()) {
    console.warn(
      "[cai] @cai-ds/tokens is not loaded. Load cai-tokens.css before cai.css.",
    );
  }
}

function boot() {
  warnIfTokensMissing();
  initThemeSystem();
  initSidebar();
  initCopyButtons();
  initModals();
  initHighlight();
  initPlayers();
  initTabs();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
