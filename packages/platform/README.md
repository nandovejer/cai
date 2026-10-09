# @cai-ds/platform

App-level shell patterns and layout components for the CAI Design System.

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

## Prerequisites

Requires `@cai-ds/tokens` and `@cai-ds/core` (both declared as peer dependencies), loaded in that order before platform.

## Installation

```bash
npm install @cai-ds/tokens @cai-ds/core @cai-ds/platform
```

## Usage

### Via npm/bundler

```js
import '@cai-ds/tokens'
import '@cai-ds/core'
import '@cai-ds/platform'
```

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/platform@3.0.0/dist/platform.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.js"></script>
<!-- Only for the search: it wires the dialog when the page loads -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/platform@3.0.0/dist/platform.min.js"></script>
```

## Package exports

- **`.`** → `platform.js` — Warns when core is not loaded and wires the search (`initSearch()`) once the page is parsed. `platform.min.js` is one file with the search inside
- **`./search`** → `search.js` — `initSearch(root = document)`, idempotent; importing it has no side effects
- **`./css`** → `platform.css` — App shell and layout primitives (`./css/min` for the minified twin)
- **`./placeholders/*`** → `dist/placeholders/` — The image placeholder: `placeholder[-night]-<ratio>-<width>.{avif,webp,jpg}`, `placeholder.svg` and `placeholder-night.svg`

## Classes included

- `.cai-platform-page` — Full-page container with optional gradient
- `.cai-platform-content` — Constrained content wrapper
- `.cai-platform-main` — Main content area
- `.cai-platform-section` — Semantic section divisions
- `.cai-platform-page-header`, `__title`, `__lead` — Page header block
- `.cai-platform-actions` — Action button group
- `.cai-platform-feature-grid` — Feature showcase grid
- `.cai-platform-footer` — Page footer
- `.cai-platform-skip-link` — Accessibility skip link
- `.cai-platform-command-block` — Command-line-style code snippet
- `.cai-platform-image` — Fixed-ratio frame around a native `<picture>`; modifiers `--4x3`, `--3x2`, `--1x1`, `--21x9`, `--9x16`
- `.cai-platform-search-trigger` (`--compact`, `__icon`, `__label`, `__key`) and `.cai-platform-search` (`__body`, `__head`, `__title`, `__close`, `__results`, `__foot`) — Site search: a button that opens a native `<dialog>` of grouped links

## Search

A button shaped like a field ("Search docs…", <kbd>Ctrl K</kbd>) opens a native `<dialog>` with a field and the results as links, grouped under Pages, Sections and HTML elements (8 per group at most). Ctrl+K and ⌘K open it too. Without JavaScript the button stays hidden and a plain link to your index page shows. Every fixed text is in your markup, and the few the script writes (the count, "no results", loading, error) are `data-cai-label-*` attributes on the dialog, in the page's language. The full markup, the keyboard model and the index format are on the [Search page of the docs](https://nandovejer.github.io/cai/docs/platform/search/).

The index is a JSON file on the same origin (`data-cai-search-src`), format version 1, with URLs relative to the file:

```json
{ "version": 1,
  "pages": [["Button", "components/button/", "Components"]],
  "sections": [["When to use, Button › Design", "components/button/#when"]],
  "elements": [["<table> element, Tables", "html/tables/#el-table"]] }
```

Each item is `[text, url, meta?, lang?]`. The component fetches it only from the page's own origin, without following redirects (your CSP needs `connect-src 'self'`), keeps only `http:` and `https:` links, writes every text as text, and has limits: 1,000,000 characters of JSON, 10,000 results, 300 characters a text, 8 words a search. Unknown fields are ignored.

## Image and placeholder

`.cai-platform-image` is a 16:9 frame (or the ratio of its modifier) around a native `<picture>`. The image fills the frame and is cropped to it, so keep text and essential detail away from the edges. When the frame has no image, CSS draws an abstract placeholder in the colours of the vejer theme with `image-set()` (AVIF, then WebP, then JPEG), with no JavaScript. In dark mode (`data-theme="dark"`, a custom theme's `data-mode="dark"`, or the colour-mode switcher's dark radio) it draws a night version. The placeholder is decorative: it is a background and screen readers skip it. While an image loads or if it fails, the frame is a flat `--cai-surface-strong` surface, so a failed image's alt text stays readable; transparent images sit on it too. Give your real image an `alt` that says what stays visible in the frame, or `alt=""` if it is decorative. Use `loading="lazy"` only below the fold.

```html
<!-- With an image -->
<div class="cai-platform-image">
  <picture>
    <source type="image/avif" srcset="photo-640.avif 640w, photo-1280.avif 1280w" sizes="100vw">
    <source type="image/webp" srcset="photo-640.webp 640w, photo-1280.webp 1280w" sizes="100vw">
    <img src="photo-1280.jpg" srcset="photo-640.jpg 640w, photo-1280.jpg 1280w" sizes="100vw"
      width="1280" height="720" alt="What the photo shows" decoding="async">
  </picture>
</div>

<!-- With no image: the placeholder -->
<div class="cai-platform-image cai-platform-image--1x1"></div>
```

The placeholder files ship in `dist/placeholders/`, next to `platform.css`, which points at them with relative URLs, so they work from npm and from a CDN. Every ratio (`16x9`, `4x3`, `3x2`, `1x1`, `21x9`, `9x16`) comes at 640, 1280 and 1920 pixels on the long side in AVIF and WebP, and at 640 and 1280 in JPEG, by day (`placeholder-`) and by night (`placeholder-night-`). `placeholder.svg` and `placeholder-night.svg` fit any size. To show the placeholder on purpose, use them in your own `<picture>` with `alt=""`. They are generated from the SVGs with ImageMagick by `pnpm placeholders:build` in the repository.

## License

MIT
