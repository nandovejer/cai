/**
 * LUZ site — colour mode and light before the first paint.
 *
 * luz-exception: EX-009 — a classic, render-blocking script in <head>
 * (PRINCIPLES §3: no JS on the critical rendering path). The pages are
 * served as Vejer light, and <luz-mode> (apps/site/header.js, a deferred
 * module) applies the visitor's mode and the light of the hour only after
 * the first paint, so a dark page flashed light on every navigation. This
 * sets data-theme and data-light on <html> the same way, before anything is
 * drawn:
 *   1. a stored choice under core's key (light, dark or high-contrast) is
 *      that mode, its light pinned: light is the afternoon, dark and high
 *      contrast the night;
 *   2. else the light is the phase of the local hour (the boundaries of
 *      phaseOf in packages/site/src/mode.js). With prefers-contrast: more
 *      the mode is high contrast, with that light, as <luz-mode by="clock">
 *      writes it after it upgrades (theme-light.css never overrides high
 *      contrast, so the light changes nothing on screen); otherwise dawn,
 *      dusk and night are dark, the others light. The system's colour
 *      scheme is not read: the clock decides.
 * <luz-mode remember by="clock"> stays the owner: it re-applies the mode,
 * stores the choice and follows the clock. It reads, never writes. Without
 * JavaScript nothing changes: no data-light, and core's radios switch.
 *
 * Not part of any published package; a classic script, so no import.
 */
(() => {
  const html = document.documentElement;
  let mode = null;
  try {
    mode = localStorage.getItem("luz-theme");
  } catch (_) {}
  let light;
  if (mode === "light") light = "afternoon";
  else if (mode === "dark" || mode === "high-contrast") light = "night";
  else {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    light = hour < 5 ? "night" : hour < 7.5 ? "dawn" : hour < 12 ? "morning" : hour < 17.5 ? "afternoon" : hour < 20.5 ? "sunset" : hour < 22.5 ? "dusk" : "night";
    if (window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) mode = "high-contrast";
    else mode = light === "dawn" || light === "dusk" || light === "night" ? "dark" : "light";
  }
  html.setAttribute("data-theme", mode);
  html.setAttribute("data-light", light);
})();
