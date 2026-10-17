# Band

Sets one block of a page on a tint that runs from edge to edge, while its content keeps the column.

### Known issues
The band has three, all from the way it draws the tint.

- **A tooltip at its top edge is clipped.** The band cuts off whatever sticks out above or below it. A CSS tooltip on a control that is the first thing in a band is cut at 200 percent text and larger. Start the band with its heading, and keep tooltips off the first control. Dropdown menus and other popovers are not clipped.
- **Outline and ghost buttons.** Their hover colour is the band's own tint, so the hover shows no change. The label and the outline still identify them. Use one primary button, and an outline button for a second way.
- **Forced colors.** The tint is removed, so the band is its heading, text and buttons between two thin rules in the system text colour.

### Copy the markup
Band markup
```html
<main id="main-content" class="o-container o-stack">
  <!-- other sections -->
  <section class="o-stack luz-band" aria-labelledby="last-seats-title">
    <h2 id="last-seats-title">Registration closes on 30 April</h2>
    <p>The hall holds 400 people, and the Two days ticket sold out last year.</p>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="/register/">Register now</a>
    </div>
  </section>
</main>
```

### Variants and options
There are no variants: one class on any block. The layout inside is yours: `.o-stack` above spaces its children.

- `.luz-band`: The block on a `--luz-brand-subtle` tint that runs from edge to edge of the page, with 48 px (`--luz-space-2xl`) above and below its content. The content keeps the page's column

### How it works
CSS from `@luz-ds/core`. No JavaScript.

- The band stays inside the page's column, so its text keeps the column's start edge. The tint is a `box-shadow` that spreads past the block, cut off above and below by `clip-path`. A shadow adds no scrollable width; `100vw` would, whenever the page has a scrollbar. In an `.o-shell` the tint stops at `.o-main`.
- Any block can be a band: a `<section>` with its heading, or a plain `<div>`.
- Put it on the page itself, inside the main column. Inside a card or an element with its own background the tint is drawn over that surface, and it runs out of the element when that element is wider than the window.

### Without JavaScript
Nothing changes: the band is CSS.

### Keyboard and ARIA
The band has no interaction, and adds no role.

- A `<section>` named with `aria-labelledby` becomes a region landmark; a `<div>` band is just a block.
- The tint carries no meaning, and it is not what groups the band: the section and its heading are. Without the tint (forced colors, print) the grouping stays.
- Controls inside the band keep their own focus ring. The 48 px above and below leaves room for it at 200 percent text and at 320 px wide.

### When to use
Use a band for a call to act near the end of a long page, or for one pause in the middle of it.

### When not to use
Do not band every section: when everything stands out, nothing does.

- One band for each screen height at most; two in a row read as a new background, not as a call to act.
- Do not use the tint to say something (a warning, a status): it carries no meaning, and forced colors remove it. Use an [alert](https://nandovejer.github.io/luz/docs/components/alert/).
- Do not put a band inside a card or on a `--luz-surface` area, or around the whole page. In dark mode the primary button falls to 2.7:1 against a tint laid over `--luz-surface`, under the 3:1 a control's edge needs.
- Do not put a `.luz-btn--secondary` on the band: its fill is the tint's own colour, and it reads as plain text.
