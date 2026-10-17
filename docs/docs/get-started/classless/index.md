# Classless styles

The look of a button, a text field, a select and a table, and the space between paragraphs, headings and lists, on the bare element, inside one element you mark, for markup you cannot add classes to.

### What it is

One extra file, `classless.css`, that gives a bare `button`, `input`, `textarea`, `select` and `table` the look of the LUZ component, and the blocks of long text the space between them, inside an element that has `data-luz-classless`. It is for markup you do not control: a Markdown file, a CMS, a form from a library.

It is not in `luz.css`, and it does nothing until you load it and mark a zone. A page that does not load it is exactly what it was.

### Loading it

From a CDN, with a `<link>` for each file, in this order:

Loading classless.css from a CDN
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/classless.min.css">
```

With a bundler, import the packages' CSS entry points. A `href` cannot name a package: these paths are for `import` only.

Importing classless.css
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/core/classless.css";
```

Then mark the zone:

Marking the zone
```html
<!-- the whole page -->
<body data-luz-classless>

<!-- or only the rendered content -->
<article data-luz-classless>…</article>
```

- It declares the layer order itself, as every file does, and writes in `luz.elements`. A `.luz-*` class is in `luz.components` and wins by order.
- Put the attribute on `<body>` or an element inside it. The elements it styles are its *descendants*.
- Size: about 1.7 kB min+gzip, with a budget of its own (3 kB).

### What each element becomes

Bare element, and the component it copies

- `button`, `input` of type `button`, `reset`: `.luz-btn .luz-btn--secondary`: Sizes and the other variants: add the class
- `button type="submit"`, `input type="submit"`: `.luz-btn .luz-btn--primary`: A button with no `type` is a submit button to the browser, but not here: say `type="submit"`
- `input` of type text, email, password, search, tel, url, number, date, time, datetime-local, month, week; `textarea`: `.luz-input`, `.luz-input--textarea`: The label, helper and error of `.luz-field`
- `select`: The closed box of `.luz-select`: The styled open list, where the browser has `appearance: base-select`: that is `.luz-select`
- `table`, with its caption, `th` and `td`: `.luz-table`: Scrolling and stacking: they need a wrapper and `data-label`

Not styled, on purpose: `checkbox`, `radio`, `range`, `color`, `file` and `hidden` inputs have a native control of their own, and a `table` is never given `display: block` or a scroll box, which makes some screen readers lose its table semantics.

### Space between blocks

LUZ's reset removes every margin, so a Markdown article would run together. Inside the zone, a paragraph, list, quotation, figure, preformatted block, table, rule, `details`, `fieldset`, `form` or address starts one step (`--luz-space-md`) below the block before it.

A heading starts further down (`--luz-space-xl`), and the block that follows it sits closer (`--luz-space-sm`), so each heading belongs to what it introduces.

- The first child of its parent has no margin above it, so the zone does not push itself away from its container.
- `div`, `span` and inline elements are left alone: their layout is yours. For a column of blocks you build yourself, use [`.o-stack`](https://nandovejer.github.io/luz/docs/components/layout/).
- A button that follows a field gets the same step, so it does not touch it. Buttons side by side stay together.
- It is a margin at specificity zero: any class of yours wins, and a LUZ component that sets its own margin keeps it.
- For an article, core's [`.luz-prose`](https://nandovejer.github.io/luz/docs/components/prose/) takes the same three steps between the blocks of one wrapper and adds the line length and the indent of lists. The two work together: put both on the element that holds the text, and classless mode adds the look of its tables and controls.

### How it stays out of the way

- **Specificity zero.** Every selector is inside `:where()`, so any class of yours, in any layer, wins.
- **A LUZ class is left alone.** An element whose class contains `luz-` belongs to its component: a `.luz-copy-btn` inside the zone keeps its own look.
- **A copy, kept honest.** The declarations of the button, field, select and table are those of the components. A test compares each bare element with its component, property by property, and fails when one drifts. The space between blocks is not a copy: no component has it.
- **Everything else about it is the same:** the three color modes, focus ring, right-to-left text and forced colors work as in the component.

### Limits

- **A color mode on the same element.** The date picker and the select take their color scheme from a `data-theme` on an ancestor of the zone, as the components do: set `data-theme` on `<html>`, not on the zone.
- **Checked by script, not by hand.** The parity test passes in Chromium, Firefox 155 and WebKit 26.6, on Linux. Forced colors do not exist in Safari, so that case is checked in Chromium and Firefox only.
- **Not a component.** It has no page in the components gallery and no states of its own. If you can add a class, use the component: it has the variants, sizes and documentation.
