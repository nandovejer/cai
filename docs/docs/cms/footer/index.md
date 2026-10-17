# Footer

Ends every page of a blog or a newspaper with who publishes it and a few secondary links, under a rule.

### Known issues
None known.

### Copy the markup
Footer markup
```html
<footer class="luz-cms-footer">
  <div class="o-container o-container--inline o-row">
    <p>The Vejer Review is published by a cooperative.</p>
    <nav class="o-actions" aria-label="Links">
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/corrections/">Corrections</a>
      <a class="luz-btn luz-btn--ghost luz-btn--sm" href="/accessibility/">Accessibility statement</a>
    </nav>
  </div>
</footer>
```

### Variants and options
There are no modifiers. The footer is a class of cms on a native `<footer>`, with a row of core's inside.

- `.luz-cms-footer`: On `<footer>`: a rule on top, 24 px above its row and 32 px below; its row spreads its children to the two ends, and is a column aligned to the start at 768 px and below
- `.o-container.o-container--inline.o-row` (core): The row: the width and gutters of the page, so its content starts where the main's does
- `.o-actions` (core): The links, as an [action group](https://nandovejer.github.io/luz/docs/components/layout/#objects-actions)

### How it works
CSS from `@luz-ds/cms` on core's objects. No JavaScript, and `@luz-ds/site` is optional.

- cms adds the rule, the room around the row and how the row spreads its children; `.o-container--inline` lines the row up with the page's content.
- On an `.o-page` the main grows, so the footer rests on the bottom of a page shorter than the window.
- The column at 768 px and below does not wrap, so its children stay one under the other.

### Without JavaScript
Nothing changes: the footer is HTML and CSS. A [color mode switcher](https://nandovejer.github.io/luz/docs/components/mode-switcher/) inside it keeps working as radios.

### Keyboard and ARIA
The footer has no interaction of its own; its links keep theirs.

- A `<footer>` that is a direct child of `<body>` is the contentinfo landmark.
- Name a `<nav>` of links with `aria-label`, and keep the links in the same order on every page.

### When to use
Use the footer at the end of every page of a blog or a newspaper, for who publishes it and a few secondary links: corrections, contact, the accessibility statement.

### When not to use
Do not put the main navigation, or anything needed to finish a task, in the footer.

- The sections go in the [header](https://nandovejer.github.io/luz/docs/cms/header/).
- A landing page has a [footer](https://nandovejer.github.io/luz/docs/landing/footer/) of its own.
