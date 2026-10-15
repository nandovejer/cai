/**
 * LUZ Design System — Copy to clipboard
 * Visual-feedback copy helper + delegated bindings for copy buttons
 * (`button.luz-copy-btn[data-copy]`, icon-grid items included). The buttons
 * are native, so Enter and Space need no handling here.
 *
 * Importing this module has no side effects; call initCopyButtons() to
 * wire up delegation, or use copyToClipboard() directly.
 */

import { enableJs } from "./utils.js";
import { getLang, t } from "./i18n.js";

const LIVE_REGION_ID = "luz-live-region";
let clearAnnouncement;

/**
 * Polite live region shared by the copy helpers, so screen-reader users hear
 * the result of a copy without losing focus (WCAG 4.1.3). Visually hidden
 * with inline styles: it works without the utilities layer.
 */
function getLiveRegion() {
  let region = document.getElementById(LIVE_REGION_ID);
  if (!region) {
    region = document.createElement("div");
    region.id = LIVE_REGION_ID;
    region.setAttribute("role", "status");
    Object.assign(region.style, {
      position: "absolute",
      inlineSize: "1px",
      blockSize: "1px",
      overflow: "hidden",
      clipPath: "inset(50%)",
      whiteSpace: "nowrap",
    });
    document.body.append(region);
  }
  return region;
}

function announce(message, el) {
  const region = getLiveRegion();
  // The region lives in <body>: say which language the message is in (WCAG 3.1.2)
  region.lang = getLang(el);
  region.textContent = message;
  clearTimeout(clearAnnouncement);
  clearAnnouncement = setTimeout(() => {
    region.textContent = "";
  }, 2000);
}

export async function copyToClipboard(text, el, type = "btn") {
  try {
    await navigator.clipboard.writeText(text);
    announce(t("copiedStatus", el), el);

    // A swatch and a token show the feedback by class only (the text stays)
    const keepText = type === "swatch" || type === "token";
    const original = el.textContent;
    if (!keepText) el.textContent = t("copied", el);
    el.classList.add("is-copied");
    setTimeout(() => {
      if (!keepText) el.textContent = original;
      el.classList.remove("is-copied");
    }, type === "swatch" ? 1000 : 1200);
  } catch (err) {
    announce(t("copyFailed", el), el);
    console.error("Failed to copy:", err);
  }
}

// One function for every call: addEventListener ignores a listener that is
// already registered, so initCopyButtons() is idempotent at no cost.
async function onCopyClick(e) {
  const copyBtn = e.target.closest(".luz-copy-btn");
  if (copyBtn?.dataset.copy) await copyToClipboard(copyBtn.dataset.copy, copyBtn);
}

/**
 * Wire up delegated click handling for all copy buttons. Idempotent: a
 * second call adds no second listener, so one click copies once.
 * `defer = true` leaves data-luz-js to a later call of an init*().
 */
export function initCopyButtons(defer = false) {
  defer || enableJs();
  // Create the live region up front: some screen readers ignore a region
  // that is inserted and filled at the same time.
  getLiveRegion();

  document.body.addEventListener("click", onCopyClick);
}
