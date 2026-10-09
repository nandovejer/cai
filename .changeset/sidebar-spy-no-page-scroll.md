---
"@cai-ds/core": patch
---

`initSidebar()`: the scroll spy brings the current link into view by scrolling only the list that holds it (the sidebar or an "On this page" rail), never the page. It used `scrollIntoView()`, which could scroll the document and moved the keyboard's starting point to the link, so the first Tab after loading skipped the skip link.
