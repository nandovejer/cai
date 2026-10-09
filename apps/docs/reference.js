/**
 * CAI documentation site — page glue, loaded by every page.
 * Wires the core behaviors the examples demonstrate, one module at a time,
 * the few HTML element demos that need a line of script (canvas,
 * template, custom element), and "On this page".
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
import { initSiteHeader } from "../landing/site-header.js";

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
  const style = getComputedStyle(document.documentElement);
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

// Color mode, menu drawer and header height (shared with the home
// page). The canvas demo paints with the token values: repaint it per mode.
initSiteHeader({ onModeChange: drawCanvas });
initFolds();
initOnThisPage();
initAssets();
initCopy();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.cai-code-block").forEach(highlightBlock);
initTabs();
initModals();
initRangeOutputs();
initPlayers();
syncLoadedMedia();
initDemoGuards();
initTemplateDemo();
initSlotDemo();
