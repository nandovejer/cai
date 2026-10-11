---
"@cai-ds/core": minor
"@cai-ds/platform": minor
---

**New (`@cai-ds/core`, `@cai-ds/platform`)**

- Print styles, in `@media print`, in a new last layer `cai.print` (the layer list in `scripts/cai-layers.js` and in the docs gains it). They are in `cai.css`; `@cai-ds/core/print.css` (`dist/print.css`) is the same block for pages that load components one by one.
- On paper: white and black whichever color mode was on (the tokens are set again for print, so components follow); navigation, sidebar, tab row, copy buttons, the color mode switch, the player, toasts and tooltips are not printed; an external link prints its address after its text; no break inside a figure, code block, table, table row, quotation, image, card or alert; the header row of a table repeats on each page; every tab panel prints; a wide table is not clipped and a long line of code wraps; no shadows, transitions or animations.
- Platform hides its skip link, search trigger and search dialog in print, and the soft glow of the shell.
- The `.o-shell` grid is one column in print.
- A page in Get started: "Print styles". Registered as EX-006: the address of a link is a content-bearing pseudo-element, print only.
- Cost: core CSS +0.5 kB min+gzip (9.1 of 15 kB), platform CSS +0.1 kB.
