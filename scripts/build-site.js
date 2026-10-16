/**
 * LUZ Site — Dist builder
 * Regenerates packages/site/dist from packages/site/src through the shared
 * builder (scripts/build-package.js): site.css and site.min.css in the
 * luz.site layer, one stylesheet per component in dist/components/, and
 * print.css; site.js, the entry (the presence loader), and its three lazy
 * chunks, search.js (<luz-search>), consent.js (<luz-consent>) and mode.js
 * (<luz-mode>), each copied and bundled alone (site.min.js loads
 * ./search.min.js, ./consent.min.js and ./mode.min.js, SEC-CHUNK-1/2).
 *
 * Usage: node scripts/build-site.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "site", js: ["site.js"], chunks: ["search.js", "consent.js", "mode.js"] });
