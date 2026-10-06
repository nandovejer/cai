---
"@cai-ds/tokens": minor
"@cai-ds/core": minor
"@cai-ds/platform": minor
---

Style the HTML elements that had no look of their own, without classes: `address`, `hgroup`, `p`, `blockquote`, `dl`/`dt`/`dd`, unclassed `ul`/`ol`, `menu`, `pre`, `abbr`, `b`/`strong`/`dfn`, `s`, `u`, `small`, `sub`/`sup`, `rt`, `code`/`samp`/`var`, `del`, `ins`, and the media elements (`img`, `picture`, `video`, `audio`, `canvas`, `svg`, `iframe`, `embed`, `object`) plus a bare `dialog`.

Every new rule is wrapped in `:where()`, so it has zero specificity and any `.cai-*` class or rule of your own wins. Elements that already have a component (`table`, `input`, `select`, `button`, `progress`) are still styled through its class.

`packages/core/src/elements/_elements.css` is now a folder, `elements/`, with one file per MDN category. The published `base.css` and `cai.css` are unchanged in structure.

A new reference page at `/html/` shows every current HTML element with a live example.
