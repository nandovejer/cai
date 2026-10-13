---
"@cai-ds/core": patch
---

Table: below 480 px of container width a heading row that holds a link or a button (a sortable column) is no longer clipped to 1 px. The headings show as a row above the cards and wrap, so the control can be seen and its focus ring is visible (WCAG 2.4.7). A heading row of plain text is hidden there as before. The caption of a stacked table is a block, so it is no longer squeezed into a narrow column. Sidebar: the three bars of `.cai-nav-toggle` are painted in `ButtonText` in forced-colors mode; they were backgrounds, which forced colors drop, and left an empty box.
