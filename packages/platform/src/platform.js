/**
 * CAI Platform — entry. Loading it (one <script type="module">) checks that
 * core is loaded first and wires the site search (search.js) once the page
 * is parsed. Importing search.js on its own has no side effects.
 */
import { initSearch } from "./search.js";

export { initSearch } from "./search.js";

if (typeof document !== "undefined") {
  // Core is a required peer: platform styles are built on its settings layer
  getComputedStyle(document.documentElement).getPropertyValue("--cai-z-toast") || console.warn("[cai] Load @cai-ds/core first");
  // A module runs once the page is parsed; a classic loader may run it earlier
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initSearch());
  else initSearch();
}
