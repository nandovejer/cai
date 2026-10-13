---
"@cai-ds/site": patch
---

The search dialog (`<cai-platform-search>`) is easier to scan, after a UX and accessibility review.

- Its body is set in `--cai-font-sans`, like the rest of the controls and navigation; the title stays in `--cai-font-heading`. The help text no longer falls back to the serif.
- The field has a decorative magnifier at its inline start: wrap the input in `div.cai-platform-search__field` with the `svg` (`aria-hidden="true"`), as the docs partial does.
- Each result is a title `span`, a `span` with `", "` (hidden on screen by `search.css`) and a category `span`. Only the title is underlined, so the category no longer reads as a second link, and the accessible name is "Button, Components".
- The result count is set in `--cai-text-sm` and `--cai-text-secondary`, below the group headings.
- The help text is shorter and stays visible: "Results update as you type. Arrow keys move through them."

`platform.min.js` includes the search again: the build ignored `src/search.js` as free of side effects and shipped an entry that never defined `<cai-platform-search>`. `search.js` is rewritten more compactly, with the same behaviour, so the bundle stays under its 2 kB budget.
