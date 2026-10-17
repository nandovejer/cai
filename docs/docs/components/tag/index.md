# Tag and badge

Labels an item with a short status or category (tag), or shows a count (badge).

### Known issues
None known.

### Copy the markup
Status tag markup
```html
<span class="luz-tag luz-tag--green luz-tag--dot">Running</span>
```

Count badge markup
```html
<a href="/inbox/">Inbox <span class="luz-badge luz-badge--primary">3</span><span class="u-sr-only"> unread</span></a>
```

### Variants and options
A tag takes one colour and, if you like, the dot. A badge takes one colour.

- `.luz-tag--gray`: Neutral: a category with no status
- `.luz-tag--blue`: Information colours
- `.luz-tag--green`: Success colours
- `.luz-tag--yellow`: Warning colours
- `.luz-tag--red`: Danger colours
- `.luz-tag--teal`, `.luz-tag--purple`: Extra colours for categories, with no status meaning
- `.luz-tag--dot`: A small dot before the text, a second cue besides colour
- `.luz-badge--primary`: Brand fill
- `.luz-badge--gray`: Neutral fill
- `.luz-badge--danger`: Danger fill

### How it works
Inline `<span>` elements, styled by `components/tag.css`. No JavaScript.

- A tag is at least 24 px high, in extra-small text, on a tint of its colour.
- A badge is a small rounded count in the mono font, at least 20 px wide.

### Without JavaScript
Nothing changes: tags and badges are HTML and CSS.

### Keyboard and ARIA
Tags and badges are not interactive and take no focus.

- The text carries the meaning; the colour adds nothing a screen reader needs.
- A count needs context: put the badge inside the link or heading it counts, and add the unit as visually hidden text if it is not on screen ("3 unread").

### When to use
Use a tag to label an item with a short status or category, and a badge to show a count next to a link or a heading.

### When not to use
Do not use a tag for an action: it is not clickable.

- For an action, use a [button](https://nandovejer.github.io/luz/docs/components/button/).
- For a sentence, use an [alert](https://nandovejer.github.io/luz/docs/components/alert/).
- Do not give teal or purple a status meaning: they are for categories.
