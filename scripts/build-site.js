/**
 * CAI Site — Dist builder
 * Regenerates packages/site/dist from packages/site/src through the shared
 * builder (scripts/build-package.js): site.css and site.min.css in the
 * cai.site layer, the JS modules (site.js, the entry, and search.js) copied
 * and bundled, and the image placeholders copied.
 *
 * Usage: node scripts/build-site.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "site", js: ["site.js", "search.js"], assets: ["placeholders"] });
