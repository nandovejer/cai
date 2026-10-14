# @luz-ds/site

What every site needs, above the components: page shell, site header with submenus, notice, cookie consent, footer, sections, image frame, site search and language switcher. A piece is here when it needs data of the site or holds other pieces; everything else is in `@luz-ds/core`. Packages for one kind of site build on this one: [`@luz-ds/landing`](../landing) for a landing page, [`@luz-ds/cms`](../cms) for a blog, a newspaper or any CMS.

> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

## Prerequisites

Requires `@luz-ds/tokens` and `@luz-ds/core` (both declared as peer dependencies), loaded in that order before this package.

## Installation

```bash
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site
```

## Usage

### Via npm/bundler

```js
import '@luz-ds/tokens/css'
import '@luz-ds/core/css'
import '@luz-ds/site/css'

import '@luz-ds/core'        // optional: the core behaviors
import '@luz-ds/site'    // the loader: the search and the cookie banner, when the page has them
```

`@luz-ds/core` and `@luz-ds/site` without `/css` are the scripts.

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"></script>
<!-- The loader: it loads search.min.js on a page with a <luz-search>
     and consent.min.js on a page with a <luz-consent>, and nothing else -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>
```

With Subresource Integrity, an `integrity` on the `<script>` covers `site.min.js` only. List each chunk the page may load in a `<link rel="modulepreload">` with its own hash, before the script: the browser checks it, and the loader's import uses that verdict.

```html
<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/search.min.js" integrity="sha384-…" crossorigin>
<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/consent.min.js" integrity="sha384-…" crossorigin>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js" integrity="sha384-…" crossorigin></script>
```

## Package exports

- **`.`** → `site.js` — The presence loader. Warns when core is not loaded, scans the page once and loads `search.js` when it has a `<luz-search>` (on the first pointerdown or focus in it, Ctrl+K, or idle) and `consent.js` when it has a `<luz-consent>` (on idle). `site.min.js` imports `./search.min.js` and `./consent.min.js` and nothing else
- **`./search`** → `search.js` — defines `<luz-search>`, a custom element (light DOM) that holds the fallback link, the trigger and the search `<dialog>`, and wires them when it connects; importing it in a page defines the element (once, however many copies), importing it in Node does nothing. Import it by hand for a `<luz-search>` added after the page has loaded
- **`./consent`** → `consent.js` — defines `<luz-consent>`, the cookie banner (light DOM), and exports `getConsent(key?)`. Importing it in Node does nothing but give `getConsent`
- **`./css`** → `site.css` — App shell and layout primitives (`./css/min` for the minified twin)
- **`./components/*`** → `dist/components/` — one stylesheet per component, `<name>.css` and `<name>.min.css`, each in `luz.site`, for a page that loads only what it uses
- **`./print.css`** → `print.css` — what site's pieces do on paper, in `luz.site`, for a page that loads components one by one (`site.css` already has it)
- **`./placeholders/*`** → `dist/placeholders/` — The image placeholder: `placeholder[-night]-<ratio>-<width>.{avif,webp,jpg}`, `placeholder.svg` and `placeholder-night.svg`

## Classes included

- `.luz-site-page` — Full-page container with optional gradient
- `.luz-site-content` — Constrained content wrapper
- `.luz-site-main` — Main content area
- `.luz-site-section` — Semantic section divisions
- `.luz-site-page-header`, `__title`, `__lead` — Page header block
- `.luz-site-actions` — Action button group
- `.luz-site-header` (`--sticky`, `__inner`, `__brand`, `__nav`, `__actions`) — Site header: the name, the main links and a few controls; below 769 px the links are a native popover panel opened by core's `.luz-nav-toggle`, with no script
- `<luz-submenu>` — An item of the header's links that holds more links: a tag (no class, no script, `display: contents`) around a native `<details name>`, in the flow in the menu panel and a box under its button from 769 px
- `<luz-banner>` (`tone="warning"`) — A tag (no class, no script) around one `<section aria-labelledby>`: a band above the header with one short announcement and one link; no close button
- `<luz-consent>` and `.luz-consent` (`__title`, `__choices`) — The cookie banner, first after the skip link in the markup and shown as a band fixed at the bottom of the window (in the flow under 30rem tall), hidden until `consent.js` shows it; its confirmation has a `[data-luz-consent-close]` button, and while it shows `consent.js` sets `--luz-consent-h` on `:root` so the page keeps room for it
- `.luz-site-footer` — Page footer
- `<luz-lang-switch>` with `.luz-lang-switch__button`, `__menu`, `__list`, `__link`, `__name`, `__title`, `__icon` — Language switch: a tag (no script) around a button that opens a native popover list of links; `--luz-lang-switch-top` (default `--luz-bar-h`) places the list
- `.luz-site-skip-link` — Accessibility skip link
- `.luz-site-image` — Fixed-ratio frame around a native `<picture>`; modifiers `--4x3`, `--3x2`, `--1x1`, `--21x9`, `--9x16`
- `<luz-search>` with `.luz-search__fallback` (`__fallback-label`), `.luz-search__trigger` (`--compact`, `__trigger-icon`, `__trigger-label`, `__trigger-key`) and `.luz-search` (`__body`, `__head`, `__title`, `__field`, `__status`, `__close`, `__results`, `__foot`) — Site search: a link to your index that a button replaces, in the same space, and a native `<dialog>` of grouped links

## Search

A button shaped like a field ("Search docs…", <kbd>Ctrl K</kbd>) opens a native `<dialog>` with a field and the results as links, grouped under Pages, Sections and HTML elements (8 per group at most). Ctrl+K and ⌘K open it too, also before its script has loaded. Without JavaScript the button stays hidden and a plain link to your index page shows in its place. Every fixed text is in your markup, and the few the script writes (the count, "no results", loading, error) are `data-luz-label-*` attributes on the dialog, in the page's language. The full markup, the keyboard model and the index format are on the [Search page of the docs](https://nandovejer.github.io/luz/docs/site/search/).

The index is a JSON file on the same origin (`data-luz-search-src`), format version 1, with URLs relative to the file:

```json
{ "version": 1,
  "pages": [["Button", "components/button/", "Components"]],
  "sections": [["When to use, Button › Design", "components/button/#when"]],
  "elements": [["<table> element, Tables", "html/tables/#el-table"]] }
```

Each item is `[text, url, meta?, lang?]`. The component fetches it only from the page's own origin, without following redirects (your CSP needs `connect-src 'self'`), keeps only `http:` and `https:` links, writes every text as text, and has limits: 1,000,000 characters of JSON, 10,000 results, 300 characters a text, 8 words a search. Unknown fields are ignored.

## Cookie consent

A banner above the header asks once whether the site may use optional cookies: Accept and Reject side by side, with the same style, and a `<details>` with one checkbox per category. It is `hidden` in the markup and `consent.js` shows it when no answer is stored, when the stored one has expired (180 days by default, `data-luz-consent-days`, 395 at most), or when it offers a category the stored answer was not asked about. It covers nothing and takes no focus; Escape is not an answer. Without JavaScript it stays hidden: none of your scripts run either, and the cookie policy is a link on every page.

The answer is stored in `localStorage` under `luz-consent` (or `data-luz-consent-key`, starting with `luz-`), as `{"version":1,"expires":<ms>,"asked":[…],"granted":[…]}`. Read it with `getConsent()`, which returns `{ asked, granted, expires }` or `null`, and listen for `luz:consent` on `document`, dispatched with the same object as `detail` on every new answer. A button with `data-luz-consent-open` (and `hidden`) shows the banner again. The script writes no text. Full markup on the [Cookie consent page of the docs](https://nandovejer.github.io/luz/docs/site/consent/).

```js
import { getConsent } from "@luz-ds/site/consent";
const granted = (answer) => answer?.granted.includes("analytics");
if (granted(getConsent())) startMeasuring();
document.addEventListener("luz:consent", (e) => (granted(e.detail) ? startMeasuring() : location.reload()));
```

## Image and placeholder

`.luz-site-image` is a 16:9 frame (or the ratio of its modifier) around a native `<picture>`. The image fills the frame and is cropped to it, so keep text and essential detail away from the edges. When the frame has no image, CSS draws an abstract placeholder in the colours of LUZ's default look (Vejer) with `image-set()` (AVIF, then WebP, then JPEG), with no JavaScript. In dark mode (`data-theme="dark"`, a custom theme's `data-mode="dark"`, or the colour-mode switcher's dark radio) it draws a night version. The placeholder is decorative: it is a background and screen readers skip it. While an image loads or if it fails, the frame is a flat `--luz-surface-strong` surface, so a failed image's alt text stays readable; transparent images sit on it too. Give your real image an `alt` that says what stays visible in the frame, or `alt=""` if it is decorative. Use `loading="lazy"` only below the fold.

```html
<!-- With an image -->
<div class="luz-site-image">
  <picture>
    <source type="image/avif" srcset="photo-640.avif 640w, photo-1280.avif 1280w" sizes="100vw">
    <source type="image/webp" srcset="photo-640.webp 640w, photo-1280.webp 1280w" sizes="100vw">
    <img src="photo-1280.jpg" srcset="photo-640.jpg 640w, photo-1280.jpg 1280w" sizes="100vw"
      width="1280" height="720" alt="What the photo shows" decoding="async">
  </picture>
</div>

<!-- With no image: the placeholder -->
<div class="luz-site-image luz-site-image--1x1"></div>
```

The placeholder files ship in `dist/placeholders/`, next to `site.css`, which points at them with relative URLs, so they work from npm and from a CDN. Every ratio (`16x9`, `4x3`, `3x2`, `1x1`, `21x9`, `9x16`) comes in AVIF and WebP at three widths and in JPEG at the two smaller ones, by day (`placeholder-`) and by night (`placeholder-night-`). The number in the file name is the width in pixels: 640, 1280 and 1920 for the landscape and square ratios (JPEG at 640 and 1280), and 360, 720 and 1080 for `9x16` (JPEG at 360 and 720), so the long side is 640, 1280 and 1920 pixels in every case. `placeholder.svg` and `placeholder-night.svg` fit any size. To show the placeholder on purpose, use them in your own `<picture>` with `alt=""`. They are generated from the SVGs with ImageMagick by `pnpm placeholders:build` in the repository.

## License

MIT
