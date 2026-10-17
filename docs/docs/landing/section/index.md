# Main and sections

Gives a landing page its rhythm: wide room between the blocks of the main, a closer one inside each section, with its head, and an optional glow behind the page.

### Known issues
None known for the main and the sections. A section on core's [band](https://nandovejer.github.io/luz/docs/components/band/#known-issues) has the band's.

### Copy the markup
Main and sections markup
```html
<body class="o-page luz-landing-glow">
  <a class="luz-skip-link" href="#main-content">Skip to content</a>
  <!-- the header -->
  <main id="main-content" class="o-container o-stack luz-landing-main" tabindex="-1">
    <!-- the hero -->
    <section class="o-stack luz-landing-section" aria-labelledby="programme-title">
      <h2 id="programme-title">Programme</h2>
      <p>Twelve talks and six workshops over two days.</p>
    </section>
    <section class="o-stack luz-landing-section luz-band" aria-labelledby="last-seats-title">
      <h2 id="last-seats-title">Registration closes on 30 April</h2>
      <div class="o-actions">
        <a class="luz-btn luz-btn--primary" href="#register">Register now</a>
      </div>
    </section>
  </main>
  <!-- the footer -->
</body>
```

Section head markup
```html
<section class="o-stack luz-landing-section" aria-labelledby="why-title">
  <p class="luz-landing-section__eyebrow">Why teams switch</p>
  <h2 class="luz-landing-section__title" id="why-title">One count for <em>every</em> shelf</h2>
  <p class="luz-landing-section__lead">Acme Stock reads each sale as it happens, in every shop.</p>
  <!-- the content -->
</section>
```

### Variants and options
Classes of the landing on core's objects, the head of a section and two knobs. A section stands out on core's [band](https://nandovejer.github.io/luz/docs/components/band/).

- `.luz-landing-main`: On `main.o-container.o-stack`: 64 px (`--luz-space-3xl`) between the blocks and under the last one; none above the first, as the hero brings its own
- `.luz-landing-section`: On `section.o-stack`: 16 px (`--luz-space-md`) between its children
- `.luz-landing-section__eyebrow`: Above the title: a short label, as the hero's eyebrow
- `.luz-landing-section__title`: The title, as the hero's one step smaller: 3xl; 2xl below 1024 px and xl at 640 px and below
- `.luz-landing-section__lead`: One or two sentences in the secondary text colour, 70 characters wide at most; lg, and base at 640 px and below
- `--luz-landing-title-accent`: A knob: the colour of the `em` in a hero's or a section's title. Unset, the title's colour
- `.luz-landing-glow`: On the `.o-page` element: the brand's subtle tint at the top, in the corner where reading starts, over a fade from the page surface to the muted one; none in print
- `--luz-landing-glow-x`: A knob on the glow's element: where along the top edge the tint sits, `0%` the left to `100%` the right, in both directions. Unset, the start edge

### How it works
CSS from `@luz-ds/landing` on core's objects. No JavaScript, and `@luz-ds/site` is optional.

- Core's `.o-container` gives the main its width and gutters, and `.o-stack` the column; the landing's layer comes after core's objects, so its gaps win over the stack's.
- The glow's tint sits at the start edge: top left in a left-to-right page and top right in a right-to-left one. `--luz-landing-glow-x` moves it: `50%` centres it in both directions.
- The head shares its rules, and the `em` knob, with the [hero](https://nandovejer.github.io/luz/docs/landing/hero/).
- Use a section on a `<section>` when the group has its own heading, or on a `<div>` when it does not.

### Without JavaScript
Nothing changes: the main, the sections and the glow are CSS.

### Keyboard and ARIA
None of the three has an interaction or a role of its own.

- The `<main>` is the main landmark, and the target of the skip link: give it `id` and `tabindex="-1"`.
- A `<section>` named with `aria-labelledby` becomes a region landmark; name only the sections people would jump to.
- The glow carries no meaning: without it (forced colors, print) nothing is lost.

### When to use
Use the main and its sections for every page of a landing site, so the space between blocks is the same everywhere. Use the glow on a short page, such as a home page or a sign-up page, to give it some warmth.

### When not to use
Do not use a section to space the paragraphs of running text: the text styles already do.

- For blocks side by side, use core's [grid objects](https://nandovejer.github.io/luz/docs/components/layout/), such as `ul.o-grid.o-grid--split` for a few features of equal weight.
- Do not use the glow on a long page or behind a band: the tint competes with the band's.
