---
"@cai-ds/tokens": major
"@cai-ds/core": major
"@cai-ds/platform": major
---

Layered, independently installable packages.

**Breaking**

- `@cai-ds/core` now declares `@cai-ds/tokens` as a required peer dependency.
- `@cai-ds/platform` now requires both `@cai-ds/core` and `@cai-ds/tokens` (tokens is no longer an optional peer).
- `@cai-ds/core`: CSS components and JS behaviors are modularized (one file per component, one module per concern).
- `@cai-ds/core`: `cai.js` no longer runs docs-only behavior on consumer pages (global Escape on `<details>`, `#demo-form`, range/output syncing, breadcrumb `href="#"` handling, section anchors, back-to-top). Copy-on-click for `.docs-swatch` / `.docs-token` / `.swatch` / `.token` is removed; call `copyToClipboard()` directly.
- `@cai-ds/core`: the sidebar scroll-spy observes the sections its links point at instead of `.docs-section`; theme mode buttons use `.cai-theme-mode-btn` instead of `.docs-theme-card__mode-btn`.
- Fonts: every bundled font is now MIT licensed. `@cai-ds/tokens` ships Gidole (sans), ET Book (serif) and Monoid (mono) instead of IBM Plex, so `--cai-font-sans`, `--cai-font-serif` and `--cai-font-mono` name different families. Gidole has a single weight; bolder text is synthesized.
- `@cai-ds/tokens` no longer ships theme fonts. `@cai-ds/core` ships Comic Shanns for the `ricardoymortimer` theme; DM Sans, Space Grotesk and Freckle Face are removed and both custom themes use Gidole for text.

**Fixed**

- `@cai-ds/tokens`: `@font-face` URLs in `dist/cai-tokens.css` now resolve (`./fonts/…`), so the fonts load from npm and CDNs without extra files.
- `@cai-ds/core`: the MIDI parser validates lengths and bounds; malformed files fail fast instead of freezing the page.
- `@cai-ds/core`: theming keeps working when `localStorage` is unavailable; sidebar links to real URLs no longer throw.
- `@cai-ds/core`: `sideEffects` now lists the auto-initializing entry so bundlers keep `import "@cai-ds/core"`.

**Added**

- `@cai-ds/tokens`: `./tokens.css` (no `@font-face`), `./fonts.css`, `./tokens.json`, `./fonts/*`, `./css/min` exports.
- `@cai-ds/core`: `./base.css` (settings + reset + elements, the prerequisite for per-component CSS), `./tabs` and `./toggle` modules.
- `@cai-ds/platform`: `./css/min` export.
- Every package ships its `LICENSE`; font folders ship the MIT notice of each font.
- A console warning when a layer is loaded without the one below it.
