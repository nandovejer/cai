# Page foot

The small print under a page: when it was last updated, and links to edit it or report a problem.

### Known issues
None known.

### Copy the markup
One paragraph, after the pager:

Page foot markup
```html
<p class="luz-docs-page-foot">Last updated <time datetime="2026-10-17">17 October 2026</time> · <a href="https://example.com/edit/install.md">Edit this page</a> · <a href="https://example.com/issues/new">Report a problem</a></p>
```

### Variants and options
No modifier. The foot is one class on a native `<p>`.

- `.luz-docs-page-foot`: On a `<p>` under the content: a rule above, room above the rule, small print in the UI font and the secondary colour. Its links are at least `--luz-control-sm` (28px) tall

### How it works
CSS from `@luz-ds/docs`. It sets the rule, the size and the colour; the facts are yours.

- The foot is one paragraph. It wraps with its text, so on a narrow screen the links go to the next line.
- The middle dots are text in the markup, between the date and the links.
- The date is a `<time>` with a `datetime` a machine can read, and the same date written in words.
- The links go to your own edit page and your own list of issues. LUZ gives neither.

### Without JavaScript
Nothing changes. It is text and two links, and the package has no script.

### Keyboard and ARIA
- **Order:** the date is text; Tab reaches "Edit this page", then "Report a problem".
- **Names:** the links are named by their text, so they make sense out of context. Do not shorten them to "Edit" and "Report".
- **Date:** `<time datetime="2026-10-17">` gives the date in a form software can read, next to the words a person reads.

### When to use
Use the page foot under the content of every page that people maintain, so a reader can tell how old it is and fix it.

- A page that changes over time, such as a guide or a reference.
- A site whose pages live in a repository, where "Edit this page" can open the file.

### When not to use
Do not use the page foot for the footer of the site: it belongs to one page.

- The footer of the site is a `<footer>`, a child of the [shell](https://nandovejer.github.io/luz/docs/documentation/shell/).
- Do not show a date that is not kept up to date: a wrong date is worse than none.
