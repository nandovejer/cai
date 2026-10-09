---
"@cai-ds/platform": minor
---

New site search in `@cai-ds/platform`: a button shaped like a field opens a native `<dialog>` where a reader finds a page, a section or an HTML element by name.

**New (`@cai-ds/platform`)**

- `.cai-platform-search-trigger` ("Search docs…" and a "Ctrl K" hint; `--compact` shows the magnifier only at 768 pixels and below) and `.cai-platform-search`, used with core's `.cai-modal`. Hooks: `data-cai-search` and `data-cai-search-src` on the dialog, `data-cai-search-open` on every trigger, `data-cai-search-fallback` on the link it replaces, `data-cai-search-results`, `data-cai-search-list="pages|sections|elements"` and `data-cai-search-show="idle|none"`.
- `platform.js` now wires it when the page is parsed (`platform.min.js` is one file with the search inside), and `@cai-ds/platform/search` exports `initSearch(root = document)` (idempotent; importing it does nothing). The new files are `dist/search.js` and `dist/search.min.js`.
- Ctrl+K and ⌘K open it (PRINCIPLES.md §3 now allows this one shortcut by name), never during IME composition, in a text area or editable content, or over another dialog. Results are links in lists under headings, 8 per group at most; the arrow keys, Home and End move between them, Enter follows one, typing goes back to the field. The count is announced once the reader stops typing.
- Without JavaScript the button stays hidden and a link to your index page shows.
- Every text is the page's: fixed text in the markup, and the few the script writes (count, no results, loading, error) in `data-cai-label-*` attributes on the dialog. There is no English fallback in the module (EXCEPTIONS.md EX-005).
- It makes obsolete a site's own search box script, and the "search" link that only opened an index.

**The index: a public format (version 1)**

```json
{ "version": 1,
  "pages": [["Button", "components/button/", "Components"]],
  "sections": [["When to use, Button › Design", "components/button/#when"]],
  "elements": [["<table> element, Tables", "html/tables/#el-table"]] }
```

Each item is `[text, url, meta?, lang?]`, URLs relative to the JSON file. Security behavior, part of the contract: the JSON is fetched only from the page's own origin, over http or https, with redirects refused (a CSP needs `connect-src 'self'`); only `http:` and `https:` links are kept; every text is written as text, never as HTML; `lang` is used only when it is a language tag; limits of 1,000,000 characters of JSON, 10,000 results, 300 characters a text and 8 words a search; unknown fields are ignored, and an index that is not version 1 shows the error text. Any later relaxation of these rules will be a versioned change.

**Known issues**

- The search has not been tested with a screen reader.
- Ctrl+K replaces the browser's web search shortcut on pages that load the search.
- At 400 % zoom (256 pixels of height) the whole dialog scrolls, so the field can scroll out of view while you read the results.
