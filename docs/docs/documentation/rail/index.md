# Rail

The list of the sections of the page that stays in view beside the content, with the actions of the page under it.

### Known issues
Without core's script no link is marked as current, and the links still work. Not tested with a screen reader.

### Copy the markup
The rail, as a direct child of the shell, after the content:

Rail markup
```html
<aside class="luz-docs-rail" aria-label="About this page">
  <nav class="luz-docs-rail__onpage" aria-labelledby="onpage-title">
    <details class="luz-docs-rail__fold" open>
      <summary class="luz-docs-rail__title" id="onpage-title">On this page</summary>
      <ul class="luz-docs-rail__list">
        <li><a class="luz-sidebar__link luz-docs-rail__link" href="#install">Install</a></li>
        <li><a class="luz-sidebar__link luz-docs-rail__link" href="#configure">Configure</a>
          <ul class="luz-docs-rail__sub">
            <li><a class="luz-sidebar__link luz-docs-rail__link" href="#config-file">The config file</a></li>
          </ul>
        </li>
      </ul>
    </details>
  </nav>
  <div class="luz-docs-rail__actions">
    <a href="https://example.com/docs/install.md">Copy page as Markdown</a>
    <a href="https://example.com/edit/install.md">Edit this page</a>
    <a href="https://example.com/issues/new">Report a problem</a>
  </div>
</aside>
```

### Variants and options
No modifier. The rail is an `<aside>` with two blocks: the list and the actions.

- `.luz-docs-rail`: On an `<aside>`: the third column of the [shell](https://nandovejer.github.io/luz/docs/documentation/shell/) from 80rem, sticky; below it, under the content
- `.luz-docs-rail__onpage`: On the `<nav>` of the list, a direct child of the rail: it scopes the reset of the fold and its title, and is the hook for a script
- `.luz-docs-rail__fold`: On a native `<details>`. Write `open`, so the list shows
- `.luz-docs-rail__title`: On the `<summary>`: "On this page", semibold. It names the `<nav>`
- `.luz-docs-rail__list`: On the `<ul>`: no bullets, a rule at its start
- `.luz-docs-rail__link` with `.luz-sidebar__link`: On each `<a>`: text on the page, 28px tall. The link marked `aria-current="true"` gets a start border in the brand colour
- `.luz-docs-rail__sub`: On a nested `<ul>`: the `h3` of an `h2`, indented
- `.luz-docs-rail__actions`: A column of links under a rule: copy, edit, report

### How it works
CSS from `@luz-ds/docs`, on core's sidebar link and its scroll spy.

- Below 80rem the rail is drawn under the content, before the footer. From 80rem it is a column and sticky, at `--luz-docs-rail-top` from the top of the window. It is as tall as the window at most, and scrolls by itself when the list is longer.
- A link carries core's `.luz-sidebar__link`, so core's script marks the section in view with `aria-current="true"`. The rail redraws the link as text on the page: the mark is the weight and a start border, never the colour alone.
- The list names each `h2` of the page and, nested under it, each `h3`. Nothing is nested deeper.
- "Copy page as Markdown" is a link to the page's Markdown file; copying it with a script is yours. The rail is left out of print.

### Without JavaScript
The list and the actions are links and a native `<details>`, so they work. No link is marked as current: the mark comes from core's script.

### Keyboard and ARIA
- **Order:** the rail is after the content in the source, so Tab reaches it after the text: the list, then the actions.
- **Keys:** Enter or Space on "On this page" folds the list. Tab reaches each link; Enter goes to its section.
- **Names:** the `<aside>` is a landmark named "About this page"; the `<nav>` is named by its summary, "On this page".

### When to use
Use the rail on pages with several sections, so a reader sees the shape of the page and jumps to a part of it.

- A page with three or more sections, long enough to scroll.
- Actions that belong to the page and not to the site: edit, report, copy.

### When not to use
Do not use the rail on a short page: a list of two links is more to read than the page.

- It lists the sections of one page. The pages of the site go in the sidebar.
- Nest no deeper than an `h3`. For the contents beside an article, use [the CMS table of contents](https://nandovejer.github.io/luz/docs/cms/toc/).
