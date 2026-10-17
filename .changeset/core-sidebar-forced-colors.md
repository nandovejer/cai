---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`.luz-sidebar__link` in forced colours: every link has a 3 px start border in `Canvas`, and the current page (`aria-current="page"`) has it in `Highlight`, so it stays marked when the backgrounds are dropped. Nothing moves.
