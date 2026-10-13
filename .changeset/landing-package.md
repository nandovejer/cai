---
"@cai-ds/landing": minor
---

New package, `@cai-ds/landing`: patterns for one kind of site, a landing page, built on `@cai-ds/site`. It has its own version, starting at 0.1.0, and needs `@cai-ds/tokens`, `@cai-ds/core` and `@cai-ds/site` 3.x as peer dependencies, loaded first.

- `dist/landing.css` (`./css`) and `dist/landing.min.css` (`./css/min`), in the new cascade layer `cai.landing`, after `cai.site` and before `cai.print`. No JavaScript.
- The feature grid moves here from site: `.cai-landing-feature-grid`, two columns at most, one when two do not fit 16rem each. Docs page at `/docs/landing/feature-grid/`.
- The event landing page templates (hero, programme, speakers, tickets, call to action, registration) move to `/docs/landing/templates/`. They are markup to copy, built from core and site.
