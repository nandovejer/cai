---
"@cai-ds/core": patch
"@cai-ds/site": patch
---

Fixes from the Safari and Firefox reviews of the beta CSS and JS (WebKit 26.6 and 27.2, Firefox 155, review only, on Linux).

**Fixed (`@cai-ds/core`)**

- **Tooltip anchor positioning (Firefox 147+).** With two tooltips on a page, every tip was anchored to the last trigger, and in right-to-left text it landed off screen. Each `.cai-tooltip` now has `anchor-scope: --cai-tooltip`, and the tip is placed with `anchor()` insets (`inset-block-end: anchor(start)`, `inset-inline-start: anchor(center)`, `translate`) instead of `position-area`; it still flips below with `position-try-fallbacks: flip-block`. Checked in Chromium, Firefox and WebKit.
- **Indeterminate `<progress>`.** WebKit and Blink painted the track over the stripes (it looked empty), and Gecko drew the bar across the whole track (it looked full). Both now show the stripes, in every engine and in forced colors, for the bare element and `.cai-progress`.
- **`.cai-meter` in Firefox.** The warning and danger states have colors (`:-moz-meter-sub-optimum`, `:-moz-meter-sub-sub-optimum`), and the meter has an edge and a highlight value in forced colors.
- **Print.** A select or a date field no longer keeps the dark color mode's system colors on paper (`color-scheme: light` in `cai.print`), and a tab panel that is plain `hidden` (a browser without `hidden="until-found"`) prints.
- **iOS.** `dvh` after `vh` for the drawer and the modal, so the last links are not under the toolbar; the prefixed `-webkit-user-select` and `-webkit-backdrop-filter` (Safari before 18); `-webkit-text-size-adjust: 100%` so iOS does not inflate text in landscape.
- **Select.** `appearance: base-select` is on two rules, one for the box and one for `::picker(select)`, so a browser with the first and not the second keeps the first.
- **Console noise.** `tabs.js` no longer calls `getElementById("")` when the page has no fragment (Firefox warned on every load).
- **Highlight.** A browser without lookbehind (Safari before 16.4) leaves the code block as plain text instead of throwing.

**Fixed (`@cai-ds/platform`)**

- The search keeps Enter that ends an IME composition from following the first result in Safari (`keyCode` 229, WebKit bugs 165004 and 317127). Same empty-fragment guard as `tabs.js`.

**Not fixed, and why**

- The four ET Book `.woff2` files have wrong glyph bounding boxes: Gecko's sanitizer logs `Glyph bbox was incorrect; adjusting` for 184 glyphs. Rendering is unaffected. Fixing it means re-saving licensed font files with fontTools, which was not available here.
- The 4 px `::-webkit-scrollbar` of `_reset.css` (a design decision), a visible message when a copy fails, the volume bar on iPhone (the browser ignores `volume`), and VoiceOver and `list-style: none` (needs a Mac): listed in the review ledger.
