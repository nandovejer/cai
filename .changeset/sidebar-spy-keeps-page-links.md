---
"@cai-ds/core": patch
---

`initSidebar()`: the scroll spy only moves the current mark between links to sections of the page. A link to another document in the same sidebar (for example the site links at the top of a drawer) keeps the `aria-current="page"` its markup gives it, instead of losing it on the first scroll.
