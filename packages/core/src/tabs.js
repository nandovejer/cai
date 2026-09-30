/**
 * CAI Design System — Tabs
 * Activation, panel visibility, and roving-tabindex keyboard support for
 * .cai-tabs / .cai-tab.
 *
 * Importing this module has no side effects; call initTabs() to wire up
 * delegation, or use activateTab() directly.
 */

export function activateTab(tab, { moveFocus = false } = {}) {
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

/**
 * Activate the initial tab of every tablist and wire up delegated click +
 * arrow/Home/End keyboard handling.
 */
export function initTabs() {
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
