# LUZ Design System — agent context

**See [PRINCIPLES.md](./PRINCIPLES.md) for the principles and red lines every change must respect, [VANILLA-FIRST.md](./dev/VANILLA-FIRST.md) for architectural principles, [STRUCTURE.md](./dev/STRUCTURE.md) for directory layout, and [QUICK-REFERENCE.md](./dev/QUICK-REFERENCE.md) for naming, tokens, and commands.**

---

## Critical Implementation Rules

### 1. `dist/` is generated, never edited directly

See [DIST-RULES.md](./dev/DIST-RULES.md) for full regeneration steps.

### 2. `docs/` is the generated GitHub Pages site

`docs/` at the repo root is the output of `pnpm pages:build` (Vite, `--mode pages`, relative URLs) and is committed so GitHub Pages can serve it. Never edit it by hand: change `apps/` or `packages/`, rebuild, and commit the result.

### 3. Everything published or served is MIT, and only MIT

Every file a package ships and every file the Pages site serves (code, fonts, icons, images, audio, examples) has the repository's licence (MIT) as its only licence (PRINCIPLES.md red line 13). Dual-licensed work is not accepted, even when MIT is one of the options, and neither is OFL or Creative Commons. Third-party MIT work keeps its notice next to it; a font's is `LICENSE-<Font>.txt` (`pnpm check:pack` enforces it). Sans and mono use the system stacks; prefer them to bundling a face.

### 4. Two levels of rules

PRINCIPLES.md has red lines (`RL-n`, absolute, never excepted) and strong rules (`SR-n`). A strong rule may be broken only with a `luz-exception: EX-nnn` comment next to the code and a row in [EXCEPTIONS.md](./EXCEPTIONS.md); `pnpm check:exceptions` keeps them in step. Size ceilings in `budgets.json` are a red line: never raise one.

### 5. Tests first

Every change to `packages/`, `apps/` or `scripts/` starts with a test that fails without it (PRINCIPLES.md SR-9): commit it red (`test: …`), then the change that makes it green. A bug fix starts with the test that reproduces it. Every recipe below starts there. See [TESTING.md](./dev/TESTING.md).

### 6. Browsers

Test runs use `--project=chromium --project=chromium-nojs`. The `firefox` and `webkit` Playwright projects, and the Safari and Firefox reviews, are run by the maintainer before a release; the record is [BROWSER-REVIEWS.md](./dev/BROWSER-REVIEWS.md).

---

## JS in `packages/core/src/`

Vanilla JS, ES modules — JavaScript only enhances what the browser already does (native `dialog`, `popover`, `input type=range|radio|checkbox`, `progress`, forms). One module per concern, all re-exported (and auto-initialized) by the `luz.js` entry. Importing an individual module has no side effects until you call its `init*()`. Published exports: `@luz-ds/core/theme`, `/sidebar`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/tabs`, `/utils`, `/i18n`, `/midi`, `/table-sort`, `/timeline`.

| Module         | Key exports                                                    |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme(theme)` (sets `data-theme` on `<html>`, persists), `applyMode`, `getInitialTheme`, `getCustomThemes()` (the names in `<html data-luz-themes="…">`; LUZ ships none), `initThemeSystem()`, `initThemeCycle()` (one button for a `.luz-mode-switcher--cycle` group) |
| `sidebar.js`   | `initSidebar()` — scroll-spy active link (`.luz-sidebar__link`, and every in-page link inside `[data-luz-spy]`); closes the popover drawer on navigation |
| `clipboard.js` | `copyToClipboard(text, el, type)` (visual feedback), `initCopyButtons()` |
| `modal.js`     | `initModals()` — fallback for `command`/`commandfor` on a native `<dialog>`; `supportsCommands()` |
| `highlight.js` | `highlightBlock(pre)` — dependency-free highlight for `pre.luz-code-block`, `initHighlight()` |
| `player.js`    | `initSeekbar(bar, onSeek)`, `wrapHTMLMedia(el)`, `bindPlayerUI(root, controls, mediaLike)`, `mountPlayer(root)`, `mountMidiPlayer(root)` (async), `initPlayers()` |
| `tabs.js`      | `activateTab(tab)`, `initTabs()` — upgrades linked panels to the ARIA tabs pattern; a fragment or in-page link into a hidden panel opens its tab; inactive panels are `hidden="until-found"` |
| `utils.js`     | `formatTime(seconds)` (`mm:ss`), `escapeHtml`, `calculateProgress`, `enableJs()` (sets `data-luz-js` on `<html>`), … |
| `i18n.js`      | `t(key, el, vars?)` — string for the language of `el` (nearest `lang`, then subtag, then English; `data-luz-label-<key>` overrides), `getLang(el)`, `registerLocale(lang, messages)`; ships `en` and `es` |
| `midi.js`      | `MidiPlayer` — MIDI Format 0/1 parser + Web Audio scheduler (lazy-loaded chunk) |
| `table-sort.js` | `initTableSort(root, translate)` — sorts a table with `th[data-luz-sort]` in the browser (lazy-loaded chunk, no imports: `luz.js` passes its `t`) |
| `timeline.js`  | `<luz-timeline>` — a rail of dates, Previous / Next, opt-in autoplay with a visible Pause / Play, or a vertical layout that marks the item in view (lazy-loaded chunk: `luz.js` imports it only on a page with a `luz-timeline` and passes its `t` to `initTimeline(root, translate)`; importing it defines the element and imports nothing, its four strings travel with it, EX-010) |

---

## Vite config and the docs site generator

`root: <repo-root>` + `publicDir: false` → absolute paths like `/packages/...` and `/apps/...` in HTML resolve correctly in dev. The routes come from the plugin in `scripts/docs-site/` (`plugin.js` is the Vite glue, `site.js` the unit-tested logic, `html.js` a strict tokenizer); nothing is listed by hand:

- Every file under `apps/docs/pages/` is a page: `pages/index.html` → `/docs/`, `pages/a/b.html` → `/docs/a/b/`, `pages/a/index.html` → `/docs/a/` (an area index). Names starting with `_` are not pages. A page is a fragment: its content, under the generated h1. Front matter in a leading `<!-- luz:page -->` comment, one `key: value` per line: `title` (the h1, the start of `<title>`, the sidebar label), `description` (the lead under the h1 and the gallery line), `area` (an id of `site.json`, or `hub`) are required; optional `order`, `group` (a group of the area in `site.json`: a gallery heading, or the labelled "Helpers" sub-list), `files` (`;`-separated, shown next to the h1), `module` (the JS module), `lead: false` (the content brings its own lead), `toc` (`h2` default, `h2,h3` — each h3 nested under its h2, used by component pages —, `false`), `generate` (`gallery` on an area index, `a-z`).
- What the generator writes around the content, from the front matter of every page: the sidebar (the eight areas of `site.json`, only the current one expanded; `aria-current="page"` on the page, `"true"` on its area), the breadcrumb, the h1 and lead, "On this page" (with three or more h2 that have an id; a rail from 1280 px), Previous / Next, the galleries and the A–Z index (`/docs/a-z/`). `apps/docs/404.html` becomes `/404.html`, with `<base href>` = `PAGES_BASE` (`vite.config.js`) and no script.
- The layout `apps/docs/_layouts/<layout>.html` wraps it. Templates know two things only: `<!-- luz:include <name> -->` (a file of `apps/docs/_partials/`) and a fixed set of `{{…}}` values (layouts and partials only). The landing includes the same `header` and `site-links` partials: Home, Docs and GitHub sit in the header row above 768px and in the drawer at 768px and below; the search button stays in the row at every width. The generator marks the current site links (`aria-current`).
- Dev server: route → file lookup table; a route without its trailing slash answers 301. Editing a layout, partial, page or `site.json` reloads the browser.
- Build: one entry per route (plus the landing at `/`); each HTML file is moved to `<route>/index.html`, and in the pages build its asset URLs and links between pages are relative to its depth.
- Search: the generator also writes `/docs/search-index.json` (`buildSearchIndex()`, from the same `indexData()` as the A–Z page, so the two never disagree), served by the dev middleware and emitted by the build. Every page gets the header's `<luz-search>` (`_partials/header.html`: the A–Z fallback link, the search button and the dialog, with `data-luz-search-src="/docs/search-index.json"` made relative in the pages build). The component is `@luz-ds/site/search`, imported at once by `apps/docs/reference.js` and `apps/landing/landing.js`; its fixed text is in the partial and the strings it writes are the dialog's `data-luz-label-*` (EX-005).
- Links: write internal links root-absolute with a trailing slash (`/docs/components/button/#how`). The build fails, with `file:line`, on a mis-nested tag, a duplicate id, an unknown route, a missing trailing slash or a `#fragment` that is not an id on the target page (a warning in dev).
- Languages: the home page (and only it: the docs and the 404 are English) is one template rendered once per language, `/` (English, the default), `/es/`, `/ar/`, each a static page with its own `lang`, `dir`, title, description and `<link rel="alternate" hreflang>` (plus `x-default`). See "Adding a language to the home page".

---

## Package layering

`tokens` is standalone; `core` requires `tokens`; `site` requires `core` and `tokens`; `landing` and `cms` each require `core` and `tokens`, take `site` as an optional peer, and never name each other. The rule between core and site: a piece goes in `site` when it needs data of the site (languages, search index, menu, cookie policy) or is page structure that holds other pieces; everything else is `core`. The rule between site and a package for one kind of site: a piece that only that kind of site uses (the hero of a landing page, the article header of a blog) goes in that package; a piece with no CSS of its own is a template on its docs page, not a pattern (the post card is core's card: a template); a piece that knows nothing about the site, even if only that package needs it now, is proposed for core instead. The contract is expressed as `peerDependencies` with literal ranges (never `workspace:`): required, except site for a package for one kind of site, which is optional (`peerDependenciesMeta`), so its CSS works with tokens and core alone. Each of site, landing and cms exports `./components/*` (one stylesheet per `src/components/<name>.css` not starting with `_`), as core does.

- Versions: `tokens`, `core` and `site` share one version (changesets `fixed`). A package for one kind of site has its own, starting at 0.x, out of `fixed`, with literal peer ranges on the major the base ships as (`^0.1.0`), never on the version the workspace is at before a release. `landing` exists (CSS only, layer `luz.landing`, classes `.luz-landing-*`, docs area `/docs/landing/`) and so does `cms` (any CMS, any stack; CSS only, layer `luz.cms`, classes `.luz-cms-*`, docs area `/docs/cms/`).
- One list of the published packages, in dependency order, is in `scripts/luz-packages.js` (`check-pack`, `publish`, `smoke-consumer` read it). `site` and every package for one kind of site build through `scripts/build-package.js`. Adding one (as `landing`, then `cms`, did):
  - **Package:** `packages/<name>/` with `package.json` (version `0.0.0`, `exports` `./css`, `./css/min` and `./components/*`, `files`, `sideEffects`, literal peers `^0.1.0` on tokens, core and site, site optional in `peerDependenciesMeta`, `workspace:*` dev dependencies), `README.md`, `LICENSE`, `pack-files.txt`, `src/index.css` and `src/components/*.css`; then `pnpm install`.
  - **Build:** `scripts/build-<name>.js` (three lines), its root `<name>:build` script chained in `build`, `SITE_KINDS` in `scripts/luz-packages.js` (check-pack, publish, smoke-consumer and the docs tests read it), the sentinel in `scripts/check-dist.js`, the regex of `scripts/qa-release.js`, the probe and the `<link>` in `scripts/smoke-consumer.js`.
  - **Layer:** `LAYERS` in `scripts/luz-layers.js` (say why it goes where it goes), then the same statement in `packages/core/src/index.css` and `tests/fixtures/theme-brand.css`, the file in `tests/layers.test.js`, and the list in VERSIONING.md, `packages/core/README.md`, this file and `get-started/layers.html`. Tokens and core get a minor changeset: their dist repeats the statement.
  - **Rules and budget:** the stylelint glob of the RL-10 override, a row in `budgets.json` and the PRINCIPLES.md §8 table (a new row, never a raised ceiling).
  - **Docs:** its area in `apps/docs/site.json`, its kind in `AREA_KIND` of `scripts/docs-site/site.js`, its blocks in `PACKAGES` of `tests/site-docs.spec.js`, the area list in `tests/docs.spec.js` (sidebar test), the count of pattern pages in `tests/docs-design.test.js` and `tests/docs-site.test.js`; its `<link>` in `apps/docs/_layouts/page.html` and its dependency in `apps/docs/package.json` (and in `apps/landing/package.json` only if the home page uses it); `pages/<name>/index.html` (gallery), a page per pattern, `pages/<name>/templates.html`, the "Packages for one kind of site" section of `get-started/index.html`, `get-started/structure.html`, the accessibility statement for any known issue, and the home page's `adopt.next.<name>` in the three catalogs.
  - **Repo:** README.md, PRINCIPLES.md (intro), `.github/CODEOWNERS`, the two issue templates, and STRUCTURE, QUICK-REFERENCE and DIST-RULES in `dev/`; a minor changeset for the package (out of `fixed`, so it releases as 0.1.0).
- The look: the default values of `semantic.css` are Vejer (warm surfaces, ET Book running text, sky-blue actions, soft radii), in the three modes. LUZ ships no theme; `packages/core/src/themes/_template.css` is the starting point of a consumer's own, and `tests/theme-template.test.js` keeps it in step with `semantic.css`.
- Cascade layers: every published stylesheet is in a layer of the container `luz` (`luz.tokens`, `luz.themes`, `luz.settings`, `luz.generic`, `luz.elements`, `luz.objects`, `luz.components`, `luz.utilities`, `luz.site`, `luz.landing`, `luz.cms`, `luz.print`), declared by `scripts/luz-layers.js`, which every build script uses. The names are public API; a new layer or a new file goes through `LAYERS` there, and `tests/layers.test.js` fails on a top-level layer name or an unlayered rule in `dist/`.
- Classless: `packages/core/src/classless/_classless.css` is a file of its own (`dist/classless.css`, exported `@luz-ds/core/classless.css`), not in `luz.css`. It styles a bare button, text field, select and table inside `[data-luz-classless]`, in `luz.elements`, every selector inside `:where()` and `:not([class*="luz-"])`. It copies the components' declarations by hand; `tests/classless.spec.js` compares each element with its component.
- Site JS: `site.js` is the entry, the presence loader: it warns without core, scans the page once and loads a lazy chunk per element on it, `search.js` (`<luz-search>`, on the first pointerdown or focus inside it, Ctrl+K or idle; it holds the fallback link, the trigger and the dialog, exported as `@luz-ds/site/search`) and `consent.js` (`<luz-consent>`, the cookie banner, and `getConsent()`, on idle; exported as `@luz-ds/site/consent`). Before the search chunk, `site.js` takes Ctrl+K itself, loads the chunk and opens the dialog. Each chunk guards `customElements.get()`, imports nothing and has its own budget row (`site JS lazy chunk: search`, `… consent`); `buildPackage({ chunks })` keeps `import("./search.js")` an import of `./search.min.js` in `site.min.js`, and `pnpm check:size` fails on a static import in the loader, a dynamic import other than its two chunks, a non-literal `import()` or a chunk that imports anything (SEC-CHUNK-1/2). An element added after the scan needs its chunk imported by hand. HTML sinks (`innerHTML`, `insertAdjacentHTML`, `eval`, …) are an ESLint error in `packages/site/src` and `apps/` (security.md SEC-IDX-2).
- Nothing in `packages/*/src` may reference docs-app hooks (`.docs-*`, `#demo-form`, …). Docs-only behavior lives in `apps/docs/reference.js` (and the modules it imports, such as `apps/docs/view.js`, the remembered Code / Design tab); the docs site generator in `scripts/docs-site/` is development tooling and never ships.
- `pnpm check:pack` verifies what each tarball ships against `packages/<name>/pack-files.txt`; after intentionally adding or removing a published file run `node scripts/check-pack.js --update`.
- Releases: add a changeset (`pnpm changeset`); never run `npm publish` by hand.

---

## Common workflows

### Adding a new component

1. **Check first:** is there a native HTML element or browser API that solves this? (`dialog`, `details`, `popover`, `<input type="...">`, CSS `:has()`, etc.). If so, use it as the base.
2. **Test first:** write `tests/<name>.spec.js` (what it renders, the keyboard, the no-JS state, axe) and, for logic or values, `tests/<name>.test.js`, from a fixture in `tests/fixtures/` or the docs page's demo. Run it, see it fail for the missing behaviour, and commit it (`test: …`).
3. Create `packages/core/src/components/<name>.css` (use the standard header of the sibling files) and add its `@import` to `packages/core/src/components/index.css` in cascade order
4. Run `pnpm core:build` — regenerates `dist/luz.css` AND `dist/components/<name>.css` (see [DIST-RULES.md](./dev/DIST-RULES.md)), then `node scripts/check-pack.js --update`
5. Give it a page: `apps/docs/pages/components/<slug>.html` with front matter (`title`, a one-line `description` — the summary under the h1 —, `area: components`, `group` of the gallery, `files: components/<name>.css`, `module` if it has JS, `toc: h2,h3`), then a `<div class="docs-component" id="c-<name>">` holding, in this order (PRINCIPLES.md red line 18 and SR-5; `.claude/plans/docs-redesign/ia.md` §6):
   - `<h2 id="example">Example</h2>` and the live demo in `<div class="docs-example" data-docs-specimen>`;
   - `<h2 id="known-issues">Known issues</h2>`, always, with "None known." when empty;
   - the tab row `<nav class="luz-tabs docs-view-tabs" aria-label="<Title> documentation">` with `<a class="luz-tab" href="#code-panel" data-docs-view="code">Code</a>` then the same for `design`;
   - `<div class="luz-tabpanel docs-view" id="code-panel">`: `<h2 class="docs-view__title" id="code">Code</h2>`, then the `h3` sections `#markup` Copy the markup, `#variants` Variants and options, `#how` How it works, `#no-js` Without JavaScript, `#keyboard` Keyboard and ARIA, and last `<p class="docs-view__xref">` linking to `#contrast`;
   - `<div class="luz-tabpanel docs-view" id="design-panel">`: `<h2 class="docs-view__title" id="design">Design</h2>`, then `#when` When to use, `#when-not` When not to use, `#do-dont` Do and don't, `#content` Writing the content, `#contrast` Contrast and focus, `#tokens` Tokens it uses, and last a `docs-view__xref` line linking to `#keyboard`.

   Copy `components/button.html` as a model. Write *Copy the markup* with the `docs-snippet` block (a label bar, a copy button with `data-copy-from` pointing at the `<code>` id, then the `pre.luz-code-block`) and *Variants and options* as a `luz-table`. *Do and don't* is a `div.docs-dodont` with two `figure`s, `docs-dodont__item--do` then `--dont`, each starting with `<figcaption><strong class="docs-dodont__verdict">Do</strong>` (or `Don't`) and a reason; the example is real LUZ markup in `<div class="docs-dodont__stage" inert aria-hidden="true">` (no `id` it does not need), or a `pre.luz-code-block` when the mistake would itself be a barrier (a11y.md TAB-20): never a live contrast or semantics failure. *Contrast and focus* is a `luz-table.docs-contrast` (Part, colour on background as `<code>--luz-…</code> on <code>--luz-…</code>` with ` over ` for a translucent layer, Light, Dark, High contrast, Needs) and a list that starts with `<strong>Focus:</strong>`; *Tokens it uses* is a `dl.docs-uses` of the tokens the component's CSS reads, grouped under links to their token pages. Never type a ratio, a value or a token list: compute them with `tests/helpers/design-tokens.js` (`contrast`, `formatRatio`, `tokensUsedBy`, `familyOf`); `tests/docs-design.test.js` recomputes every one and fails on drift. Without JavaScript both panels show, stacked, under their visible `h2`; with it, core `tabs.js` shows one and `apps/docs/view.js` remembers the reader's last tab. The sidebar, the gallery, "On this page", Previous / Next and the A–Z index pick the page up. `tests/docs-site.test.js` checks the structure of every component and pattern page, and `tests/docs.spec.js` finds the new page from the CSS file name. State the no-JS behavior and any known issue in the accessibility statement (`pages/accessibility.html`). A pattern page of site or of a package for one kind of site (`pages/site/<slug>.html`, `pages/landing/<slug>.html`, `pages/cms/<slug>.html`, `group: patterns`) has the same structure.
6. If the styles are docs-only (grids, prop tables), put them in `apps/docs/reference.css`

**Before delivering anything, read [PRINCIPLES.md](./PRINCIPLES.md): its red lines are enforced by stylelint, ESLint, `pnpm check:size`, `pnpm check:strings`, `pnpm check:exceptions` and the Playwright suites (axe, no-JS, reduced motion, forced colors).**

**Vanilla checklist before delivering any JS:**

- [ ] Zero runtime dependencies added (`package.json` unchanged)
- [ ] No `import` of external libraries in any `.js` file
- [ ] Interactivity uses native APIs wherever possible
- [ ] Component works without a bundler (plain HTML + CSS + JS)

### Adding a new semantic token

1. **Test first:** add the pair it must meet to `scripts/check-contrast.js` (or the assertion of the component that reads it) and see it fail.
2. Add it to `packages/tokens/src/semantic.css` in all three theme blocks (`:root, [data-theme="light"]`, `[data-theme="dark"]`, `[data-theme="high-contrast"]`)
3. If it references a new primitive, also add that to `tokens.json`
4. Run `pnpm tokens:build`
5. Document it on the Tokens pages of the docs site (`apps/docs/pages/tokens/`; the semantic colours are on `tokens/color.html`)

### Adding a new primitive color

1. **Test first:** the semantic token or the contrast pair that will use it (a primitive alone is never read by a component, red line 10).
2. Add it to `tokens.json` under `color.{family}.{scale}`
3. Run `pnpm tokens:build` — adds `--luz-{family}-{scale}` to Layer 1
4. Reference from semantic tokens in Layer 2 if needed in any theme

### Modifying a breakpoint or motion token

**Test first:** the spec of what the change must do (a layout at the new width, a duration under reduced motion). Then edit `packages/core/src/settings/_settings.css` only, and regenerate `dist/luz.css`.

### Adding a style for a bare HTML element

1. **Test first:** update the element's `styledBy` in `tests/fixtures/html-elements.json` and run `pnpm test:ui`: it fails until the rule exists.
2. Put the rule in the file of its MDN category under `packages/core/src/elements/` (`document`, `sections`, `text`, `inline`, `media`, `forms`, `interactive`).
3. Wrap the whole selector in `:where()` (specificity 0), so any `.luz-*` class or the consumer's own rule wins. A pseudo-element goes outside: `:where(dialog)::backdrop`. There is no exception (red line 11): stylelint's `luz/no-bare-element` rule fails on any bare type selector in `packages/`.
4. Elements that already have a component (`table`, `input`, `select`, `button`) are styled through its class, not here.
5. Update the element's card on the page of its category, `apps/docs/pages/html/<category>.html` (the A–Z table is on `html/index.html`), then run `pnpm core:build` and `pnpm test:ui`.

### Adding a language to the home page

The home page's text is not in `apps/landing/index.html`: the template says `{{t:key}}` (escaped text) or `{{html:key}}` (trusted inline HTML: only `<a href>`, `<code>`, `<span>`, `<strong>`, `<em>`, with `class`, `href`, `lang`, `data-count`), and the strings live in one flat catalog per language, `apps/landing/i18n/<code>.json`. The shared partials it includes (`header`, `site-links`) use the same keys; the docs pages render them with the English catalog. `{{lang}}`, `{{dir}}`, `{{home}}`, `{{alternates}}` and `{{langswitch}}` are written by the generator (`scripts/docs-site/i18n.js`).

The build is the test here: it fails on a missing or extra key.

1. Add a row to `apps/landing/i18n/locales.json`: `{ "code": "fr", "name": "Français", "dir": "ltr", "route": "/fr/" }` (the name in that language; `route` is `/<code>/`; the first row is the default, at `/`).
2. Copy `en.json` to `fr.json` and translate every value. Keep `{n}`, `{mode}`… as they are, and the markup of the HTML keys.
3. Run `pnpm test:unit` and `pnpm check:strings`, then `pnpm pages:build`. Nothing else: the route, the build entry, the switcher, the alternates and the link check follow the registry.

The build fails with `file:line` on a key a template uses that a catalog lacks, on a catalog that misses a key of `en.json` or has one it does not, and on a key no template uses. Links from another language into the docs get `hreflang="en"` automatically; the search results are English (`lang="en"` on their lists). A language core's i18n does not ship (Arabic) still gets the scripts' strings in its own language: the landing's `<body>` carries `data-luz-label-*` from the catalog. For a right-to-left language check the page at 320 px; for a script ET Book lacks, add its `:lang()` font switch to `packages/core/src/settings/_settings.css`, as Arabic has.

---

## Not yet implemented (P2 backlog)

- `light-dark()` in `packages/tokens/src/semantic.css`: not before 2026-11-13, when it is expected to be Baseline Widely available (Newly since 2024-05-13). High contrast stays a block of its own, and `parseSemantic`, `check-contrast` and the consumer check must read it first. Decide the default (light, or the OS) before folding the blocks.
