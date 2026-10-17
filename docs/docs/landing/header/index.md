# Header

Starts every page of a landing site with its name, its main links and a few controls, in one row that stays at the top.

### Known issues
The header's own issues are those of the pieces of core it is made of.

- **The menu panel.** If you keep pressing Tab after the last link of the open menu, focus moves on into the page and the menu stays open over it; Escape closes it. Without CSS anchor positioning the panel and the language list open at the height of a one-row header from the top of the window, so with enlarged text they can cover part of the header. See the [navbar's known issues](https://nandovejer.github.io/luz/docs/components/navbar/#known-issues).
- **Sticky header and enlarged text.** The scroll padding of `.o-sticky` is a minimum: at 300% text, with the header wrapped to several rows, Safari can leave a field reached with Tab under it. Set `scroll-padding-block-start` on `html` to your header's real height, or leave out `.o-sticky`.

### Copy the markup
Header markup
```html
<header class="luz-landing-header o-sticky">
  <div class="o-container o-container--inline o-row">
    <button class="luz-nav-toggle" type="button" popovertarget="site-nav" aria-label="Menu">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
    </button>
    <a class="luz-landing-header__brand" href="/">Acme Summit</a>
    <nav class="luz-navbar" id="site-nav" aria-label="Main" popover>
      <ul class="luz-navbar__list">
        <li><a class="luz-navbar__link" href="/programme/" aria-current="page">Programme</a></li>
        <li><a class="luz-navbar__link" href="/speakers/">Speakers</a></li>
        <li><a class="luz-navbar__link" href="/tickets/">Tickets</a></li>
      </ul>
    </nav>
    <div class="o-row luz-landing-header__actions">
      <a class="luz-btn luz-btn--ghost" href="/account/">Log in</a>
    </div>
  </div>
</header>
```

### Variants and options
There are no modifiers. The header is a class of the landing on a native `<header>`, laid out by core's objects in the markup.

- `.luz-landing-header`: On `<header>`: the page surface, a rule underneath, the gaps of its row, and the anchor its panels open under
- `.luz-landing-header__brand`: The site's name as a link to the home page: semibold, not underlined, at least 44 px tall; it takes the free room of the row
- `.luz-landing-header__actions`: On a `.o-row` at the end of the row: a search, a [language switch](https://nandovejer.github.io/luz/docs/site/lang-switch/), a button
- `.o-sticky` (core): Keeps the header at the top while the page scrolls, in a window at least 30 rem tall; see [the page and its bars](https://nandovejer.github.io/luz/docs/components/layout/#objects-page)
- `.o-container.o-container--inline.o-row` (core): The row: the width and gutters of the page, wrapping rather than overflowing
- `.luz-nav-toggle`, `.luz-navbar` (core): The menu button and the links: see the [navbar](https://nandovejer.github.io/luz/docs/components/navbar/)

### How it works
CSS from `@luz-ds/landing` on core's objects and navbar. No JavaScript, and `@luz-ds/site` is optional.

- The landing adds the skin only: the page surface, the rule underneath, the brand, and the gaps of the row (8 px between rows, 16 px between items, 24 px from 769 px). Core gives the rest: `.o-sticky` the stickiness and the scroll padding, `.o-container--inline` the gutters, `.o-row` the wrapping row, and the navbar the links and their panel.
- A one-row header is core's `--luz-bar-h` tall: 44 px controls, 4 px above and below, and the 1 px rule. With enlarged text the row wraps and the header grows.
- The header names itself the anchor `--luz-bar`, scoped to itself. Where the browser supports CSS anchor positioning, the navbar's panel and the list of site's `<luz-lang-switch>` open under it on one row or on two. Elsewhere they open at `--luz-bar-h` from the top of the window.
- Without `@luz-ds/site` nothing changes: its rules that refine site's elements match nothing.

### Without JavaScript
Nothing changes: the menu is a popover opened by the button's `popovertarget`, with no script, and the links are plain links.

### Keyboard and ARIA
- **Order:** the menu button, the brand, the links, then the actions, in the order of the source. With the menu open, the next Tab after the button goes into the panel's links.
- **Keys:** Enter or Space on the button opens and closes the panel; Escape closes it and returns focus to the button.
- **Names:** the `<nav>` has an `aria-label` ("Main"). The button's name is "Menu"; the browser exposes its expanded state. The current link has `aria-current="page"` and an underline.
- **Landmarks:** a `<header>` that is a direct child of `<body>` is the banner. Put the [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/) before it.

### When to use
Use the header at the top of every page of a landing site: the visitor sees which site this is and reaches its main parts from any page.

### When not to use
Do not use it on a blog or a newspaper, or in an app: their packages have headers of their own.

- One header per page, never inside a component: it is the page's banner.
- A single page that fits one screen needs a heading and a skip link, not a header.
