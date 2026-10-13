---
"@cai-ds/site": minor
---

New language switcher in `@cai-ds/platform`: a button in the header opens a native popover with one link per language, so a reader goes to the same page in another language. CSS only: no script, no new export.

**New (`@cai-ds/platform`)**

- `.cai-platform-lang-switcher` (the wrapper), `__button` (shows the current language; its name is "Language: English", the label hidden, the visible text inside it), `__name` (the current language's name; below 360px it is clipped and the globe shows alone, the name staying in the accessible name), `__icon` (an optional decorative globe), `__menu` (the `<nav popover>`, fixed under the header at the inline end, so it mirrors in right-to-left text), `__title` (the visible name of the list), `__list` and `__link` (one 44 px row per language; with `aria-current` it is bold and underlined).
- `--cai-platform-lang-switcher-top`, set on the wrapper: how far from the top of the screen the list opens (by default under a one-row header of 44 px controls).
- Each language is named in itself, with `lang` and `hreflang`; never a flag. In a browser without the popover API the button is hidden and the links show in a row.
- It replaces nothing in CAI; it makes a `<select>` with a script that changes the address unnecessary.
- `.cai-platform-page--gradient` now puts its tint in the top right corner in right-to-left text, and `.cai-platform-page-header__title` has no letter spacing in Arabic (it breaks the joins of the script).

The CAI home page uses it: English at `/`, Spanish at `/es/`, Arabic at `/ar/`, each a static page with its own `lang`, `dir`, title, description and `<link rel="alternate" hreflang>`. The documentation stays in English.

**Known issues**

- The list opens at a fixed place under the header, not next to its button (that needs CSS anchor positioning, not yet in every browser).
- Below 360px the button shows the globe only.
- It has not been tested with a screen reader.
