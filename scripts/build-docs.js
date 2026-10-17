/**
 * LUZ Docs — Dist builder
 * Regenerates packages/docs/dist from packages/docs/src through the shared
 * builder (scripts/build-package.js): docs.css and docs.min.css in the
 * luz.docs layer. No JavaScript in 0.x.
 *
 * Usage: node scripts/build-docs.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "docs", label: "Docs" });
