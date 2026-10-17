# Install LUZ

Pick a level, then copy one install command or the CDN tags. Each level needs the ones below it and nothing above.

Know what you are building? [Choose your snippet](https://nandovejer.github.io/luz/docs/get-started/snippet/) and copy the lines for it, CDN hashes included.

Beta

Names, classes and behaviour can still change before the stable release. Pin an exact version, and read the changelog before you upgrade.

### Which level do I need?

- **Your own components, LUZ's colours and spacing:** level 1, tokens only.
- **Ready-made buttons, forms, tables and dialogs:** level 2, tokens and core.
- **Whole pages: shell, page header, footer, search:** level 3, all three packages.
- **A landing page, with its header, hero and blocks:** level 3 and [a package for that kind of site](https://nandovejer.github.io/luz/docs/get-started/#site-kinds).

### Level 1: tokens only

CSS custom properties: the colour, space and type scales, and the colours of light, dark and high contrast. No other LUZ package is needed.

`pnpm add @luz-ds/tokens`

CDN tags, level 1
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
```

With a bundler such as Vite, import the files instead of adding tags. A `href` cannot name a package: these paths are for `import` only.

Bundler imports, level 1
```js
import "@luz-ds/tokens/css";
```

- Running text and headings use ET Book, an MIT-licensed font that ships with the tokens. Controls, labels and tables use the system sans, and code the system mono.
- Bringing your own fonts? Load `dist/tokens.min.css` instead: the same tokens without any `@font-face`.
- Check your own colours against the WCAG ratios with `npx @luz-ds/tokens check-contrast`, or [in the browser](https://nandovejer.github.io/luz/docs/tokens/contrast/).

### Level 2: tokens and core

The 32 components, the styles of bare HTML elements, and optional JavaScript. Load tokens first.

`pnpm add @luz-ds/tokens @luz-ds/core`

CDN tags, level 2
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">

<!-- Optional: copy buttons, tabs, players, the color mode -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
```

Bundler imports, level 2
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";

// Optional: copy buttons, tabs, players, the color mode
import "@luz-ds/core";
```

- Every page works without the script. See [what each JavaScript module adds](https://nandovejer.github.io/luz/docs/get-started/javascript/).
- Need a single component? Load `dist/base.min.css` plus the file you want, for example `dist/components/button.min.css`.
- Markup you cannot add classes to, such as Markdown or a CMS? Load [`classless.css`](https://nandovejer.github.io/luz/docs/get-started/classless/) and mark the zone with `data-luz-classless`.

### Level 3: tokens, core and site

Six components that need data of the site: search, cookie consent, color mode, language switch, submenu and banner. Site needs core and tokens.

The page structure, from the header to the footer, is in landing and cms, which work without site.

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site`

CDN tags, level 3
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

Bundler imports, level 3
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/site/css";

// Optional: core behaviours, and the site search
import "@luz-ds/core";
import "@luz-ds/site";
```

### Packages for one kind of site

On top of level 3, a package can add what one kind of site needs:

- [Landing](https://nandovejer.github.io/luz/docs/landing/): the header, hero, sections and footer of a landing page, and blocks to copy for it.
- [CMS](https://nandovejer.github.io/luz/docs/cms/): the header, page header, article header, table of contents and footer of a blog or a newspaper, with any CMS.
- [App](https://nandovejer.github.io/luz/docs/app/): the header and the dashboard of a web application.
- [Documentation](https://nandovejer.github.io/luz/docs/documentation/): the shell, page head, rail, example, do and don't, pager and page foot of a documentation site.

Each needs the packages of level 2, loaded first. Site is optional for them, and the commands below add it for its search and its language switch.

Install the one you need.

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/landing`

CDN tags, landing
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/landing@0.0.0/dist/landing.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/cms`

CDN tags, cms
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/cms@0.0.0/dist/cms.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/app`

CDN tags, app
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.0.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/app@0.0.0/dist/app.min.css">

<!-- Optional: core behaviours, and the site search and cookie banner -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js"></script>
```

`pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/docs`

- Landing, cms, app and docs each have their own version and need `^0.1.0` of the base. Pin both numbers.
- With a bundler, add `import "@luz-ds/landing/css";`, `import "@luz-ds/cms/css";`, `import "@luz-ds/app/css";` or `import "@luz-ds/docs/css";` after the imports of level 3.
- None has a script. Core's script is optional: with cms, it marks the section in view in the table of contents; with app, it marks the current link of the sidebar and closes the drawer when a link is followed.

### Before you ship

- npm and pnpm install the lower levels for you. Yarn only warns, so list every package, as above.
- On a CDN, pin an exact version and add an `integrity` hash with `crossorigin="anonymous"`. Compute the hash from the file you load, as below.
- The core and site scripts warn in the console when the level below is missing.
- Set `lang` on `<html>`: core's scripts write their text in that language (English and Spanish ship).

Computing the integrity hash
```text
curl -s https://cdn.jsdelivr.net/npm/@luz-ds/core@0.0.0/dist/luz.min.css | openssl dgst -sha384 -binary | openssl base64 -A
```

Write the result as `integrity="sha384-…"` on the tag that loads that file, and repeat it for each file.

A hash on a script covers that file only, not the files it loads later. `site.min.js` loads `search.min.js` on a page with a search and `consent.min.js` on a page with a cookie banner and `mode.min.js` on a page with an Auto color mode.

Give each one its own hash in an import map, before the first module script. It works in Chrome 127, Safari 18 and Firefox 138 and later; an older browser ignores it and loads the files unchecked.

A `<link rel="modulepreload">` with a hash is not a guard in Safari or Firefox: use it as a performance hint only.

Integrity for the site scripts
```html
<script type="importmap">
{
  "integrity": {
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/search.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/consent.min.js": "sha384-…",
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/mode.min.js": "sha384-…"
  }
}
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.0.0/dist/site.min.js" integrity="sha384-…" crossorigin="anonymous"></script>
```

### Next steps

- [Choose your snippet](https://nandovejer.github.io/luz/docs/get-started/snippet/) for your kind of site and the way you load it.
- [Browse the components](https://nandovejer.github.io/luz/docs/components/) and copy their markup.
- [Set up the color modes](https://nandovejer.github.io/luz/docs/tokens/modes/): light, dark and high contrast.
- [Learn how the tokens work](https://nandovejer.github.io/luz/docs/tokens/) before you write your own components.
- [See how LUZ is organised](https://nandovejer.github.io/luz/docs/get-started/structure/): packages, CSS layers and the page skeleton.
