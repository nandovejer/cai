---
"@cai-ds/platform": patch
---

Site search fixes:

- The Enter that ends an IME composition (Japanese, Chinese, Korean input) no longer opens the first result.
- A `data-cai-label-loading` or `data-cai-label-error` with a placeholder such as `{n}` no longer throws: the text shows, and the next open tries to load the index again.
- A result on the same page whose hash has a malformed escape (`#%E0%A4%A`) no longer throws; the link still navigates.
- Put the search `<dialog>` at the start of `<body>`, before the skip link. When the dialog is opened with Ctrl+K while nothing has focus, the browser starts the next Tab after closing from the dialog's position, so the reader then lands on the skip link instead of further down the page.
