---
"@cai-ds/core": patch
---

`.u-sr-only` and the copy buttons' live region hide text with CAI's own rule: a 1px box clipped with `clip-path: inset(50%)`, written with logical properties, instead of the common `clip: rect()` recipe. Screen readers still read the text.
