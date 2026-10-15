---
"@luz-ds/site": minor
"@luz-ds/check": patch
---

**Breaking.** Site's two scripted pieces drop `site-` from their names, the search becomes one self-contained element, and `site.js` becomes a loader that loads each piece's script only on a page that has it.

**The loader.** `site.min.js` no longer bundles the search. It scans the page once and loads `search.min.js` when the page has a `<luz-search>` (on the first pointerdown or focus inside it, on Ctrl+K or ⌘K, or when the browser is idle) and `consent.min.js` when it has a `<luz-consent>` (when the browser is idle, at most a second later, after the search). A page with neither loads neither. Each chunk defines its element once, however many copies of it a page loads, and imports nothing. A Ctrl+K pressed before the search's script has loaded loads it and opens the dialog. If a chunk cannot load, the page stays as it is without JavaScript. There is no MutationObserver: for a `<luz-search>` or `<luz-consent>` added after the page has loaded, import `@luz-ds/site/search` or `@luz-ds/site/consent` (or the `.min.js` file) yourself.

**The search slot.** The fallback link and the button now sit inside `<luz-search>`, with the dialog, and share one place: the hidden one keeps its space, so nothing moves when the button takes over. If the reader is on the link at that moment (keyboard focus or a pressed pointer), the swap waits until they leave it. At 768 px and below, next to a `--compact` button, the link shows the magnifier only, 44 by 44 px, its words clipped but still its name. The button and the link use the sans. The `<kbd>` hint is `aria-hidden`.

**Subresource Integrity.** An `integrity` on `site.min.js` does not cover the chunks it loads. For full coverage, add a `<link rel="modulepreload" integrity crossorigin>` for `search.min.js` and `consent.min.js` before the script (SECURITY.md).

| Was | Now |
| --- | --- |
| `<luz-site-search>` around the dialog; trigger and fallback outside it | `<luz-search>` holding `a.luz-search__fallback`, `button.luz-search__trigger` and `dialog.luz-search` |
| `<a data-luz-search-fallback>A–Z index</a>` | `<a class="luz-search__fallback" data-luz-search-fallback>` with a `svg.luz-search__trigger-icon` and `<span class="luz-search__fallback-label">A–Z index</span>` |
| `.luz-site-search-trigger`, `--compact` | `.luz-search__trigger`, `.luz-search__trigger--compact` |
| `.luz-site-search-trigger__icon`, `__label`, `__key` | `.luz-search__trigger-icon`, `.luz-search__trigger-label`, `.luz-search__trigger-key` |
| `.luz-site-search`, `__body`, `__head`, `__title`, `__close`, `__field`, `__status`, `__results`, `__foot` | `.luz-search`, `.luz-search__body`, `__head`, `__title`, `__close`, `__field`, `__status`, `__results`, `__foot` |
| `<luz-site-consent>`, `.luz-site-consent`, `__title`, `__choices` | `<luz-consent>`, `.luz-consent`, `__title`, `__choices` |
| `site.min.js` bundles the search; `consent.min.js` loaded by its own `<script>` | `site.min.js` loads `search.min.js` and `consent.min.js` when the page has their element; a page may still load either file on its own |
| Budget row "site JS module: consent" | "site JS lazy chunk: consent" (same file and ceiling), and a new row "site JS lazy chunk: search" (2.5 kB) |

`[data-luz-search-open]` buttons outside `<luz-search>` still open the dialog and still show only once the search works. Every `data-luz-search*` and `data-luz-label-*` attribute, the index format, the keyboard, `getConsent()` and the `luz:consent` event are unchanged.
