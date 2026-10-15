/**
 * LUZ App — Dist builder
 * Regenerates packages/app/dist from packages/app/src through the shared
 * builder (scripts/build-package.js): app.css and app.min.css in the
 * luz.app layer. No JavaScript in 0.x.
 *
 * Usage: node scripts/build-app.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "app", label: "App" });
