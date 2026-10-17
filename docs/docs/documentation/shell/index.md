# Shell

The page of a documentation site in three columns: the sidebar, the content and a rail, down to one column on a phone.

### Known issues
None known.

### Copy the markup
The shell on `<body>`, then the header, the sidebar, the rail, the content and the footer, in the order a keyboard reaches them. The skip link goes to the content, past the sidebar and the rail:

Shell markup
```html
<body class="o-shell luz-docs-shell">
  <a class="luz-skip-link" href="#main-content">Skip to content</a>
  <header>
    <button class="luz-nav-toggle" type="button" popovertarget="docs-nav" aria-label="Menu">…</button>
    <p><a href="/">Acme docs</a></p>
  </header>
  <nav class="luz-sidebar luz-docs-nav" id="docs-nav" aria-label="Acme docs" popover>…</nav>
  <aside class="luz-docs-rail" aria-label="About this page">…</aside>
  <main class="o-main luz-docs-main" id="main-content" tabindex="-1">
    <header class="luz-docs-page-head">…</header>
    …
  </main>
  <footer>…</footer>
</body>
```

### Variants and options
No modifier. Three classes on native elements, and three custom properties.

- `.luz-docs-shell`: On `<body>`, with core's `.o-shell`: the tracks and where each part goes
- `.luz-docs-nav`: With core's `.luz-sidebar`, on the `<nav>`: the sidebar's column
- `.luz-docs-main`: With `.o-main`, on the `<main>`: the content's column. Its children keep to the measure
- `.luz-docs-rail`: On an `<aside>`: the third column from 80rem, above the content below it. See [Rail](https://nandovejer.github.io/luz/docs/documentation/rail/)
- `--luz-docs-measure`: A line of text: `46rem`. Set it on the shell in your own CSS to change it
- `--luz-docs-nav-w`, `--luz-docs-rail-w`: The sidebar and the rail: `16.5rem` and `14rem`
- `--luz-docs-rail-top`: How far from the top the rail sticks. Raise it under a sticky header

### How it works
CSS from `@luz-ds/docs` on core's shell and sidebar. Docs gives the tracks and the measure; core gives the grid and the drawer.

- From 80rem there are three tracks: sidebar, content, rail. From 60rem there are two, with the rail drawn above the content. Below, one, in the order of the markup: sidebar, rail, content, footer.
- A plain `<header>` goes across every track. The footer sits under the content, and the sidebar runs down beside it.
- Between 769px and 60rem the sidebar is the first block above the content. At 768px and below it is core's drawer, a popover the menu button opens.
- Every child of the content keeps to `--luz-docs-measure`, so an example is as wide as a line of text. In print the rail is left out.

### Without JavaScript
Nothing changes: the layout is CSS. The drawer is a popover opened by the menu button's `popovertarget`, with no script.

In a browser without the popover API the sidebar stays in the page, above the content.

### Keyboard and ARIA
- **Order:** the order of the source; the grid does not change it. Skip link, header, sidebar, rail, content, footer. The skip link goes to the content, past the sidebar and the rail.
- **Skip link:** put the [skip link](https://nandovejer.github.io/luz/docs/components/skip-link/) first, aimed at the `<main>`, so a keyboard user passes the sidebar.
- **Landmarks:** a `<header>` child of `<body>` is the banner; name the `<nav>` after the site and the `<aside>` "About this page".
- **Keys:** Enter or Space on the menu button opens the drawer; Escape closes it. The browser does it.

### When to use
Use the shell for the pages of a documentation site: read one after another, with a sidebar of all of them and a list of the sections of the page.

- Your site has more pages than fit in a header.
- Readers move through pages in order.

### When not to use
Do not use the shell for a page that is not documentation: it assumes a sidebar and a content column.

- A page with no sidebar uses core's `.o-page`: see [the page and its bars](https://nandovejer.github.io/luz/docs/components/layout/#objects-page).
- A web application has [App](https://nandovejer.github.io/luz/docs/app/); a blog has [CMS](https://nandovejer.github.io/luz/docs/cms/).
