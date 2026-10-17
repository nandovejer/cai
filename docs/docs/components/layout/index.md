# Layout objects

Lay out blocks in a stack, a row, a grid or beside an image, a group of actions, and the page itself with its sticky bar, with the o-* classes.

### Examples

`.o-shell`, `.o-main` and `.o-container` are page-level: [this page uses them](https://nandovejer.github.io/luz/docs/components/layout/#page-nav).

### Pick an object

Objects only lay things out: no colour, no type. Spacing comes from the space tokens.

- `.o-stack`: A column, 12 px between items
- `.o-row`: A row that wraps, items centred vertically, 12 px between them
- `.o-grid`: A grid with 16 px gaps; set the columns with your own `grid-template-columns`, or with one of the modifiers below
- `.o-grid--auto`: As many equal columns as fit, none narrower than `--luz-grid-min` (16 rem by default): the grid reflows by itself and needs no breakpoint
- `.o-grid--2`, `.o-grid--3`, `.o-grid--4`: That many equal columns above 768 px; one column at 768 px and below
- `.o-grid--split`: Two equal columns when each gets `--luz-grid-min` (16 rem by default), one below: a hero with its image, or two features side by side. It stacks by itself with larger text
- `.o-media`, `.o-media__body`: A fixed item, such as an avatar, beside content that takes the remaining width
- `.o-container`: The content width (`--luz-content-max`, 1100 px) and page padding; less padding at 640 px and below
- `.o-container--inline`: The container's width and side gutters only, with no padding above or below: the row of a bar, so its content starts where the page's content starts
- `.o-page`: A page without a sidebar: a column at least as tall as the window, whose `<main>` grows, so the footer rests on the bottom of a short page. Any number of bands can come before the header
- `.o-sticky`: A bar that stays at the top while the page scrolls, in a window at least 30 rem tall, with the scroll padding that keeps what Tab reaches out from under it
- `.o-actions`: Two or three related buttons or links in a row that wraps, 8 px apart; at 640 px and below, a column of full-width actions whose labels wrap
- `.o-shell`: The app layout: a sidebar column (`--luz-sidebar-width`) beside the main area, a footer across the bottom; one column at 768 px and below
- `.o-main`: The main area inside `.o-shell`

### The page and its bars

A page without a sidebar is `.o-page`: any bands first (a notice, the cookie question), then the header, `<main>` and the footer. The header's row is `.o-container.o-container--inline`, so the site's name starts where the content starts, and `.o-sticky` keeps the header at the top.

Page markup
```html
<body>
  <a class="luz-skip-link" href="#main-content">Skip to main content</a>
  <div class="o-page">
    <header class="o-sticky">
      <div class="o-container o-container--inline o-row">…</div>
    </header>
    <main id="main-content" class="o-container o-stack" tabindex="-1">…</main>
    <footer>
      <div class="o-container o-container--inline o-row">…</div>
    </footer>
  </div>
</body>
```

- The objects lay out only: the header's surface and divider are the job of your CSS, or of the header of a package for one kind of site.
- `--luz-bar-h` is the height of a one-row bar of 44 px controls at the default text size: the control, two 4 px paddings and a 1 px divider. The [navbar](https://nandovejer.github.io/luz/docs/components/navbar/) panel opens at that height when nothing anchors it.
- With `.o-sticky` on the page, the scroll padding of `<html>` is `--luz-bar-h` or 3.5em, whichever is more, plus half a control: a field reached with Tab, or the target of the [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/), stops below the bar. It is a minimum: a bar that wraps to several rows with enlarged text is taller, and Safari can leave a field partly under it at 300 percent text.
- Below 30 rem of window height the bar scrolls away with the page, so it never takes most of a short screen.

### Actions and the split grid

Split grid and actions markup
```html
<section class="o-grid o-grid--split">
  <div class="o-stack">
    <h1>…</h1>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="/register/">Register now</a>
      <a class="luz-btn luz-btn--outline" href="/programme/">See the programme</a>
    </div>
  </div>
  <div class="luz-image">…</div>
</section>

<!-- two columns only when each gets 24 rem -->
<section class="o-grid o-grid--split hero">…</section>
<style>.hero { --luz-grid-min: 24rem; }</style>
```

- One primary action per group, and a second, outline one if there is another way. In the narrow column the primary comes first, as in the source.
- A `.luz-btn` in `.o-actions` wraps its label in the narrow column, so a long label never runs out of the window.

### The grid

LUZ has no 12-column system: a content grid is a handful of equal columns, and `.o-grid` draws them. Use `.o-grid--auto` when the items decide how many fit, such as cards; use `.o-grid--2` to `--4` when the number is part of the design.

Grid markup
```html
<!-- as many columns as fit, each at least 16 rem -->
<div class="o-grid o-grid--auto">…cards…</div>

<!-- at least 12 rem: set the property in your own CSS -->
<div class="o-grid o-grid--auto gallery">…</div>
<style>.gallery { --luz-grid-min: 12rem; }</style>

<!-- three columns above 768 px, one below -->
<div class="o-grid o-grid--3">…</div>
```

- Items keep their source order: the grid reorders nothing, so reading order and tab order are the page's.
- Columns are `minmax(0, 1fr)`, so a long word or a wide table inside an item cannot push the grid wider than its container.
- For a layout that depends on the width of a card and not of the window, put the grid in a container and size the items there; the objects do not read the container.

### Lists

When the items are a list (posts, speakers, tags), put `.o-grid`, `.o-stack` or `.o-row` on the `<ul>` or `<ol>` itself. The object takes off the markers and the indent, and the items stay a list: a screen reader says how many there are and lets the reader skip past them.

List grid markup
```html
<ul class="o-grid o-grid--auto">
  <li class="luz-card">…</li>
  <li class="luz-card">…</li>
</ul>
```

- Safari can drop the list role from a list without markers, outside a `<nav>`. Give each item a heading, as cards have, so the reader can still move through them.
- No rule of yours is needed. Inside [prose](https://nandovejer.github.io/luz/docs/components/prose/), which gives lists their markers back, a list with an object keeps none.

### Copy the markup

Media object markup
```html
<div class="o-media">
  <span class="luz-avatar luz-avatar--md" aria-hidden="true">AB</span>
  <div class="o-media__body">
    <p>Ana Belén</p>
  </div>
</div>
```

App shell markup
```html
<body class="o-shell">
  <nav class="luz-sidebar" aria-label="Main">…</nav>
  <main class="o-main" id="main-content">
    <div class="o-container">…</div>
  </main>
  <footer>…</footer>
</body>
```

The footer is a plain `<footer>`, which core places across the bottom: nothing here needs site. For whole pages without a sidebar, use [`.o-page`](https://nandovejer.github.io/luz/docs/components/layout/#objects-page).

[What each package needs](https://nandovejer.github.io/luz/docs/get-started/structure/#needs) lists every piece.
