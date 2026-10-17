# Dashboard

The view of an application at a glance: its title and main action, then a grid of panels that fills the room the view has.

### Known issues
None known.

### Copy the markup
The view: a title row, then the panels. The title row is a `<div>`, and each panel starts with its heading.

Dashboard markup
```html
<main class="luz-app-dashboard" id="main-content" tabindex="-1">
  <div class="luz-app-dashboard__head">
    <h1 class="luz-app-dashboard__title">Overview</h1>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="/reports/new/">New report</a>
      <a class="luz-btn luz-btn--secondary" href="/export/">Export data</a>
    </div>
  </div>
  <ul class="o-grid o-grid--auto">
    <li class="luz-card luz-app-dashboard__panel luz-app-dashboard__panel--wide">
      <h2 class="luz-card__title">Sales this month</h2>
      <p class="luz-card__body">…</p>
    </li>
    <li class="luz-card luz-app-dashboard__panel">
      <h2 class="luz-card__title">Stock alerts</h2>
      <p class="luz-card__body">…</p>
    </li>
  </ul>
</main>
```

### Variants and options
One modifier, for the panel. The dashboard is a class of app on a native `<main>`; the grid and the card are core's.

- `.luz-app-dashboard`: On `<main>`: the view. 32 px of padding (16 px at 640 px and below), 24 px between its rows, and the container of its own size query
- `.luz-app-dashboard__head`: On a `<div>`: the title at the start and the actions at the end, on one row that wraps; at 640 px and below, a column
- `.luz-app-dashboard__title`: The view's one `<h1>`: 2xl size, semibold, in the text colour; xl at 640 px and below
- `.luz-app-dashboard__panel`: On a `.luz-card` in the grid: it can shrink, so a wide child never widens its column
- `.luz-app-dashboard__panel--wide`: Two columns, when the dashboard is at least 40 rem wide; one column below, so it never asks for a column that is not there
- `.o-grid.o-grid--auto` (core): On the `<ul>`: as many equal columns as fit, none narrower than 18 rem
- `.o-actions` (core): Two or three related actions: a row that wraps, a column of full-width actions at 640 px and below

### How it works
CSS from `@luz-ds/app` on core's grid and card. No JavaScript.

- The dashboard sets `--luz-grid-min: 18rem` for core's `.o-grid--auto`, so a column is never narrower than 18 rem and the number of columns follows the room: one at 320 px, two at 768 px, and three at 1280 px beside a sidebar.
- The dashboard is a size container. The wide panel asks how wide the dashboard is, not the window, so it fits with a sidebar and without one. From 40 rem two columns always exist (two of 18 rem and a gap), and at 200% text both are in rem, so it never overflows.
- The panels keep the order of the markup. There is no dense packing and no `order`: a wide panel that does not fit in what is left of a row starts the next one, and the gap stays. Reading order, focus order and what is drawn are the same.
- A panel can shrink, so a long line of code or a table inside it scrolls in its own wrapper and does not widen the column.
- Empty, loading and failed panels are the panel's own content: a sentence and a link, core's [progress](https://nandovejer.github.io/luz/docs/components/progress/) or [alert](https://nandovejer.github.io/luz/docs/components/alert/). There is no skeleton class in 0.1.

### Without JavaScript
Nothing changes: the grid, the container query and the cards are CSS.

### Keyboard and ARIA
- **Order:** the order of the source: the title row's actions, then each panel in turn. A panel that is a card with a link inside is reached by that link.
- **Headings:** the view has one `<h1>`, in the title row, and each panel starts with an `<h2>`. The title row is a `<div>`, not a `<header>`.
- **List:** the panels are a `<ul>` of `<li>`: a screen reader says how many there are. Safari can drop the list role from a list without markers; the headings still lead through the panels.
- **Actions:** an action that goes somewhere is a link (`<a href>`); one that does something on this page is a `<button type="button">`. Never an `<a>` without `href`.
- **Landmarks:** the dashboard is the page's `<main>`, the sibling of the [header](https://nandovejer.github.io/luz/docs/app/header/). It takes the skip link's target, with `tabindex="-1"`.

### When to use
Use the dashboard for a view that shows several things about the same subject, each short enough to read at a glance and each leading to its own page.

- An overview, a status page or a home view, where the person checks and then acts on one thing.
- The most important panel first, wide: it gets the room when the view has it.

### When not to use
Do not use it for a view that is one long thing: a table, a form or a document are not panels.

- One primary action per view, in the title row, never in a panel.
- Do not make a panel taller than its neighbours with row spans or dense packing: it moves a panel before the ones that come first in the markup.
- For a plain grid of cards in a page of content, use core's [grid](https://nandovejer.github.io/luz/docs/components/layout/#objects-grid) and [card](https://nandovejer.github.io/luz/docs/components/card/).
