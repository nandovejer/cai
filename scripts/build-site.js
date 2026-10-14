/**
 * LUZ Site — Dist builder
 * Regenerates packages/site/dist from packages/site/src through the shared
 * builder (scripts/build-package.js): site.css and site.min.css in the
 * luz.site layer; site.js, the entry (the presence loader), and its two
 * lazy chunks, search.js (<luz-search>) and consent.js (<luz-consent>),
 * each copied and bundled alone (site.min.js loads ./search.min.js and
 * ./consent.min.js, SEC-CHUNK-1/2); and the image placeholders copied.
 *
 * Usage: node scripts/build-site.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "site", js: ["site.js"], chunks: ["search.js", "consent.js"], assets: ["placeholders"] });
