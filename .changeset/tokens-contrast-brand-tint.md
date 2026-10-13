---
"@cai-ds/tokens": minor
---

`check-contrast` and the contrast tool measure two more pairs, strict (WCAG 1.4.11, 3:1): `--cai-brand-fill` and `--cai-focus-ring` on `--cai-brand-subtle` over the page, the ground of a primary button inside a tinted band. In dark mode the fill is 3.03:1 there, the thinnest pair of the system, so a change to the tint or the fill fails the check first. A custom theme that lowers either token may now fail where it passed.
