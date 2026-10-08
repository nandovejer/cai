/**
 * CAI Design System — Sidebar
 * Navigation active state (scroll spy). The mobile drawer is a native
 * popover (<nav class="cai-sidebar" popover> + <button popovertarget>) and
 * needs no script; this module only enhances it.
 *
 * Importing this module has no side effects; call initSidebar() to enable it.
 */

function focusSidebarTarget(targetEl) {
  if (!targetEl) return;

  const focusTarget = targetEl.matches("h1, h2, h3, h4, h5, h6, section, main")
    ? targetEl
    : targetEl.querySelector("h1, h2, h3, h4, h5, h6") || targetEl;

  if (!focusTarget.hasAttribute("tabindex")) {
    focusTarget.setAttribute("tabindex", "-1");
  }

  focusTarget.focus({ preventScroll: true });
}

/** True when `el` is a popover that is currently showing. */
function isOpenPopover(el) {
  try {
    return el.matches(":popover-open");
  } catch {
    return false; // browser without the popover API
  }
}

/**
 * Wire up nav active state, drawer controls, and section observation.
 * @param {ParentNode} [root=document] - Limit it to one sidebar, for a page
 *   that also shows a sidebar specimen whose links must stay inert.
 */
export function initSidebar(root = document) {
  const navLinks = Array.from(root.querySelectorAll(".cai-sidebar__link"));
  const linkMap = new Map(
    navLinks.map((link) => [link.getAttribute("href"), link]),
  );
  let currentActive = root.querySelector(".cai-sidebar__link.is-active");

  // A link to a section of this page is the current *location*
  // (aria-current="true"); "page" is kept for a link to another document, so
  // the page's own site navigation stays the only aria-current="page".
  function setCurrentLink(link) {
    navLinks.forEach((item) => {
      const isActive = item === link;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", item.getAttribute("href")?.startsWith("#") ? "true" : "page");
      } else item.removeAttribute("aria-current");
    });
  }

  const updateActiveState = (newActive) => {
    if (currentActive === newActive || !newActive) return;
    setCurrentLink(newActive);
    newActive.scrollIntoView({ block: "nearest" });
    currentActive = newActive;
  };

  if (currentActive) setCurrentLink(currentActive);

  // IntersectionObserver: choose the section closest to the top of the viewport
  // Only consider entries with top >= 0 (inside or below the viewport) to avoid
  // past sections (negative top) competing with visible ones.
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries.filter((e) => e.isIntersecting);
      if (visibleEntries.length === 0) return;

      // Prefer sections whose top edge has not yet left the top of the viewport
      const candidates = visibleEntries.filter(
        (e) => e.boundingClientRect.top >= 0,
      );
      const pool = candidates.length > 0 ? candidates : visibleEntries;

      const topEntry = pool.reduce((prev, curr) =>
        curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev,
      );

      const activeLink = linkMap.get(`#${topEntry.target.id}`);
      if (activeLink) updateActiveState(activeLink);
    },
    {
      threshold: 0.1,
      rootMargin: "-10% 0px -60% 0px",
    },
  );

  // Observe the sections the sidebar links point at (in-page #fragments)
  for (const href of linkMap.keys()) {
    const section = href?.startsWith("#") && document.getElementById(href.slice(1));
    if (section) observer.observe(section);
  }

  // --- Sidebar link navigation ---
  // The browser scrolls to the #fragment (smooth unless the user prefers
  // reduced motion, see elements/document.css). This only keeps the active
  // link in step and closes the drawer, which a popover does not do itself.
  document.addEventListener("click", (e) => {
    const link = e.target.closest?.(".cai-sidebar__link");
    if (!link || !navLinks.includes(link)) return;

    const targetId = link.getAttribute("href");
    const targetEl = targetId?.startsWith("#")
      ? document.getElementById(targetId.slice(1))
      : null;
    if (targetEl) updateActiveState(link);

    const drawer = link.closest(".cai-sidebar[popover]");
    if (drawer && isOpenPopover(drawer)) {
      drawer.hidePopover();
      requestAnimationFrame(() => focusSidebarTarget(targetEl));
    }
  });
}
