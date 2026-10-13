---
"@cai-ds/site": patch
---

`<cai-platform-search>` now matches a query against an item's meta as well as its text, so a section listed as `["When to use", "components/button/#when", "Button › Design"]` is found by its page's name. The docs site index puts a section's page and tab in the meta instead of repeating them in the text: the result reads "When to use" with "Button › Design" muted after it, and its accessible name stays "When to use, Button › Design". The docs site's "none" hint, "Check the spelling or try a shorter word.", is now part of the announced status label.
