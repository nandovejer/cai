---
"@cai-ds/tokens": patch
---

PRINCIPLES.md section 8: a new row in the size table, `site` JS module `consent` (a file of its own, not imported by `site.js`), ideal 1 kB and ceiling 1.5 kB min+gzip. It is a new row; no ceiling is raised (RL-17). The privacy rule now names the one more thing CAI may store, where a site uses site's cookie consent: the visitor's answer to it (the categories asked, the ones granted and when the answer expires), in `localStorage` under a `cai-` key, checked against the allowed list, with no personal data.

`check-contrast` checks four more pairs, the ones the new site pages print: `brand-primary` (4.5:1) and `focus-ring` (3:1) on `color-warning-bg` over `surface-page`, `brand-fill` on `surface-muted` (3:1), and `outline` on `input-bg` (3:1). All pass in the three modes.
