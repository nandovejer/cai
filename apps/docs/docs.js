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

function boot() {
  initSectionAnchors();
  initBackToTop();
  initDetailsKeyboard();
  initDemoBreadcrumbs();
  initFormDemos();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
