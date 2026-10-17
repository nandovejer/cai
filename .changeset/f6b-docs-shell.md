---
"@luz-ds/docs": patch
"@luz-ds/check": patch
---

`.luz-docs-shell` below 60 rem: the content row takes the free height. On a page shorter than the window the header, the sidebar and the footer keep their own height instead of sharing the extra space.

`.luz-docs-rail__inner`: a `<div>`, the one child of the rail, around "On this page" and the actions. From 80 rem the rail stretches over its grid area and the inner box is the sticky one, so it stops at the end of the rail and never covers the footer under it (WCAG 2.4.11); it scrolls by itself, with room at its start for a focus ring. Wrap the rail's two blocks in it.

`.luz-docs-page-head__files`: a quiet line, "Files:" and each file in a `<code>`, for a page that names its files without the chips. The rail's actions draw their top rule only after the "On this page" list. The date in `.luz-docs-page-foot` is the size of the line.

`luz-check` reads a stylesheet of `@luz-ds/docs` as loaded: `@luz-ds/docs` in a URL, `/packages/docs/` in development, or a bare `docs.css` (which may be your own). Before, a page that linked `docs.css` and used a `luz-docs-*` class was told to load `@luz-ds/docs`.
