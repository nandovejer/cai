# Meta line

Shows a few facts about something on one line, such as its date, its reading time and its author, with a dot between them.

### Known issues
The dots are hidden from screen readers with alternative text for generated content, which Firefox has since version 128 and Safari since 17.4. An older browser lets a screen reader read each dot.

Not yet tested with a screen reader.

### Copy the markup
Meta line markup
```html
<p class="luz-meta">
  <span>By <a href="/authors/ana-ruiz/">Ana Ruiz</a></span>
  <time datetime="2026-10-12">12 October 2026</time>
  <span>6 min read</span>
</p>
```

### Variants and options
There are no modifiers.

- `.luz-meta`: The line: facts in a row that wraps, in the sans, in the secondary text colour
- Each child: One fact: a `<time>`, a link, or a `<span>` of text. Every child after the first gets a dot before it

### How it works
CSS only, in `components/meta.css`: a flex row that wraps, and a dot drawn by `::before` on each fact after the first.

- The dot sits in the gap before its fact. The line clips its start and end edges, so a fact that wraps to the start of a new line leaves its dot outside: no line starts with a dot.
- The line has 4 px of padding at each end, room for a link's focus ring inside the clip, and a negative margin of the same size, so its text lines up with the text above it.
- The dot is written `content: "·" / ""`: an empty alternative text, so screen readers do not read it.
- Nothing in it is positioned, so in a card whose title link covers the card, the whole card stays one link.

### Without JavaScript
Nothing changes: the meta line is CSS. Without CSS, the facts run together on one line with the spaces of your markup between them: keep a space or a line break between the elements.

### Keyboard and ARIA
The line takes no focus and adds no role. Tab reaches the links in it, in order.

- A screen reader reads the facts one after another, without the dots. Write each fact so it makes sense alone: "6 min read", not "6".
- Give a date a `<time datetime>`, so software can read it.

### When to use
Use a meta line for two to four short facts about a post, a story or an item: the author, the date, the reading time, the section.

### When not to use
Do not use it for a sentence, or for facts the reader needs to compare across items.

- Facts with labels, such as a price and a size, are a description list (`<dl>`) or a [table](https://nandovejer.github.io/luz/docs/components/table/).
- A path of pages is a [breadcrumb](https://nandovejer.github.io/luz/docs/components/breadcrumb/); a set of labels is a row of [tags](https://nandovejer.github.io/luz/docs/components/tag/).
