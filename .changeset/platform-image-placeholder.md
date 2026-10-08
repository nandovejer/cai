---
"@cai-ds/platform": minor
---

New `.cai-platform-image`: a frame of fixed ratio around a native `<picture>`, with an abstract placeholder for when there is no image.

**New (`@cai-ds/platform`)**

- `.cai-platform-image` is 16:9 by default; `--4x3`, `--3x2`, `--1x1`, `--21x9` and `--9x16` set the other ratios. The image fills the frame and is cropped to it.
- A frame with no image shows an abstract placeholder in the colours of the vejer theme: arches, sky and sandstone, no text. CSS picks AVIF, WebP or JPEG with `image-set()`, without JavaScript. It is a background, so screen readers skip it.
- In dark mode the placeholder has a night version, drawn from vejer's dark palette. It follows the same hooks as the dark tokens: `data-theme="dark"`, a custom theme's `data-mode="dark"`, and the colour-mode switcher's dark radio without JavaScript. High contrast keeps the day version.
- While an image loads or if it fails, the frame is a flat `--cai-layer-03` surface, so a failed image's alt text keeps the contrast of normal text. Transparent images sit on that surface too.
- `dist/placeholders/` ships the placeholder by day and by night in every ratio. AVIF and WebP come at 640, 1280 and 1920 pixels on the long side, and JPEG, the fallback, at 640 and 1280. `placeholder.svg` and `placeholder-night.svg` fit any size. They are exported as `@cai-ds/platform/placeholders/*`. Use them in your own `<picture>`, with `alt=""`, to show the placeholder on purpose. They add about 680 kB unpacked to the package. A page downloads one AVIF of 1–4 kB per ratio it uses.
- It makes obsolete the empty grey boxes and one-off fallback images that apps add for missing pictures.

**Known issues**

- In forced-colors mode browsers drop the placeholder; the frame keeps a thin border instead.
- The night version follows a dark mode set on a page or a section, but not a light section inside a dark one.
