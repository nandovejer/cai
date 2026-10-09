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
 * the inactive panels and adds roving tabindex with arrow, Home and End keys
 * (Left and Right follow the reading direction) and Space.
 *
 * Links into a hidden panel still work: a URL fragment that names an element
 * inside a panel opens its tab, on load and on hashchange, and so does an
 * in-page link to it. Inactive panels are hidden="until-found" where the
 * browser supports it, so find in page reaches them and opens their tab.
 *
 * Importing this module has no side effects; call initTabs() to enable it.
 */
import { enableJs } from "./utils.js";

let uid = 0;

function panelOf(tab) {
  const id = tab.getAttribute("aria-controls") || tab.getAttribute("href")?.slice(1);
  return id ? document.getElementById(id) : null;
}

/** Keys of the ARIA tabs pattern and where each one moves the focus (Space: stays, and selects). */
const TAB_KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: "start", End: "end", " ": 0 };

/** The element a fragment ("#id") names, or null. */
function byHash(hash) {
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null; // a malformed escape in the fragment
  }
}

/**
 * Open the tabs whose panels hold `el` (from the outermost). Returns true when
 * a tab changed, so the caller scrolls to `el` again: it was not rendered.
 */
function reveal(el) {
  let changed = false;
  for (let panel = el?.closest?.('[role="tabpanel"]'); panel; panel = panel.parentElement.closest('[role="tabpanel"]')) {
    const tab = document.getElementById(panel.getAttribute("aria-labelledby"));
    if (tab?.getAttribute("aria-selected") === "false") {
      activateTab(tab);
      changed = true;
    }
  }
  return changed;
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
    // "until-found" keeps the panel's text reachable by find in page; a
    // browser without it reads the string as true, which is plain hidden
    panel.hidden = isActive ? false : "until-found";
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
 * handling once. The tab whose panel holds the URL fragment's target opens
 * first; then a tab marked aria-selected="true" or .is-active; then the first.
 */
export function initTabs(root = document) {
  enableJs();
  const target = byHash(location.hash);
  const lists = root.querySelectorAll(".cai-tabs");

  lists.forEach((tablist) => {
    upgrade(tablist);
    const tabs = Array.from(tablist.querySelectorAll(".cai-tab"));
    const activeTab =
      tabs.find((t) => target && panelOf(t)?.contains(target)) ||
      tablist.querySelector('.cai-tab[aria-selected="true"]') ||
      tablist.querySelector(".cai-tab.is-active") ||
      tabs[0];

    if (activeTab) activateTab(activeTab);
  });
  // The browser scrolled to the target before the panels were hidden, which
  // moved it: bring it back, without moving focus
  if (target && lists.length) target.scrollIntoView({ behavior: "instant" });

  if (bound) return;
  bound = true;

  document.addEventListener("click", (e) => {
    const tab = e.target.closest?.(".cai-tab");
    if (tab?.closest(".cai-tabs[role='tablist']")) {
      // eslint-disable-next-line no-restricted-syntax -- RL-3: the tab is a link only without JavaScript; with it, the tab shows its panel in place
      e.preventDefault();
      activateTab(tab);
      return;
    }
    // A link into a hidden panel: open it, then the browser follows the link
    // natively (scroll, and focus, which the target can take)
    const link = e.target.closest?.('a[href^="#"]');
    const el = link && byHash(link.hash);
    if (reveal(el) && !el.hasAttribute("tabindex")) el.tabIndex = -1;
  });

  // Back, Forward or a typed fragment
  window.addEventListener("hashchange", () => {
    const el = byHash(location.hash);
    if (reveal(el)) el.scrollIntoView();
  });

  // Find in page reached the text of an "until-found" panel
  document.addEventListener("beforematch", (e) => reveal(e.target));

  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest?.(".cai-tab");
    const tablist = tab?.closest(".cai-tabs[role='tablist']");
    if (!tablist || !Object.hasOwn(TAB_KEYS, e.key)) return;
    // eslint-disable-next-line no-restricted-syntax -- RL-3: the ARIA tabs pattern moves focus with these keys; without this the page would scroll as well
    e.preventDefault();
    const step = TAB_KEYS[e.key];
    // Left and Right follow the reading direction (right-to-left too)
    moveTabFocus(tab, /Left|Right/.test(e.key) && getComputedStyle(tablist).direction === "rtl" ? -step : step);
  });
}
