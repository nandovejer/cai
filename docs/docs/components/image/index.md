# Image

Shows a picture in a frame of fixed shape, on a flat surface while it loads or when it is missing.

### Known issues
If an image fails to load, some browsers add a broken-image icon next to its alt text. In forced-colors mode the surface takes the page's colour, and the frame shows a thin border instead.

### Copy the markup
Image frame markup
```html
<div class="luz-image">
  <picture>
    <source type="image/avif" srcset="dunes-640.avif 640w, dunes-1280.avif 1280w" sizes="(min-width: 768px) 50vw, 100vw">
    <source type="image/webp" srcset="dunes-640.webp 640w, dunes-1280.webp 1280w" sizes="(min-width: 768px) 50vw, 100vw">
    <img src="dunes-1280.jpg" srcset="dunes-640.jpg 640w, dunes-1280.jpg 1280w" sizes="(min-width: 768px) 50vw, 100vw"
      width="1280" height="720" alt="Sand dunes under a low sun" loading="lazy" decoding="async">
  </picture>
</div>
```

### Variants and options
One modifier sets the shape. Without one, the frame is 16:9.

- `.luz-image`: 16:9
- `.luz-image--4x3`: 4:3
- `.luz-image--3x2`: 3:2
- `.luz-image--1x1`: Square
- `.luz-image--21x9`: 21:9, for wide banners
- `.luz-image--9x16`: 9:16, portrait

### How it works
A `<div>` of fixed aspect ratio around a native `<picture>`, styled by `@luz-ds/core`. No JavaScript.

- The image fills the frame and is cropped to it.
- The frame is a flat `--luz-surface-strong` surface: with no image, while an image loads, or when it fails. A failed image's alt text is drawn on it, and transparent PNG and SVG images sit on it too.
- LUZ ships no placeholder picture: the page asks for nothing it did not name.

### Without JavaScript
Nothing changes: the frame and the image are HTML and CSS. Without CSS the image shows at its own size.

### Keyboard and ARIA
The frame has no interaction of its own.

- Screen readers announce the `<img>` by its alt text; an empty frame announces nothing.
- Do not add a role or an `aria-label` to the frame.
- If the image is a link, the link takes its name from the alt text, which must then say where it goes.

### When to use
Use the image frame for a picture in a box of fixed shape, such as a card cover or an article header, when the picture may be missing.

- Content from people or from a content system.
- A page built before its images exist.

### When not to use
Do not use it for an image that must keep its own shape, such as a chart or a screenshot: the frame crops it.

- For a chart or a diagram with a caption, use a [figure](https://nandovejer.github.io/luz/docs/components/figure/).
- For icons and logos, use an `<img>` or an SVG at its own size.
- Never let an empty frame stand in for an image that carries information: if it is missing, say so in text.
