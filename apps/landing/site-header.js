/**
 * CAI site header — shared by the home and documentation pages.
 * Publishes the sticky header's height as --site-header-h on <html>, so
 * anchored targets, the docs sidebar and its drawer sit below the header
 * at any width (the header wraps on narrow screens). Without JavaScript
 * the CSS falls back to a one-row estimate.
 */
export function initSiteHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const publish = () =>
    document.documentElement.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
  publish();
  if (typeof ResizeObserver === "function") new ResizeObserver(publish).observe(header);
}
