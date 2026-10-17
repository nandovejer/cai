# Prose

Sets long text in lines of about 70 characters, with space between its blocks, whatever markup an editor writes inside.

### Known issues
A table without a wrapper that is wider than the column pushes the page sideways on a narrow screen. Put a wide table in core's [table](https://nandovejer.github.io/luz/docs/components/table/) wrapper, `.luz-table-wrap`, which scrolls inside itself.

Not yet tested with a screen reader.

### Copy the markup
Prose markup
```html
<div class="luz-prose">
  <!-- What the editor or the Markdown writes, as it is -->
  <p>Since March 2016, a group of volunteers has read the tide gauge…</p>
  <h2 id="method">How the readings were taken</h2>
  <p>…</p>
  <ul class="wp-block-list">
    <li>…</li>
  </ul>
  <figure>
    <img src="gauge.jpg" width="1200" height="800" alt="The tide gauge in the port, a post marked in centimetres">
    <figcaption>The gauge at low tide.</figcaption>
  </figure>
</div>
```

### Variants and options
There are no modifiers.

- `.luz-prose`: On the element that holds the text: lines of about 70 characters, the space between its blocks, the indent and markers of its lists, inline code as a chip
- `--luz-prose-measure`: The longest line, `70ch` by default. Set it on the wrapper, between `60ch` and `80ch`
- `data-luz-classless` on the same element: With [classless mode](https://nandovejer.github.io/luz/docs/get-started/classless/) loaded, its tables, buttons and fields take the look of core's components

### How it works
CSS only, in `components/prose.css`. Every selector is inside `:where()`, so a LUZ component inside the text, or a rule of yours, wins.

- **Line length.** Each block of the wrapper is at most `--luz-prose-measure` wide. Figures, tables, code blocks, images, videos and `.luz-table-wrap` take the whole width of the wrapper, never more.
- **Space between blocks.** A block starts `--luz-space-md` below the one before it. A heading or a rule starts further down (`--luz-space-xl`), and the block after a heading sits closer (`--luz-space-sm`). Margins, not a gap: a component inside keeps its own margin, and the two collapse.
- **Lists.** Every list gets its indent and markers back, with a class or without one (an editor's `ul.wp-block-list`), except a list with a layout object (`.o-grid`, `.o-stack`) or a LUZ component class.
- **Inline code** has the look of `.luz-code-inline`. Long words and addresses break rather than push the page sideways.
- **Classless mode** takes the same three steps between blocks, so the two agree; prose is in a later layer, so it wins where they meet. Prose adds the line length and the lists; classless mode adds the look of tables and controls.

### Without JavaScript
Nothing changes: prose is CSS.

### Keyboard and ARIA
Prose takes no focus and adds no role. Tab reaches the links and controls inside it, in source order.

- A long `<pre>` scrolls sideways inside itself. To scroll it with the keyboard, give it `tabindex="0"`, `role="region"` and a name, as core's [code block](https://nandovejer.github.io/luz/docs/components/code/) does.
- The headings inside make the outline of the text: start at the level under the page's title, and do not skip one.

### When to use
Use prose around running text whose markup you do not write block by block: the body of a post or a page from a CMS editor, Markdown, a help article.

### When not to use
Do not put prose around a whole page or an interface: the header, the navigation, forms and cards lay themselves out.

- For a column of blocks you build yourself, use [`.o-stack`](https://nandovejer.github.io/luz/docs/components/layout/).
- For one or two lines inside a component, such as a card's text, use the component's own classes.
