---
"@cai-ds/tokens": patch
"@cai-ds/core": patch
"@cai-ds/platform": patch
---

Safari and Firefox review of the Vejer look and `<cai-platform-search>`:

- **tokens:** the four ET Book faces no longer draw `‹` and `›` (the font maps U+2039 and U+203A to the glyphs "ffi" and "ffl"): `unicode-range` leaves them to the next family of the stack. The woff2 files are saved again with correct glyph bounding boxes, which silences the 270 "Glyph bbox was incorrect" console warnings Firefox printed on every page.
- **core:** the date, time and select pickers take `color-scheme: dark` in a custom theme's dark mode (`data-mode="dark"`) and in the no-JavaScript dark route, not only under `data-theme="dark"`. `.cai-toggle` and `.cai-output` use the sans stack, as the other form controls do. `initThemeSystem()` no longer follows `prefers-color-scheme` changes while the page is open: the page is light unless it says otherwise, as the themes page already states.
- **platform:** `<cai-platform-search>` is `display: contents`, so it no longer takes a cell of a grid or flex container. The dialog's arrow keys, Home and End are ignored during IME composition. A trigger of a dialog that was removed from the page does nothing instead of throwing.
