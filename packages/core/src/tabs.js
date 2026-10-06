/**
 * CAI Design System — Tabs (progressive enhancement)
 *
 * Without JavaScript the markup is a row of in-page links and every panel is
 * visible, stacked, each reachable from its link:
 *
 *   <nav class="cai-tabs" aria-label="Project">
 *     <a class="cai-tab" href="#panel-a">Summary</a>
 *     <a class="cai-tab" href="#panel-b">Settings</a>
 *   </nav>
 *   <div class="cai-tabpanel" id="panel-a">…</div>
 *   <div class="cai-tabpanel" id="panel-b">…</div>
 *
 * initTabs() upgrades it to the ARIA tabs pattern: it adds role="tablist",
 * "tab" and "tabpanel", aria-selected, aria-controls / aria-labelledby, hides
 * the inactive panels and adds roving tabindex with arrow, Home and End keys.
 *
 * Importing this module has no side effects; call initTabs() to enable it.
 */
import { enableJs } from "./utils.js";

let uid = 0;

function panelOf(tab) {
  const id = tab.getAttribute("aria-controls") || tab.getAttribute("href")?.slice(1);
  return id ? document.getElementById(id) : null;
}

/** Add the ARIA roles and relationships. Idempotent. */
function upgrade(tablist) {
  tablist.setAttribute("role", "tablist");
  tablist.querySelectorAll(".cai-tab").forEach((tab) => {
    const panel = panelOf(tab);
    if (!tab.id) tab.id = `cai-tab-${(uid += 1)}`;
    tab.setAttribute("role", "tab");
    if (panel) {
      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
    }
  });
}

export function activateTab(tab, { moveFocus = false } = {}) {
  const tablist = tab.closest(".cai-tabs");
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll(".cai-tab"));
  tabs.forEach((item) => {
    const isActive = item === tab;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
    item.setAttribute("tabindex", isActive ? "0" : "-1");

    const panel = panelOf(item);
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

let bound = false;

/**
 * Upgrade every .cai-tabs in `root` and wire delegated click + keyboard
 * handling once. A URL hash that names a panel opens that tab.
 */
export function initTabs(root = document) {
  enableJs();

  root.querySelectorAll(".cai-tabs").forEach((tablist) => {
    upgrade(tablist);
    const fromHash = location.hash
      ? Array.from(tablist.querySelectorAll(".cai-tab")).find(
          (t) => t.getAttribute("href") === location.hash,
        )
      : null;
    const activeTab =
      fromHash ||
      tablist.querySelector('.cai-tab[aria-selected="true"]') ||
      tablist.querySelector(".cai-tab.is-active") ||
      tablist.querySelector(".cai-tab");

    if (activeTab) activateTab(activeTab);
  });

  if (bound) return;
  bound = true;

  document.addEventListener("click", (e) => {
    const tab = e.target.closest?.(".cai-tab");
    if (!tab || !tab.closest(".cai-tabs[role='tablist']")) return;
    e.preventDefault(); // the link only matters without JavaScript
    activateTab(tab);
  });

  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest?.(".cai-tab");
    if (!tab || !tab.closest(".cai-tabs[role='tablist']")) return;

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
