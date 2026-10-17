# Pagination

Links to the pages of a list that goes on over several, with the current page marked.

### Known issues
None known.

### Copy the markup
Pagination markup
```html
<nav aria-label="Pagination">
  <ul class="luz-pagination">
    <li><a class="luz-pagination__link" href="/blog/?page=1" rel="prev">Previous</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=1" aria-label="Page 1">1</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=2" aria-label="Page 2" aria-current="page">2</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=3" aria-label="Page 3">3</a></li>
    <li><a class="luz-pagination__link" href="/blog/?page=3" rel="next">Next</a></li>
  </ul>
</nav>
```

### Variants and options
There are no modifiers. The list wraps onto more lines when it is narrow.

- `.luz-pagination`: The list: one row of items, which wraps when it is narrow
- `.luz-pagination__link`: A page, Previous or Next: a target of at least 44 px
- `aria-current="page"`: Marks the current page: solid fill and heavier weight
- `aria-disabled="true"`: Previous or Next at either end, as a `<span>` and not a link: disabled text colour
- `.luz-pagination__gap`: The “…” of a long list: a mark, hidden from screen readers

### How it works
A `<nav>` landmark around a list of links, styled by `components/pagination.css`. Each page is a real address, so the server renders it and the back button, a bookmark and a search engine all work.

No JavaScript.

- The numbers are links, not buttons: following one loads another page.
- `rel="prev"` and `rel="next"` say which links go to the neighbours.
- The current page is a link with `aria-current="page"`, so it is still announced as a link and keeps its place in the order.
- At the first or last page, Previous or Next is a `<span>` with `aria-disabled="true"`: text, with no focus stop.
- Keep the `<nav>`. Some browsers drop the list semantics of a `<ul>` without bullets, and the landmark is what keeps it announced as a list; without a `<nav>`, add `role="list"` to the `<ul>`.

### Without JavaScript
Nothing changes: it is a list of links and CSS. Without CSS it reads as a list of links.

### Keyboard and ARIA
Tab reaches each link in order; Enter follows it.

- Name the `<nav>` “Pagination” with `aria-label`, so it differs from the main navigation.
- Give a number the name “Page 3” with `aria-label`. The visible number stays in the name. `aria-current="page"` makes the screen reader say which one is current, so the name does not need to.
- A gap is `aria-hidden="true"`: the screen reader hears the pages, not the dots.

### When to use
Use pagination when a list is too long for one page and each page can be reached by its own address: search results, a blog archive, a table of records.

### When not to use
Do not use pagination for a short list, or for the steps of a task.

- For the parents of the page you are on, use a [breadcrumb](https://nandovejer.github.io/luz/docs/components/breadcrumb/).
- For the sections of one page, use [tabs](https://nandovejer.github.io/luz/docs/components/tabs/).
- For a feed that keeps loading on scroll, give a link to the next page as well: it is the only version a keyboard and a screen reader reach.
