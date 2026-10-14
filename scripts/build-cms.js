/**
 * LUZ CMS — Dist builder
 * Regenerates packages/cms/dist from packages/cms/src through the shared
 * builder (scripts/build-package.js): cms.css and cms.min.css in the
 * luz.cms layer. No JavaScript in 0.x.
 *
 * Usage: node scripts/build-cms.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "cms", label: "CMS" });
