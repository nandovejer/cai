# Hero

Opens a home or landing page with its title, one sentence, the main actions and an optional picture.

### Known issues
None known.

### Copy the markup
Hero markup
```html
<section class="luz-landing-hero o-grid o-grid--split" aria-labelledby="hero-title">
  <div class="luz-landing-hero__copy">
    <p class="luz-landing-hero__eyebrow">12 and 13 May 2027 · Seville</p>
    <h1 class="luz-landing-hero__title" id="hero-title">Acme Summit 2027</h1>
    <p class="luz-landing-hero__lead">Two days of talks and workshops for retail teams.</p>
    <div class="o-actions">
      <a class="luz-btn luz-btn--primary" href="#register">Register</a>
      <a class="luz-btn luz-btn--outline" href="#programme">See the programme</a>
    </div>
  </div>
  <div class="luz-landing-hero__media">
    <div class="luz-image luz-image--4x3">
      <img src="/img/venue-1280.jpg" width="1280" height="960" alt="The main hall, full, before the opening talk" fetchpriority="high" decoding="async">
    </div>
  </div>
</section>
```

### Variants and options
Two modifiers, `--centered` and `__media--bleed`, as in the [product page template](https://nandovejer.github.io/luz/docs/landing/templates/#product-page). The eyebrow, the lead and the picture are optional; with no picture the copy takes the whole width.

The block is a class of the landing on core's split grid.

- `.luz-landing-hero`: On a `<section>` with core's `.o-grid.o-grid--split`: space above it, the gaps, and columns of at least 24rem (`--luz-grid-min`), so two equal columns when each gets 24rem, one below
- `.luz-landing-hero--centered`: One column at every width: the copy at most 48rem wide, centred, with its text and actions centred, and the picture under it
- `.luz-landing-hero__copy`: The text and the actions, first in the source
- `.luz-landing-hero__eyebrow`: A short line above the title, in small capitals of the mono face; the sans in Arabic
- `.luz-landing-hero__title`: The title: heading font, 4xl size, balanced lines; 3xl below 1024 px and 2xl at 640 px and below
- `.luz-landing-hero__lead`: One or two sentences in the secondary text colour, 70 characters wide at most; xl, lg below 1024 px and base at 640 px and below
- `.luz-landing-hero__media`: The second column, holding core's [image frame](https://nandovejer.github.io/luz/docs/components/image/)
- `.luz-landing-hero__media--bleed`: On the picture of a centred hero: it runs from edge to edge of the window, past the page's gutters, with no sideways scroll. The frame is 16:9 unless you give it a ratio

### How it works
A `<section>` named by its title, laid out by core's split grid and styled by `@luz-ds/landing`. No JavaScript, and `@luz-ds/site` is optional.

- The columns are core's [split grid](https://nandovejer.github.io/luz/docs/components/layout/#objects-actions), intrinsic: they follow the room the hero has, not the window. A hero as wide as the page splits from about 900 px of window; in a narrow column, or with larger text, it stays one column.
- The order is the source order: the copy comes first, on the left in a left-to-right page and on the right in a right-to-left one.
- The actions are core's [action group](https://nandovejer.github.io/luz/docs/components/layout/#objects-actions), `.o-actions`: at 640 px and below its buttons stack and take the whole width.
- The bleed measures the window without a viewport unit, which counts a scrollbar and scrolls the page sideways: the page's root becomes a size container (`container-type: inline-size`). The column must be centred in the window, as core's `.o-container` is.
- The `em` in a title takes the colour of `--luz-landing-title-accent`, the title's own when it is unset.
- The classes change the look only. The title must be the page's `<h1>`.

### Without JavaScript
Nothing changes: the hero is HTML and CSS.

### Keyboard and ARIA
The hero has no interaction of its own: Tab reaches its links in the order of the source.

- `aria-labelledby` on the `<section>` points at the title, so the hero is a region with the page's name.
- Keep it first inside `<main>`, so the skip link lands right before it.

### When to use
Use a hero at the top of a home page, a landing page or a front page, to say in a few words what the site or the event is and what to do first.

### When not to use
Do not use it on a page whose reader came to read or to do a task: use a plain `<h1>` and a lead paragraph, which are smaller.

- One hero per page, and only at the top.
- Not for a message in the middle of a page: use a [section](https://nandovejer.github.io/luz/docs/landing/section/), with core's [band](https://nandovejer.github.io/luz/docs/components/band/) if it must stand out.
