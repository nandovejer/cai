/**
 * CAI documentation site — the Code / Design tab a reader chose last.
 *
 * Component and pattern pages have two tabs, Code (the default) and Design:
 * core's tabs.js upgrades them (`.cai-tabs` with `data-docs-view` on each
 * tab). This docs-only glue remembers the reader's choice across pages:
 *
 * - Which tab opens: the URL fragment's (tabs.js), else the stored one, else
 *   Code (a11y.md TAB-11). Call initDocsView() before initTabs(): it only
 *   marks the stored tab aria-selected="true", which initTabs() honours.
 * - Restoring is silent: no focus move, no URL or history change (TAB-13).
 * - Only an explicit choice is stored, a click or a key press on a tab; a tab
 *   opened by a fragment, a link or find in page is not (TAB-14).
 * - One key, "cai-docs-view", and only "code" or "design" is read back:
 *   every page of an account's GitHub Pages shares one origin, so the value
 *   is untrusted (security.md SEC-MISC-1). Storage that is blocked or throws
 *   leaves the default (PRINCIPLES.md §8).
 */

export const VIEW_KEY = "cai-docs-view";
export const VIEWS = ["code", "design"];

/** The stored view, or null when there is none, it is not allowed, or storage throws. */
export function readView(storage) {
  try {
    // Reading window.localStorage itself throws where storage is blocked
    const value = (storage ?? globalThis.localStorage).getItem(VIEW_KEY);
    return VIEWS.includes(value) ? value : null;
  } catch {
    return null;
  }
}

/** Store a view; anything but "code" or "design" is ignored. Never throws. */
export function saveView(value, storage) {
  if (!VIEWS.includes(value)) return;
  try {
    (storage ?? globalThis.localStorage).setItem(VIEW_KEY, value);
  } catch {
    // Blocked storage: the choice lasts for this page only
  }
}

/** Keys with which core's tabs.js changes the selected tab. */
const SELECTING_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " ", "Enter"]);

/** Mark the stored tab selected (before initTabs) and store the reader's choices (after it). */
export function initDocsView() {
  const tabs = [...document.querySelectorAll(".cai-tab[data-docs-view]")];
  if (!tabs.length) return;

  const stored = readView();
  const tab = stored && tabs.find((t) => t.dataset.docsView === stored);
  if (tab) tab.setAttribute("aria-selected", "true");

  // Registered before tabs.js binds its own listeners, so it reads the
  // selection once they have run: wait for the end of the event
  const remember = (e) => {
    if (!e.target.closest?.(".cai-tab[data-docs-view]")) return;
    if (e.type === "keydown" && !SELECTING_KEYS.has(e.key)) return;
    setTimeout(() => {
      const selected = tabs.find((t) => t.getAttribute("aria-selected") === "true");
      if (selected) saveView(selected.dataset.docsView);
    });
  };
  document.addEventListener("click", remember);
  document.addEventListener("keydown", remember);
}
