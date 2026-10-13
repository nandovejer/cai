---
"@cai-ds/platform": patch
---

Search dialog: the close button is now an × icon instead of the words "Close search". Its name comes from `aria-label` (translated in the page's language), the icon is `aria-hidden`, and the button is a square 44 px target. The × is `--cai-text-secondary` and turns `--cai-text-primary` on `--cai-surface-hover` on hover, in light, dark and high contrast; in forced colors it follows the system's text colour. If you copy the search markup, replace the text button with `<button class="cai-btn cai-btn--ghost cai-platform-search__close" aria-label="Close search"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`. Platform CSS grows by about 0.04 kB. Not yet reviewed in Safari and Firefox.
