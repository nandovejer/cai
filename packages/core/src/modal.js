/**
 * CAI Design System — Modal & dialog
 *
 * A modal is a native <dialog class="cai-modal">. The browser already gives
 * it focus trapping, Escape, an inert page behind it and focus restoration.
 * Triggers are declarative, with no JavaScript:
 *
 *   <button commandfor="my-dialog" command="show-modal">Open</button>
 *   <button commandfor="my-dialog" command="close">Close</button>
 *
 * Those attributes are not yet in every supported browser, so this module
 * is only a fallback: initModals() does nothing where the browser handles
 * them and binds the same two commands where it does not.
 *
 * Importing this module has no side effects; call initModals() to enable it.
 */

/** True when the browser implements the command / commandfor attributes. */
export function supportsCommands() {
  return (
    typeof HTMLButtonElement !== "undefined" &&
    "commandForElement" in HTMLButtonElement.prototype
  );
}

const bound = new WeakSet();

/**
 * Fallback for button[commandfor][command="show-modal|close|request-close"]
 * on <dialog> targets. Idempotent; scoped to `root`.
 */
export function initModals(root = document) {
  if (supportsCommands() || bound.has(root)) return;
  bound.add(root);

  root.addEventListener("click", (event) => {
    const button = event.target.closest?.("button[commandfor][command]");
    if (!button || button.disabled) return;
    const dialog = document.getElementById(button.getAttribute("commandfor"));
    if (!(dialog instanceof HTMLDialogElement)) return;

    switch (button.getAttribute("command")) {
      case "show-modal":
        if (!dialog.open) dialog.showModal();
        break;
      case "close":
      case "request-close":
        dialog.close();
        break;
    }
  });
}
