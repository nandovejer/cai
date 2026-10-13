---
"@cai-ds/core": minor
---

Table: two classes for data tables. `.cai-table__numeric` goes on a `<th>` and on every `<td>` of a column of numbers: the text is aligned to the end of the cell (`text-align: end`, so the left edge in right-to-left text) and set in tabular figures (`font-variant-numeric: tabular-nums`), so the digits of a column line up. `.cai-table--compact` reduces the vertical padding of the cells to `--cai-space-2xs` and the gutter between columns to `--cai-space-sm`, so a one-line row is about 33 px instead of 49 px; the type size does not change. In the stacked card layout (below 480 px of container width) the cards keep their own padding, and the value is already at the end of its row. No new token, no JavaScript. Sorting is not part of the table and the docs say so: a table sorted by the server works with links in the headings and `aria-sort` on the sorted column, and the docs list what the link, the `href` and the caption need. Page: `/docs/components/table/`.
