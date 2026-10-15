---
"@luz-ds/app": minor
---

New package: the header and the dashboard of a web application, on core's shell and sidebar. CSS only (no script), in the cascade layer `luz.app`, after `luz.cms`. Requires `@luz-ds/tokens` and `@luz-ds/core` (`^0.1.0`); `@luz-ds/site` is an optional peer, for the search in the bar. Exports `./css`, `./css/min` and `./components/*`.

- `.luz-app-header`, `__toggle`, `__product`, `__actions`, `__account`, `__account-name`: `header.luz-app-header.o-sticky > div.o-row` in `.o-main`, beside the sidebar. The page surface, a 1 px divider, one row of core's `--luz-bar-h`, and gutters that match the content's (16 px, 32 px from 641 px). It holds core's `.luz-nav-toggle` (it opens the sidebar drawer), the product's name (shown at 768 px and below only, so it is never twice in the tree), and the actions at the inline end: site's `<luz-search>`, then a `.luz-dropdown` whose button is the account (initials in a `.luz-avatar`, then the name, clipped to nothing at 640 px and below and kept in the button's name: "AM Ana Martín"). The account list opens ending where its button ends, so it stays in the window at the inline end of the bar. `.o-main` gets `scroll-padding-block-start: var(--luz-bar-h)`.
- `.luz-app-dashboard`, `__head`, `__title`, `__panel`, `__panel--wide`: `main.luz-app-dashboard`, the container of its own size query, with a title row (`div.__head`: the view's one `h1` and core's `.o-actions`) and a `ul.o-grid.o-grid--auto` of `li.luz-card.__panel` with an 18 rem column. `__panel--wide` takes two columns from a 40 rem container. The panels keep the order of the markup: no dense packing, no `order`.

The view's `h1` and its main action are the first row of the dashboard, not in the bar: the bar holds only what is the same in every view. Not in 0.1: an icon rail or collapsible sidebar, a stat or chart style, a skeleton, notifications.
