# LUZ Monorepo Structure

```
luz-design-system/
├── apps/                              ← internal apps (NOT publishable)
│   ├── docs/                          ← the documentation site, built by scripts/docs-site
│   │   ├── site.json                  ← the seven areas of the docs (id, label, slug, groups)
│   │   ├── pages/                     ← one HTML fragment per page, front matter in <!-- luz:page -->; route = path
│   │   │   ├── index.html             ← /docs/ (the hub)
│   │   │   ├── a-z.html               ← /docs/a-z/ (generated index)
│   │   │   ├── accessibility.html     ← /docs/accessibility/ (the statement)
│   │   │   ├── get-started/           ← install, structure, JavaScript modules
│   │   │   ├── components/            ← gallery (index.html), one page per component, helpers; _thumbs/ = gallery thumbnails
│   │   │   ├── tokens/                ← index and one page per family
│   │   │   ├── site/                  ← index, one page per pattern, templates, class reference
│   │   │   ├── landing/               ← index, one page per pattern, landing page templates
│   │   │   ├── cms/                   ← index, one page per pattern, CMS templates (post card, listing, author box)
│   │   │   └── html/                  ← overview with the A–Z table, one page per element category
│   │   ├── 404.html                   ← /404.html (absolute <base>, no script)
│   │   ├── _layouts/                  ← page.html and not-found.html: head, header, sidebar, <main>, footer
│   │   ├── _partials/                 ← header (shared with the landing), site-links, footer
│   │   ├── reference.css              ← docs page–only styles
│   │   ├── elements.css               ← HTML elements chapter styles
│   │   ├── reference.js               ← docs glue on every page (mode, copy, demos, element cards, "On this page")
│   │   ├── site-header.css, .js       ← the header of the docs and the home page (not published)
│   │   └── assets/                    ← demo media and images; placeholders/ (docs-only, MIT LICENSE next to them)
│   ├── landing/                       ← home page
│   │   ├── index.html                 ← template of the home page in every language; includes the header and site-links partials
│   │   ├── i18n/                      ← locales.json (languages and routes) + one catalog per language (en, es, ar)
│   │   ├── landing.css, landing.js    ← the home page's own; the header is ../docs/site-header.{css,js}
│   │   └── assets/                    ← favicon set and LUZ mark
├── packages/
│   ├── tokens/                        ← @luz-ds/tokens (publishable)
│   │   ├── tokens.json                ← source of truth for Layer 1 primitives
│   │   ├── src/semantic.css           ← Layer 2 semantic themes (light/dark/high-contrast)
│   │   ├── fonts/                     ← Gidole, ET Book, Monoid woff2 + fonts.css + MIT licence texts
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── luz-tokens.css (+ .min) ← fonts + primitives + semantic
│   │       ├── tokens.css, fonts.css  ← the same, split (bring your own fonts)
│   │       ├── tokens.json            ← primitives source, for tooling
│   │       └── fonts/                 ← woff2 files + licence texts
│   │
│   ├── core/                          ← @luz-ds/core (publishable)
│   │   ├── src/                       ← EDIT HERE
│   │   │   ├── settings/_settings.css ← config tokens (z-index, breakpoints, motion)
│   │   │   ├── generic/_reset.css     ← reset
│   │   │   ├── elements/              ← bare HTML elements, one file per MDN category
│   │   │   │   ├── index.css          ← barrel (document, sections, text, inline, media, forms, interactive)
│   │   │   │   └── *.css              ← new rules wrapped in :where() (specificity 0)
│   │   │   ├── objects/_objects.css   ← layout abstractions (.o-)
│   │   │   ├── components/            ← ONE FILE PER COMPONENT (.luz-*)
│   │   │   │   ├── index.css          ← barrel (@import in cascade order)
│   │   │   │   ├── button.css, form.css, table.css, modal.css, player.css, …
│   │   │   │   └── _animations.css    ← shared public @keyframes
│   │   │   ├── utilities/_utilities.css   ← .u-*
│   │   │   ├── themes/                ← the theme template, _template.css
│   │   │   ├── index.css              ← entry with ITCSS imports (source of truth for layer order)
│   │   │   ├── luz.js                 ← entry: re-exports API + auto-init
│   │   │   ├── theme.js               ← theme system (applyTheme, applyMode, …)
│   │   │   ├── sidebar.js             ← sidebar nav + mobile drawer
│   │   │   ├── clipboard.js           ← copy-to-clipboard behaviors
│   │   │   ├── modal.js               ← modals + focus trap
│   │   │   ├── highlight.js           ← dependency-free syntax highlight
│   │   │   ├── player.js              ← video/audio/MIDI player UI
│   │   │   ├── tabs.js                ← tabs activation + keyboard
│   │   │   ├── midi.js                ← MIDI parser + Web Audio scheduler (lazy chunk)
│   │   │   └── utils.js               ← pure helpers (unit-tested)
│   │   ├── fonts/custom-faces/        ← theme font (Comic Shanns) + MIT licence text
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── luz.css (+ .min)       ← full bundle
│   │       ├── base.css (+ .min)      ← settings + reset + elements (needed by per-component files)
│   │       ├── components/*.css       ← per-component files (standalone use)
│   │       ├── luz.js                 ← bundled entry (rollup)
│   │       ├── theme.js, sidebar.js, … ← individual ESM modules
│   │       ├── midi.js                ← lazy chunk
│   │       ├── fonts/custom-faces/    ← copied for the themes
│   │       └── themes/*.css
│   │
│   ├── site/                      ← @luz-ds/site (publishable)
│   │   ├── src/                       ← EDIT HERE
│   │   │   ├── components/{search,consent,lang-switch,submenu,banner}.css, _print.css
│   │   │   ├── index.css
│   │   │   ├── site.js                ← the presence loader
│   │   │   └── search.js, consent.js  ← lazy chunks
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── site.css (+ .min), print.css, components/*.css
│   │       └── site.js, search.js, consent.js (+ .min)
│   │
│   ├── landing/                   ← @luz-ds/landing (publishable, its own version, 0.x)
│   │   ├── src/                       ← EDIT HERE
│   │   │   ├── components/{header,hero,main,section,footer,glow}.css
│   │   │   └── index.css
│   │   └── dist/                      ← GENERATED (do not edit)
│   │       ├── landing.css
│   │       └── landing.min.css
│   │
│   └── cms/                       ← @luz-ds/cms (publishable, its own version, 0.x)
│       ├── src/                       ← EDIT HERE
│       │   ├── components/article-header.css
│       │   ├── components/article.css   ← article layout and table of contents
│       │   └── index.css
│       └── dist/                      ← GENERATED (do not edit)
│           ├── cms.css
│           └── cms.min.css
│
├── docs/                              ← GENERATED GitHub Pages site (pnpm pages:build); do not edit
│
├── dev/                               ← contributor guides (this file, QUICK-REFERENCE, DIST-RULES, TESTING, VANILLA-FIRST, BROWSER-REVIEWS)
│
├── .claude/                           ← Claude Code: agents/, hooks/, settings.json and skills/ are versioned;
│                                        the maintainer's private notes (OWNER.md, CLAUDE.md, plans, reports) are not in git
│
└── scripts/
    ├── docs-site/                     ← the docs site generator (Vite plugin, dev tooling only)
    │   ├── site.js                    ← pure: scan pages, front matter, routes, render, link check (unit-tested)
    │   ├── html.js                    ← strict tokenizer: fails on bad nesting with file:line
    │   └── plugin.js                  ← Vite glue: build inputs, dev routes (301 without slash), relative URLs, HMR
    ├── build-tokens.js                ← fonts + primitives (tokens.json) + semantic (src/semantic.css)
    ├── build-core.js                  ← inlines src/index.css @imports + per-component dist + JS
    ├── build-package.js               ← shared builder of site, landing and cms: @import inlining, layer, min, JS bundle, assets
    ├── build-site.js                  ← site: calls build-package.js (CSS, the loader and its two chunks)
    ├── build-landing.js               ← landing: calls build-package.js (CSS only)
    ├── build-cms.js                   ← cms: calls build-package.js (CSS only)
    ├── luz-packages.js                ← the published packages, in dependency order
    ├── check-dist.js                  ← predev guard (rebuilds if any dist missing)
    ├── check-pack.js                  ← tarball contract: file snapshot, licences, exports, no workspace: ranges
    └── publish.js                     ← CI-only: publishes versions missing from npm (OIDC + provenance)
```

## Dependency Chain

```
@luz-ds/tokens
    ↓
@luz-ds/core  (consumes tokens, must never import site)
    ↓
@luz-ds/site  (app-level patterns)
    ↓
@luz-ds/landing  (patterns of a landing page; own version, 0.x)
@luz-ds/cms      (patterns of a blog or a newspaper, any CMS; own version, 0.x; never depends on landing)
```

Tokens, core and site share one version; landing and cms have their own and peer ranges on the base's major.

## Key Rules

- **Never edit `dist/`** — it is generated from `src/`
- **Layer order lives in `src/index.css`** — build scripts inline its `@import` graph; there is no duplicated file list
- **What gets published** — `packages/tokens/`, `packages/core/`, `packages/site/`, `packages/landing/`, `packages/cms/` (consumers download these)
- **Where the guides live** — `dev/` holds the contributor guides. `.claude/` holds the Claude Code agents, hooks, `settings.json` and skills (all versioned) plus the maintainer's private notes (not in git)
- **What does not** — `apps/docs/`, `apps/landing/` (internal apps only)
