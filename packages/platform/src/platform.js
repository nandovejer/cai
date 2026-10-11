/**
 * CAI Platform — entry. Loading it (one <script type="module">) checks that
 * core is loaded first and defines <cai-platform-search> (search.js), which
 * wires the site search when it connects. Importing search.js on its own
 * defines the element too.
 */
import "./search.js";

if (typeof document !== "undefined") {
  // Core is a required peer: platform styles are built on its settings layer
  getComputedStyle(document.documentElement).getPropertyValue("--cai-z-toast") || console.warn("[cai] Load @cai-ds/core first");
}
