---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
"@luz-ds/site": minor
"@luz-ds/landing": minor
"@luz-ds/cms": minor
"@luz-ds/check": patch
---

First release of LUZ, formerly CAI (its packages were last published as 2.0.0, under another scope). Migration from those packages: install `@luz-ds/*` instead; every old prefix becomes `luz` (classes `.luz-*`, hooks `data-luz-*`, tokens `--luz-*`, elements `<luz-*>`, layers `luz.*`, events `luz:*`, storage keys `luz-*`); the stylesheet and the script are now `luz.css` and `luz.js`. Display preferences stored under the old keys are not read.
