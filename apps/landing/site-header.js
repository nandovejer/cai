/**
 * CAI site header — one behavior for every page of the site (home, docs).
 * Everything here enhances what works without JavaScript: the color mode is
 * a native radio group (:root:has() in the tokens) and the menu
 * drawer is a native popover.
 *
 * - Color mode: applies the stored mode (or the OS one), stores the
 *   visitor's choice under the site's own key, follows the OS while there
 *   is no choice, and turns the radios into core's cycle button.
 * - Menu drawer: core's initSidebar() on #page-nav, so a link closes the
 *   drawer and the current section is marked.
 * - Publishes the sticky header's height as --site-header-h on <html>, so
 *   anchored targets, the docs sidebar and the drawer sit below the header.
 *
 * Not part of any published package.
 */

import { initThemeCycle } from "/packages/core/dist/theme.js";
import { initSidebar } from "/packages/core/dist/sidebar.js";

// One key for the whole site, so the choice follows the visitor
const MODES = ["light", "dark", "high-contrast"];
const MODE_KEY = "cai-site-mode";

function storedMode() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return MODES.includes(mode) ? mode : null;
  } catch (_) {
    return null;
  }
}

function initModes(onModeChange) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const prefersContrast = window.matchMedia("(prefers-contrast: more)");
  const osMode = () => {
    if (prefersContrast.matches) return "high-contrast";
    return prefersDark.matches ? "dark" : "light";
  };

  const setMode = (mode, persist) => {
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
    onModeChange?.(mode);
  };

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

function publishHeight(header) {
  const publish = () =>
    document.documentElement.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
  publish();
  if (typeof ResizeObserver === "function") new ResizeObserver(publish).observe(header);
}

/**
 * @param {{ onModeChange?: (mode: string) => void }} [options]
 *   onModeChange runs after every mode change, the first one included.
 */
export function initSiteHeader({ onModeChange } = {}) {
  initModes(onModeChange);
  // One button that steps through the modes; the radios stay underneath
  initThemeCycle();
  const nav = document.getElementById("page-nav");
  if (nav) initSidebar(nav);
  const header = document.querySelector(".site-header");
  if (header) publishHeight(header);
}
