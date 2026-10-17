# Pager

Two link blocks at the end of a page, to the previous page and to the next, each with the title it leads to.

### Known issues
None known.

### Copy the markup
A list of one or two blocks, in a navigation landmark:

Pager markup
```html
<nav aria-label="Previous and next page">
  <ul class="luz-docs-pager">
    <li class="luz-docs-pager__prev"><a class="luz-docs-pager__link" rel="prev" href="/install/"><span class="luz-docs-pager__label">Previous</span> <span class="luz-docs-pager__title">Install the tool</span></a></li>
    <li class="luz-docs-pager__next"><a class="luz-docs-pager__link" rel="next" href="/deploy/"><span class="luz-docs-pager__label">Next</span> <span class="luz-docs-pager__title">Deploy to production</span></a></li>
  </ul>
</nav>
```

### Variants and options
No modifier. The two items say which side they are on.

- `.luz-docs-pager`: On a `<ul>`: two equal columns with a gap, no bullets. One column at 640px and below
- `.luz-docs-pager__prev`: On the first `<li>`: the first column
- `.luz-docs-pager__next`: On the second `<li>`: the second column, with its text at the end. It stays there when there is no previous page
- `.luz-docs-pager__link`: On the `<a>`: the whole block is the link, with a border and padding. On hover, the border and the surface change and the title is underlined
- `.luz-docs-pager__label`: "Previous" or "Next", small, in the secondary colour
- `.luz-docs-pager__title`: The title of the page it leads to, larger and semibold, in the colour of a link

### How it works
CSS from `@luz-ds/docs`. It sets the blocks; the order of the pages is yours.

- The two blocks are equal and the whole block is the target, so the click or tap area is large.
- The first page has only a Next and the last only a Previous: leave the other `<li>` out. A lone Next stays in the second column, at the end.
- Each link has `rel="prev"` or `rel="next"`, and a name that starts with its visible words: "Previous: Install the tool".
- The title is never shortened: a long one wraps inside the block.

### Without JavaScript
Nothing changes. It is two links, and the package has no script.

### Keyboard and ARIA
- **Order:** Previous, then Next, as in the source. Tab reaches each link, and Enter follows it.
- **Names:** the `<nav>` is named "Previous and next page". Each link is named by its visible text ("Previous Install the tool"), so a person who says "click Previous" finds it (WCAG 2.5.3). Do not add an `aria-label` that replaces it.
- **Landmark:** one pager for each page. A second `<nav>` on the page needs a different name.

### When to use
Use the pager at the end of the content, so a reader who finishes a page goes to the next one in the order you intend.

- Pages that are read in a sequence: a guide, a tutorial, the chapters of a manual.
- After the content and before the page foot.

### When not to use
Do not use the pager for pages that have no order, or for the pages of a list of results.

- The sidebar already lists every page. The pager gives the next step, not the whole map.
- For the pages of a list or a table, use [pagination](https://nandovejer.github.io/luz/docs/components/pagination/), which has page numbers.
