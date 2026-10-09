/**
 * CAI Design System — Copy to clipboard
 * Visual-feedback copy helper + delegated bindings for copy buttons
 * (`button.cai-copy-btn[data-copy]`, icon-grid items included). The buttons
 * are native, so Enter and Space need no handling here.
 *
 * Importing this module has no side effects; call initCopyButtons() to
 * wire up delegation, or use copyToClipboard() directly.
 */

import { enableJs } from "./utils.js";
import { t } from "./i18n.js";

const LIVE_REGION_ID = "cai-live-region";
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

function announce(message) {
  const region = getLiveRegion();
  region.textContent = message;
  clearTimeout(clearAnnouncement);
  clearAnnouncement = setTimeout(() => {
    region.textContent = "";
  }, 2000);
}

export async function copyToClipboard(text, el, type = "btn") {
  try {
    await navigator.clipboard.writeText(text);
    announce(t("copiedStatus", el));

    if (type === "swatch") {
      el.classList.add("is-copied");
      setTimeout(() => el.classList.remove("is-copied"), 1000);
    } else if (type === "token") {
      // .token elements show feedback via class only (text stays as token name)
      el.classList.add("is-copied");
      setTimeout(() => el.classList.remove("is-copied"), 1200);
    } else {
      const original = el.textContent;
      el.textContent = t("copied", el);
      el.classList.add("is-copied");
      setTimeout(() => {
        el.textContent = original;
        el.classList.remove("is-copied");
      }, 1200);
    }
  } catch (err) {
    announce(t("copyFailed", el));
    console.error("Failed to copy:", err);
  }
}

/**
 * Wire up delegated click handling for all copy buttons.
 */
export function initCopyButtons() {
  enableJs();
  // Create the live region up front: some screen readers ignore a region
  // that is inserted and filled at the same time.
  getLiveRegion();

  document.body.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest(".cai-copy-btn");
    if (copyBtn?.dataset.copy) await copyToClipboard(copyBtn.dataset.copy, copyBtn);
  });
}
