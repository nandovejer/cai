---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

A sidebar without `popover` inside `.o-shell` is now the first block of the page on a phone (768 px and below), not a sticky full-height column. The rule moved from the objects layer to `components/sidebar.css`, where `.luz-sidebar` sets position and size. A sidebar with `popover` keeps the drawer.
