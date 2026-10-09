---
---

PRINCIPLES.md §8: a new size ceiling, a red line like the others (red line 17). Each page of the documentation site is at most 80 kB of HTML, measured as the raw bytes of each built `docs/**/*.html` (ideal 60 kB). A page that reaches it is split into two pages; the ceiling is never raised. `pnpm check:size` checks it, from the new row in `budgets.json`. Why: the documentation is now one page per component, pattern, token family and element category, and each must stay quick to load and to read. No package changes.
