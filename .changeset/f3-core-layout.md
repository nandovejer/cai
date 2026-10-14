---
"@luz-ds/core": minor
---

Core gains the layout every kind of page needs, so a site no longer needs `@luz-ds/site` for it:

- `--luz-bar-h` (settings): the height of a one-row bar of 44 px controls, `calc(var(--luz-control-lg) + var(--luz-space-xs) + 1px)`.
- Objects: `.o-page` (a column at least as tall as the window, whose `main` grows, with any number of bands before the header), `.o-container--inline` (the container's width and side gutters, no block padding: a bar's row), `.o-sticky` (a bar stuck to the top in a window at least 30 rem tall, with the scroll padding that keeps a field reached with Tab clear of it), `.o-grid--split` (two equal columns when each gets `--luz-grid-min`, one below) and `.o-actions` (a wrapping row of actions; a column of full-width actions, whose button labels wrap, at 640 px and below).
- Components, each also in `dist/components/<name>.css`: `.luz-skip-link` (hidden in print), `.luz-band` (a tint from edge to edge of the page; two rules in forced colors), `.luz-image` with `--4x3`, `--3x2`, `--1x1`, `--21x9`, `--9x16` (a frame of fixed ratio on the flat `--luz-surface-strong` surface; no placeholder picture), and `.luz-navbar`, `__list`, `__link` (the links of a header: a row from 769 px, a native popover panel under the bar at 768 px and below, opened by `.luz-nav-toggle`; no JavaScript).

They take over from site's `.luz-site-page`, `.luz-site-header__inner`, `--sticky` and `--luz-site-header-h`, `.luz-site-actions`, `.luz-site-skip-link`, `.luz-site-section--band`, `.luz-site-image` and `.luz-site-header__nav`, which stay in this release and go in a later one.
