# CAI Design System — agent context

**See [PRINCIPLES.md](./PRINCIPLES.md) for the principles and red lines every change must respect, [VANILLA-FIRST.md](./.claude/VANILLA-FIRST.md) for architectural principles, [STRUCTURE.md](./.claude/STRUCTURE.md) for directory layout, and [QUICK-REFERENCE.md](./.claude/QUICK-REFERENCE.md) for naming, tokens, and commands.**

---

## Critical Implementation Rules

### 1. `dist/` is generated, never edited directly

See [DIST-RULES.md](./.claude/DIST-RULES.md) for full regeneration steps.

### 2. `docs/` is the generated GitHub Pages site

`docs/` at the repo root is the output of `pnpm pages:build` (Vite, `--mode pages`, relative URLs) and is committed so GitHub Pages can serve it. Never edit it by hand: change `apps/` or `packages/`, rebuild, and commit the result.

### 3. Bundled fonts must be MIT licensed, and only MIT

Every font file shipped by a package must have the repository's licence (MIT) as its only licence, with its notice next to it as `LICENSE-<Font>.txt` (`pnpm check:pack` enforces the notice). Dual-licensed fonts are not accepted, even when MIT is one of the options, and neither is OFL. Sans and mono use the system stacks; prefer them to bundling a face (PRINCIPLES.md red line 13).

### 4. Two levels of rules

PRINCIPLES.md has red lines (`RL-n`, absolute, never excepted) and strong rules (`SR-n`). A strong rule may be broken only with a `cai-exception: EX-nnn` comment next to the code and a row in [EXCEPTIONS.md](./EXCEPTIONS.md); `pnpm check:exceptions` keeps them in step. Size ceilings in `budgets.json` are a red line: never raise one.

---

## JS in `packages/core/src/`

Vanilla JS, ES modules — JavaScript only enhances what the browser already does (native `dialog`, `popover`, `input type=range|radio|checkbox`, `progress`, forms). One module per concern, all re-exported (and auto-initialized) by the `cai.js` entry. Importing an individual module has no side effects until you call its `init*()`. Published exports: `@cai-ds/core/theme`, `/sidebar`, `/clipboard`, `/modal`, `/highlight`, `/player`, `/tabs`, `/utils`, `/i18n`, `/midi`.

| Module         | Key exports                                                    |
| -------------- | -------------------------------------------------------------- |
| `theme.js`     | `applyTheme(theme)` (sets `data-theme` on `<html>`, persists), `applyMode`, `getInitialTheme`, `initThemeSystem()`, `initThemeCycle()` (one button for a `.cai-mode-switcher--cycle` group) |
| `sidebar.js`   | `initSidebar()` — scroll-spy active link; closes the popover drawer on navigation |
| `clipboard.js` | `copyToClipboard(text, el, type)` (visual feedback), `initCopyButtons()` |
| `modal.js`     | `initModals()` — fallback for `command`/`commandfor` on a native `<dialog>`; `supportsCommands()` |
| `highlight.js` | `highlightBlock(pre)` — dependency-free highlight for `pre.cai-code-block`, `initHighlight()` |
| `player.js`    | `initSeekbar(bar, onSeek)`, `wrapHTMLMedia(el)`, `bindPlayerUI(root, controls, mediaLike)`, `mountPlayer(root)`, `mountMidiPlayer(root)` (async), `initPlayers()` |
| `tabs.js`      | `activateTab(tab)`, `initTabs()` — upgrades linked panels to the ARIA tabs pattern; a fragment or in-page link into a hidden panel opens its tab; inactive panels are `hidden="until-found"` |
| `utils.js`     | `formatTime(seconds)` (`mm:ss`), `escapeHtml`, `calculateProgress`, `enableJs()` (sets `data-cai-js` on `<html>`), … |
| `i18n.js`      | `t(key, el, vars?)` — string for the language of `el` (nearest `lang`, then subtag, then English; `data-cai-label-<key>` overrides), `getLang(el)`, `registerLocale(lang, messages)`; ships `en` and `es` |
| `midi.js`      | `MidiPlayer` — MIDI Format 0/1 parser + Web Audio scheduler (lazy-loaded chunk) |

---

## Vite config and the docs site generator

`root: <repo-root>` + `publicDir: false` → absolute paths like `/packages/...` and `/apps/...` in HTML resolve correctly in dev. The routes come from the plugin in `scripts/docs-site/` (`plugin.js` is the Vite glue, `site.js` the unit-tested logic, `html.js` a strict tokenizer); nothing is listed by hand:

- Every file under `apps/docs/pages/` is a page: `pages/index.html` → `/docs/`, `pages/a/b.html` → `/docs/a/b/`, `pages/a/index.html` → `/docs/a/` (an area index). Names starting with `_` are not pages (`pages/components/_thumbs/<slug>.html` holds the gallery thumbnails). A page is a fragment: its content, under the generated h1. Front matter in a leading `<!-- cai:page -->` comment, one `key: value` per line: `title` (the h1, the start of `<title>`, the sidebar label), `description` (the lead under the h1 and the gallery line), `area` (an id of `site.json`, or `hub`) are required; optional `order`, `group` (a group of the area in `site.json`: a gallery heading, or the labelled "Helpers" sub-list), `files` (`;`-separated, shown next to the h1), `module` (the JS module), `lead: false` (the content brings its own lead), `toc` (`h2` default, `h2,h3` — each h3 nested under its h2, used by component pages —, `false`), `generate` (`gallery` on an area index, `a-z`).
- What the generator writes around the content, from the front matter of every page: the sidebar (the six areas of `site.json`, only the current one expanded; `aria-current="page"` on the page, `"true"` on its area), the breadcrumb, the h1 and lead, "On this page" (with three or more h2 that have an id; a rail from 1280 px), Previous / Next, the galleries and the A–Z index (`/docs/a-z/`). `apps/docs/404.html` becomes `/404.html`, with `<base href>` = `PAGES_BASE` (`vite.config.js`) and no script.
- The layout `apps/docs/_layouts/<layout>.html` wraps it. Templates know two things only: `<!-- cai:include <name> -->` (a file of `apps/docs/_partials/`) and a fixed set of `{{…}}` values (layouts and partials only). The landing includes the same `header` and `site-links` partials. The generator marks the current site links (`aria-current`).
- Dev server: route → file lookup table; a route without its trailing slash answers 301. Editing a layout, partial, page or `site.json` reloads the browser.
- Build: one entry per route (plus the landing at `/`); each HTML file is moved to `<route>/index.html`, and in the pages build its asset URLs and links between pages are relative to its depth.
- Search: the generator also writes `/docs/search-index.json` (`buildSearchIndex()`, from the same `indexData()` as the A–Z page, so the two never disagree), served by the dev middleware and emitted by the build. Every page gets the header's search button and the dialog partial `_partials/search.html`, with `data-cai-search-src="/docs/search-index.json"` made relative in the pages build. The component is `@cai-ds/platform/search` (`initSearch()`); its fixed text is in the partial and the strings it writes are the dialog's `data-cai-label-*` (EX-005).
- Links: write internal links root-absolute with a trailing slash (`/docs/components/button/#how`). The build fails, with `file:line`, on a mis-nested tag, a duplicate id, an unknown route, a missing trailing slash or a `#fragment` that is not an id on the target page (a warning in dev).

---

## Package layering

`tokens` is standalone; `core` requires `tokens`; `platform` requires `core` and `tokens`. The contract is expressed as required `peerDependencies` with literal ranges (never `workspace:`), and the three packages share one version (changesets `fixed`).

- Platform JS: `platform.js` (entry; warns without core, wires the search) and `search.js` (`initSearch(root)`, exported as `@cai-ds/platform/search`). `platform.min.js` is bundled with esbuild, so the 2 kB budget measures the search too; `pnpm check:size` fails if a budgeted file imports an unbudgeted one statically. HTML sinks (`innerHTML`, `insertAdjacentHTML`, `eval`, …) are an ESLint error in `packages/platform/src` and `apps/` (security.md SEC-IDX-2).
- Nothing in `packages/*/src` may reference docs-app hooks (`.docs-*`, `#demo-form`, …). Docs-only behavior lives in `apps/docs/reference.js` (and the modules it imports, such as `apps/docs/view.js`, the remembered Code / Design tab); the docs site generator in `scripts/docs-site/` is development tooling and never ships.
- `pnpm check:pack` verifies what each tarball ships against `packages/<name>/pack-files.txt`; after intentionally adding or removing a published file run `node scripts/check-pack.js --update`.
- Releases: add a changeset (`pnpm changeset`); never run `npm publish` by hand.

---

## Common workflows

### Adding a new component

1. **Check first:** is there a native HTML element or browser API that solves this? (`dialog`, `details`, `popover`, `<input type="...">`, CSS `:has()`, etc.). If so, use it as the base.
2. Create `packages/core/src/components/<name>.css` (use the standard header of the sibling files) and add its `@import` to `packages/core/src/components/index.css` in cascade order
3. Run `pnpm core:build` — regenerates `dist/cai.css` AND `dist/components/<name>.css` (see [DIST-RULES.md](./.claude/DIST-RULES.md)), then `node scripts/check-pack.js --update`
4. Give it a page: `apps/docs/pages/components/<slug>.html` with front matter (`title`, a one-line `description` — the summary under the h1 —, `area: components`, `group` of the gallery, `files: components/<name>.css`, `module` if it has JS, `toc: h2,h3`), then a `<div class="docs-component" id="c-<name>">` holding, in this order (PRINCIPLES.md red line 18 and SR-5; `.claude/plans/docs-redesign/ia.md` §6):
   - `<h2 id="example">Example</h2>` and the live demo in `<div class="docs-example" data-docs-specimen>`;
   - `<h2 id="known-issues">Known issues</h2>`, always, with "None known." when empty;
   - the tab row `<nav class="cai-tabs docs-view-tabs" aria-label="<Title> documentation">` with `<a class="cai-tab" href="#code-panel" data-docs-view="code">Code</a>` then the same for `design`;
   - `<div class="cai-tabpanel docs-view" id="code-panel">`: `<h2 class="docs-view__title" id="code">Code</h2>`, then the `h3` sections `#markup` Copy the markup, `#variants` Variants and options, `#how` How it works, `#no-js` Without JavaScript, `#keyboard` Keyboard and ARIA, and last `<p class="docs-view__xref">` linking to `#contrast`;
   - `<div class="cai-tabpanel docs-view" id="design-panel">`: `<h2 class="docs-view__title" id="design">Design</h2>`, then `#when` When to use, `#when-not` When not to use, `#do-dont` Do and don't, `#content` Writing the content, `#contrast` Contrast and focus, `#tokens` Tokens it uses, and last a `docs-view__xref` line linking to `#keyboard`.

   Copy `components/button.html` as a model. Write *Copy the markup* with the `docs-snippet` block (a label bar, a copy button with `data-copy-from` pointing at the `<code>` id, then the `pre.cai-code-block`) and *Variants and options* as a `cai-table`. *Do and don't* is a `div.docs-dodont` with two `figure`s, `docs-dodont__item--do` then `--dont`, each starting with `<figcaption><strong class="docs-dodont__verdict">Do</strong>` (or `Don't`) and a reason; the example is real CAI markup in `<div class="docs-dodont__stage" inert aria-hidden="true">` (no `id` it does not need), or a `pre.cai-code-block` when the mistake would itself be a barrier (a11y.md TAB-20): never a live contrast or semantics failure. *Contrast and focus* is a `cai-table.docs-contrast` (Part, colour on background as `<code>--cai-…</code> on <code>--cai-…</code>` with ` over ` for a translucent layer, Light, Dark, High contrast, Needs) and a list that starts with `<strong>Focus:</strong>`; *Tokens it uses* is a `dl.docs-uses` of the tokens the component's CSS reads, grouped under links to their token pages. Never type a ratio, a value or a token list: compute them with `tests/helpers/design-tokens.js` (`contrast`, `formatRatio`, `tokensUsedBy`, `familyOf`); `tests/docs-design.test.js` recomputes every one and fails on drift. Without JavaScript both panels show, stacked, under their visible `h2`; with it, core `tabs.js` shows one and `apps/docs/view.js` remembers the reader's last tab. The sidebar, the gallery, "On this page", Previous / Next and the A–Z index pick the page up; add a reduced, inert thumbnail in `pages/components/_thumbs/<slug>.html` (no id, script, media or form). `tests/docs-site.test.js` checks the structure of every component and pattern page, and `tests/docs.spec.js` finds the new page from the CSS file name. State the no-JS behavior and any known issue in the accessibility statement (`pages/accessibility.html`). A platform pattern page (`pages/platform/<slug>.html`, `group: patterns`) has the same structure.
5. If the styles are docs-only (grids, prop tables), put them in `apps/docs/reference.css`

**Before delivering anything, read [PRINCIPLES.md](./PRINCIPLES.md): its red lines are enforced by stylelint, ESLint, `pnpm check:size`, `pnpm check:strings`, `pnpm check:exceptions` and the Playwright suites (axe, no-JS, reduced motion, forced colors).**

**Vanilla checklist before delivering any JS:**

- [ ] Zero runtime dependencies added (`package.json` unchanged)
- [ ] No `import` of external libraries in any `.js` file
- [ ] Interactivity uses native APIs wherever possible
- [ ] Component works without a bundler (plain HTML + CSS + JS)

### Adding a new semantic token

1. Add it to `packages/tokens/src/semantic.css` in all three theme blocks (`:root, [data-theme="light"]`, `[data-theme="dark"]`, `[data-theme="high-contrast"]`)
2. If it references a new primitive, also add that to `tokens.json`
3. Run `pnpm tokens:build`
4. Document it on the Tokens pages of the docs site (`apps/docs/pages/tokens/`; the semantic colours are on `tokens/color.html`)

### Adding a new primitive color

1. Add it to `tokens.json` under `color.{family}.{scale}`
2. Run `pnpm tokens:build` — adds `--cai-{family}-{scale}` to Layer 1
3. Reference from semantic tokens in Layer 2 if needed in any theme

### Modifying a breakpoint or motion token

Edit `packages/core/src/settings/_settings.css` only, then regenerate `dist/cai.css`.

### Adding a style for a bare HTML element

1. Put the rule in the file of its MDN category under `packages/core/src/elements/` (`document`, `sections`, `text`, `inline`, `media`, `forms`, `interactive`).
2. Wrap the whole selector in `:where()` (specificity 0), so any `.cai-*` class or the consumer's own rule wins. A pseudo-element goes outside: `:where(dialog)::backdrop`. There is no exception (red line 11): stylelint's `cai/no-bare-element` rule fails on any bare type selector in `packages/`.
3. Elements that already have a component (`table`, `input`, `select`, `button`) are styled through its class, not here.
4. Update the element's `styledBy` in `tests/fixtures/html-elements.json` and its card on the page of its category, `apps/docs/pages/html/<category>.html` (the A–Z table is on `html/index.html`), then run `pnpm core:build` and `pnpm test:ui`.

---

## Not yet implemented (P2 backlog)

- Dropdown / context menu
- Pagination
- Documented grid system
- A contrast checker that consumers run against their own theme (PRINCIPLES.md §1)
- HTML elements page: a table of the deprecated elements with their modern replacement, and a grid of the 22 `input` types
