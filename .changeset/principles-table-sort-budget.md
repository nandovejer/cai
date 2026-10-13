---
"@cai-ds/tokens": patch
---

PRINCIPLES.md section 8 splits the lazy-chunk row of the size table in two, so it stays one to one with `budgets.json`: `midi` (3 kB ideal, 4 kB ceiling, unchanged) and the new `table-sort` (1 kB ideal, 2 kB ceiling). Section 3 names `table-sort.js` among the modules that are lazy-loaded. No existing ceiling changes: the core JS entry stays at 8 kB (RL-17).
