---
"@cai-ds/site": minor
---

Hero pattern: `.cai-site-hero`, the first block of a home, landing or front page, with `__copy` (an optional `__eyebrow`, the `h1` `__title`, `__lead` and a `.cai-site-actions` row) and an optional `__media` holding a `.cai-site-image`.

- With a picture, two equal columns when each gets 24rem, one below: the columns are intrinsic, like the feature grid's, so the hero stacks in a narrow column and with larger text, needs no modifier and no `:has()`. The copy comes first in the source, so first in reading order and at the inline start in both writing directions.
- Title `--cai-text-4xl` (3xl below 1024 px, 2xl at 640 px and below), lead `--cai-text-xl` (lg, then base). In Arabic the eyebrow uses the sans and neither it nor the title has letter-spacing.
- No JavaScript. Docs page at `/docs/site/hero/`; the home page and the "Hero with an image" template now use it.
