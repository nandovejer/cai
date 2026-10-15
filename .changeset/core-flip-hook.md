---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`data-luz-flip` is read by LUZ: an element with it (the `chevron-end` and `arrow-end` icons of the icon grid, or an icon of your own that points to the end of the line) is mirrored in right-to-left text, by one rule of specificity zero in `luz.utilities` (`:where([data-luz-flip]):dir(rtl) { transform: scaleX(-1) }`). Nothing to write; a rule of your own still wins.
