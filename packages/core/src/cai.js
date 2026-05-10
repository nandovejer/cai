/**
 * CAI Design System — showcase.js
 * Showcase management: sidebar, themes, copy-to-clipboard, responsive.
 */

import { MidiPlayer } from "/packages/core/dist/midi.js";
import { formatTime } from "./utils.js";

/* ============================================================
   1. THEME SYSTEM
   ============================================================ */

// Color modes: luminosity variants (light/dark/high-contrast)
const MODES = ["light", "dark", "high-contrast"];
// Custom themes: complete visual identities
const CUSTOM_THEMES = ["ricardoymortimer", "minimalist"];
// Default color mode for each custom theme (used when no mode is stored)
const CUSTOM_THEME_DEFAULT_MODE = { ricardoymortimer: "dark", minimalist: "light" };
const ALL_THEMES = [...MODES, ...CUSTOM_THEMES];
const STORAGE_KEY = "cai-theme";
const STORAGE_KEY_MODE = "cai-mode";
const systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");

function getStoredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && ALL_THEMES.includes(saved) ? saved : null;
}

function getStoredMode() {
  const saved = localStorage.getItem(STORAGE_KEY_MODE);
  return saved && MODES.includes(saved) ? saved : null;
}

function getInitialTheme() {
  const saved = getStoredTheme();
  if (saved) return saved;
  return "minimalist";
}

function syncButtons(theme) {
  const isCustom = CUSTOM_THEMES.includes(theme);
  const currentMode = document.documentElement.dataset.mode;

  // Mode buttons (footer) — active only when a base color mode is selected
  document.querySelectorAll(".cai-theme-btn").forEach((btn) => {
    const active = !isCustom && btn.dataset.theme === theme;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.classList.toggle("is-dimmed", isCustom);
  });

  // Custom theme apply buttons
  document.querySelectorAll(".cai-theme-apply-btn").forEach((btn) => {
    const active = btn.dataset.theme === theme;
    btn.classList.toggle("is-active", active);
    btn.textContent = active ? "Applied" : "Apply theme";
    btn.setAttribute("aria-pressed", String(active));
  });

  // Inline mode buttons inside theme cards
  document.querySelectorAll(".docs-theme-card__mode-btn").forEach((btn) => {
    const card = btn.closest(".docs-theme-card");
    const cardTheme = card?.dataset.theme;
    const isCardActive = theme === cardTheme;
    const modeActive = isCardActive && currentMode === btn.dataset.mode;
    btn.classList.toggle("is-active", modeActive);
    btn.setAttribute("aria-pressed", String(modeActive));
  });
}

function applyTheme(theme, { persist = true } = {}) {
  const isCustom = CUSTOM_THEMES.includes(theme);
  document.documentElement.dataset.theme = theme;
  if (persist) localStorage.setItem(STORAGE_KEY, theme);

  if (isCustom) {
    // Restore saved mode, or fall back to the theme's default mode
    const savedMode = getStoredMode();
    const mode = savedMode || CUSTOM_THEME_DEFAULT_MODE[theme] || "light";
    document.documentElement.dataset.mode = mode;
    // Persist the resolved mode so it survives page reload
    if (persist) localStorage.setItem(STORAGE_KEY_MODE, mode);
  } else {
    // Base color mode: clear data-mode
    delete document.documentElement.dataset.mode;
    if (persist) localStorage.removeItem(STORAGE_KEY_MODE);
  }

  syncButtons(theme);
}

// Apply a color mode within an already-active custom theme
function applyMode(mode, parentTheme, { persist = true } = {}) {
  // Ensure the parent theme is applied first
  if (document.documentElement.dataset.theme !== parentTheme) {
    if (persist) {
      if (MODES.includes(document.documentElement.dataset.theme)) {
        localStorage.setItem("cai-last-mode", document.documentElement.dataset.theme);
      }
    }
    document.documentElement.dataset.theme = parentTheme;
    if (persist) localStorage.setItem(STORAGE_KEY, parentTheme);
  }
  document.documentElement.dataset.mode = mode;
  if (persist) localStorage.setItem(STORAGE_KEY_MODE, mode);
  syncButtons(parentTheme);
}

// Escuchar cambios en la preferencia del SO
systemThemeMedia.addEventListener("change", (e) => {
  // Solo respetar el SO si el usuario no ha elegido manualmente
  if (!getStoredTheme()) {
    applyTheme(e.matches ? "dark" : "light", { persist: false });
  }
});

/* ============================================================
   2. SIDEBAR — NAVIGATION AND ACTIVE STATE
   ============================================================ */

const navLinks = Array.from(document.querySelectorAll(".cai-sidebar__link"));
const linkMap = new Map(
  navLinks.map((link) => [link.getAttribute("href"), link]),
);
let currentActive = document.querySelector(".cai-sidebar__link.is-active");

function setCurrentLink(link) {
  navLinks.forEach((item) => {
    const isActive = item === link;
    item.classList.toggle("is-active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

const updateActiveState = (newActive) => {
  if (currentActive === newActive || !newActive) return;
  setCurrentLink(newActive);
  newActive.scrollIntoView({ block: "nearest" });
  currentActive = newActive;
};

if (currentActive) setCurrentLink(currentActive);

// IntersectionObserver: choose the section closest to the top of the viewport
// Only consider entries with top >= 0 (inside or below the viewport) to avoid
// past sections (negative top) competing with visible ones.
const observer = new IntersectionObserver(
  (entries) => {
    const visibleEntries = entries.filter((e) => e.isIntersecting);
    if (visibleEntries.length === 0) return;

    // Prefer sections whose top edge has not yet left the top of the viewport
    const candidates = visibleEntries.filter(
      (e) => e.boundingClientRect.top >= 0,
    );
    const pool = candidates.length > 0 ? candidates : visibleEntries;

    const topEntry = pool.reduce((prev, curr) =>
      curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev,
    );

    const activeLink = linkMap.get(`#${topEntry.target.id}`);
    if (activeLink) updateActiveState(activeLink);
  },
  {
    threshold: 0.1,
    rootMargin: "-10% 0px -60% 0px",
  },
);

document
  .querySelectorAll(".docs-section[id]")
  .forEach((s) => observer.observe(s));

/* ============================================================
   3. SIDEBAR — RESPONSIVE (mobile drawer)
   ============================================================ */

const sidebar = document.querySelector(".cai-sidebar");
const sidebarToggle = document.querySelector(".cai-nav-toggle");
const sidebarOverlay = document.querySelector(".cai-nav-overlay");
let sidebarReturnFocusTarget = null;

function getSidebarFocusableElements() {
  return sidebar
    ? Array.from(
        sidebar.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
    : [];
}

function focusSidebarTarget(targetEl) {
  if (!targetEl) return;

  const focusTarget =
    targetEl.matches("h1, h2, h3, h4, h5, h6, section, main")
      ? targetEl
      : targetEl.querySelector("h1, h2, h3, h4, h5, h6") || targetEl;

  if (!focusTarget.hasAttribute("tabindex")) {
    focusTarget.setAttribute("tabindex", "-1");
  }

  focusTarget.focus({ preventScroll: true });
}

function openSidebar() {
  sidebarReturnFocusTarget = document.activeElement;
  sidebar?.classList.add("is-open");
  sidebarOverlay?.classList.add("is-open");
  sidebarToggle?.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    getSidebarFocusableElements()[0]?.focus();
  });
}

function closeSidebar({ restoreFocus = true } = {}) {
  sidebar?.classList.remove("is-open");
  sidebarOverlay?.classList.remove("is-open");
  sidebarToggle?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";

  if (restoreFocus) {
    const focusTarget = sidebarReturnFocusTarget || sidebarToggle;
    requestAnimationFrame(() => {
      focusTarget?.focus();
    });
  }

  sidebarReturnFocusTarget = null;
}

sidebarToggle?.addEventListener("click", () => {
  const isOpen = sidebar?.classList.contains("is-open");
  isOpen ? closeSidebar() : openSidebar();
});

sidebarOverlay?.addEventListener("click", closeSidebar);

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

function setToggleState(track, checked) {
  track.classList.toggle("is-on", checked);
  track.setAttribute("aria-checked", String(checked));
}

function toggleSwitch(track) {
  setToggleState(track, !track.classList.contains("is-on"));
}

// Cerrar con Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebar?.classList.contains("is-open"))
    closeSidebar();

  const tab = e.target.closest?.(".cai-tab");
  if (tab) {
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
  }

  const toggleTrack = e.target.closest?.('.cai-toggle__track[role="switch"]');
  if (!toggleTrack) return;

  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    toggleSwitch(toggleTrack);
  }
});

/* ============================================================
   4. EVENT DELEGATION — global clicks
   ============================================================ */

document.body.addEventListener("click", async (e) => {
  const demoBreadcrumbLink = e.target.closest('.cai-breadcrumb a[href="#"]');
  if (demoBreadcrumbLink) {
    e.preventDefault();
    return;
  }

  // --- Color mode switcher (footer) ---
  const themeBtn = e.target.closest(".cai-theme-btn");
  if (themeBtn?.dataset.theme) {
    applyTheme(themeBtn.dataset.theme);
    return;
  }

  // --- Inline mode buttons inside theme cards ---
  const cardModeBtn = e.target.closest(".docs-theme-card__mode-btn");
  if (cardModeBtn?.dataset.mode) {
    const card = cardModeBtn.closest(".docs-theme-card");
    const parentTheme = card?.dataset.theme;
    if (parentTheme) applyMode(cardModeBtn.dataset.mode, parentTheme);
    return;
  }

  // --- Custom theme apply button ---
  const themeApplyBtn = e.target.closest(".cai-theme-apply-btn");
  if (themeApplyBtn?.dataset.theme) {
    const current = document.documentElement.dataset.theme;
    // Toggle: clicking again removes the custom theme → restore last mode
    if (current === themeApplyBtn.dataset.theme) {
      const fallback = localStorage.getItem("cai-last-mode") || "light";
      localStorage.removeItem(STORAGE_KEY_MODE);
      applyTheme(fallback);
    } else {
      // Store current base mode before switching to a custom theme
      if (MODES.includes(current)) {
        localStorage.setItem("cai-last-mode", current);
      }
      applyTheme(themeApplyBtn.dataset.theme);
    }
    return;
  }

  // --- Sidebar link ---
  const link = e.target.closest(".cai-sidebar__link");
  if (link) {
    const targetId = link.getAttribute("href");
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      updateActiveState(link);
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // On mobile, close the drawer when navigating
    if (window.innerWidth <= 768) {
      closeSidebar({ restoreFocus: false });
      requestAnimationFrame(() => {
        focusSidebarTarget(targetEl);
      });
    }
    return;
  }

  // --- Tabs ---
  const tab = e.target.closest(".cai-tab");
  if (tab) {
    activateTab(tab);
    return;
  }

  // --- Toggle ---
  const toggleTrack = e.target.closest('.cai-toggle__track[role="switch"]');
  if (toggleTrack) {
    toggleSwitch(toggleTrack);
    return;
  }

  // --- Copy icon SVG ---
  const iconItem = e.target.closest(".cai-icon-item");
  if (iconItem) {
    const svgCode = iconItem.dataset.svg;
    const label = iconItem.querySelector(".cai-icon-name");
    if (!svgCode || !label) return;

    const originalText = label.textContent;
    try {
      await navigator.clipboard.writeText(svgCode);
      label.textContent = "✓ Copied!";
      iconItem.classList.add("is-copied");
      setTimeout(() => {
        label.textContent = originalText;
        iconItem.classList.remove("is-copied");
      }, 1200);
    } catch (err) {
      console.error("Failed to copy icon:", err);
    }
    return;
  }

  // --- Copy token / swatch ---
  const copyBtn = e.target.closest(".cai-copy-btn, .copy-btn");
  if (copyBtn) {
    const text = copyBtn.dataset.copy;
    if (!text) return;
    await copyToClipboard(text, copyBtn);
    return;
  }

  const swatch = e.target.closest(".docs-swatch[data-copy], .swatch[data-copy]");
  if (swatch) {
    await copyToClipboard(swatch.dataset.copy, swatch, "swatch");
    return;
  }

  // --- Copy token label (spacing, elevation) ---
  const tokenLabel = e.target.closest(".docs-token[data-copy], .token[data-copy]");
  if (tokenLabel) {
    const text = tokenLabel.dataset.copy;
    if (!text) return;
    await copyToClipboard(text, tokenLabel, "token");
    return;
  }
});

/* ============================================================
   5. COPY TO CLIPBOARD — helper
   ============================================================ */

async function copyToClipboard(text, el, type = "btn") {
  try {
    await navigator.clipboard.writeText(text);

    if (type === "swatch") {
      el.classList.add("is-copied");
      setTimeout(() => el.classList.remove("is-copied"), 1000);
    } else if (type === "token") {
      // .token elements show feedback via class only (text stays as token name)
      el.classList.add("is-copied");
      setTimeout(() => el.classList.remove("is-copied"), 1200);
    } else {
      const original = el.textContent;
      el.textContent = "✓ Copied";
      el.classList.add("is-copied");
      setTimeout(() => {
        el.textContent = original;
        el.classList.remove("is-copied");
      }, 1200);
    }
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

function activateCopyTarget(target) {
  if (!target) return;

  if (target.matches(".cai-copy-btn, .copy-btn")) {
    const text = target.dataset.copy;
    if (text) copyToClipboard(text, target);
    return;
  }

  if (target.matches(".docs-swatch[data-copy], .swatch[data-copy]")) {
    copyToClipboard(target.dataset.copy, target, "swatch");
    return;
  }

  if (target.matches(".docs-token[data-copy], .token[data-copy]")) {
    const text = target.dataset.copy;
    if (text) copyToClipboard(text, target, "token");
  }
}

function initCopyA11y() {
  document
    .querySelectorAll(".docs-swatch[data-copy], .docs-token[data-copy]")
    .forEach((target) => {
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", "0");
      const label = target.textContent.replace(/\s+/g, " ").trim();
      target.setAttribute("aria-label", `Copy ${label}`);
    });
}

function initCodeBlocks() {
  document.querySelectorAll("pre.cai-code-block").forEach((pre, index) => {
    if (!pre.hasAttribute("aria-label")) {
      const lang = (pre.dataset.lang || "code").toUpperCase();
      pre.setAttribute("aria-label", `${lang} example`);
    }

    if (pre.querySelector(".cai-code-block__copy")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cai-copy-btn cai-code-block__copy";
    button.dataset.copy = pre.querySelector("code")?.textContent || "";
    button.setAttribute("aria-label", `Copy code example ${index + 1}`);
    button.textContent = "Copy";
    pre.appendChild(button);
  });
}

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

function initDocHeadings() {
  // All .docs-section__title, .docs-subsection__title, and .docs-group-header__label
  // are now semantic <h2> and <h3> elements. This function is kept for safety
  // but no longer adds role/aria-level since those are native heading elements.
  // This is a no-op and can be called without side effects.
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

/* ============================================================
   Details/Summary keyboard support
   Escape key closes all open details elements
   ============================================================ */

function initDetailsKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll("details[open]").forEach((detail) => {
        detail.open = false;
      });
    }
  });
}

/* ============================================================
   MODALS & DIALOGS
   ============================================================ */

function initModals() {
  // Setup all modals on the page (both <dialog> and div-based with .cai-modal)
  document.querySelectorAll(".cai-modal, dialog.cai-modal").forEach((modal) => {
    const isDialogElement = modal.tagName === "DIALOG";
    let trap = null;

    // Handle trigger buttons (data-modal-trigger="modal-id")
    document.querySelectorAll("[data-modal-trigger]").forEach((btn) => {
      if (btn.dataset.modalTrigger === modal.id) {
        btn.addEventListener("click", () => {
          if (isDialogElement) {
            modal.showModal();
          } else {
            modal.classList.remove("is-hidden");
            modal.setAttribute("aria-hidden", "false");
          }
          // Activate focus trap
          trap = createFocusTrap(modal);
          trap.activate();
        });
      }
    });

    // Handle close buttons (data-modal-close="modal-id")
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      if (btn.dataset.modalClose === modal.id) {
        btn.addEventListener("click", () => {
          closeModal(modal, isDialogElement, trap);
        });
      }
    });

    // Escape key closes modal (for <dialog> this is automatic, but we need it for divs)
    if (!isDialogElement) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.classList.contains("is-hidden")) {
          closeModal(modal, isDialogElement, trap);
        }
      });
    }

    // For <dialog> elements, also deactivate trap on close
    if (isDialogElement) {
      modal.addEventListener("close", () => {
        if (trap) trap.deactivate();
      });
    }
  });

  function closeModal(modal, isDialogElement, trap) {
    if (isDialogElement) {
      modal.close();
    } else {
      modal.classList.add("is-hidden");
      modal.setAttribute("aria-hidden", "true");
    }
    if (trap) trap.deactivate();
  }
}

/* ============================================================
   6. ACCESIBILIDAD — keyboard en iconos
   ============================================================ */

document.querySelectorAll(".cai-icon-item").forEach((item) => {
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      item.click();
    }
  });
});

document.addEventListener("keydown", (e) => {
  const copyTarget = e.target.closest?.(
    ".docs-swatch[data-copy], .docs-token[data-copy], .cai-copy-btn, .copy-btn",
  );
  if (!copyTarget) return;

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    activateCopyTarget(copyTarget);
  }
});

/* ============================================================
   6b. FORM DEMOS — range outputs + form validation feedback
   ============================================================ */

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

/* ============================================================
   7. INIT
   ============================================================ */

// Apply initial theme without forcing persistence when it comes from the OS
applyTheme(getInitialTheme(), { persist: !!getStoredTheme() });

document.querySelectorAll(".cai-tabs").forEach((tablist) => {
  const activeTab =
    tablist.querySelector('.cai-tab[aria-selected="true"]') ||
    tablist.querySelector(".cai-tab.is-active") ||
    tablist.querySelector(".cai-tab");

  if (activeTab) activateTab(activeTab);
});

/* ============================================================
   8. MEDIA PLAYERS — Video & Audio (native HTMLMediaElement API)
   ============================================================ */

/**
 * Seekbar drag logic — shared by seek and volume bars.
 * @param {HTMLElement} bar   - .cai-player-seekbar element
 * @param {Function}    onSeek - called with value 0-1 during drag and on click
 */
function initSeekbar(bar, onSeek) {
  let dragging = false;

  function valueFromEvent(e) {
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  bar.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    onSeek(valueFromEvent(e));
  });

  bar.addEventListener(
    "touchstart",
    (e) => {
      dragging = true;
      onSeek(valueFromEvent(e));
    },
    { passive: true },
  );

  document.addEventListener("mousemove", (e) => {
    if (dragging) onSeek(valueFromEvent(e));
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      if (dragging) onSeek(valueFromEvent(e));
    },
    { passive: true },
  );

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
  document.addEventListener("touchend", () => {
    dragging = false;
  });

  // Keyboard: left/right arrows ±5%, Home/End
  bar.addEventListener("keydown", (e) => {
    const fill = bar.querySelector(".cai-player-seekbar-fill");
    const current = parseFloat(fill?.style.width || "0") / 100;
    const step = 0.05;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onSeek(Math.min(1, current + step));
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSeek(Math.max(0, current - step));
    }
    if (e.key === "Home") {
      e.preventDefault();
      onSeek(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      onSeek(1);
    }
  });
}

/* ============================================================
   8. SHARED PLAYER UI BINDING
   Extracts shared logic between mountPlayer and mountMidiPlayer.
   mediaLike must expose: .paused, .duration, .currentTime, .volume,
   .muted, .play(), .pause(), .on(event, cb) or addEventListener.
   ============================================================ */

/**
 * Wraps an HTMLMediaElement to match the MidiPlayer event API.
 * @param {HTMLMediaElement} el
 * @returns {{ on: Function, paused: boolean, duration: number,
 *             currentTime: number, volume: number, muted: boolean,
 *             play: Function, pause: Function }}
 */
function wrapHTMLMedia(el) {
  return {
    get paused() {
      return el.paused;
    },
    get duration() {
      return el.duration;
    },
    get currentTime() {
      return el.currentTime;
    },
    set currentTime(v) {
      el.currentTime = v;
    },
    get volume() {
      return el.volume;
    },
    get muted() {
      return el.muted;
    },
    play() {
      return el.play();
    },
    pause() {
      el.pause();
    },
    setMute(v) {
      el.muted = v;
    },
    setVolume(v) {
      el.volume = v;
    },
    seek(v) {
      if (el.duration) el.currentTime = v * el.duration;
    },
    on(event, cb) {
      el.addEventListener(event, cb);
    },
  };
}

/**
 * Binds shared player UI controls to a media-like object.
 * Handles: play/pause, mute, seek, volume, keyboard shortcuts.
 * Video-only controls (PiP, fullscreen, mediaWrap click) are handled
 * separately in mountPlayer since MidiPlayer has no video element.
 *
 * @param {HTMLElement} root         - .cai-player element
 * @param {HTMLElement} controls     - .cai-player-controls element
 * @param {object}      mediaLike    - wrapHTMLMedia() or MidiPlayer instance
 */
function bindPlayerUI(root, controls, mediaLike) {
  const playPauseBtn = root.querySelector(".cai-player-playpause");
  const muteBtn = root.querySelector(".cai-player-mute");
  const seekbar = controls.querySelector(
    ".cai-player-progress-row .cai-player-seekbar",
  );
  const seekFill = seekbar?.querySelector(".cai-player-seekbar-fill");
  const seekThumb = seekbar?.querySelector(".cai-player-seekbar-thumb");
  const volbar = controls.querySelector(".cai-player-volbar");
  const volFill = volbar?.querySelector(".cai-player-seekbar-fill");
  const volThumb = volbar?.querySelector(".cai-player-seekbar-thumb");
  const currentEl = controls.querySelector(".cai-player-current");
  const durationEl = controls.querySelector(".cai-player-duration");

  // ---- UI helpers ----

  function setPlayState(playing) {
    const iconPlay = playPauseBtn?.querySelector(".icon-play");
    const iconPause = playPauseBtn?.querySelector(".icon-pause");
    if (iconPlay) iconPlay.style.display = playing ? "none" : "";
    if (iconPause) iconPause.style.display = playing ? "" : "none";
    playPauseBtn?.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function setMuteState(muted) {
    const on = muteBtn?.querySelector(".icon-vol-on");
    const off = muteBtn?.querySelector(".icon-vol-off");
    if (on) on.style.display = muted ? "none" : "";
    if (off) off.style.display = muted ? "" : "none";
    muteBtn?.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }

  function updateSeekUI() {
    if (!mediaLike.duration) return;
    const pct = (mediaLike.currentTime / mediaLike.duration) * 100;
    if (seekFill) seekFill.style.width = pct + "%";
    if (seekThumb) seekThumb.style.left = pct + "%";
    if (seekbar) seekbar.setAttribute("aria-valuenow", Math.round(pct));
    if (currentEl) currentEl.textContent = formatTime(mediaLike.currentTime);
  }

  function updateVolumeUI(v) {
    if (volFill) volFill.style.width = v * 100 + "%";
    if (volThumb) volThumb.style.left = v * 100 + "%";
    if (volbar) volbar.setAttribute("aria-valuenow", Math.round(v * 100));
  }

  // ---- Wire media events to UI ----

  mediaLike.on("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(mediaLike.duration);
  });

  mediaLike.on("timeupdate", updateSeekUI);
  mediaLike.on("play", () => setPlayState(true));
  mediaLike.on("pause", () => setPlayState(false));
  mediaLike.on("ended", () => {
    setPlayState(false);
    if (seekFill) seekFill.style.width = "0%";
    if (seekThumb) seekThumb.style.left = "0%";
    if (currentEl) currentEl.textContent = "0:00";
  });
  mediaLike.on("volumechange", () => {
    setMuteState(mediaLike.muted);
    updateVolumeUI(mediaLike.muted ? 0 : mediaLike.volume);
  });

  // ---- Wire controls to media ----

  playPauseBtn?.addEventListener("click", () => {
    mediaLike.paused ? mediaLike.play() : mediaLike.pause();
  });

  muteBtn?.addEventListener("click", () => {
    mediaLike.setMute(!mediaLike.muted);
  });

  if (seekbar) {
    initSeekbar(seekbar, (v) => {
      mediaLike.seek(v);
      updateSeekUI();
    });
  }

  if (volbar) {
    initSeekbar(volbar, (v) => {
      mediaLike.setVolume(v);
      mediaLike.setMute(v === 0);
      updateVolumeUI(v);
    });
  }

  // Keyboard shortcuts
  root.setAttribute("tabindex", "-1");
  root.addEventListener("keydown", (e) => {
    if (["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(e.target.tagName))
      return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      mediaLike.paused ? mediaLike.play() : mediaLike.pause();
    }
    if (e.key === "m") mediaLike.setMute(!mediaLike.muted);
  });

  // ---- Init state ----
  setPlayState(false);
  setMuteState(false);
  updateVolumeUI(1);

  return {
    setPlayState,
    setMuteState,
    updateSeekUI,
    updateVolumeUI,
    durationEl,
  };
}

/**
 * Mount a single media player (video or audio).
 * @param {HTMLElement} root - .cai-player element
 */
function mountPlayer(root) {
  const isVideo = root.dataset.type === "video";
  const media = root.querySelector(
    isVideo ? ".cai-player-video" : ".cai-player-audio",
  );
  if (!media) return;

  const controls = root.querySelector(".cai-player-controls");
  const mediaWrap = root.querySelector(".cai-player-media-wrap"); // video only
  const seekBuf = controls?.querySelector(
    ".cai-player-progress-row .cai-player-seekbar .cai-player-seekbar-buf",
  );
  const pipBtn = root.querySelector(".cai-player-pip");
  const fsBtn = root.querySelector(".cai-player-fullscreen");

  const wrapped = wrapHTMLMedia(media);

  // Bind shared UI (play/pause, mute, seek, volume, keyboard)
  const { setPlayState } = bindPlayerUI(root, controls, wrapped);

  // ---- Video-specific: mediaWrap class sync ----
  if (mediaWrap) {
    mediaWrap.classList.add("is-paused");
    media.addEventListener("play", () =>
      mediaWrap.classList.remove("is-paused"),
    );
    media.addEventListener("pause", () => mediaWrap.classList.add("is-paused"));
  }

  // ---- Video-specific: buffer progress ----
  function updateBuffer() {
    if (!media.duration || !seekBuf) return;
    try {
      const buf = media.buffered;
      if (buf.length > 0) {
        seekBuf.style.width =
          (buf.end(buf.length - 1) / media.duration) * 100 + "%";
      }
    } catch (_) {}
  }
  media.addEventListener("timeupdate", updateBuffer);
  media.addEventListener("progress", updateBuffer);

  // ---- Bug 1.10 fix: ended — deterministic order ----
  media.addEventListener("ended", () => {
    media.currentTime = 0; // first: reposition
    setPlayState(false); // then: update UI
  });

  // ---- Video-specific: click on video area toggles play/pause ----
  if (mediaWrap) {
    mediaWrap.addEventListener("click", (e) => {
      if (
        e.target === mediaWrap ||
        e.target === media ||
        e.target.classList.contains("cai-player-overlay")
      ) {
        media.paused ? media.play() : media.pause();
      }
    });
  }

  // ---- PiP (video only) ----
  if (pipBtn) {
    if (!document.pictureInPictureEnabled) {
      pipBtn.style.display = "none";
    } else {
      pipBtn.addEventListener("click", async () => {
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await media.requestPictureInPicture();
          }
        } catch (err) {
          console.warn("PiP not available:", err);
        }
      });
    }
  }

  // ---- Fullscreen (video only) ----
  if (fsBtn) {
    const iconExpand = fsBtn.querySelector(".icon-expand");
    const iconCompress = fsBtn.querySelector(".icon-compress");

    fsBtn.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          await root.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen not available:", err);
      }
    });

    document.addEventListener("fullscreenchange", () => {
      const isFs = !!document.fullscreenElement;
      if (iconExpand) iconExpand.style.display = isFs ? "none" : "";
      if (iconCompress) iconCompress.style.display = isFs ? "" : "none";
      fsBtn.setAttribute("aria-label", isFs ? "Exit fullscreen" : "Fullscreen");
    });

    // f = fullscreen shortcut (video-specific)
    root.addEventListener("keydown", (e) => {
      if (e.key === "f") fsBtn.click();
    });
  }
}

/* ============================================================
   9. MIDI PLAYER MOUNT
   Uses MidiPlayer (midi.js) but drives the exact same UI as the
   audio player — same CSS classes, same seekbar, same controls.
   ============================================================ */

async function mountMidiPlayer(root) {
  const src = root.dataset.src;
  if (!src) {
    console.warn(
      '[CAI] .cai-player[data-type="midi"] missing data-src attribute',
    );
    return;
  }

  const controls = root.querySelector(".cai-player-controls");
  const playPauseBtn = root.querySelector(".cai-player-playpause");
  const statusEl = root.querySelector(".cai-player-midi-status");

  // Loading state
  if (statusEl) {
    statusEl.textContent = "Loading…";
    statusEl.setAttribute("aria-live", "polite"); // Bug 1.11: screen reader support
  }
  if (playPauseBtn) playPauseBtn.disabled = true;

  let player;
  try {
    player = await MidiPlayer.load(src);
  } catch (err) {
    if (statusEl) statusEl.textContent = "Failed to load MIDI file.";
    console.error("[CAI] MIDI load error:", err);
    return;
  }

  if (statusEl) statusEl.textContent = "";
  if (playPauseBtn) playPauseBtn.disabled = false;

  // Bind shared UI (play/pause, mute, seek, volume, keyboard)
  const { durationEl } = bindPlayerUI(root, controls, player);

  // Bug 1.9 fix: loadedmetadata fires before listeners register because
  // MidiPlayer.load() resolves after emitting the event synchronously.
  // Seed the duration display directly after load resolves.
  if (durationEl && player.duration) {
    durationEl.textContent = formatTime(player.duration);
  }
}

/* ============================================================
   FOCUS TRAP (for modals, dialogs, and dropdowns)
   Constrains keyboard focus within a container, preventing
   focus from escaping to the page behind.
   ============================================================ */

function createFocusTrap(element) {
  let previousActiveElement = null;
  let focusableElements = [];
  let firstFocusable = null;
  let lastFocusable = null;

  function getFocusableElements() {
    // Elements that can receive focus
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(element.querySelectorAll(selector)).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.offsetHeight > 0 &&
        el.offsetWidth > 0, // visible
    );
  }

  function handleKeydown(e) {
    if (e.key !== "Tab") return;
    focusableElements = getFocusableElements();
    firstFocusable = focusableElements[0];
    lastFocusable = focusableElements[focusableElements.length - 1];

    if (!firstFocusable || !lastFocusable) return; // no focusable elements

    // Shift+Tab on first element: jump to last
    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    }
    // Tab on last element: jump to first
    else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }

  return {
    activate() {
      previousActiveElement = document.activeElement;
      element.addEventListener("keydown", handleKeydown);
      // Focus the first focusable element, or the element itself if none
      focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        element.focus();
      }
    },

    deactivate() {
      element.removeEventListener("keydown", handleKeydown);
      // Restore focus to the element that opened the modal
      if (previousActiveElement && previousActiveElement.focus) {
        previousActiveElement.focus();
      }
    },
  };
}

/* ============================================================
   SYNTAX HIGHLIGHT
   Lightweight tokenizer with no dependencies for documentation code blocks.
   Supports HTML, CSS, and JS/JSX.
   ============================================================ */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightCSS(code) {
  return escapeHtml(code)
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
    .replace(
      /(var|@import|@media|@keyframes)/g,
      '<span class="tok-keyword">$1</span>',
    )
    .replace(/(--[\w-]+)(?=\s*[;:,)])/g, '<span class="tok-property">$1</span>')
    .replace(
      /(:\s*)(&#x27;[^&#x27;]*&#x27;|&quot;[^&quot;]*&quot;)/g,
      '$1<span class="tok-string">$2</span>',
    )
    .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="tok-string">$1</span>');
}

function highlightHTML(code) {
  return escapeHtml(code)
    .replace(/(<!--[\s\S]*?-->)/g, '<span class="tok-comment">$1</span>')
    .replace(/(&lt;\/?)([\w-]+)/g, '<span class="tok-tag">$1$2</span>')
    .replace(/\s([\w-]+)=(&quot;)/g, ' <span class="tok-attr">$1</span>=$2')
    .replace(
      /(&quot;)(.*?)(&quot;)/g,
      '<span class="tok-string">$1$2$3</span>',
    );
}

function highlightJS(code) {
  return escapeHtml(code)
    .replace(/(\/\/.*$)/gm, '<span class="tok-comment">$1</span>')
    .replace(
      /(import|export|from|const|let|var|return|function|class|new|if|else|=&gt;)/g,
      '<span class="tok-keyword">$1</span>',
    )
    .replace(
      /(&quot;[^&quot;]*&quot;|&#x27;[^&#x27;]*&#x27;|`[^`]*`)/g,
      '<span class="tok-string">$1</span>',
    )
    .replace(
      /([A-Z][a-zA-Z]+)(?=\s*[=(])/g,
      '<span class="tok-name">$1</span>',
    );
}

function highlightBlock(pre) {
  const code = pre.querySelector("code");
  if (!code) return;
  const lang = pre.dataset.lang || "txt";
  const raw = code.textContent;

  let highlighted;
  if (lang === "css") highlighted = highlightCSS(raw);
  else if (lang === "html") highlighted = highlightHTML(raw);
  else if (lang === "js" || lang === "jsx") highlighted = highlightJS(raw);
  else highlighted = escapeHtml(raw);

  code.innerHTML = highlighted;
}

initCopyA11y();
initCodeBlocks();
initDocHeadings();
initSectionAnchors();
document.querySelectorAll("pre.cai-code-block").forEach(highlightBlock);
initBackToTop();
initDetailsKeyboard();
initModals();

// Init all players on the page
document.querySelectorAll(".cai-player").forEach((root) => {
  if (root.dataset.type === "midi") {
    mountMidiPlayer(root);
  } else {
    mountPlayer(root);
  }
});
