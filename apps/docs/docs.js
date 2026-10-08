/**
 * CAI docs apps — showcase glue
 * Docs-only enhancements shared by apps/docs and apps/platform-docs.
 * Not part of any published package: consumers never load this file.
 */

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

// Demo breadcrumb links (href="#") should not navigate
function initDemoBreadcrumbs() {
  document.body.addEventListener("click", (e) => {
    const demoBreadcrumbLink = e.target.closest('.cai-breadcrumb a[href="#"]');
    // eslint-disable-next-line no-restricted-syntax -- RL-3: a demo link with nowhere to go; following "#" would only jump to the top
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
      // eslint-disable-next-line no-restricted-syntax -- RL-3: a demo form has no endpoint; the result is shown in place
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

function boot() {
  initSectionAnchors();
  initDemoBreadcrumbs();
  initFormDemos();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
