# Footer

Ends every page of a landing site with who made it, its licence and a few secondary links, under a rule, in a row or as columns.

### Known issues
None known.

### Copy the markup
Footer markup
```html
<footer class="luz-landing-footer">
  <div class="o-container o-container--inline o-row">
    <p>Acme Inc. · MIT licence</p>
    <nav class="o-actions" aria-label="Links">
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/status/">Service status</a>
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/accessibility/">Accessibility statement</a>
    </nav>
  </div>
</footer>
```

Footer with columns markup
```html
<footer class="luz-landing-footer">
  <div class="o-container o-container--inline o-grid">
    <div class="luz-landing-footer__brand">
      <p><strong>Acme Stock</strong> <span>v2.0</span></p>
      <p>Stock counts that keep up with the shop.</p>
    </div>
    <nav class="luz-landing-footer__col" aria-labelledby="footer-product">
      <h2 class="luz-landing-footer__col-title" id="footer-product">Product</h2>
      <ul>
        <li><a href="/pricing/">Pricing</a></li>
        <li><a href="/trial/">Start free trial</a></li>
      </ul>
    </nav>
    <nav class="luz-landing-footer__col" aria-labelledby="footer-company">
      <h2 class="luz-landing-footer__col-title" id="footer-company">Company</h2>
      <ul>
        <li><a href="/about/">About</a></li>
      </ul>
    </nav>
  </div>
</footer>
```

### Variants and options
No modifiers. The footer is a class of the landing on a native `<footer>`, with a row of core's or a grid of a brand and columns inside.

- `.luz-landing-footer`: On `<footer>`: a rule on top, 24 px above its row and 32 px below; its row spreads its children to the two ends, and is a column aligned to the start at 768 px and below
- `.o-container.o-container--inline.o-row` (core): The row: the width and gutters of the page, so its content starts where the main's does
- `.luz-landing-footer__brand`: The first cell of the `.o-container.o-container--inline.o-grid` (core), 24 px (`--luz-space-lg`) apart: a name, a version, one line. From 768 px it is twice a column
- `.luz-landing-footer__col`: A column, on a `<nav>`: a title over a list of links with no markers, 8 px (`--luz-space-xs`) apart; each link is a box 28 px (`--luz-control-sm`) tall, a target of 24 px or more
- `.luz-landing-footer__col-title`: A column's title: sans, small, semibold, primary text
- `.o-actions` (core): The links, as an [action group](https://nandovejer.github.io/luz/docs/components/layout/#objects-actions)

### How it works
CSS from `@luz-ds/landing` on core's objects. No JavaScript, and `@luz-ds/site` is optional.

- The landing adds the rule, the room around the row and how the row spreads its children; `.o-container--inline` lines the row up with the page's content.
- On an `.o-page` the main grows, so the footer rests on the bottom of a page shorter than the window.
- With a brand and columns the cells stack, and from 768 px they sit in a row: the brand takes two shares, each column one.
- The column at 768 px and below does not wrap, so its children stay one under the other.

### Without JavaScript
Nothing changes: the footer is HTML and CSS. A [color mode switcher](https://nandovejer.github.io/luz/docs/components/mode-switcher/) inside it keeps working as radios.

### Keyboard and ARIA
The footer has no interaction of its own; its links keep theirs.

- A `<footer>` that is a direct child of `<body>` is the contentinfo landmark.
- Name a `<nav>` of links with `aria-label`, and keep the links in the same order on every page.
- Name a column's `<nav>` by its title with `aria-labelledby`, and make the title a heading (`<h2>`).

### When to use
Use the footer at the end of every page of a landing site, for who made it, its licence and a few secondary links.

### When not to use
Do not put the main navigation, or anything needed to finish a task, in the footer.

- Main navigation goes in the [header](https://nandovejer.github.io/luz/docs/landing/header/).
