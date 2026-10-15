---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
"@luz-ds/check": patch
---

The layer statement that every stylesheet repeats now names `luz.app`, after `luz.cms` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.site, luz.landing, luz.cms, luz.app, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.app` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/app`.

**Fix (core).** `.o-main` no longer sets `overflow-y: auto`. The page scrolls, not `.o-main` (the sidebar sticks to the window the same way), so a bar with `.o-sticky` inside `.o-main` stuck to nothing and scrolled away with the page. A wide child that has no wrapper of its own (a table with no `.luz-table-wrap`) now makes the page scroll sideways, as it does outside `.o-shell`, instead of scrolling inside `.o-main`.
