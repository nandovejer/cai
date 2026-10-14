/**
 * LUZ Site — entry. Loading it (one <script type="module">) checks that
 * core is loaded first and defines <luz-site-search> (search.js), which
 * wires the site search when it connects. Importing search.js on its own
 * defines the element too.
 */
import "./search.js";

if (typeof document !== "undefined") {
  // Core is a required peer: site styles are built on its settings layer
  getComputedStyle(document.documentElement).getPropertyValue("--luz-z-toast") || console.warn("[luz] Load @luz-ds/core first");
}
