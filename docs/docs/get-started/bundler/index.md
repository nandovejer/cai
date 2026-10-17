# With a bundler or framework

Import LUZ's CSS and script in Astro or any tool that resolves package names, and keep the layer order and the fonts.

### The imports

Import the CSS of each package you use, tokens first, and the script if you want behaviour. A bundler resolves these names from `node_modules`; a `<link>` in HTML cannot.

The imports
```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/core";

// Only if the page uses a site element: search, consent, language switch
import "@luz-ds/site/css";
import "@luz-ds/site";

// Only for one kind of site: landing, cms or app
import "@luz-ds/landing/css";
```

- The tokens come first: every other package needs them.
- `import "@luz-ds/core"` is the script. It is optional: every LUZ page works without it.
- To load less CSS, import `@luz-ds/core/base.css` and then one file per component, for example `@luz-ds/core/components/button.css`.
- To load one script module, import it by name and call its function: see [JavaScript modules](https://nandovejer.github.io/luz/docs/get-started/javascript/).

For the lines that match what you are building, with the CDN tags and their integrity hashes, [choose your snippet](https://nandovejer.github.io/luz/docs/get-started/snippet/).

Every name above is an entry of the `exports` map of its package. This table lists all of them.

The exports of each package

- `@luz-ds/tokens`: `.`: `luz-tokens.css`, the same file as `./css`, for tools that look for the main stylesheet of a package
- `@luz-ds/tokens`: `./css`: `luz-tokens.css`: every token, with the `@font-face` rules of ET Book
- `@luz-ds/tokens`: `./css/min`: `luz-tokens.min.css`: the same, minified
- `@luz-ds/tokens`: `./tokens.css`: `tokens.css`: every token, with no `@font-face`. For when you bring your own font
- `@luz-ds/tokens`: `./fonts.css`: The `@font-face` rules alone
- `@luz-ds/tokens`: `./tokens.json`: The tokens as JSON, for tooling
- `@luz-ds/tokens`: `./dtcg`: The tokens in the W3C Design Tokens format, for Figma and other design tools
- `@luz-ds/tokens`: `./dtcg/resolver`: A resolver document for the same tokens, with their three color modes
- `@luz-ds/tokens`: `./fonts/*`: The ET Book font files that the stylesheets point to
- `@luz-ds/tokens`: `./classes.json`: Every class and custom property the package defines, with its kind and layer, as JSON for tools and AI agents
- `@luz-ds/core`: `.`: `luz.js`: the script, which starts every behaviour on the page. Import it in the browser
- `@luz-ds/core`: `./css`: `luz.css`: the reset, the bare elements, the layout objects, the components and the utilities
- `@luz-ds/core`: `./css/min`: `luz.min.css`: the same, minified
- `@luz-ds/core`: `./base.css`: The settings, the reset and the bare elements, for loading components one by one
- `@luz-ds/core`: `./print.css`: The print styles alone. `luz.css` already has them
- `@luz-ds/core`: `./classless.css`: Styles for markup you cannot add classes to, inside `data-luz-classless`
- `@luz-ds/core`: `./components/*`: One stylesheet per component, such as `@luz-ds/core/components/button.css`
- `@luz-ds/core`: `./themes/*`: The template of a look of your own, `themes/_template.css`
- `@luz-ds/core`: `./theme`: Color mode: `initThemeSystem`, `applyTheme`
- `@luz-ds/core`: `./sidebar`: Scroll spy and the drawer: `initSidebar`
- `@luz-ds/core`: `./clipboard`: Copy buttons: `initCopyButtons`
- `@luz-ds/core`: `./modal`: The fallback for `command` and `commandfor` on a dialog: `initModals`
- `@luz-ds/core`: `./highlight`: Code highlighting: `initHighlight`
- `@luz-ds/core`: `./player`: Audio and video players: `initPlayers`
- `@luz-ds/core`: `./tabs`: Tabs: `initTabs`
- `@luz-ds/core`: `./midi`: The MIDI player: `MidiPlayer`, loaded on demand
- `@luz-ds/core`: `./table-sort`: Sortable tables: `initTableSort`, loaded on demand
- `@luz-ds/core`: `./timeline`: The `<luz-timeline>` element, loaded on demand
- `@luz-ds/core`: `./utils`: Helpers such as `formatTime` and `enableJs`
- `@luz-ds/core`: `./i18n`: The strings of the scripts: `t`, `registerLocale`, `loadLocales`
- `@luz-ds/core`: `./i18n/*`: The strings of one language LUZ ships, for example `@luz-ds/core/i18n/es`: its default export is an object of strings, loaded on demand
- `@luz-ds/core`: `./classes.json`: Every class and custom property the package defines, with its kind and layer, as JSON for tools and AI agents
- `@luz-ds/core`: `./custom-elements.json`: Every custom element the package defines or styles, with its attributes and events, in the Custom Elements Manifest format, for editors and AI agents
- `@luz-ds/site`: `.`: `site.js`: loads the script of each site element the page has
- `@luz-ds/site`: `./search`: The `<luz-search>` element
- `@luz-ds/site`: `./consent`: The `<luz-consent>` element, and `getConsent`
- `@luz-ds/site`: `./mode`: The `<luz-mode>` element
- `@luz-ds/site`: `./css`: `site.css`: the styles of the site elements
- `@luz-ds/site`: `./css/min`: `site.min.css`: the same, minified
- `@luz-ds/site`: `./print.css`: The print rules of the site elements, alone
- `@luz-ds/site`: `./components/*`: One stylesheet per site element: banner, consent, language switch, mode, search and submenu
- `@luz-ds/site`: `./classes.json`: Every class and custom property the package defines, with its kind and layer, as JSON for tools and AI agents
- `@luz-ds/site`: `./custom-elements.json`: Every custom element the package defines or styles, with its attributes and events, in the Custom Elements Manifest format, for editors and AI agents
- `@luz-ds/landing`: `./css`: `landing.css`: the pieces of a landing page
- `@luz-ds/landing`: `./css/min`: `landing.min.css`: the same, minified
- `@luz-ds/landing`: `./components/*`: One stylesheet per piece
- `@luz-ds/landing`: `./classes.json`: Every class and custom property the package defines, with its kind and layer, as JSON for tools and AI agents
- `@luz-ds/cms`: `./css`: `cms.css`: the pieces of a blog or CMS
- `@luz-ds/cms`: `./css/min`: `cms.min.css`: the same, minified
- `@luz-ds/cms`: `./components/*`: One stylesheet per piece
- `@luz-ds/cms`: `./classes.json`: Every class and custom property the package defines, with its kind and layer, as JSON for tools and AI agents
- `@luz-ds/app`: `./css`: `app.css`: the pieces of a web application
- `@luz-ds/app`: `./css/min`: `app.min.css`: the same, minified
- `@luz-ds/app`: `./components/*`: One stylesheet per piece
- `@luz-ds/app`: `./classes.json`: Every class and custom property the package defines, with its kind and layer, as JSON for tools and AI agents
- `@luz-ds/docs`: `./css`: `docs.css`: the pieces of a documentation page
- `@luz-ds/docs`: `./css/min`: `docs.min.css`: the same, minified
- `@luz-ds/docs`: `./components/*`: One stylesheet per piece
- `@luz-ds/docs`: `./classes.json`: Every class and custom property the package defines, with its kind and layer, as JSON for tools and AI agents

### The layer order survives bundling

Every CSS file LUZ publishes starts with the same `@layer` statement, which declares the order of all of LUZ's layers. So the order is the same however your tool splits, reorders or joins the files: the first one to load sets it.

In the Astro build below, the layers came out in the declared order, `luz.tokens` first and `luz.print` last, and an unlayered rule of the consumer came last.

CSS of your own that is outside any layer wins over every layer of LUZ, in any position, with no `!important`. [Cascade layers](https://nandovejer.github.io/luz/docs/get-started/layers/) has the full list and how to override one.

### Astro, step by step

A new Astro project with LUZ's tokens and core, a layout that loads them, and CSS of your own that comes last.

**Built with Astro 7.3 on 2026-10-15.** LUZ is in beta and Astro changes between releases, so this page is dated: if a step fails on a newer Astro, check that release's notes first.

The build used packages packed from the LUZ repository at version 0.0.0, installed with `npm install --legacy-peer-deps`, because the peer ranges of `^0.1.0` do not resolve until 0.1.0 is published. After that, the command below needs no flag.

#### The project

The files of the project
```text
my-site/
├─ package.json
├─ astro.config.mjs            (empty config: defineConfig({}))
└─ src/
   ├─ layouts/Base.astro       the two CSS imports, the script
   ├─ styles/site.css          your own CSS, last, outside any layer
   └─ pages/index.astro
```

`astro.config.mjs` stays as Astro creates it. LUZ needed no setting in it.

#### The commands

The commands
```bash
npm create astro@latest my-site
cd my-site
npm install @luz-ds/tokens @luz-ds/core
npm run dev
```

#### The layout

src/layouts/Base.astro
```html
---
// src/layouts/Base.astro
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "../styles/site.css";
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My site</title>
  </head>
  <body>
    <slot />
    <script>
      import "@luz-ds/core";
    </script>
  </body>
</html>
```

#### Your CSS and the page

src/styles/site.css
```css
/* src/styles/site.css */
:root { --luz-type-base: 1.125rem; }
```

src/pages/index.astro
```html
---
// src/pages/index.astro
import Base from "../layouts/Base.astro";
---
<Base>
  <main class="o-container">
    <h1>My site</h1>
    <button class="luz-btn luz-btn--primary" type="button">Save changes</button>
  </main>
</Base>
```

The rule in `site.css` sets the type knob to 1.125rem and wins over LUZ's default without a layer and without `!important`. [Make it yours](https://nandovejer.github.io/luz/docs/get-started/make-it-yours/) has the other knobs.

#### What the build showed

- `astro build` and `astro dev` both worked with the two CSS imports in the frontmatter of a layout and no setting in `astro.config.mjs`.
- Astro bundled the `<script>` with `import "@luz-ds/core"` into one module file and split the lazy chunks off it.
- The fonts came out as hashed files, and the layers and your own rule came out in the order described above.

The build output was inspected, and the built page was not opened in a browser. Astro with a view transition router (`<ClientRouter />`) was not tried, and neither was Windows. The `landing`, `cms` and `app` imports have the same shape as the ones above, and were not built.

### Vite, Next, Nuxt and SvelteKit

Only Astro was built for this page; Vite on its own, Next, Nuxt and SvelteKit were not built or tested. The imports are the same ones, in the root layout or the entry file of the app. Each tool's own documentation says where CSS from a package goes:

- [Vite documentation](https://vite.dev/guide/)
- [Next.js documentation](https://nextjs.org/docs)
- [Nuxt documentation](https://nuxt.com/docs)
- [SvelteKit documentation](https://svelte.dev/docs/kit)

One fact is the same for all of them. A LUZ module has no side effect when it is imported, until you call its `init` function, and `luz.js` and `site.js` check that `document` exists first. So a framework that renders on the server can import them. In plain Node, with no `document`, ten modules of core and site were imported with no error.

### Fonts and assets

`@luz-ds/tokens/css` is `luz-tokens.css`, and its `@font-face` rules point at the ET Book files with `url()`. Your bundler resolves those paths: Astro emitted the files as hashed `woff2` assets.

To skip ET Book, import `@luz-ds/tokens/tokens.css` instead. It has the same tokens and no `@font-face`, so no font is downloaded. Then set `--luz-font-body` to the font you use: [Make it yours](https://nandovejer.github.io/luz/docs/get-started/make-it-yours/) shows how.

### A CDN in a framework

You can load LUZ from a CDN in a framework layout instead of importing it. In an Astro layout, a `<link rel="stylesheet">` in the `<head>` and a `<script type="module" src="https://…">`, each with `integrity` and `crossorigin`, stay as written. So does a script with `is:inline`. Astro only processes a `<script>` that has no attribute other than `src`.

Use the CDN or the imports, not both: LUZ would load twice. [Choose your snippet](https://nandovejer.github.io/luz/docs/get-started/snippet/) gives the tags with their hashes.

### If something does not work

- **A warning about a peer dependency.** `@luz-ds/core` asks for `@luz-ds/tokens` at `^0.1.0`. Install both, at the same version: `npm install @luz-ds/tokens @luz-ds/core`.
- **The tool cannot resolve `@luz-ds/core/css`.** The export is `./css`, with no file extension. If your tool reports an unresolved import, add the package to `vite.ssr.noExternal`, as [Astro's styling guide](https://docs.astro.build/en/guides/styling/) describes.
- **The styles come out in the wrong order.** Two copies of LUZ on the page, for example one from a CDN and one from your bundler, put their rules in the same layers: load it once. An `@import` with `layer(luz)` nests the names as `luz.luz.components`: drop the `layer()`. [Cascade layers](https://nandovejer.github.io/luz/docs/get-started/layers/) explains the order.

astro.config.mjs with the package left to the bundler
```js
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
  vite: { ssr: { noExternal: ["@luz-ds/tokens", "@luz-ds/core"] } },
});
```
