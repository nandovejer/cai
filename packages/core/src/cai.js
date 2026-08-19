/**
 * CAI Design System — cai.js (entry)
 * Re-exports the public API and auto-initializes every behavior when
 * loaded in a page: <script type="module" src=".../cai.js"></script>.
 *
 * For granular usage import the individual modules instead:
 *   import { applyTheme } from "@cai-ds/core/theme";
 *   import { mountPlayer } from "@cai-ds/core/player";
 */

import { initThemeSystem } from "./theme.js";
import { initSidebar } from "./sidebar.js";
import { initCopyButtons } from "./clipboard.js";
import { initModals } from "./modal.js";
import { initHighlight } from "./highlight.js";
import { initPlayers } from "./player.js";

export {
  MODES,
  CUSTOM_THEMES,
  getStoredTheme,
  getStoredMode,
  getInitialTheme,
  applyTheme,
  applyMode,
  initThemeSystem,
} from "./theme.js";
export { openSidebar, closeSidebar, initSidebar } from "./sidebar.js";
export { copyToClipboard, initCopyButtons } from "./clipboard.js";
export { createFocusTrap, initModals } from "./modal.js";
export { highlightBlock, initHighlight } from "./highlight.js";
export {
  initSeekbar,
  wrapHTMLMedia,
  bindPlayerUI,
  mountPlayer,
  mountMidiPlayer,
  initPlayers,
} from "./player.js";
export {
  formatTime,
  isCustomTheme,
  isValidMode,
  calculateProgress,
  escapeHtml,
} from "./utils.js";

/* ============================================================
   TABS — activation, panels, and keyboard support
   ============================================================ */

function activateTab(tab, { moveFocus = false } = {}) {
  const tablist = tab.closest(".cai-tabs");
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll(".cai-tab"));
  tabs.forEach((item) => {
    const isActive = item === tab;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
    item.setAttribute("tabindex", isActive ? "0" : "-1");

    const panelId = item.getAttribute("aria-controls");
    if (!panelId) return;

    const panel = document.getElementById(panelId);
    if (!panel) return;

    panel.hidden = !isActive;
    panel.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  if (moveFocus) tab.focus();
}

function moveTabFocus(currentTab, direction) {
  const tablist = currentTab.closest(".cai-tabs");
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll(".cai-tab"));
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex === -1) return;

  const nextIndex =
    direction === "start"
      ? 0
      : direction === "end"
      ? tabs.length - 1
      : (currentIndex + direction + tabs.length) % tabs.length;

  activateTab(tabs[nextIndex], { moveFocus: true });
}

function initTabs() {
  document.querySelectorAll(".cai-tabs").forEach((tablist) => {
    const activeTab =
      tablist.querySelector('.cai-tab[aria-selected="true"]') ||
      tablist.querySelector(".cai-tab.is-active") ||
      tablist.querySelector(".cai-tab");

    if (activeTab) activateTab(activeTab);
  });

  document.body.addEventListener("click", (e) => {
    const tab = e.target.closest(".cai-tab");
    if (tab) activateTab(tab);
  });

  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest?.(".cai-tab");
    if (!tab) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveTabFocus(tab, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveTabFocus(tab, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveTabFocus(tab, "start");
    } else if (e.key === "End") {
      e.preventDefault();
      moveTabFocus(tab, "end");
    }
  });
}

/* ============================================================
   TOGGLE SWITCH — click + keyboard
   ============================================================ */

function setToggleState(track, checked) {
  track.classList.toggle("is-on", checked);
  track.setAttribute("aria-checked", String(checked));
}

function toggleSwitch(track) {
  setToggleState(track, !track.classList.contains("is-on"));
}

function initToggles() {
  document.body.addEventListener("click", (e) => {
    const toggleTrack = e.target.closest('.cai-toggle__track[role="switch"]');
    if (toggleTrack) toggleSwitch(toggleTrack);
  });

  document.addEventListener("keydown", (e) => {
    const toggleTrack = e.target.closest?.('.cai-toggle__track[role="switch"]');
    if (!toggleTrack) return;

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleSwitch(toggleTrack);
    }
  });
}

/* ============================================================
   SHOWCASE GLUE — docs-only enhancements
   (candidates to move into apps/docs)
   ============================================================ */

function initSectionAnchors() {
  document.querySelectorAll(".docs-section[id]").forEach((section) => {
    const title = section.querySelector(".docs-section__title");
    if (!title || title.querySelector(".docs-anchor-link")) return;

    const anchor = document.createElement("a");
    anchor.className = "docs-anchor-link";
    anchor.href = `#${section.id}`;
    anchor.setAttribute(
      "aria-label",
      `Copy link to ${title.textContent.trim()}`,
    );
    anchor.textContent = "#";
    title.appendChild(anchor);
  });
}

function initBackToTop() {
  const button = document.querySelector("[data-back-to-top]");
  if (!button) return;

  const toggle = () => {
    button.classList.toggle("is-visible", window.scrollY > 300);
  };

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  toggle();
  window.addEventListener("scroll", toggle, { passive: true });
}

// Escape key closes all open details elements
function initDetailsKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll("details[open]").forEach((detail) => {
        detail.open = false;
      });
    }
  });
}

// Demo breadcrumb links (href="#") should not navigate
function initDemoBreadcrumbs() {
  document.body.addEventListener("click", (e) => {
    const demoBreadcrumbLink = e.target.closest('.cai-breadcrumb a[href="#"]');
    if (demoBreadcrumbLink) e.preventDefault();
  });
}

function initFormDemos() {
  // Sync range inputs with their paired <output> element
  document.querySelectorAll('input[type="range"]').forEach((range) => {
    const outputId = range.id ? range.id + "-out" : null;
    const out = outputId ? document.getElementById(outputId) : null;
    if (!out) return;

    const sync = () => {
      out.textContent = range.value;
      out.setAttribute("aria-live", "polite");
    };
    sync();
    range.addEventListener("input", sync);
  });

  // Demo form: show success/error feedback without a real submit
  const demoForm = document.getElementById("demo-form");
  if (demoForm) {
    demoForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const result = document.getElementById("form-result");
      if (!result) return;

      if (demoForm.checkValidity()) {
        result.textContent = "✓ Form is valid — would be submitted.";
        result.style.color = "var(--cai-color-success)";
      } else {
        demoForm.reportValidity();
        result.textContent = "✗ Please fill in all required fields.";
        result.style.color = "var(--cai-color-danger)";
      }
    });

    demoForm.addEventListener("reset", () => {
      const result = document.getElementById("form-result");
      if (result) result.textContent = "";
    });
  }
}

/* ============================================================
   AUTO-INIT
   ============================================================ */

function boot() {
  initThemeSystem();
  initSidebar();
  initCopyButtons();
  initModals();
  initHighlight();
  initPlayers();
  initTabs();
  initToggles();
  initSectionAnchors();
  initBackToTop();
  initDetailsKeyboard();
  initDemoBreadcrumbs();
  initFormDemos();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
