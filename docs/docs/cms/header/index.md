# Header

Starts every page of a blog or a newspaper with the publication's name, its sections and a search: one row that stays at the top, or a masthead of three rows.

### Known issues
The header's own issues are those of the pieces of core it is made of, and one of the masthead.

- **The masthead's menu without anchor positioning.** In browsers without CSS anchor positioning, the sections menu of the masthead header opens near the top of the window and covers the publication name and the menu button while it is open. Escape, or a click outside the menu, closes it and returns to the page.
- **The menu panel.** If you keep pressing Tab after the last link of the open menu, focus moves on into the page and the menu stays open over it; Escape closes it. See the [navbar's known issues](https://nandovejer.github.io/luz/docs/components/navbar/#known-issues).
- **Sticky bar and enlarged text.** The scroll padding of `.o-sticky` is a minimum: at 300% text, with the bar wrapped to several rows, Safari can leave a field reached with Tab under it. Set `scroll-padding-block-start` on `html` to your header's real height, or leave out `.o-sticky`.

### Copy the markup
The blog bar, with site's search and language switch in its actions:

Blog bar markup
```html
<header class="luz-cms-header o-sticky">
  <div class="o-container o-container--inline o-row">
    <button class="luz-nav-toggle" type="button" popovertarget="cms-nav" aria-label="Sections">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z"/></svg>
    </button>
    <a class="luz-cms-header__brand" href="/">The Vejer Review</a>
    <nav class="luz-navbar" id="cms-nav" aria-label="Sections" popover>
      <ul class="luz-navbar__list">
        <li><a class="luz-navbar__link" href="/news/" aria-current="true">News</a></li>
        <li><a class="luz-navbar__link" href="/culture/">Culture</a></li>
        <li><a class="luz-navbar__link" href="/opinion/">Opinion</a></li>
      </ul>
    </nav>
    <div class="o-row luz-cms-header__actions">
      <luz-search>…</luz-search>
      <luz-lang-switch>…</luz-lang-switch>
    </div>
  </div>
</header>
```

The masthead:

Masthead markup
```html
<header class="luz-cms-header luz-cms-header--masthead">
  <div class="o-container o-container--inline o-stack">
    <div class="o-row luz-cms-header__top">
      <p class="luz-cms-header__date"><time datetime="2026-10-14">Wednesday, 14 October 2026</time></p>
      <div class="o-row luz-cms-header__actions">
        <luz-search>…</luz-search>
      </div>
    </div>
    <a class="luz-cms-header__brand" href="/">The Vejer Review</a>
    <div class="o-row luz-cms-header__sections">
      <button class="luz-nav-toggle" type="button" popovertarget="cms-nav" aria-label="Sections">…</button>
      <nav class="luz-navbar" id="cms-nav" aria-label="Sections" popover>…</nav>
    </div>
  </div>
</header>
```

### Variants and options
One modifier. The header is a class of cms on a native `<header>`, laid out by core's objects in the markup.

- `.luz-cms-header`: On `<header>`: the blog bar. The page surface, a rule underneath, the gaps of its row, and the anchor its panels open under
- `.luz-cms-header--masthead`: The newspaper's masthead: three rows in an `.o-stack`, 16 px above and below, not sticky
- `.luz-cms-header__brand`: The publication's name as a link to the home page, in the heading font, semibold, underlined on hover only. In the bar it takes the free room of the row; in the masthead it is large and centred. A logo `<img>` inside it is 44 px tall in the bar, 88 px in the masthead
- `.luz-cms-header__actions`: On a `.o-row`: site's [search](https://nandovejer.github.io/luz/docs/site/search/), then its [language switch](https://nandovejer.github.io/luz/docs/site/lang-switch/)
- `.luz-cms-header__top`: Masthead only, on a `.o-row`: the date at the start and the actions at the end, on one row
- `.luz-cms-header__date`: Masthead only: today's date in a `<time datetime>`, small and secondary; it wraps to give the actions their room
- `.luz-cms-header__sections`: Masthead only, on a `.o-row`: the menu button and the navbar between two rules, centred from 769 px; its panel opens under this row
- `.o-sticky` (core): Keeps the blog bar at the top while the page scrolls, in a window at least 30 rem tall; see [the page and its bars](https://nandovejer.github.io/luz/docs/components/layout/#objects-page). Never on the masthead
- `.o-container.o-container--inline` (core): The width and gutters of the page, so the header starts where the content starts
- `.luz-nav-toggle`, `.luz-navbar` (core): The menu button and the sections: see the [navbar](https://nandovejer.github.io/luz/docs/components/navbar/)

### How it works
CSS from `@luz-ds/cms` on core's objects and navbar. No JavaScript, and `@luz-ds/site` is optional.

- cms adds the skin only: the page surface, the rule underneath, the brand, and the gaps of the row (8 px between rows, 16 px between items, 24 px from 769 px). Core gives the rest: `.o-sticky` the stickiness and the scroll padding, `.o-container--inline` the gutters, `.o-row` and `.o-stack` the rows, and the navbar the links and their panel.
- A one-row bar is core's `--luz-bar-h` tall: 44 px controls, 4 px above and below, and the 1 px rule. At 768 px and below the brand fills the room between the menu button and the actions and wraps there, so the controls stay on one row; with enlarged text the row wraps and the bar grows.
- The masthead is not sticky: three rows stuck to the top would take a third of a phone's screen. Its brand is 49 px from 1024 px, 39 px below and 31 px at 640 px and below (`--luz-text-4xl`, `-3xl` and `-2xl`, the steps of the landing hero).
- The bar, and in the masthead the sections row, name themselves the anchor `--luz-bar`, scoped to themselves. Where the browser supports CSS anchor positioning, the navbar's panel opens under them. Elsewhere it opens at `--luz-bar-h` from the top of the window (see Known issues).
- With `@luz-ds/site`, the list of its `<luz-lang-switch>` opens under the bar. Without it nothing changes: the rules that refine site's elements match nothing.
- The [table of contents](https://nandovejer.github.io/luz/docs/cms/toc/) of an article sticks under a bar with `.o-sticky`.

### Without JavaScript
Nothing changes: the menu is a popover opened by the button's `popovertarget`, with no script, the links are plain links, and site's search shows its link to the A–Z index.

### Keyboard and ARIA
- **Order:** the order of the source. In the bar: the menu button, the brand, the sections, then the actions. In the masthead: the actions of the top row, the brand, then the menu button and the sections.
- **Keys:** Enter or Space on the menu button opens and closes the panel; Escape closes it and returns focus to the button. The panel is not modal: Tab after its last link moves on.
- **Names:** the `<nav>` and the menu button are both named "Sections"; the browser exposes the button's expanded state. The section of an article has `aria-current="true"`, the section's own index `aria-current="page"`; both are underlined.
- **Brand:** a link, never a heading: the story's title is the page's one `h1`. A logo is an `<img>` whose `alt` is the publication's name, with no text beside it.
- **Landmarks:** a `<header>` that is a direct child of `<body>` is the banner. Put the [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/) before it.

### When to use
Use the header at the top of every page of a blog or a newspaper: a reader who lands on a story from a search sees which publication it is and reaches its sections and its search.

- The blog bar for most sites: one row that stays at the top while the reader reads.
- The masthead for a newspaper's front page and sections, where the name and the date set the tone.

### When not to use
Do not use it on a landing page or in an app: their packages have headers of their own.

- One header per page, never inside a component or an article: it is the page's banner.
- Do not make the masthead sticky, and do not put the date in the bar: in one row it competes with the name.
