# Navbar

Puts the main links of a site in a header's row, and in a panel under it on a narrow screen.

### Known issues
If you keep pressing Tab after the last link of the open menu, focus moves on into the page and the menu stays open over it, hiding what is behind. Escape closes it. This meets WCAG 2.4.11 (AA) and does not meet 2.4.12 (AAA).

- **Browsers without anchor positioning.** Where CSS anchor positioning is supported (Chrome and Edge 125, Safari 26, Firefox 147) the panel opens under the bar wherever it ends, even with a notice or the cookie banner above it. Elsewhere it opens at `--luz-bar-h` from the top of the window: with enlarged text and a bar that wraps to a second row, or with a band above the bar before the page scrolls, it can cover part of the bar. Escape or a click outside closes it.
- **Forced colors in Firefox.** The dim layer behind the open menu is not drawn, so the page is not dimmed. The panel keeps its border, so it is still set apart.
- **Breakpoints in Safari on a Mac.** With always-visible scrollbars, Safari does not count the scrollbar in width media queries (WebKit bug 52653), so the menu collapses, or the links return to the row, when the window is up to about 15 px wider than 768 px.

### Copy the markup
The navbar goes in a bar's row, after core's menu button and the site's name. The bar is yours, or the header of a package for one kind of site, which also sets the anchor the panel opens under.

Navbar markup
```html
<header class="o-sticky">
  <div class="o-container o-container--inline o-row">
    <button class="luz-nav-toggle" type="button" popovertarget="site-nav" aria-label="Menu">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
    </button>
    <a href="/">Acme</a>
    <nav class="luz-navbar" id="site-nav" aria-label="Main" popover>
      <ul class="luz-navbar__list">
        <li><a class="luz-navbar__link" href="/products/" aria-current="page">Products</a></li>
        <li><a class="luz-navbar__link" href="/pricing/">Pricing</a></li>
        <li><a class="luz-navbar__link" href="/support/">Support</a></li>
      </ul>
    </nav>
  </div>
</header>
```

### Variants and options
- `.luz-navbar`: On the `<nav popover>`: a row of the bar from 769 px; a panel under the bar, the width of the window, at 768 px and below
- `.luz-navbar__list`: The `<ul>`: a row that wraps, with no markers; a column in the open panel
- `.luz-navbar__link`: Each link, at least 44 px tall; with `aria-current`, the primary text colour and a 2 px underline
- `anchor-name: --luz-bar`: Set on the bar, with `anchor-scope: --luz-bar`, by the header of a kind of site or by you: the panel opens under it. Without it, the panel opens at `--luz-bar-h` from the top of the window

### How it works
A native `popover` on the `<nav>`, opened by core's `.luz-nav-toggle` with `popovertarget`. No JavaScript: the browser gives Escape, light dismiss, the place of the open panel in the Tab order and the expanded state of the button.

- From 769 px the closed popover is shown as a row of the bar, and the menu button is hidden.
- At 768 px and below the panel is fixed under the bar, the width of the window, with a shadow, and a dim layer that starts under the bar so the bar is never dimmed.
- A panel left open when the window grows stays under the bar until it is closed.
- Without the popover API the links stay in the row and wrap, and the menu button stays hidden.
- The submenu of site ([Submenu](https://nandovejer.github.io/luz/docs/site/submenu/)) can go in a list item.

### Without JavaScript
Nothing changes: the navbar is HTML, a native popover and CSS.

### Keyboard and ARIA
Every link is reached with Tab in the order of the page.

- Narrow and closed, the links are not in the Tab order. Enter or Space on the menu button opens the panel, and the next Tab reaches its first link.
- Escape, or a click outside, closes the panel and puts focus back on the button. The button says whether it is expanded.
- Give the `<nav>` a name that no other navigation of the page has, such as "Main".
- Mark the current page with `aria-current="page"`, or `"true"` for the section a page belongs to.

### When to use
Use the navbar for the few main links of a site, in the header every page shares.

### When not to use
Do not use it for an app with many sections, or for links in the page.

- For many sections, or a hierarchy, use the [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/).
- For the place of a page in a hierarchy, use a [breadcrumb](https://nandovejer.github.io/luz/docs/components/breadcrumb/).
- For the sections of one page, use [tabs](https://nandovejer.github.io/luz/docs/components/tabs/) or a list of in-page links.
