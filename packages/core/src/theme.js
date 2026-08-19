/**
 * CAI Design System — Theme system
 * Base color modes (light/dark/high-contrast) via data-theme on <html>,
 * custom themes (data-theme="<name>") with per-theme data-mode variants.
 *
 * Importing this module has no side effects; call initThemeSystem() to
 * wire up buttons, OS preference syncing, and the initial theme.
 */

// Color modes: luminosity variants (light/dark/high-contrast)
export const MODES = ["light", "dark", "high-contrast"];
// Custom themes: complete visual identities
export const CUSTOM_THEMES = ["ricardoymortimer", "minimalist"];
// Default color mode for each custom theme (used when no mode is stored)
const CUSTOM_THEME_DEFAULT_MODE = {
  ricardoymortimer: "dark",
  minimalist: "light",
};
const ALL_THEMES = [...MODES, ...CUSTOM_THEMES];
const STORAGE_KEY = "cai-theme";
const STORAGE_KEY_MODE = "cai-mode";
const STORAGE_KEY_LAST_MODE = "cai-last-mode";

export function getStoredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && ALL_THEMES.includes(saved) ? saved : null;
}

export function getStoredMode() {
  const saved = localStorage.getItem(STORAGE_KEY_MODE);
  return saved && MODES.includes(saved) ? saved : null;
}

export function getInitialTheme() {
  const saved = getStoredTheme();
  if (saved) return saved;
  return "minimalist";
}

function syncButtons(theme) {
  const isCustom = CUSTOM_THEMES.includes(theme);
  const currentMode = document.documentElement.dataset.mode;

  // Mode buttons (footer) — active only when a base color mode is selected
  document.querySelectorAll(".cai-theme-btn").forEach((btn) => {
    const active = !isCustom && btn.dataset.theme === theme;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.classList.toggle("is-dimmed", isCustom);
  });

  // Custom theme apply buttons
  document.querySelectorAll(".cai-theme-apply-btn").forEach((btn) => {
    const active = btn.dataset.theme === theme;
    btn.classList.toggle("is-active", active);
    btn.textContent = active ? "Applied" : "Apply theme";
    btn.setAttribute("aria-pressed", String(active));
  });

  // Inline mode buttons inside theme cards
  document.querySelectorAll(".docs-theme-card__mode-btn").forEach((btn) => {
    const card = btn.closest(".docs-theme-card");
    const cardTheme = card?.dataset.theme;
    const isCardActive = theme === cardTheme;
    const modeActive = isCardActive && currentMode === btn.dataset.mode;
    btn.classList.toggle("is-active", modeActive);
    btn.setAttribute("aria-pressed", String(modeActive));
  });
}

export function applyTheme(theme, { persist = true } = {}) {
  const isCustom = CUSTOM_THEMES.includes(theme);
  document.documentElement.dataset.theme = theme;
  if (persist) localStorage.setItem(STORAGE_KEY, theme);

  if (isCustom) {
    // Restore saved mode, or fall back to the theme's default mode
    const savedMode = getStoredMode();
    const mode = savedMode || CUSTOM_THEME_DEFAULT_MODE[theme] || "light";
    document.documentElement.dataset.mode = mode;
    // Persist the resolved mode so it survives page reload
    if (persist) localStorage.setItem(STORAGE_KEY_MODE, mode);
  } else {
    // Base color mode: clear data-mode
    delete document.documentElement.dataset.mode;
    if (persist) localStorage.removeItem(STORAGE_KEY_MODE);
  }

  syncButtons(theme);
}

// Apply a color mode within an already-active custom theme
export function applyMode(mode, parentTheme, { persist = true } = {}) {
  // Ensure the parent theme is applied first
  if (document.documentElement.dataset.theme !== parentTheme) {
    if (persist) {
      if (MODES.includes(document.documentElement.dataset.theme)) {
        localStorage.setItem(
          STORAGE_KEY_LAST_MODE,
          document.documentElement.dataset.theme,
        );
      }
    }
    document.documentElement.dataset.theme = parentTheme;
    if (persist) localStorage.setItem(STORAGE_KEY, parentTheme);
  }
  document.documentElement.dataset.mode = mode;
  if (persist) localStorage.setItem(STORAGE_KEY_MODE, mode);
  syncButtons(parentTheme);
}

/**
 * Wire up theme buttons, OS preference syncing, and the initial theme.
 */
export function initThemeSystem() {
  // Apply initial theme without forcing persistence when it comes from the OS
  applyTheme(getInitialTheme(), { persist: !!getStoredTheme() });

  // Follow OS preference changes while the user has no explicit choice
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!getStoredTheme()) {
        applyTheme(e.matches ? "dark" : "light", { persist: false });
      }
    });

  document.body.addEventListener("click", (e) => {
    // --- Color mode switcher (footer) ---
    const themeBtn = e.target.closest(".cai-theme-btn");
    if (themeBtn?.dataset.theme) {
      applyTheme(themeBtn.dataset.theme);
      return;
    }

    // --- Inline mode buttons inside theme cards ---
    const cardModeBtn = e.target.closest(".docs-theme-card__mode-btn");
    if (cardModeBtn?.dataset.mode) {
      const card = cardModeBtn.closest(".docs-theme-card");
      const parentTheme = card?.dataset.theme;
      if (parentTheme) applyMode(cardModeBtn.dataset.mode, parentTheme);
      return;
    }

    // --- Custom theme apply button ---
    const themeApplyBtn = e.target.closest(".cai-theme-apply-btn");
    if (themeApplyBtn?.dataset.theme) {
      const current = document.documentElement.dataset.theme;
      // Toggle: clicking again removes the custom theme → restore last mode
      if (current === themeApplyBtn.dataset.theme) {
        const fallback = localStorage.getItem(STORAGE_KEY_LAST_MODE) || "light";
        localStorage.removeItem(STORAGE_KEY_MODE);
        applyTheme(fallback);
      } else {
        // Store current base mode before switching to a custom theme
        if (MODES.includes(current)) {
          localStorage.setItem(STORAGE_KEY_LAST_MODE, current);
        }
        applyTheme(themeApplyBtn.dataset.theme);
      }
    }
  });
}
