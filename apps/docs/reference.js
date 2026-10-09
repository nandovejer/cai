/**
 * CAI documentation page — page glue.
 * Wires the core behaviors the examples demonstrate, one module at a time,
 * and the few HTML element demos that need a line of script (canvas,
 * template, custom element).
 *
 * cai.js is deliberately not loaded: its auto-init applies the stored or
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
import { initThemeCycle } from "/packages/core/dist/theme.js";
import { initSiteHeader } from "../landing/site-header.js";

/* ---- Color mode ------------------------------------------------------- */

// Shared with the home page, so the choice follows the visitor
const MODES = ["light", "dark", "high-contrast"];
const MODE_KEY = "cai-site-mode";
const root = document.documentElement;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const prefersContrast = window.matchMedia("(prefers-contrast: more)");

function storedMode() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return MODES.includes(mode) ? mode : null;
  } catch (_) {
    return null;
  }
}

function osMode() {
  if (prefersContrast.matches) return "high-contrast";
  return prefersDark.matches ? "dark" : "light";
}

function setMode(mode, persist) {
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
  // The canvas demo paints with the token values: repaint it
  drawCanvas();
}

function initModes() {
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

/* ---- Small enhancements ----------------------------------------------- */

function initFolds() {
  // The long reference lists are native <details>, open in the markup so they
  // read without JS. On a narrow screen they start closed, to keep the page a
  // reasonable length; opening one is the browser's own behavior.
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const target = document.getElementById(window.location.hash.slice(1));
  document.querySelectorAll("details[data-fold-narrow]").forEach((details) => {
    // eslint-disable-next-line no-restricted-syntax -- RL-3: sets the initial state only; opening and closing stay native
    if (!details.contains(target)) details.open = false;
  });
  // Folding moves everything below it: go back to the requested section
  if (target) target.scrollIntoView();
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

/* ---- Assets the build cannot see in markup ---------------------------- */

/* Vite rewrites src on img, source and video, not on track, embed, object or
   data-* attributes. new URL(…, import.meta.url) is plain ESM, and it is also
   what makes the build emit the files. */
const ASSETS = {
  shapes: new URL("./assets/shapes.svg", import.meta.url).href,
  captions: new URL("./assets/captions.vtt", import.meta.url).href,
  midi: new URL("./assets/sample.mid", import.meta.url).href,
};

function initAssets() {
  const player = document.querySelector('.cai-player[data-type="midi"]');
  if (player) player.dataset.src = ASSETS.midi;
  document.querySelectorAll("[data-asset]").forEach((el) => {
    const href = ASSETS[el.dataset.asset];
    if (href) el.setAttribute(el.matches("object") ? "data" : "src", href);
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
  const style = getComputedStyle(root);
  const token = (name) => style.getPropertyValue(name).trim();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = token("--cai-brand-primary");
  ctx.fillRect(20, 20, 80, 80);
  ctx.fillStyle = token("--cai-text-secondary");
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

function syncLoadedMedia() {
  // mountPlayer() reads the duration on "loadedmetadata" only, and a video
  // with preload="metadata" can have it before this module runs.
  document.querySelectorAll(".cai-player video, .cai-player audio").forEach((media) => {
    if (media.readyState >= 1) media.dispatchEvent(new window.Event("loadedmetadata"));
  });
}

/* ---- Boot -------------------------------------------------------------- */

initModes();
// One button in the header that steps through the modes; the radios stay
initThemeCycle();
initSiteHeader();
initFolds();
initAssets();
initCopy();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.cai-code-block").forEach(highlightBlock);
initTabs();
initModals();
initRangeOutputs();
// The page navigation only: the sidebar specimen's links stay inert
const nav = document.getElementById("docs-nav");
if (nav) initSidebar(nav);
initPlayers();
syncLoadedMedia();
initDemoGuards();
initTemplateDemo();
initSlotDemo();
