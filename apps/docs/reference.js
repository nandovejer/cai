/**
 * LUZ documentation site — page glue, loaded by every page.
 * Wires the core behaviors the examples demonstrate, one module at a time,
 * the few HTML element demos that need a line of script (canvas,
 * template, custom element), "On this page", the Code / Design tab the
 * reader chose last (view.js), and the site search and the cookie consent
 * example (@luz-ds/site).
 *
 * luz.js is deliberately not loaded: its auto-init applies the stored or
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
// Defines <luz-search> at once, not on idle as site.js would: the header's
// search button is on every page, and wires itself when it connects
import "/packages/site/dist/search.js";
// Defines <luz-consent>, for the live example of the Cookie consent page
// (its answer is stored under its own key, luz-consent-demo)
import "/packages/site/dist/consent.js";
import { initSiteHeader } from "./site-header.js";
import { initDocsView } from "./view.js";

/* ---- Small enhancements ----------------------------------------------- */

function initFolds() {
  // The long reference lists are native <details>, open in the markup so they
  // read without JS. On a narrow screen they start closed, to keep the page a
  // reasonable length; opening one is the browser's own behavior.
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const id = window.location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  document.querySelectorAll("details[data-fold-narrow]").forEach((details) => {
    // eslint-disable-next-line no-restricted-syntax -- RL-3: sets the initial state only; opening and closing stay native
    if (!details.contains(target)) details.open = false;
  });
  // Folding moves everything below it: go back to the requested section
  if (target) target.scrollIntoView();
}

function initOnThisPage() {
  // A closed <details> in the markup, so it reads without JS on every
  // screen; from 1280px it is a rail beside the content: open it, and mark
  // the section in view (aria-current="true", core's scroll spy). Below
  // 1280px nothing is marked: the list is closed.
  const nav = document.querySelector(".docs-onpage");
  if (!nav || !window.matchMedia("(min-width: 1280px)").matches) return;
  // eslint-disable-next-line no-restricted-syntax -- RL-3: sets the initial state only; opening and closing stay native
  nav.querySelector("details").open = true;
  initSidebar(nav);
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

/* ---- Choose your snippet: the picker ------------------------------------ */

function initSnippetPicker() {
  // The form is in a <template>: without a script the table is the index and
  // every snippet shows. State lives in the DOM (checked, hidden) and the URL.
  const template = document.querySelector("template[data-docs-picker]");
  const index = document.querySelector('[role="region"][aria-label="Every snippet"]');
  if (!template || !index) return;
  template.after(template.content.cloneNode(true));
  const form = template.nextElementSibling;
  const snippets = [...document.querySelectorAll("[data-snippet]")];
  const status = form.querySelector("[data-picker-status]");
  const radio = (name, value) => form.querySelector(`input[name="${name}"][value="${value}"]`);
  const show = () => {
    const kind = form.querySelector('input[name="kind"]:checked').value;
    const via = form.querySelector('input[name="via"]:checked').value;
    snippets.forEach((el) => {
      el.hidden = el.dataset.kind !== kind || el.dataset.via !== via;
    });
    document.querySelectorAll("[data-snippet-kind]").forEach((section) => {
      section.hidden = !section.querySelector("[data-snippet]:not([hidden])");
    });
    status.textContent = document.getElementById(`${kind}-${via}`).querySelector("h3").textContent.trim();
  };
  // A hash that is not a snippet leaves the choice alone
  const fromHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (!target?.matches("[data-snippet]") || !radio("kind", target.dataset.kind) || !radio("via", target.dataset.via)) return;
    radio("kind", target.dataset.kind).checked = true;
    radio("via", target.dataset.via).checked = true;
    show();
    // The browser could not scroll to it while it was hidden
    target.scrollIntoView();
  };
  form.addEventListener("change", () => {
    show();
    const chosen = snippets.find((el) => !el.hidden);
    window.history.replaceState(null, "", `#${chosen.id}`);
  });
  index.hidden = true;
  show();
  fromHash();
  window.addEventListener("hashchange", fromHash);
}

/* ---- Make it yours: the sizes demo -------------------------------------- */

// The two knobs, in the order of the ranges: the base (in rem) and the ratio
const KNOBS = [
  ["--luz-type-base", "rem"],
  ["--luz-type-ratio", ""],
];

function initSizesDemo() {
  // A <template> of the page: without a script there is no control of nothing,
  // and the table of presets is what the reader has
  const template = [...document.querySelectorAll("template")].find((t) => t.content.querySelector('input[type="range"][data-output]'));
  if (!template) return;
  template.after(template.content.cloneNode(true));
  const form = template.nextElementSibling;
  const ranges = [...form.querySelectorAll('input[type="range"]')];
  const outputOf = (input) => document.getElementById(input.dataset.output);
  // It re-scales this page itself, on <html>; nothing is stored
  form.addEventListener("input", (e) => {
    const i = ranges.indexOf(e.target);
    if (i >= 0) document.documentElement.style.setProperty(KNOBS[i][0], e.target.value + KNOBS[i][1]);
  });
  form.addEventListener("reset", () => {
    // The browser resets the controls after this event: do the same, now
    ranges.forEach((input, i) => {
      input.value = input.defaultValue;
      outputOf(input).textContent = input.value;
      document.documentElement.style.removeProperty(KNOBS[i][0]);
    });
  });
}

/* ---- Assets the build cannot see in markup ---------------------------- */

/* Vite rewrites src on img, source and video, not on track, embed, object or
   data-* attributes. new URL(…, import.meta.url) is plain ESM, and it is also
   what makes the build emit the files. */
const ASSETS = {
  shapes: new URL("./assets/shapes.svg", import.meta.url).href,
  captions: new URL("./assets/captions.vtt", import.meta.url).href,
  "nasa-captions": new URL("./assets/nasa-earth.vtt", import.meta.url).href,
  "nasa-captions-es": new URL("./assets/nasa-earth-es.vtt", import.meta.url).href,
  midi: new URL("./assets/sample.mid", import.meta.url).href,
};

function initAssets() {
  const player = document.querySelector('.luz-player[data-type="midi"]');
  if (player) player.dataset.src = ASSETS.midi;
  document.querySelectorAll("[data-asset]").forEach((el) => {
    const href = ASSETS[el.dataset.asset];
    if (href) el.setAttribute(el.matches("object") ? "data" : "src", href);
    // A default track is already showing, without a file: Firefox loads the
    // new src only when the mode is set again
    if (href && el.track?.mode === "showing") {
      el.track.mode = "disabled";
      el.track.mode = "showing";
    }
  });
}

/* ---- Copy buttons ----------------------------------------------------- */

function initCopy() {
  // The HTML element cards copy the code on screen, so it cannot drift
  document.querySelectorAll("[data-copy-from]").forEach((button) => {
    const source = document.getElementById(button.dataset.copyFrom);
    if (source) button.dataset.copy = source.textContent.trim();
  });
  initCopyButtons();
}

/* ---- HTML element demos ------------------------------------------------ */

function initDemoGuards() {
  document.querySelectorAll(".elements-stage").forEach((stage) => {
    stage.addEventListener("click", (e) => {
      const link = e.target.closest('a[href="#"], area[href="#"]');
      // eslint-disable-next-line no-restricted-syntax -- RL-3: a demo link with nowhere to go; following "#" would only jump to the top
      if (link) e.preventDefault();
    });
    stage.addEventListener("submit", (e) => {
      // Native validation has already run: only a valid form gets here
      // eslint-disable-next-line no-restricted-syntax -- RL-3: a demo form has no endpoint; native validation has already run
      if (e.target.matches("form:not([method='dialog'])")) e.preventDefault();
    });
  });
}

function drawCanvas() {
  const canvas = document.getElementById("d-canvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  const style = getComputedStyle(document.documentElement);
  const token = (name) => style.getPropertyValue(name).trim();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = token("--luz-brand-primary");
  ctx.fillRect(20, 20, 80, 80);
  ctx.fillStyle = token("--luz-text-secondary");
  ctx.beginPath();
  ctx.arc(170, 60, 40, 0, Math.PI * 2);
  ctx.fill();
}

function initTemplateDemo() {
  const template = document.getElementById("d-template");
  const list = document.getElementById("d-template-list");
  const button = document.getElementById("d-template-add");
  if (!template || !list || !button) return;
  button.addEventListener("click", () => {
    const item = template.content.cloneNode(true);
    item.querySelector("[data-n]").textContent = String(list.children.length + 1);
    list.append(item);
  });
}

function initSlotDemo() {
  const template = document.getElementById("d-slot-template");
  if (!template || customElements.get("demo-card")) return;
  customElements.define(
    "demo-card",
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" }).append(template.content.cloneNode(true));
      }
    },
  );
}

/* ---- Boot -------------------------------------------------------------- */

// Color mode, menu drawer and header height (shared with the home
// page). The canvas demo paints with the token values: repaint it per mode.
initSiteHeader({ onModeChange: drawCanvas });
initFolds();
initOnThisPage();
initAssets();
initCopy();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.luz-code-block").forEach(highlightBlock);
// The remembered Code / Design tab first: initTabs() opens the tab it marks,
// unless the URL fragment points into the other one
initDocsView();
initTabs();
initModals();
initSnippetPicker();
// Before the outputs: it binds the ranges of the demo it clones in
initSizesDemo();
initRangeOutputs();
initPlayers();
initDemoGuards();
initTemplateDemo();
initSlotDemo();
// Only the contrast page has the tool: its script is a separate chunk
if (document.querySelector("[data-contrast-tool]")) import("./contrast-check.js").then((m) => m.initContrastTool());
// The Table page sorts its example in the browser, as luz.js would: the module
// loads on demand, with the strings of core's dictionary
if (document.querySelector("th[data-luz-sort]")) {
  Promise.all([import("/packages/core/dist/table-sort.js"), import("/packages/core/dist/i18n.js")]).then(([sort, i18n]) =>
    sort.initTableSort(document, i18n.t),
  );
}
// The Timeline page defines <luz-timeline> with the chunk on its own, as a
// consumer who imports @luz-ds/core/timeline does (its strings travel with it)
if (document.querySelector("luz-timeline")) import("/packages/core/dist/timeline.js");
