---
"@luz-ds/site": minor
---

**Breaking.** Site's three pieces with no script become tags that no script defines (CSS-only tags: the tag is the block, it never upgrades and adds no role), and the cookie banner becomes a band fixed at the bottom of the window.

**CSS-only tags.** `<luz-lang-switch>`, `<luz-submenu>` and `<luz-banner>` are styled by `components/lang-switch.css`, `components/submenu.css` and `components/banner.css`; every rule that names a tag has its whole selector inside `:where()`. Their semantics stay on the native elements inside them (the button and `nav[popover]`, the `details`, the `section[aria-labelledby]`), so the accessibility tree is the one the classed markup gave. `<luz-submenu>` is `display: contents`, so the list item keeps its layout; `<luz-banner>` is a block. The old class names no longer do anything.

**The cookie banner.** `.luz-consent` is now fixed at the bottom of the window, the whole width, at most half its height with its own scroll, under the top layer, so showing it moves nothing. In a window less than 30 rem tall it stays in the flow, where its markup is (first after the skip link), which moves the page when it appears. While it shows, `consent.js` sets its height, rounded up, as `--luz-consent-h` on `:root` (from a ResizeObserver), and the page (`<html>`), `.o-main` and `.luz-sidebar` keep that much room at their end and as scroll padding, so nothing Tab reaches stays under it. None of it applies in print, where the banner is hidden. The confirmation now has a Close button, `[data-luz-consent-close]`: it hides the banner and returns focus to the button that opened it, else the first `[data-luz-consent-open]`, else `<main>`. The confirmation also hides when focus leaves it for the page, and focus stays where it went. Escape still does nothing. `[data-luz-consent-open]` buttons keep their space while hidden, so nothing moves when the script shows them.

| Was | Now |
| --- | --- |
| `<div class="luz-site-lang-switcher">` | `<luz-lang-switch>` (no class) |
| `.luz-site-lang-switcher__button`, `__icon`, `__name`, `__menu`, `__title`, `__list`, `__link` | `.luz-lang-switch__button`, `__icon`, `__name`, `__menu`, `__title`, `__list`, `__link` |
| `--luz-site-lang-switcher-top` (default `calc(var(--luz-control-lg) + var(--luz-space-xs))`) | `--luz-lang-switch-top` (default core's `--luz-bar-h`, 1 px more: the bar's border), set on the tag |
| `<details class="luz-site-submenu" name="…">` | `<luz-submenu><details name="…">…</details></luz-submenu>` |
| `<section class="luz-site-notice" aria-labelledby="…">` | `<luz-banner><section aria-labelledby="…">…</section></luz-banner>` |
| `.luz-site-notice--warning` | `<luz-banner tone="warning">` (any other value is the plain band) |
| `components/lang-switcher.css`, `components/banners.css` | `components/lang-switch.css`, `components/banner.css` and `components/consent.css` |
| `.luz-consent` in the flow, above the header | `.luz-consent` fixed at the bottom of the window (in the flow under 30 rem tall); keep it first after the skip link in the markup |
| `<p data-luz-consent-done tabindex="-1" hidden>…</p>` | `<div data-luz-consent-done tabindex="-1" hidden><p>…</p><button type="button" data-luz-consent-close>Close</button></div>` |
| Docs: `/docs/site/lang-switcher/`, `/docs/site/notice/` | `/docs/site/lang-switch/`, `/docs/site/banner/` |

Also: `prefers-reduced-data` no longer removes the placeholder of `.luz-site-image` (no browser ships the media feature; the placeholders leave site in a later release), and the site header's own rule for the language list is gone: its `--luz-site-header-h` and the switch's default are both `--luz-bar-h`.
