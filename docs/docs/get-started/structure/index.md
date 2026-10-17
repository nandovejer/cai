# How LUZ is organised

Packages that depend in one direction, CSS in cascade layers inside one called luz, and one optional script.

### Package boundaries

Each package depends on the ones above it in this list, never on the ones below.

The name stands for Light, Usable & Zero-dependency: light in weight (plain CSS and ES modules, nothing to build for the people who use it), usable by everyone (native HTML, three color modes, tested for accessibility), and with zero runtime dependencies.

Package dependency chain
```text
@luz-ds/tokens   -> primitive and semantic tokens (standalone)
      ↓ required by
@luz-ds/core     -> components, objects, bare-element styles, optional JS
      ↓ required by
@luz-ds/site     -> search, consent, mode, lang-switch, submenu and banner

Each of these needs tokens and core, and takes site as an optional peer:
@luz-ds/landing  -> header, hero, sections and footer of a landing page (own version, 0.x)
@luz-ds/cms      -> page structure of a blog, a newspaper or any CMS (own version, 0.x)
@luz-ds/app      -> header and dashboard of a web application (own version, 0.x)
@luz-ds/docs     -> shell, page head, rail, example, do and don't, pager and page foot of a documentation site (own version, 0.x)
```

- Landing, cms, app and docs need tokens and core, and can use site when you load it, never each other; site needs core and tokens; core needs tokens; tokens needs nothing.
- Tokens, core and site share one version. A package for one kind of site, such as landing, cms, app or docs, has its own, and names the major of the others it needs.
- The packages say so as peer dependencies: required for tokens and core, optional for site in landing, cms, app and docs. The core and site scripts warn in the console when a level is missing.

### What each package needs

Find the part you want, and install the package of its row and the ones below it.

Which package holds each part of a page

- Color modes, semantic tokens, ET Book: `--luz-*`, `data-theme`: tokens: Nothing else is needed
- Reset and styles of bare HTML elements: `h1`, `p`, `a`, `ul`…: core: In `base.css` and `luz.css`
- Components: `.luz-btn`, `.luz-field`, `.luz-card`, `.luz-table`, `.luz-tabs`…: core: Also one file each, in `components/`
- Modal: `.luz-modal` on a `<dialog>`: core: The script is a fallback for browsers without `command` and `commandfor`
- Layout objects: `.o-container`, `.o-grid`, `.o-stack`, `.o-media`: core: Spacing comes from the space tokens
- An app layout with a sidebar: `.o-shell`, `.o-main`, `.luz-sidebar`: core: A plain `<footer>` as a direct child of `.o-shell` goes across the bottom; its look is yours, or a kind of site's footer
- A page with no sidebar, a sticky bar, an action group: `.o-page`, `.o-sticky`, `.o-actions`: core: Instead of `.o-shell`, for a page with no sidebar: [the page and its bars](https://nandovejer.github.io/luz/docs/components/layout/#objects-page)
- Skip link, band, image frame: `.luz-skip-link`, `.luz-band`, `.luz-image`: core: The image frame keeps a ratio and crops the picture to it; with no picture it is a flat surface
- The header, hero, sections and footer of a landing page: `.luz-landing-header`, `-hero`, `-main`, `-section`, `-footer`, `-glow`: landing: On core's objects (`.o-page`, `.o-sticky`, `.o-container`, `.o-grid--split`) and core's navbar; site is optional. A feature grid is `ul.o-grid.o-grid--split`, core's
- The header, page header, article header, table of contents and footer of a blog or a newspaper: `.luz-cms-header` (`--masthead`), `-page-header`, `-article-header`, `-article`, `-toc`, `-footer`: cms: On core's objects and navbar; site is optional. Post cards, listings and the author box are core's card: [CMS templates](https://nandovejer.github.io/luz/docs/cms/templates/)
- The header and the dashboard of a web application: `.luz-app-header` (`__product`, `__actions`, `__account`), `.luz-app-dashboard` (`__head`, `__title`, `__panel`): app: On core's shell, sidebar, sticky bar, grid and card; site is optional, for the search. No script. See [App](https://nandovejer.github.io/luz/docs/app/)
- The shell, page head, rail, example, do and don't, pager and page foot of a documentation site: `.luz-docs-shell`, `.luz-docs-page-head`, `.luz-docs-rail`, `.luz-docs-example`, `.luz-docs-dodont`, `.luz-docs-pager`, `.luz-docs-page-foot`: docs: On core's shell, sidebar, code block and tables; site is optional, for the search. No script. See [Documentation](https://nandovejer.github.io/luz/docs/documentation/)
- The links of a header, and its menu button: `.luz-navbar`, `.luz-nav-toggle`: core: A popover panel at 768 px and below, with no script
- Submenu, banner: `<luz-submenu>`, `<luz-banner>`: site: Tags with no script and no class: the submenu is a native `<details>` in a header's links, the banner a `<section>`
- Cookie consent: `<luz-consent>`, `.luz-consent`: site: `site.js` loads its script, `consent.js`, when the page has one; a band fixed at the bottom of the window; without the script it stays hidden
- Auto color mode: `<luz-mode>`: site: `site.js` loads its script, `mode.js`, when the page has one; without it the radios of core's switcher still work and Auto is light
- Language switch: `<luz-lang-switch>`: site: No script
- Site search: `<luz-search>`, `.luz-search`: site: Needs the script (`site.js`, which loads `search.js` when the page has one) and an index file; without them it is a link
- Print styles: Nothing to add: core: In `luz.css`; site adds its own print rules
- Markup you cannot add classes to: `data-luz-classless`: core: `classless.css`, a file of its own
- Checking what you or an AI agent wrote: `npx @luz-ds/check`, the `luz-check` command: check: A tool with no CSS and no layer, and no other package needed: it reads your HTML and CSS offline. See [Working with AI](https://nandovejer.github.io/luz/docs/get-started/ai/)

- **Two ways to lay out a page, both core's.** `.o-shell` with `.o-main`: a sidebar column beside the main area. `.o-page`: a header, the content and a footer in one column. Pick one for the grid of the page: the first when it has a sidebar, the second when it has none. A landing or CMS header and footer work with both; these docs use `.o-shell`.
- Site needs core, and core needs tokens, so a row at a level also needs every package under it. Landing, CMS, app and docs need core and tokens; site is optional for them.

### CSS layers

Core's CSS comes in native cascade layers (`@layer`), in ITCSS order, inside one container layer called `luz`. The six below are the ones that hold its rules; [the layers page](https://nandovejer.github.io/luz/docs/get-started/layers/) lists them all, with tokens, site and print.

A later layer wins over an earlier one, and any CSS of yours that is not in a layer wins over all of LUZ, with no `!important`. [How to order and override them](https://nandovejer.github.io/luz/docs/get-started/layers/).

Core cascade layers
```text
packages/core/src/
  settings/_settings.css      luz.settings    motion, z-index, breakpoints
  generic/_reset.css          luz.generic     the reset
  elements/*.css              luz.elements    bare HTML elements, zero specificity
  objects/_objects.css        luz.objects     layout: .o-*
  components/*.css            luz.components  the components: .luz-*
  utilities/_utilities.css    luz.utilities   single-purpose helpers: .u-*
```

- The components layer holds 32 components.
- `dist/luz.css` holds these six layers and `luz.print`. Tokens are in `luz.tokens`, site in `luz.site`, landing in `luz.landing`, cms in `luz.cms`, app in `luz.app` and docs in `luz.docs`; `luz.themes` is empty, kept for a look of your own. For a page that needs a few components only, load `dist/base.css` (settings, reset and elements), then `dist/components/<name>.css` for each one.
- Rules for bare elements are wrapped in `:where()`, so any class wins over them.

### The script

One optional entry point, `luz.js`, starts every behaviour on the page: color mode, copy buttons, dialogs, highlighting, players, tabs and the sidebar.

Load the core script
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"></script>
```

To load less, import one module and call its `init` function. See [JavaScript modules](https://nandovejer.github.io/luz/docs/get-started/javascript/).

### Minimal page

Minimal page skeleton
```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign up – Acme</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
</head>
<body>
  <main class="o-container">
    <h1>Sign up</h1>
    <form action="/signup/" method="post">
      <div class="luz-field">
        <label class="luz-field__label" for="email">Email</label>
        <input class="luz-input" id="email" name="email" type="email" autocomplete="email" required>
      </div>
      <button class="luz-btn luz-btn--primary" type="submit">Create account</button>
    </form>
  </main>
</body>
</html>
```
