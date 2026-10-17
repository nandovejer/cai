# Sidebar

Holds the main navigation of a site or an app, and becomes a drawer on small screens.

### Known issues
In a browser without the popover API the navigation does not become a drawer: it stays visible above the content on small screens.

### Copy the markup
Sidebar with its drawer button markup
```html
<header>
  <button class="luz-nav-toggle" type="button" popovertarget="site-nav" aria-label="Menu">
    <span class="luz-nav-toggle__bar"></span>
    <span class="luz-nav-toggle__bar"></span>
    <span class="luz-nav-toggle__bar"></span>
  </button>
</header>

<nav class="luz-sidebar" id="site-nav" popover aria-label="Main">
  <div class="luz-sidebar__section">
    <div class="luz-sidebar__section-label">Account</div>
    <a class="luz-sidebar__link is-active" href="/profile/" aria-current="page">Profile</a>
    <a class="luz-sidebar__link" href="/billing/">Billing</a>
  </div>
</nav>
```

Sidebar script code
```js
import { initSidebar } from "@luz-ds/core/sidebar";
initSidebar();
```

### Variants and options
- `.luz-sidebar`: The navigation column, in the sidebar colours
- `popover` on `.luz-sidebar`: Makes it a drawer at 768 px and below
- `.luz-sidebar__brand`, `__brand-name`, `__logo`, `__version`: An optional brand block at the top
- `.luz-sidebar__section`, `__section-label`: A group of links and its label
- `.luz-sidebar__link`: A link
- `data-luz-spy` on any element: Not part of the sidebar: the scroll spy also marks the links to sections of the page inside it, such as a table of contents styled your own way
- `.is-active` on a link: Marks the current link with weight and colour; pair it with `aria-current="page"`
- `.luz-sidebar__footer`: Pinned to the bottom, for example for the [color mode switcher](https://nandovejer.github.io/luz/docs/components/mode-switcher/)
- `.luz-nav-toggle`: The menu button, shown at 768 px and below; put it first in your header row
- `.luz-nav-toggle--fixed`: Pins the menu button to the top start corner, for a page with no header

### How it works
A `<nav>` landmark, styled by `components/sidebar.css`. On small screens it is a native popover drawer.

- The menu button opens it with `popovertarget`, with no script. The browser gives Escape, a click outside to close, the top layer and the expanded state.
- `initSidebar()` from `sidebar.js` is optional: it marks the link of the section in view on a long page (`aria-current="true"`) and closes the drawer when a link is followed. `luz.js` runs it.
- The scroll spy finds its links by `.luz-sidebar__link`, and by `data-luz-spy`: on any element (a `<nav>` of contents), it spies every link inside that points at a section of the page (`href="#…"`). The attribute is the hook; the look of those links is yours.

### Without JavaScript
The sidebar and the drawer work. The current link is the one your markup marks; it does not follow the scroll.

### Keyboard and ARIA
Tab moves through the links in order. On small screens, the menu button opens the drawer; Escape or a click outside closes it, and focus goes back to the button.

- Name the `<nav>` with `aria-label` when the page has more than one.
- Mark the current page with `aria-current="page"` as well as `.is-active`: the class is only the look.
- The menu button keeps the name "Menu" whether the drawer is open or closed; the popover exposes the state.

### When to use
Use a sidebar for the main navigation of an app or a documentation site with many sections.

### When not to use
Do not use a sidebar for a site with a few pages: a header navigation is simpler.

- For the trail to the current page, use a [breadcrumb](https://nandovejer.github.io/luz/docs/components/breadcrumb/).
- For panels of one page, use [tabs](https://nandovejer.github.io/luz/docs/components/tabs/).
