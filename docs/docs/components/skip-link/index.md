# Skip link

Lets keyboard users jump past the header to the main content.

### Known issues
None known.

### Copy the markup
Skip link markup
```html
<body>
  <a class="luz-skip-link" href="#main-content">Skip to main content</a>
  <header class="o-sticky">…</header>
  <main id="main-content" tabindex="-1">…</main>
</body>
```

### Variants and options
There are no variants: one class on one link.

- `.luz-skip-link`: Off screen until it has focus, then fixed at the top start corner, in the brand fill, above everything, a sticky bar included. Not printed

### How it works
A normal link to the `id` of `<main>`, first in `<body>`, before a cookie banner, a notice or the header. CSS only.

- It slides in when it receives focus, over `--luz-duration-fast`; under reduced motion it appears at once.
- The browser does the jump. `tabindex="-1"` on `<main>` lets it take the focus, so the next Tab starts inside it in every browser.
- Under a sticky bar ([.o-sticky](https://nandovejer.github.io/luz/docs/components/layout/#objects-page)) the page's scroll padding keeps the start of `<main>` below the bar after the jump.

### Without JavaScript
Nothing changes: the skip link is a link and CSS.

### Keyboard and ARIA
Press Tab once from the top of the page and the link appears; Enter follows it to the main content.

- It must be the first focusable element of the page, before a cookie banner or a notice.
- No ARIA: its text is its name.

### When to use
Put a skip link on every page that has a header, a banner or navigation before the main content.

### When not to use
Do not rely on it alone: the page still needs landmarks and a logical heading order.

- Do not add a list of skip links to every section: one to the main content is enough.
