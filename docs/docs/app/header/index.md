# Header

The quiet bar at the top of an application's main area: the menu button, the product name on a phone, the search and the account.

### Known issues
The header's own issues are those of the pieces of core it is made of.

- **The account list without anchor positioning.** In browsers without CSS anchor positioning, the list opens as a sheet at the bottom of the window instead of under the button. Escape, or a click outside it, closes it.
- **Sticky bar and enlarged text.** The scroll padding of `.o-sticky` is a minimum: at 300% text, with the bar wrapped to several rows, Safari can leave a field reached with Tab under it. Set `scroll-padding-block-start` on `html` to your header's real height, or leave out `.o-sticky`.

### Copy the markup
The bar, in `.o-main` beside the sidebar, with site's search before the account:

App header markup
```html
<div class="o-shell">
  <nav class="luz-sidebar" id="app-nav" aria-label="Main" popover>…</nav>
  <div class="o-main">
    <header class="luz-app-header o-sticky">
      <div class="o-row">
        <button class="luz-nav-toggle" type="button" popovertarget="app-nav" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
        </button>
        <p class="luz-app-header__product">Bodega</p>
        <div class="o-row luz-app-header__actions">
          <luz-search>…</luz-search>
          <div class="luz-dropdown">
            <button class="luz-btn luz-btn--ghost luz-app-header__account" type="button" popovertarget="account-menu"><span class="luz-avatar luz-avatar--sm">AM</span> <span class="luz-app-header__account-name">Ana Martín</span></button>
            <div class="luz-dropdown__menu" id="account-menu" popover>
              <ul class="luz-dropdown__list">
                <li><a class="luz-dropdown__item" href="/account/">Account settings</a></li>
                <li><a class="luz-dropdown__item" href="/logout/">Sign out</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main class="luz-app-dashboard" id="main-content" tabindex="-1">…</main>
  </div>
</div>
```

### Variants and options
No modifier. The header is a class of app on a native `<header>`, laid out by core's objects in the markup.

- `.luz-app-header`: On `<header>`, a child of `.o-main`: the page surface and a rule underneath. It is one row of `--luz-bar-h`; its `.o-row` has the gutters of the content
- `.luz-app-header__product`: The product's name in medium text, semibold. It shows only at 768 px and below, where the sidebar is a drawer and its brand is out of sight
- `.luz-app-header__actions`: On a `.o-row`: the global tools at the inline end of the bar. Site's [search](https://nandovejer.github.io/luz/docs/site/search/), then the account
- `.luz-app-header__account`: On the `.luz-btn.luz-btn--ghost` that opens the account list: at least 44 by 44 px, with its initials in a `.luz-avatar` and then the name
- `.luz-app-header__account-name`: The account's name. At 640 px and below it is clipped to nothing, and stays in the button's name
- `.o-sticky` (core): Keeps the bar at the top while the page scrolls, in a window at least 30 rem tall; see [the page and its bars](https://nandovejer.github.io/luz/docs/components/layout/#objects-page)
- `.luz-dropdown` (core): The account list, a disclosure of links: see the [dropdown](https://nandovejer.github.io/luz/docs/components/dropdown/)

### How it works
CSS from `@luz-ds/app` on core's shell, sticky bar, drawer and dropdown. No JavaScript, and `@luz-ds/site` is optional.

- App adds the skin only: the page surface, the rule underneath and the gaps of the row (8 px between rows, 16 px between items). Core gives the rest: `.o-sticky` the stickiness and the scroll padding, `.o-row` the row, the nav toggle and the sidebar the drawer, and the dropdown the account list.
- A one-row bar is core's `--luz-bar-h` tall: 44 px controls, 4 px above and below, and the 1 px rule. With enlarged text the row wraps and the bar grows.
- The page is what scrolls, not `.o-main`, so the sticky bar stays at the window's top. If you give `.o-main` a height of its own and make it scroll, what it focuses stays clear of the bar through its scroll padding.
- The account list opens under its button and ends where the button ends, so it never leaves the window at the inline end of the bar.
- Without site there is no search: leave `<luz-search>` out. Nothing else changes.
- The view's `h1` and its main action are not here: they are the first row of the [dashboard](https://nandovejer.github.io/luz/docs/app/dashboard/). The bar holds only what is the same in every view.

### Without JavaScript
Nothing changes.

The drawer and the account list are popovers opened by the button's `popovertarget`, with no script, and site's search shows its link to the A–Z index. In a browser without the popover API the sidebar stays in the page above the content, the menu button is not shown, and the account list stays under its button.

### Keyboard and ARIA
- **Order:** the order of the source and of the screen. Skip link, the sidebar (a column from 769 px), the search, the account, then the view. At 768 px and below the closed drawer is out of the order: skip link, menu button, search, account, then the view.
- **Keys:** Enter or Space on the menu button opens the drawer, and on the account button opens the list; Tab reaches each link in order; Escape closes it and returns focus to the button.
- **Names:** the menu button is named "Menu" (`aria-label`, translated like the rest of the page). The account button's name is its initials, then the name: "AM Ana Martín", so a person who says "click AM" finds it at any width. The browser exposes the buttons' expanded state.
- **Not a menu:** the account list is a list of links in a popover. It has no `role="menu"`, no `aria-haspopup` and no arrow keys.
- **Landmarks:** a `<header>` in `.o-main`, which is a `<div>`, is the page's banner, beside the `<main>`, never inside it. The sidebar is the one navigation, named "Main". Put the [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/) first: it skips the sidebar and the bar.

### When to use
Use the header at the top of the main area of every view of an application: the person always finds the search and their account in the same place.

- One quiet row of global tools: the menu button, the search and the account.
- The product's name on a phone, where the sidebar's brand is behind the drawer.

### When not to use
Do not use it for the title of the view or for its actions: they go in the first row of the dashboard.

- One header per page, in `.o-main`: it is the page's banner.
- Do not put a primary button in the bar: the view's main action would be lost among the chrome.
- For a bar with the site's own sections, use the [navbar](https://nandovejer.github.io/luz/docs/components/navbar/) in the header of [landing](https://nandovejer.github.io/luz/docs/landing/header/) or [CMS](https://nandovejer.github.io/luz/docs/cms/header/).
