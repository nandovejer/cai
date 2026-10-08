/**
 * Utility functions for CAI Design System
 * Pure functions that can be tested independently
 */

/**
 * Format seconds into MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "1:23")
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Check if a theme is a custom theme
 * @param {string} theme - Theme name
 * @param {string[]} customThemes - List of custom theme names
 * @returns {boolean}
 */
export function isCustomTheme(
  theme,
  customThemes = ["vejer", "minimalist"],
) {
  return customThemes.includes(theme);
}

/**
 * Validate that a mode is in the allowed list
 * @param {string} mode - Mode name (light, dark, high-contrast)
 * @param {string[]} modes - Allowed modes
 * @returns {boolean}
 */
export function isValidMode(mode, modes = ["light", "dark", "high-contrast"]) {
  return modes.includes(mode);
}

/**
 * Calculate progress percentage from current time and duration
 * @param {number} current - Current time in seconds
 * @param {number} duration - Total duration in seconds
 * @returns {number} Percentage 0-100
 */
export function calculateProgress(current, duration) {
  if (!duration || isNaN(current) || isNaN(duration)) return 0;
  return Math.max(0, Math.min(100, (current / duration) * 100));
}

/**
 * Escape HTML special characters for safe display
 * @param {string} str - Raw string
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mark the document as running enhancement scripts. CSS uses
 * `:root:not([data-cai-js])` to hide controls that only work with JavaScript
 * (copy buttons) or to lay out the no-JS state of a component (tabs).
 * Safe to call more than once. Called by the init*() of enhancing modules.
 */
export function enableJs() {
  document.documentElement.setAttribute("data-cai-js", "");
}
