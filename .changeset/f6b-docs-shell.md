---
"@luz-ds/docs": patch
"@luz-ds/check": patch
---

`.luz-docs-shell` below 60 rem: the content row takes the free height. On a page shorter than the window the header, the sidebar and the footer keep their own height instead of sharing the extra space.

`luz-check` reads a stylesheet of `@luz-ds/docs` as loaded: `@luz-ds/docs` in a URL, `/packages/docs/` in development, or a bare `docs.css` (which may be your own). Before, a page that linked `docs.css` and used a `luz-docs-*` class was told to load `@luz-ds/docs`.
