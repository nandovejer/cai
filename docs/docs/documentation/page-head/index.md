# Page head

The top of a documentation page: the eyebrow, the title, one sentence and the chips that say what the page covers.

### Known issues
None known.

### Copy the markup
The head, as the first child of the content:

Page head markup
```html
<header class="luz-docs-page-head">
  <p class="luz-docs-page-head__eyebrow">Guides · Setup</p>
  <h1>Install the command line tool</h1>
  <p class="luz-docs-page-head__lead">Add the tool to a project and check that it runs, in about two minutes.</p>
  <ul class="luz-docs-page-head__meta">
    <li>Version 2</li>
    <li>macOS, Linux and Windows</li>
    <li><a href="#known-issues">No known issues</a></li>
  </ul>
</header>
```

### Variants and options
No modifier. The head is a class on a native `<header>` with four parts.

- `.luz-docs-page-head`: On a `<header>` in the content: one column, with a gap between its parts and room under it. Its `h1` is `--luz-text-4xl`, and `--luz-text-2xl` at 640px and below
- `.luz-docs-page-head__eyebrow`: On a `<p>`: the area and the group, in small spaced capitals and the secondary colour. A `<code>` in it, a package name, keeps its own case. In Arabic the spacing between letters is left out
- `.luz-docs-page-head__lead`: On a `<p>`: one sentence, larger than the text, in the secondary colour
- `.luz-docs-page-head__meta`: On a `<ul>`: the chips. Each `<li>` is a word or two in a rounded outline, at least `--luz-control-sm` (28px) tall. A link in one is the same height
- `.luz-docs-page-head__files`: On a `<p>`, instead of the chips, on a page that is not a component: "Files:" and each file in a `<code>`, one small line in the secondary colour

### How it works
CSS from `@luz-ds/docs`. It sets the rhythm and the sizes; the words are yours.

- The head is a grid of one column. The gap between the parts is `--luz-space-sm` and the space under the head is `--luz-space-xl`.
- The `h1` is a plain element inside the head, with no class: the head styles it by position.
- The chips are a list of facts a reader asks before reading: which files, which script, which modes, whether it is tested, whether it has known issues. A chip that leads somewhere is a link.
- A long word in a chip breaks instead of widening the page, so the chips wrap at 320px.

### Without JavaScript
Nothing changes. The head is text and links, and the package has no script.

### Keyboard and ARIA
- **Order:** the order of the source: eyebrow, title, lead, then the chips. Tab reaches only the links in the chips.
- **Headings:** the `h1` is the one `h1` of the page. A `<header>` inside `<main>` is not a banner landmark.
- **Chips:** a list of plain items, announced as a list. A chip with no link is text and takes no focus.

### When to use
Use the head at the top of every page of a documentation site, so a reader finds the title and what the page covers in the same place.

- One sentence that says what the page lets a reader do.
- A few chips for the facts that decide whether to read on.

### When not to use
Do not use the head for the banner of the site: it holds the page's `h1`.

- One head per page. A section of a long page has an `h2`, not another head.
- For the header of an article in a blog, use [the CMS article header](https://nandovejer.github.io/luz/docs/cms/article-header/).
- A landing page opens with [the hero](https://nandovejer.github.io/luz/docs/landing/hero/).
