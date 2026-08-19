/**
 * CAI Design System — Sidebar
 * Navigation active state (IntersectionObserver) + mobile drawer.
 *
 * Importing this module has no side effects; call initSidebar() to wire
 * up navigation, or use openSidebar()/closeSidebar() directly.
 */

let sidebarReturnFocusTarget = null;

const getSidebar = () => document.querySelector(".cai-sidebar");
const getToggle = () => document.querySelector(".cai-nav-toggle");
const getOverlay = () => document.querySelector(".cai-nav-overlay");

function getSidebarFocusableElements() {
  const sidebar = getSidebar();
  return sidebar
    ? Array.from(
        sidebar.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
    : [];
}

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

export function openSidebar() {
  sidebarReturnFocusTarget = document.activeElement;
  getSidebar()?.classList.add("is-open");
  getOverlay()?.classList.add("is-open");
  getToggle()?.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    getSidebarFocusableElements()[0]?.focus();
  });
}

export function closeSidebar({ restoreFocus = true } = {}) {
  getSidebar()?.classList.remove("is-open");
  getOverlay()?.classList.remove("is-open");
  getToggle()?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";

  if (restoreFocus) {
    const focusTarget = sidebarReturnFocusTarget || getToggle();
    requestAnimationFrame(() => {
      focusTarget?.focus();
    });
  }

  sidebarReturnFocusTarget = null;
}

/**
 * Wire up nav active state, drawer controls, and section observation.
 */
export function initSidebar() {
  const navLinks = Array.from(document.querySelectorAll(".cai-sidebar__link"));
  const linkMap = new Map(
    navLinks.map((link) => [link.getAttribute("href"), link]),
  );
  let currentActive = document.querySelector(".cai-sidebar__link.is-active");

  function setCurrentLink(link) {
    navLinks.forEach((item) => {
      const isActive = item === link;
      item.classList.toggle("is-active", isActive);
      if (isActive) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
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

  document
    .querySelectorAll(".docs-section[id]")
    .forEach((s) => observer.observe(s));

  // --- Drawer controls ---
  getToggle()?.addEventListener("click", () => {
    const isOpen = getSidebar()?.classList.contains("is-open");
    isOpen ? closeSidebar() : openSidebar();
  });

  getOverlay()?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && getSidebar()?.classList.contains("is-open"))
      closeSidebar();
  });

  // --- Sidebar link navigation ---
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest(".cai-sidebar__link");
    if (!link) return;

    const targetId = link.getAttribute("href");
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      updateActiveState(link);
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // On mobile, close the drawer when navigating
    if (window.innerWidth <= 768) {
      closeSidebar({ restoreFocus: false });
      requestAnimationFrame(() => {
        focusSidebarTarget(targetEl);
      });
    }
  });
}
