---
"@luz-ds/core": patch
"@luz-ds/site": minor
"@luz-ds/landing": minor
"@luz-ds/cms": minor
---

One stylesheet per component in site, landing and cms, as core already has: each `src/components/<name>.css` is also published as `dist/components/<name>.css` and `<name>.min.css`, in the package's own layer (`luz.site`, `luz.landing`, `luz.cms`), exported as `./components/*` (`@luz-ds/landing/components/feature-grid.css`). Site's print rules are also published on their own as `dist/print.css` (+ `.min`), exported as `@luz-ds/site/print.css`, for a page that loads components one by one; `site.css` still contains them. `./css` and `./css/min` stay the bundles.

`@luz-ds/landing` and `@luz-ds/cms` now take `@luz-ds/site` as an optional peer (`peerDependenciesMeta`): their CSS works with `@luz-ds/tokens` and `@luz-ds/core` alone, and site, when you use it, is loaded before them. Tokens and core stay required.

Core no longer names site's footer: `.o-shell` places its `footer` child across the bottom, as before, but no longer a `.luz-site-footer` that is not a `<footer>`. Migration: put `.luz-site-footer` on a `<footer>` (or inside one) when it is a direct child of `.o-shell`.
