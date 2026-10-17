# Class reference

Every tag and class of the site components, what element it goes on and what it does, in one place.

Look up a tag or a class by name. Each component's own page has its markup and guidance. The page structure that site held before, from the shell to the footer, is in core ([layout](https://nandovejer.github.io/luz/docs/components/layout/), [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/), [image](https://nandovejer.github.io/luz/docs/components/image/), [band](https://nandovejer.github.io/luz/docs/components/band/)) and in the packages for one kind of site ([landing](https://nandovejer.github.io/luz/docs/landing/), [CMS](https://nandovejer.github.io/luz/docs/cms/)).

### Search

- <luz-search>: <luz-search>: The element `search.min.js` defines. It holds the fallback link, the trigger and the dialog; the link and the trigger share one place, so nothing moves when the trigger takes over.
- .luz-search__fallback: <a>: The link to an index of every page, shown until the search works. A control high, with the magnifier before its words.
- .luz-search__fallback-label: <span>: The link’s words, also its name. Clipped, not removed, next to a compact trigger at 768 pixels and below.
- .luz-search__trigger: <button>: The search button, shaped like a field: label, then the shortcut. Hidden in the markup, in its place; the script shows it.
- .luz-search__trigger--compact: <button>: Modifier. At 768 pixels and below, the magnifier only, and the link next to it too; the words stay their names.
- .luz-search__trigger-icon: <svg>: The magnifier, in the text color, in the trigger and the link.
- .luz-search__trigger-label: <span>: The visible label, which is also the button’s name.
- .luz-search__trigger-key: <kbd aria-hidden="true">: The shortcut hint, "Ctrl K". Hidden on touch screens and from assistive technology, which reads `aria-keyshortcuts`.
- .luz-search: <dialog>: With `.luz-modal`: the search dialog, a column whose results scroll; full screen at 768 pixels and below.
- .luz-search__body: <search>: The field, the status and the results.
- .luz-search__head: <div>: The title and the close button, in one row that wraps.
- .luz-search__title: <h2>: The dialog’s name; its label names the field.
- .luz-search__field: <div>: The field, with a decorative magnifier `svg` at its start.
- .luz-search__status: <p>: The count of results, `role="status"`, small and muted.
- .luz-search__close: <button>: The close button, 44 pixels high, in a `form method="dialog"`.
- .luz-search__results: <div>: The result groups: a heading and a list of links each.
- .luz-search__foot: <p>: The last line, with the link to the index page.

### Language switch

- <luz-lang-switch>: a tag: The block: holds the button and the list, with no class and no role of its own. Sets `--luz-lang-switch-top`, how far down the list opens (core’s `--luz-bar-h` by default).
- .luz-lang-switch__button: <button>: Opens the list with `popovertarget`. Shows the current language; its name starts with the label, hidden.
- .luz-lang-switch__icon: <svg>: The globe, decorative, in the text color.
- .luz-lang-switch__name: <span>: The current language’s name in the button. Clipped below 360 pixels, where the globe shows alone; it stays in the button’s name.
- .luz-lang-switch__menu: <nav>: The popover with the list, fixed under the header at the end of the row.
- .luz-lang-switch__title: <p>: The visible name of the list, which labels the nav.
- .luz-lang-switch__list: <ul>: The languages, one per row, without bullets.
- .luz-lang-switch__link: <a>: A language, named in itself, with `lang` and `hreflang`; bold and underlined with `aria-current`.

### Submenu

- <luz-submenu>: around a <details>: A tag, no class: an item of a header’s links that holds more links. The `<summary>` is the button, the `<ul>` after it the links. No script.

### Banner and cookie consent

- <luz-banner>: around a <section>: A tag, no class: a band above the header with one short announcement and one link, its text in the header’s column. No script, no close button.
- tone="warning": <luz-banner>: The warning colours, for something that stops the visitor; the words say it too.
- .luz-consent: <section hidden>: The cookie banner, in a `<luz-consent>` before the header, shown as a band fixed at the bottom of the window. Hidden in the markup: `consent.min.js` shows it when no answer is stored.
- .luz-consent__title: <h2>: The banner’s heading, in the sans; it names the region.
- .luz-consent__choices: <details>: The categories of optional cookies, as checkboxes in a form, under Accept and Reject.
