---
"@cai-ds/core": patch
---

`initCopyButtons()` is idempotent, as PRINCIPLES.md §3 asks of every `init*()`.

**Fixed (`@cai-ds/core`)**

Each call added one more click listener to `document.body`, so after two calls one click on a `.cai-copy-btn` copied twice and the button's text could be left as "Copied". The listener is now one function for every call, and a second call adds nothing.
