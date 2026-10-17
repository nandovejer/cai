# Stat

Shows one figure big, with a short label under it.

### Known issues
None known.

### Copy the markup
Stat markup
```html
<ul class="o-grid o-grid--3">
  <li>
    <div class="luz-landing-stat">
      <p class="luz-landing-stat__value">4,000+</p>
      <p class="luz-landing-stat__label">teams on the platform</p>
    </div>
  </li>
  <!-- one li for each stat; a card is a li.luz-card -->
</ul>
```

### Variants and options
No modifiers: two parts, alone or inside a card.

- `.luz-landing-stat`: The block: the value over the label, a small gap (`--luz-space-2xs`) apart, and no padding or surface
- `.luz-landing-stat__value`: The figure: heading font, 3xl, light, with figures of equal width; it wraps anywhere in a narrow column
- `.luz-landing-stat__label`: What the figure counts: sm size, in the secondary text colour

### How it works
CSS from `@luz-ds/landing`. No JavaScript, and `@luz-ds/site` is optional.

- The stat lays out nothing: put several in a core grid list, `ul.o-grid.o-grid--3`. In a [card](https://nandovejer.github.io/luz/docs/components/card/) it uses the card's padding and surface.

### Without JavaScript
Nothing changes: the stat is HTML and CSS, and does not count up.

### Keyboard and ARIA
The stat has no interaction or role of its own.

- The value comes before the label in the source, so it is read in that order. Put stats in a `<ul>`, under the section's heading.

### When to use
Use a stat for a figure that backs up a claim: how many use the product, how fast it is. Two to four together read at a glance.

### When not to use
Do not use a stat for a figure that needs a sentence to be understood.

- For rows and columns to compare, use a [table](https://nandovejer.github.io/luz/docs/components/table/).
