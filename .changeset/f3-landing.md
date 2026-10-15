---
"@luz-ds/landing": minor
"@luz-ds/check": patch
---

**Breaking.** Landing now holds the page structure of a landing page, moved from site: its header, hero, main, sections, footer and glow. Each is a class of the landing on a native element, laid out in the markup by core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-container--inline`, `.o-row`, `.o-stack`, `.o-grid--split`, `.o-actions`) and core's navbar; the landing adds only its skin and its rhythm. Site is an optional peer: with tokens, core and landing alone, the header, hero and footer render, and the rules that refine site's `<luz-lang-switch>` match nothing. The feature grid is gone: it had no CSS of its own after core's split grid, so it is a template, a `ul.o-grid.o-grid--split`.

**What each one is.**
- `.luz-landing-header`, `__brand`, `__actions`: `header.luz-landing-header.o-sticky > div.o-container.o-container--inline.o-row`, with core's `.luz-nav-toggle` and `nav.luz-navbar[popover]`. The page surface, a 1 px divider, the brand (semibold, the text colour, no underline, 44 px), the row's gaps (8 px between rows, 16 px between items, 24 px from 769 px), and `anchor-name` / `anchor-scope: --luz-bar`, so the navbar's panel and the language list open under it, on two rows as on one, where anchor positioning is supported. Stickiness is `.o-sticky`'s.
- `.luz-landing-hero`, `__copy`, `__eyebrow`, `__title`, `__lead`, `__media`: `section.luz-landing-hero.o-grid.o-grid--split`, with `--luz-grid-min: 24rem`; the same gaps, room above, type steps and Arabic rules as site's hero had.
- `.luz-landing-main`: `main.o-container.o-stack.luz-landing-main`, 64 px between the blocks and under the last one, none above the first.
- `.luz-landing-section`: `section.o-stack.luz-landing-section`, 16 px between its children; add core's `.luz-band` for the tint.
- `.luz-landing-footer`: `footer.luz-landing-footer > div.o-container.o-container--inline.o-row`, a 1 px divider above, its items at the two ends, a column aligned to the start at 768 px and below.
- `.luz-landing-glow`: on the `.o-page` element, the tint in the corner where reading starts (top right in right-to-left pages); none in print.

| Was | Now | Package |
| --- | --- | --- |
| `.luz-site-header`, `__inner`, `__brand`, `__nav`, `__actions`, `--sticky` | `header.luz-landing-header.o-sticky > .o-container.o-container--inline.o-row`; `.luz-landing-header__brand`; `nav.luz-navbar > ul.luz-navbar__list > li > a.luz-navbar__link`; `.o-row.luz-landing-header__actions` | landing, core |
| `.luz-site-hero`, `__copy`, `__eyebrow`, `__title`, `__lead`, `__media` | `.luz-landing-hero.o-grid.o-grid--split`, `.luz-landing-hero__copy`, `__eyebrow`, `__title`, `__lead`, `__media` | landing, core |
| `.luz-site-footer` (the row itself) | `footer.luz-landing-footer > .o-container.o-container--inline.o-row` (the divider is on the `<footer>`) | landing, core |
| `.luz-site-page`, `.luz-site-page--gradient` | `.o-page`, `.o-page.luz-landing-glow` | core, landing |
| `.luz-site-main` | `main.o-container.o-stack.luz-landing-main` | landing, core |
| `.luz-site-section`, `--band` | `.o-stack.luz-landing-section`, `.luz-band` | landing, core |
| `.luz-site-actions` | `.o-actions` | core |
| `.luz-landing-feature-grid` | `ul.o-grid.o-grid--split` (a template on the landing templates page) | core |
| `components/feature-grid.css` | `components/header.css`, `hero.css`, `main.css`, `section.css`, `footer.css`, `glow.css` | landing |
| Docs: `/docs/landing/feature-grid/` | `/docs/landing/header/`, `/hero/`, `/section/`, `/footer/`; the feature grid block on `/docs/landing/templates/` | — |

Site's old classes stay in `@luz-ds/site` until they are removed in a later release.
