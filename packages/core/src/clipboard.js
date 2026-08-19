/**
 * CAI Design System — Copy to clipboard
 * Visual-feedback copy helper + delegated bindings for copy buttons,
 * color swatches, token labels, and icon-grid items.
 *
 * Importing this module has no side effects; call initCopyButtons() to
 * wire up delegation, or use copyToClipboard() directly.
 */

export async function copyToClipboard(text, el, type = "btn") {
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

async function copyIconItem(iconItem) {
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
}

/**
 * Make non-button copy targets keyboard-accessible.
 */
function initCopyA11y() {
  document
    .querySelectorAll(".docs-swatch[data-copy], .docs-token[data-copy]")
    .forEach((target) => {
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", "0");
      const label = target.textContent.replace(/\s+/g, " ").trim();
      target.setAttribute("aria-label", `Copy ${label}`);
    });

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
}

/**
 * Wire up delegated click + keyboard handling for all copy targets.
 */
export function initCopyButtons() {
  initCopyA11y();

  document.body.addEventListener("click", async (e) => {
    // --- Copy icon SVG ---
    const iconItem = e.target.closest(".cai-icon-item");
    if (iconItem) {
      await copyIconItem(iconItem);
      return;
    }

    // --- Copy button ---
    const copyBtn = e.target.closest(".cai-copy-btn, .copy-btn");
    if (copyBtn) {
      const text = copyBtn.dataset.copy;
      if (!text) return;
      await copyToClipboard(text, copyBtn);
      return;
    }

    // --- Copy color swatch ---
    const swatch = e.target.closest(
      ".docs-swatch[data-copy], .swatch[data-copy]",
    );
    if (swatch) {
      await copyToClipboard(swatch.dataset.copy, swatch, "swatch");
      return;
    }

    // --- Copy token label (spacing, elevation) ---
    const tokenLabel = e.target.closest(
      ".docs-token[data-copy], .token[data-copy]",
    );
    if (tokenLabel) {
      const text = tokenLabel.dataset.copy;
      if (!text) return;
      await copyToClipboard(text, tokenLabel, "token");
    }
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
}
