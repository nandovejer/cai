/**
 * LUZ landing — page glue.
 * Everything here is an enhancement: the color mode switcher is a native
 * radio group that works without JavaScript (:root:has() in the tokens),
 * and the specimens of "Works without JavaScript" are native elements.
 *
 * luz.js is deliberately not loaded: its auto-init applies the stored or
 * default custom theme to <html>. The mode and the light of the hour belong
 * to the footer's <luz-mode> (defined by apps/site/header.js): this page
 * only asks it to preview a light, and listens to luz-mode:change.
 */

import { initCopyButtons } from "/packages/core/dist/clipboard.js";
import { highlightBlock } from "/packages/core/dist/highlight.js";
import { initModals } from "/packages/core/dist/modal.js";
// Defines <luz-search> at once, not on idle as site.js would: the header's
// search button wires itself when it connects
import "/packages/site/dist/search.js";
// A namespace, not a named import: if site's module is not there, the rest of the page still runs
import * as siteMode from "/packages/site/dist/mode.js";
import { initSiteHeader } from "/apps/site/header.js";
// <home-light>, the visitor's sky under the hero: defines the element, which
// loads its one visual
import "/apps/landing/light/light.js";

/** The footer's <luz-mode>, once it is upgraded. */
const mode = () => {
  const el = document.querySelector("luz-mode");
  return el && typeof el.preview === "function" ? el : null;
};

/** The name of a light, in the page's language (the labels of <home-light>). */
const nameOf = (phase) => document.body.getAttribute(`data-luz-label-light-${phase}`) || phase;

/* ---- Copy buttons ----------------------------------------------------- */

function initCopy() {
  // The copied text is read from the code on screen, so it cannot drift
  document.querySelectorAll("[data-copy-from]").forEach((button) => {
    const source = document.getElementById(button.dataset.copyFrom);
    if (source) button.dataset.copy = source.textContent.trim();
    button.hidden = false;
  });
  // initCopyButtons() announces each copy in a polite live region
  initCopyButtons();
}

/* ---- The day: the swatches of "Why" and the strip of "Modes" ----------- */

/**
 * The six phases from dawn, cut where <luz-mode>'s own phaseOf() changes:
 * minutes after the start of dawn, so the day reads dawn to night.
 * Null without site's module.
 */
function dayOf(phaseOf) {
  if (typeof phaseOf !== "function") return null;
  const at = (minute) => phaseOf((minute % 1440) / 60);
  let dawn = 0;
  while (at(dawn) !== "dawn" && dawn < 1440) dawn += 1;
  const edges = [0];
  for (let m = 1; m < 1440; m += 1) if (at(dawn + m) !== at(dawn + m - 1)) edges.push(m);
  edges.push(1440);
  const phases = edges.slice(0, -1).map((m) => at(dawn + m));
  /** Where a minute of the day sits on the strip: 0 at the start of dawn, 1 at the end of the night. */
  const place = (minute) => {
    const m = (minute - dawn + 1440) % 1440;
    const i = edges.findLastIndex((edge) => edge <= m);
    return (i + (m - edges[i]) / (edges[i + 1] - edges[i])) / phases.length;
  };
  return { at, phases, place };
}

function initDay() {
  const day = dayOf(siteMode.phaseOf);
  if (!day) return;
  const { at, phases: PHASES, place } = day;
  const swatches = [...document.querySelectorAll("[data-phase]")];
  const back = document.querySelector("[data-phase-live]");
  const current = document.querySelector("[data-shown-light]");
  const strip = document.querySelector(".landing-day");
  const marker = strip?.querySelector(".landing-day__now");
  const line = document.querySelector("[data-day-line]");
  const name = line?.querySelector("[data-day-phase]");

  for (const swatch of swatches) swatch.addEventListener("click", () => mode()?.preview(swatch.dataset.phase));
  back?.addEventListener("click", () => {
    // The button hides itself once the clock's light is back: the focus goes
    // first to the swatch of that light, not with the button to <body>
    if (document.activeElement === back) {
      const now = new Date();
      swatches.find((swatch) => swatch.dataset.phase === at(now.getHours() * 60 + now.getMinutes()))?.focus();
    }
    mode()?.preview(null);
  });

  let timer = 0;
  // A borrowed light is shown at the middle of its phase; else the clock's minute
  const show = ({ light = null, simulated = false } = {}) => {
    clearTimeout(timer);
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    const borrowed = simulated && PHASES.includes(light) ? light : null;
    const phase = borrowed ?? at(minute);
    for (const swatch of swatches) swatch.setAttribute("aria-pressed", String(swatch.dataset.phase === borrowed));
    if (back) back.hidden = !borrowed;
    if (strip) strip.style.setProperty("--day-t", (borrowed ? (PHASES.indexOf(borrowed) + 0.5) / PHASES.length : place(minute)).toFixed(4));
    if (marker) marker.hidden = false;
    if (name) name.textContent = nameOf(phase);
    if (current) current.textContent = nameOf(phase);
    if (line) line.hidden = false;
    if (!borrowed) timer = setTimeout(() => show(), 6e4 - (now.getSeconds() * 1e3 + now.getMilliseconds()));
  };

  document.addEventListener("luz-mode:change", (event) => show(event.detail));
  // <luz-mode> may have upgraded, and told the page, before this module ran
  show();
  // The swatches need <luz-mode> and this script: shown only now
  if (mode()) {
    for (const el of document.querySelectorAll(".landing-swatches, [data-needs-js]")) el.hidden = false;
  }
}

/* ---- Boot -------------------------------------------------------------- */

// Color mode, menu drawer and header height (shared with the docs)
initSiteHeader();
initCopy();
// The dialog of "Works without JavaScript": core's fallback where the
// browser has no command / commandfor
initModals();
initDay();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.luz-code-block").forEach(highlightBlock);
