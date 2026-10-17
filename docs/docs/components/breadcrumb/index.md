# Breadcrumb

Shows where the page sits in the site, as a trail of links to its parents.

### Known issues
None known.

### Copy the markup
Breadcrumb markup
```html
<nav aria-label="Breadcrumb">
  <ol class="luz-breadcrumb">
    <li><a class="luz-breadcrumb__item" href="/">Home</a></li>
    <li><a class="luz-breadcrumb__item" href="/settings/">Settings</a></li>
    <li><span class="luz-breadcrumb__item" aria-current="page">Billing</span></li>
  </ol>
</nav>
```

### Variants and options
There are no modifiers. The separator is drawn by the CSS between two items: there is nothing to write for it.

- `.luz-breadcrumb`: The ordered list: one row of items, which wraps onto more lines when it is narrow. Each `<li>` after the first starts with a slash
- `.luz-breadcrumb__item`: A parent link, or the current page as text
- `aria-current="page"`: Marks the current page: primary text colour and medium weight

### How it works
The [APG breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/): a `<nav>` landmark around an ordered list of links, styled by `components/breadcrumb.css`. No JavaScript.

- The list is ordered because the order is the meaning: screen readers announce a list and its number of items.
- The current page is the last item, a `<span>` with `aria-current="page"`, not a link to itself.
- The separator is a border drawn by `::before` with empty content, so assistive technology has nothing to read.

### Without JavaScript
Nothing changes: the breadcrumb is a list of links and CSS. Without CSS it reads as a numbered list.

### Keyboard and ARIA
Tab reaches each parent link in order; Enter follows it. The current page is not in the tab order.

- Name the `<nav>` "Breadcrumb" with `aria-label`, so it differs from the main navigation.
- `aria-current="page"` tells screen readers which item is the current page.

### When to use
Use a breadcrumb when pages sit three or more levels deep, so the reader sees where they are and can go up a level.

### When not to use
Do not use a breadcrumb on a flat site, or as the only navigation.

- For the main sections of a site, use a [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/) or a header navigation.
- For steps in a process, show the step number in the page heading instead.
