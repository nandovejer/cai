/**
 * CAI Landing — Dist builder
 * Regenerates packages/landing/dist from packages/landing/src through the
 * shared builder (scripts/build-package.js): landing.css and
 * landing.min.css in the cai.landing layer. No JavaScript in 0.x.
 *
 * Usage: node scripts/build-landing.js (from the repo root)
 */

import { buildPackage } from "./build-package.js";

await buildPackage({ name: "landing" });
