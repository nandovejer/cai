# Table of contents

Lists the sections of a long article, beside the text when there is room and above it when there is not.

### Known issues
The mark on the section in view needs core's script; without it, no link is marked. Beside the text, the contents sit at the inline end but come first in the source, so Tab reaches them before the text.

Not yet tested with a screen reader.

### Copy the markup
Table of contents markup
```html
<article class="luz-cms-article">
  <header class="luz-cms-article-header">…</header>
  <div class="luz-cms-article__layout">
    <nav class="luz-cms-toc" aria-labelledby="toc-title" data-luz-spy>
      <h2 class="luz-cms-toc__title" id="toc-title">Contents</h2>
      <ol class="luz-cms-toc__list">
        <li><a href="#method">How the readings were taken</a></li>
        <li><a href="#level">Four centimetres in ten years</a></li>
        <li><a href="#storms">Storms that reach the walls</a></li>
      </ol>
    </nav>
    <div class="luz-prose">
      <p>Since March 2016, a group of volunteers has read the tide gauge…</p>
      <h2 id="method">How the readings were taken</h2>
      <p>…</p>
      <h2 id="level">Four centimetres in ten years</h2>
      <p>…</p>
      <h2 id="storms">Storms that reach the walls</h2>
      <p>…</p>
    </div>
  </div>
</article>
```

### Variants and options
There are no modifiers. The contents are optional: without them, the text takes the first column alone.

- `.luz-cms-article`: The story: its width decides the layout, not the window's (a size container)
- `.luz-cms-article__layout`: The contents, then the text. When the article is 46rem wide or more: the text in the first column, the contents in a 13rem column at the inline end, 48 px apart; one column below that
- `.luz-cms-toc`: The `<nav>`. Beside the text it stays in view while the text scrolls, and a list taller than the window scrolls inside it
- `data-luz-spy` on `.luz-cms-toc`: Core's scroll spy marks the link of the section in view. Optional
- `.luz-cms-toc__title`: The heading of the contents, in the sans, semibold
- `.luz-cms-toc__list`: The list, with no markers and a rule along its inline start; one link a line
- `--luz-cms-toc-top`: The space above the contents while they stay in view: 24 px, or 24 px under a sticky bar (core's `.o-sticky`, one row of `--luz-bar-h`, such as the [header](https://nandovejer.github.io/luz/docs/cms/header/)). Set it on `.luz-cms-toc` for a header of another height

### How it works
A CSS grid inside a size container, from `@luz-ds/cms`. No JavaScript of its own.

- The layout follows the room the article has: in a page with a sidebar, or with larger text, the contents go above the text sooner. Below 46rem they are a plain list above the text, and do not stay in view: they would cover it.
- The contents come first in the source, so they are read first and Tab reaches them first, in both layouts. The text is one element, the second child of `__layout`; in a CMS, the element that holds the post's content.
- Each link points at the `id` of a section heading. Most CMSs can write those ids: in WordPress, the HTML anchor of each heading block.
- With core's script (`luz.js`, or `initSidebar()` from `@luz-ds/core/sidebar`), the link of the section in view gets `aria-current="true"`, which draws a bar and makes it semibold. The script finds the links by the `data-luz-spy` attribute on the `<nav>`: every link to a section of the page inside it.

### Without JavaScript
The contents are a list of links to the sections, which the browser scrolls to. Only the mark on the section in view needs the script; without it, no link is marked.

### Keyboard and ARIA
Tab moves through the links in order; Enter follows one. The browser moves focus and scrolls to the section.

- A `<nav>` named by its heading: screen reader users find it in the list of landmarks as "Contents". Use an `<ol>`: the sections have an order.
- `aria-current="true"` names the section in view; the script moves it. Without the script, nothing claims to be current.
- Under a sticky header, the scroll padding of core's `.o-sticky` keeps the section's heading clear of the header when a link is followed.

### When to use
Use a table of contents in an article of four or more sections, which people read in parts or come back to: a guide, a report, a long interview.

### When not to use
Do not use it in a short post: three paragraphs need no map.

- Not for links to other pages: that is navigation, in the [header](https://nandovejer.github.io/luz/docs/cms/header/) or a [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/).
- Not for the steps of a task done in order: number the steps in the text.
