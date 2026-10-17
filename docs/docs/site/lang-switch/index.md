# Language switch

Lets readers go to the same page in another language, from a button in the header.

### Known issues
The list opens at a fixed place under the header, not under its button: placing it next to the button needs CSS anchor positioning, which is not yet available in every browser. Below 360 px wide the button shows the globe only, to keep the header on one row; the language’s name is still its accessible name, so a sighted reader has to recognise the globe.

It has not been tested with a screen reader yet.

### Copy the markup
One link per language, to the same page in that language, in the header of every translated page. On each page mark its own language with `aria-current="page"` and write the label in the page’s language.

Language switch markup
```html
<luz-lang-switch>
  <button class="luz-lang-switch__button" type="button" popovertarget="lang-menu">
    <span class="u-sr-only">Language: </span><span class="luz-lang-switch__name">English</span>
  </button>
  <nav class="luz-lang-switch__menu" id="lang-menu" popover aria-labelledby="lang-title">
    <p class="luz-lang-switch__title" id="lang-title">Language</p>
    <ul class="luz-lang-switch__list">
      <li><a class="luz-lang-switch__link" href="/" hreflang="en" lang="en" aria-current="page">English</a></li>
      <li><a class="luz-lang-switch__link" href="/es/" hreflang="es" lang="es">Español</a></li>
      <li><a class="luz-lang-switch__link" href="/ar/" hreflang="ar" lang="ar">العربية</a></li>
    </ul>
  </nav>
</luz-lang-switch>
```

### Variants and options
There are no variants. One custom property places the list.

- `<luz-lang-switch>`: The block: holds the button and the list. A tag that no script defines, with no class and no role of its own
- `.luz-lang-switch__button`: A 44 px button with the current language’s name; filled while the list is open
- `.luz-lang-switch__icon`: An optional globe before the name, drawn in the text colour. Decorative: `aria-hidden="true"`
- `.luz-lang-switch__name`: The current language’s name. Below 360 px it is clipped and the globe shows alone; it stays in the button’s name
- `.luz-lang-switch__menu`: The popover: fixed under the header, at the end of the row (the left edge in right-to-left text)
- `.luz-lang-switch__title`: The visible name of the list
- `.luz-lang-switch__list`: The list of languages, without bullets
- `.luz-lang-switch__link`: One 44 px row per language. With `aria-current`: bold and underlined
- `--luz-lang-switch-top`: How far from the top of the screen the list opens. Defaults to `--luz-bar-h`, the height of a one-row bar of 44 px controls; set it on the tag if your header is taller.

### How it works
Changing language is going to another page, so the switch is a list of links. The button opens it with the native `popovertarget`, and `@luz-ds/site` only styles it: there is no script.

`<luz-lang-switch>` is a tag that no script ever defines; it only gives the block a name in the markup and in CSS, and adds no role: the button and the `nav` carry the meaning.

- Each language is named in that language, with `lang` so a screen reader pronounces it, and `hreflang` so the link says where it goes.
- The list is a popover in the top layer, fixed under the header at the inline end; it mirrors in right-to-left text.
- The page itself declares its language and direction: `<html lang="ar" dir="rtl">`. Add a `<link rel="alternate" hreflang="…">` per language in the `<head>`, so search engines find the others.
- Core switches Arabic text to the system sans and removes letter spacing from it: the serif has no Arabic letters, and spacing breaks the joins of the script.

### Without JavaScript
Nothing changes: the button opens the list with the popover API, and the links are links. In a browser without the popover API the button is hidden and the links show in a row.

### Keyboard and ARIA
Tab to the button and press Enter or Space to open the list; Tab moves through the languages and Enter follows one. Escape, or a click outside, closes the list.

- The browser tells assistive technology whether the list is open, from `popovertarget`.
- The button’s name is “Language: English”: what it is, then the visible text (WCAG 2.5.3). Below 360 px only the globe shows, and the name is the same.
- The current language is a link with `aria-current="page"`.

### When to use
Use it on a site whose pages exist in two languages or more, in the header of every translated page, at the same place on each.

### When not to use
Do not add it to pages that exist in one language only, even if the rest of the site is translated.

- Do not choose the language for the reader from the browser’s settings or their location: let them choose, and link each page to the others.
- Do not use it to translate the page in place with a script: each language is a page of its own, with its own address.

It replaces nothing in LUZ. It makes a `<select>` with a script that changes the address unnecessary.
