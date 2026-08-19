/**
 * CAI Design System — Modal & dialog
 * Works with native <dialog class="cai-modal"> and div-based .cai-modal,
 * with focus trapping while open.
 *
 * Importing this module has no side effects; call initModals() to wire up
 * [data-modal-trigger] / [data-modal-close] buttons.
 */

/**
 * Constrains keyboard focus within a container, preventing focus from
 * escaping to the page behind. Returns { activate, deactivate }.
 */
export function createFocusTrap(element) {
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

/**
 * Wire up all modals on the page (both <dialog> and div-based .cai-modal).
 */
export function initModals() {
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
