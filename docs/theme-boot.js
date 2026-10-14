/**
 * LUZ site — color mode before the first paint.
 *
 * luz-exception: EX-009 — a classic, render-blocking script in <head>
 * (PRINCIPLES §3: no JS on the critical rendering path). The pages start
 * as data-theme="light" and site-header.js, a deferred module, applies the
 * visitor's mode only after the first paint, so a dark page flashed light
 * on every navigation. This sets the same mode, the same way (the stored
 * choice under the site's key, else the OS), before anything is drawn.
 * site-header.js stays the owner of the mode: it re-applies it, stores
 * the choice and follows the OS. Without JavaScript nothing changes.
 *
 * Not part of any published package; a classic script, so no import.
 */
(() => {
  const modes = ["light", "dark", "high-contrast"];
  let mode = null;
  try {
    mode = localStorage.getItem("luz-site-mode");
  } catch (_) {}
  if (!modes.includes(mode)) {
    const matches = (query) => window.matchMedia?.(query).matches;
    if (matches("(prefers-contrast: more)")) mode = "high-contrast";
    else mode = matches("(prefers-color-scheme: dark)") ? "dark" : "light";
  }
  document.documentElement.dataset.theme = mode;
})();
