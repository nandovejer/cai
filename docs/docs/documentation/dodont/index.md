# Do and don't

A Do and a Don't, one example to follow and one to avoid, each with its reason, side by side when there is room.

### Known issues
In browsers without alternative text for generated content (Safari before 17.4, Firefox before 128), a screen reader may read the tick or the cross before "Do" or "Don't". The word that follows is always read.

Not tested with a screen reader.

### Copy the markup
A pair: the Do first, then the Don't. Each is a figure whose caption says why:

Do and don't markup
```html
<div class="luz-docs-dodont">
  <figure class="luz-docs-dodont__item luz-docs-dodont__item--do">
    <figcaption><strong class="luz-docs-dodont__verdict">Do</strong> Title a page for what it lets the reader do.</figcaption>
    <div class="luz-docs-dodont__stage" inert aria-hidden="true">
      <h3>Install the command line tool</h3>
    </div>
  </figure>
  <figure class="luz-docs-dodont__item luz-docs-dodont__item--dont">
    <figcaption><strong class="luz-docs-dodont__verdict">Don't</strong> Use a title that fits any page: "Introduction" tells the reader nothing.</figcaption>
    <div class="luz-docs-dodont__stage" inert aria-hidden="true">
      <h3>Introduction</h3>
    </div>
  </figure>
</div>
```

### Variants and options
One block, its parts, and two modifiers for the two verdicts.

- `.luz-docs-dodont`: On a `<div>`: the pair, in columns of at least 17.5rem. Side by side when there is room, stacked below
- `.luz-docs-dodont__item`: On each `<figure>`: a framed box with the caption and the stage
- `.luz-docs-dodont__item--do`: A solid frame in the success colour
- `.luz-docs-dodont__item--dont`: A dashed frame in the danger colour
- `.luz-docs-dodont__verdict`: On a `<strong>` that starts the caption: "Do" or "Don't", in the colour of its frame, with a tick or a cross before it
- `.luz-docs-dodont__stage`: The picture: a bordered box on the page surface. Make it `inert` and `aria-hidden="true"`. For a mistake that would itself be a barrier, use a `pre.luz-code-block` in its place

### How it works
CSS from `@luz-ds/docs`. It draws the verdict three ways; the words are yours.

- The verdict is a word first. The tick or the cross before it, the solid or dashed frame and the colour are extra cues, and none is the only one.
- The tick and the cross are generated content with an empty alternative, so a screen reader does not read them.
- The stage is inert and hidden from assistive technology: it is a picture, and the caption says what it shows. Nothing in it takes focus or is announced.
- A mistake that would be a barrier when live, such as low contrast or wrong semantics, is shown as code in a `pre.luz-code-block`, never as a live stage.
- Write the Do first, then its Don't. A page can have several pairs, one after another.

### Without JavaScript
Nothing changes. The stage is inert by its attribute, and the pair is CSS.

### Keyboard and ARIA
- **Order:** the Do, then the Don't. Each is a `<figure>` with a `<figcaption>`, read as the caption of its picture.
- **Stage:** `inert` keeps focus and clicks out of it, and `aria-hidden="true"` keeps it out of the accessibility tree. Do not put a link or a field in it that the reader should use.
- **Code stage:** a `pre.luz-code-block` keeps `tabindex="0"` and an `aria-label`, as it scrolls.

### When to use
Use Do and don't to teach a rule by contrast: the reader sees the right way next to the wrong one.

- A lesson that is easier to see than to say, such as a title, a label or a spacing.
- One pair for each lesson, and the Don't is a mistake people make.

### When not to use
Do not use it for a rule with nothing to compare, or to show a piece that works.

- To show how a piece looks and is built, use [the example](https://nandovejer.github.io/luz/docs/documentation/example/).
- Do not invent a mistake nobody makes to fill the Don't.
- Do not show a live failure. A contrast or semantics failure goes in code.
