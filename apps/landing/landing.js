/**
 * CAI landing — page glue.
 * Wires the core behaviors the gallery demonstrates, one module at a time.
 *
 * cai.js is deliberately not loaded: its auto-init applies the stored or
 * default theme to <html>, and this page owns its own color mode (light,
 * dark or high contrast, stored under its own key).
 */

import { initCopyButtons } from "/packages/core/dist/clipboard.js";
import { highlightBlock } from "/packages/core/dist/highlight.js";
import { initTabs } from "/packages/core/dist/tabs.js";
import { initToggles } from "/packages/core/dist/toggle.js";
import { initModals } from "/packages/core/dist/modal.js";
import { initPlayers } from "/packages/core/dist/player.js";

/* ---- Color mode ------------------------------------------------------- */

const MODES = ["light", "dark", "high-contrast"];
const MODE_KEY = "cai-landing-mode";
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
  document.querySelectorAll("[data-landing-mode]").forEach((button) => {
    const active = button.dataset.landingMode === mode;
    button.setAttribute("aria-pressed", String(active));
    if (button.classList.contains("cai-theme-btn")) {
      button.classList.toggle("is-active", active);
    }
  });
}

function initModes() {
  setMode(storedMode() || osMode(), false);

  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-landing-mode]");
    if (button) setMode(button.dataset.landingMode, true);
  });

  // Follow the OS while the visitor has not chosen a mode here
  [prefersDark, prefersContrast].forEach((query) => {
    query.addEventListener("change", () => {
      if (!storedMode()) setMode(osMode(), false);
    });
  });
}

/* ---- Copy buttons ----------------------------------------------------- */

function initCopy() {
  // The copied text is read from the code on screen, so it cannot drift
  document.querySelectorAll("[data-copy-from]").forEach((button) => {
    const source = document.getElementById(button.dataset.copyFrom);
    if (source) button.dataset.copy = source.textContent.trim();
  });
  initCopyButtons();

  // copyToClipboard() reports success only by adding .is-copied, so announce
  // that when it appears, and a failure when it has not appeared in time.
  const status = document.getElementById("landing-status");
  if (!status) return;
  const targets = ".cai-copy-btn, .cai-icon-item";
  let clearTimer;

  function announce(message) {
    status.textContent = message;
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      status.textContent = "";
    }, 2000);
  }

  new window.MutationObserver((records) => {
    const copied = records.some(
      (record) =>
        record.target.matches(targets) &&
        record.target.classList.contains("is-copied") &&
        !(record.oldValue || "").includes("is-copied"),
    );
    if (copied) announce("Copied to clipboard");
  }).observe(document.body, {
    subtree: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
  });

  document.addEventListener("click", (e) => {
    const target = e.target.closest(targets);
    if (!target) return;
    setTimeout(() => {
      if (!target.classList.contains("is-copied")) {
        announce("Copy failed. Select the text and copy it manually.");
      }
    }, 1000);
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

function initLevelNav() {
  const links = new Map();
  document.querySelectorAll(".landing-levelnav__link").forEach((link) => {
    links.set(link.getAttribute("href").slice(1), link);
  });
  if (!links.size || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (entry.isIntersecting) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

function initMidiSource() {
  // A build does not rewrite data-* URLs. new URL(…, import.meta.url) is
  // plain ESM, and it is also what makes the build emit the file.
  const player = document.querySelector('.cai-player[data-type="midi"]');
  if (player) {
    player.dataset.src = new URL(
      "../platform-docs/assets/sample.mid",
      import.meta.url,
    ).href;
  }
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
initFolds();
initCopy();
// highlightBlock() only: initHighlight() also injects a copy button into each
// block, and core ships no position for it.
document.querySelectorAll("pre.cai-code-block").forEach(highlightBlock);
initTabs();
initToggles();
initModals();
initRangeOutputs();
initLevelNav();
initMidiSource();
initPlayers();
syncLoadedMedia();
