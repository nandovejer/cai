/**
 * LUZ site header — one behavior for every page of the site (home, docs).
 * Everything here enhances what works without JavaScript: the color mode is
 * a native radio group (:root:has() in the tokens) and the menu
 * drawer is a native popover.
 *
 * - Color mode: <luz-mode remember by="clock"> in the footer owns it (it
 *   stores the choice under core's "luz-theme" key and, in Auto, follows
 *   the clock: apps/site/boot.js set the same mode before the first paint);
 *   this module defines the element and turns the radios into core's cycle
 *   button.
 * - Menu drawer: core's initSidebar() on #page-nav, so a link closes the
 *   drawer and the current section is marked.
 * - Publishes the sticky header's height as --site-header-h on <html>, so
 *   anchored targets, the docs sidebar and the drawer sit below the header.
 *
 * Lives in apps/site, which the home page and the docs both import.
 * Not part of any published package.
 */

import { initThemeCycle } from "/packages/core/dist/theme.js";
import { initSidebar } from "/packages/core/dist/sidebar.js";
// Defines <luz-mode>: the footer's switcher on every page, which owns the mode
import "/packages/site/dist/mode.js";

function publishHeight(header) {
  const publish = () =>
    document.documentElement.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
  publish();
  if (typeof ResizeObserver === "function") new ResizeObserver(publish).observe(header);
}

/** Wire the header of a page of the site: the cycle button, the drawer and the header's height. */
export function initSiteHeader() {
  // One button that steps through the modes; the radios stay underneath
  initThemeCycle();
  const nav = document.getElementById("page-nav");
  if (nav) initSidebar(nav);
  const header = document.querySelector(".site-header");
  if (header) publishHeight(header);
}
