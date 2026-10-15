# @luz-ds/site

Five self-contained site components, each a light-DOM `<luz-*>` tag: search, cookie consent, language switch, submenu and banner. A piece is here when it can go in any section of a page of any kind of site and acts for the site as a whole; everything else is in `@luz-ds/core`. The page structure (header, hero, page header, footer) is never here: it is in the packages for one kind of site, which work without this one. [`@luz-ds/landing`](../landing) is for a landing page, [`@luz-ds/cms`](../cms) for a blog, a newspaper or any CMS, and [`@luz-ds/app`](../app) for a web application.

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
- **`./css`** → `site.css` — The five components' styles (`./css/min` for the minified twin)
- **`./components/*`** → `dist/components/` — one stylesheet per component, `<name>.css` and `<name>.min.css`, each in `luz.site`, for a page that loads only what it uses
- **`./print.css`** → `print.css` — what site's pieces do on paper, in `luz.site`, for a page that loads components one by one (`site.css` already has it)

## Tags and classes included

Each tag is the block; its parts are `.luz-<tag>__<part>`.

- `<luz-submenu>` — An item of the header's links that holds more links: a tag (no class, no script, `display: contents`) around a native `<details name>`, in the flow in the menu panel and a box under its button from 769 px
- `<luz-banner>` (`tone="warning"`) — A tag (no class, no script) around one `<section aria-labelledby>`: a band above the header with one short announcement and one link; no close button
- `<luz-consent>` and `.luz-consent` (`__title`, `__choices`) — The cookie banner, first after the skip link in the markup and shown as a band fixed at the bottom of the window (in the flow under 30rem tall), hidden until `consent.js` shows it; its confirmation has a `[data-luz-consent-close]` button, and while it shows `consent.js` sets `--luz-consent-h` on `:root` so the page keeps room for it
- `<luz-lang-switch>` with `.luz-lang-switch__button`, `__menu`, `__list`, `__link`, `__name`, `__title`, `__icon` — Language switch: a tag (no script) around a button that opens a native popover list of links; `--luz-lang-switch-top` (default `--luz-bar-h`) places the list
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

A band fixed at the bottom of the window asks once whether the site may use optional cookies: Accept and Reject side by side, with the same style, and a `<details>` with one checkbox per category. It is `hidden` in the markup and `consent.js` shows it when no answer is stored, when the stored one has expired (180 days by default, `data-luz-consent-days`, 395 at most), or when it offers a category the stored answer was not asked about. It does not take focus, and while it shows it reserves the page's height, so it covers nothing; Escape is not an answer. Without JavaScript it stays hidden: none of your scripts run either, and the cookie policy is a link on every page.

The answer is stored in `localStorage` under `luz-consent` (or `data-luz-consent-key`, starting with `luz-`), as `{"version":1,"expires":<ms>,"asked":[…],"granted":[…]}`. Read it with `getConsent()`, which returns `{ asked, granted, expires }` or `null`, and listen for `luz:consent` on `document`, dispatched with the same object as `detail` on every new answer. A button with `data-luz-consent-open` (and `hidden`) shows the banner again. The script writes no text. Full markup on the [Cookie consent page of the docs](https://nandovejer.github.io/luz/docs/site/consent/).

```js
import { getConsent } from "@luz-ds/site/consent";
const granted = (answer) => answer?.granted.includes("analytics");
if (granted(getConsent())) startMeasuring();
document.addEventListener("luz:consent", (e) => (granted(e.detail) ? startMeasuring() : location.reload()));
```

## What moved out

Before 0.1, this package also held the page structure. The skip link, the image frame (`.luz-image`, a flat surface with no placeholder), the band, the action group (`.o-actions`), the sticky bar (`.o-sticky`), the page column (`.o-page`) and the header's links (`.luz-navbar`) are in `@luz-ds/core`; the header, hero, sections and footer of a landing page in `@luz-ds/landing`; the header, page header and footer of a blog in `@luz-ds/cms`. The image placeholders are no longer published.

## License

MIT
