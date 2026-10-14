---
"@cai-ds/site": minor
---

Three new patterns at the top of a site, and a new export, `@cai-ds/site/consent`.

**New**

- Submenu, `.cai-site-submenu`: an item of the site header's links that holds more links. It is a native `<details>` in the list, its `<summary>` the button, with no script: the browser opens and closes it and exposes the expanded state, and the same `name` on every submenu closes the others where it is supported. In the header's menu at 768 px and below its links open in place, under the button; from 769 px in a box under the button, over the page (the last item's box opens toward the start). Never on hover. It replaces a script-driven dropdown navigation and the hover menu. Docs page at `/docs/site/submenu/`.
- Notice, `.cai-site-notice` and `--warning`: a band above the site header with one short announcement and one link, its text in the header's column. No script and no close button: a dismissal that lasts needs a script and storage, and a notice is removed from the markup when it ends. The warning uses the existing warning colours, and its words say it too. Docs page at `/docs/site/notice/`.
- Cookie consent, `.cai-site-consent` (`__title`, `__choices`) and the module `consent.js` (`./consent`, `dist/consent.js` and `dist/consent.min.js`, which `site.js` does not import). The banner is `hidden` in the markup; `<cai-site-consent>` shows it, in the flow above the header and without taking focus, when no answer is stored, it has expired (`data-cai-consent-days`, 180 by default, 395 at most) or a category was not asked about. Accept and Reject have the same style; a `<details>` holds one checkbox per category in a native form. Escape is not an answer. The answer is stored in `localStorage` under `cai-consent` (or `data-cai-consent-key`, starting with `cai-`) as `{"version":1,"expires":…,"asked":[…],"granted":[…]}`; `getConsent(key?)` reads it, and `cai:consent` is dispatched on `document` with `{ asked, granted, expires }` on every new answer. `[data-cai-consent-open]` buttons, hidden until the script runs, show it again. The script writes no text. Without JavaScript the banner stays hidden. Docs page at `/docs/site/consent/`.

**Changed**

- The site header's menu panel and the language list in a site header open under the header with CSS anchor positioning where it is supported (`anchor-name` and `anchor-scope` on `.cai-site-header`, `position-area: block-end span-all`), so a notice or the cookie banner above the header, or a header wrapped by enlarged text, no longer puts the panel over the header. The open panel's scrim is then its own shadow, below it. Elsewhere nothing changes: they open at `--cai-site-header-h`.
- The cookie banner is hidden in print.

**Known issues**

- A submenu has no Escape key and does not close on a click elsewhere (native `<details>`): its button, or opening another one, closes it. From 769 px an open submenu stays over the top of the page, so a link of the page reached with Tab behind it can be hidden (WCAG 2.4.11).
- Without anchor positioning (before Chrome 125, Safari 26, Firefox 147) the header's menu opens at the top of the window and can cover part of the header when a notice or the banner is above it, before the page scrolls.
- The notice cannot be closed. Without JavaScript the cookie banner is not shown; a server that sets optional cookies without a script must ask another way.
- None of the three has been tested with a screen reader.

Size: `site.css` 3.7 kB of 4 kB; `consent.min.js` 0.9 kB, in a new budget row (ideal 1 kB, ceiling 1.5 kB); `site.min.js` unchanged.
