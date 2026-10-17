---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`.luz-sidebar[popover]` in forced colours: the open drawer has a 1 px inline-end border in `CanvasText`, so it stands apart from the page it covers once the backgrounds and the shadow are dropped. Nothing changes outside forced colours.
