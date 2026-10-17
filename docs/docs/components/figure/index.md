# Figure

Shows an image, a chart or a diagram with a caption that says what it is.

### Known issues
None known.

### Copy the markup
Figure markup
```html
<figure class="luz-figure">
  <div class="luz-figure__media">
    <img src="requests.png" width="640" height="192" alt="Bar chart: requests rise every day, from 1,200 on Monday to 3,400 on Saturday.">
  </div>
  <figcaption class="luz-figure__caption">Requests per day, last six days.</figcaption>
</figure>
```

### Variants and options
There are no modifiers.

- `.luz-figure`: A padded surface with a brand-coloured start border and rounded corners
- `.luz-figure__media`: Rounds and clips the image, chart or code inside
- `.luz-figure__caption`: Smaller, italic, secondary text colour

### How it works
The native `<figure>` and `<figcaption>`, styled by `components/figure.css`. No JavaScript.

- The caption names the figure for assistive technology.
- A bare `<figure>` with no class also gets a simple style from the base elements.

### Without JavaScript
Nothing changes: a figure is HTML and CSS.

### Keyboard and ARIA
A figure is not interactive and takes no focus.

- The media needs its own text alternative: `alt` on an `<img>`, or `role="img"` and `aria-label` on an inline `<svg>`.
- A chart also needs its numbers as text: in the alt text, the caption or a [table](https://nandovejer.github.io/luz/docs/components/table/) next to it.

### When to use
Use a figure for a chart, an image, a diagram or a code sample that the text refers to and that needs a caption.

### When not to use
Do not use a figure for decoration.

- A decorative image gets `alt=""` and no figure.
- For a picture in a box of fixed shape, use the [image](https://nandovejer.github.io/luz/docs/components/image/) frame.
