/**
 * LUZ documentation site — page glue, loaded by every page.
 * Wires the core behaviors the examples demonstrate, one module at a time,
 * the few HTML element demos that need a line of script (canvas,
 * template, custom element), "On this page" and "Copy page as Markdown" in
 * the rail, the Code / Design tab the
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
import { initSiteHeader } from "/apps/site/header.js";
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
  // "On this page" is an open <details> in the rail (aside.luz-docs-rail), so
  // it reads without JS. From 80rem the rail is a column beside the content:
  // mark the section in view there (aria-current="true", core's scroll spy).
  // Only the page's own list, never the live demo of the rail pattern, which
  // sits inside an example in main.
  const nav = document.querySelector("aside.luz-docs-rail > .luz-docs-rail__inner > .luz-docs-rail__onpage");
  if (!nav || !window.matchMedia("(min-width: 80rem)").matches) return;
  initSidebar(nav);
}

/* ---- Copy page as Markdown --------------------------------------------- */

const COPIED = "Copied the page as Markdown.";
const NOT_COPIED = "Could not copy the page.";

function initCopyPage() {
  // A plain link to the page's index.md: without a script it opens the file.
  // With the clipboard API it becomes a button with the same text, which
  // copies the file's text and says so in the rail (WCAG 4.1.2: it no
  // longer navigates). The text is fetched when the pointer or the focus
  // reaches it, so the copy happens inside the click (Safari asks for that).
  // If the file cannot be read, the rail says so and the focus stays; if the
  // clipboard refuses the text, the browser opens the file instead.
  const link = document.querySelector("aside.luz-docs-rail a[data-docs-copy-page]");
  if (!link || !navigator.clipboard) return;
  const href = link.href;
  const button = document.createElement("button");
  button.type = "button";
  if (link.className) button.className = link.className;
  button.textContent = link.textContent;
  link.replaceWith(button);
  // The status exists, empty, before anything is said in it
  const status = document.createElement("p");
  status.className = "docs-rail-status";
  status.setAttribute("role", "status");
  button.closest(".luz-docs-rail__actions").append(status);
  let text = null;
  let loading = null;
  const load = () =>
    (loading ??= fetch(href)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`${response.status}`))))
      .then(
        (body) => (text = body),
        (error) => {
          // A later click tries again
          loading = null;
          throw error;
        },
      ));
  button.addEventListener("pointerenter", () => load().catch(() => {}));
  button.addEventListener("focus", () => load().catch(() => {}));
  let clear;
  const say = (message) => {
    status.textContent = message;
    clearTimeout(clear);
    clear = setTimeout(() => {
      status.textContent = "";
    }, 5000);
  };
  button.addEventListener("click", () => {
    const read = text !== null ? Promise.resolve(text) : load();
    read.then(
      (body) =>
        navigator.clipboard.writeText(body).then(
          () => say(COPIED),
          () => window.location.assign(href),
        ),
      () => say(NOT_COPIED),
    );
  });
}

/* ---- The current page in the sidebar ------------------------------------ */

/**
 * Every page is in the sidebar, so the current one can be far down its
 * list: on load, scroll the sidebar (its own scroller, never the page) so
 * that the link marked aria-current="page" is in view. The focus stays where
 * it is. The same in-list scroll as core's sidebar.js uses for the scroll spy.
 */
function revealCurrentPage() {
  const nav = document.getElementById("page-nav");
  const current = nav?.querySelector('a[aria-current="page"]');
  if (!current || nav.scrollHeight <= nav.clientHeight || !/auto|scroll/.test(getComputedStyle(nav).overflowY)) return;
  const l = current.getBoundingClientRect();
  const b = nav.getBoundingClientRect();
  if (l.top >= b.top && l.bottom <= b.bottom) return;
  // Into the middle of the box, so the pages around it show too
  nav.scrollTop += l.top - b.top - (b.height - l.height) / 2;
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

/**
 * Repaint the canvas demo when the mode or the light changes: at once, and
 * again when the colour fade on <html> (apps/site/theme-light.css) has ended,
 * so it ends in the colours of the mode and not in those of a frame of the fade.
 */
function initCanvas() {
  if (!document.getElementById("d-canvas")) return;
  drawCanvas();
  document.addEventListener("luz-mode:change", () => {
    drawCanvas();
    const fading = document.documentElement.getAnimations?.() ?? [];
    if (fading.length) Promise.allSettled(fading.map((a) => a.finished)).then(drawCanvas);
  });
}

/**
 * Re-anchor every specimen to the colour mode of <html> (plan §3.4): the
 * site's light changes the page, never what is documented. A specimen gets
 * <html>'s data-theme, so its tokens are Vejer's for that mode under any
 * light. It follows luz-mode:change and any other write to <html>'s
 * data-theme. Nothing is served with it: without JavaScript a specimen
 * inherits the page, and the radios still re-scope it.
 */
function initSpecimenTheme() {
  const root = document.documentElement;
  const apply = () => {
    const theme = root.getAttribute("data-theme");
    for (const el of document.querySelectorAll("[data-docs-specimen], .luz-docs-dodont__stage")) {
      if (!theme) el.removeAttribute("data-theme");
      else if (el.getAttribute("data-theme") !== theme) el.setAttribute("data-theme", theme);
    }
  };
  apply();
  document.addEventListener("luz-mode:change", apply);
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
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

// Color mode, menu drawer and header height (shared with the home page)
initSiteHeader();
// The specimens stay in Vejer whatever the light; the canvas demo paints with
// the token values, so it repaints per mode and light
initSpecimenTheme();
initCanvas();
initFolds();
initOnThisPage();
initCopyPage();
revealCurrentPage();
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
