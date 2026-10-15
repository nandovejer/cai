<div align="center">

# LUZ Design System

**LUZ — Light, Usable & Zero-dependency**

A vanilla design system in plain CSS and ES modules.<br>
No framework. No build step for consumers.

[![CI](https://github.com/nandovejer/luz/actions/workflows/ci.yml/badge.svg)](https://github.com/nandovejer/luz/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Status: beta](https://img.shields.io/badge/status-beta-orange)
![Runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)

[Install](#install-and-load) ·
[What each package needs](#what-each-package-needs) ·
[Components](#components) ·
[Accessibility](#accessibility) ·
[Documentation](https://nandovejer.github.io/luz/docs/) ·
[Work on LUZ](#work-on-luz)

</div>

---

> [!WARNING]
> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

LUZ (formerly CAI) is built with plain CSS, ES modules and native browser APIs. Adopt only the tokens, add the components, or take whole-page patterns: the three layers are independent packages that stack in one direction. Packages for one kind of site build on top of them.

```text
@luz-ds/tokens  ->  @luz-ds/core  ->  @luz-ds/site  ->  @luz-ds/landing
   standalone        needs tokens      needs core +   |->  @luz-ds/cms
                                       tokens         \->  @luz-ds/app
                                                          each needs core and
                                                          tokens; site is optional
```

The name stands for Light, Usable & Zero-dependency: light in weight (plain CSS and ES modules, nothing to build for the people who use it), usable by everyone (native HTML, three color modes, tested for accessibility), and with zero runtime dependencies.

- [`@luz-ds/tokens`](./packages/tokens): design tokens (CSS custom properties), the three color modes and the font.
- [`@luz-ds/core`](./packages/core): the components, the layout objects, the styles of bare HTML elements and optional JavaScript.
- [`@luz-ds/site`](./packages/site): page patterns (page shell, site header, footer, image frame) and the site search.
- [`@luz-ds/landing`](./packages/landing): the page structure of a landing page (header, hero, sections, footer). It has its own version, 0.x, and needs `^0.1.0` of tokens and core, and of site if you use it.
- [`@luz-ds/cms`](./packages/cms): patterns for a blog, a newspaper or any CMS, with any stack (the article header and the table of contents). It has its own version, 0.x, and needs `^0.1.0` of tokens, core and site.
- [`@luz-ds/app`](./packages/app): the header and the dashboard of a web application, on core's shell and sidebar. It has its own version, 0.x, and needs `^0.1.0` of tokens and core, and of site if you use its search.
- [`@luz-ds/check`](./packages/check): a tool, not a stylesheet. The `luz-check` command reads the HTML and CSS of your project, offline, and says which LUZ classes, elements, load order and theme colors are wrong. It has its own version, 0.x, and needs no other package.

## Install and load

Each package needs the ones below it and nothing above it. Adopt one level and stop there, or keep going.

| You want | Install | Load, in order |
| --- | --- | --- |
| Tokens only | `@luz-ds/tokens` | `luz-tokens.css` |
| Tokens + components | `@luz-ds/tokens` `@luz-ds/core` | `luz-tokens.css`, `luz.css`, optionally `luz.js` |
| Tokens + components + page patterns | `@luz-ds/tokens` `@luz-ds/core` `@luz-ds/site` | `luz-tokens.css`, `luz.css`, `site.css`, optionally `luz.js` and `site.js` |
| A landing page | the three above and `@luz-ds/landing` | the files of the row above, then `landing.css` |
| A blog or a newspaper | the three above and `@luz-ds/cms` | the files of level 3, then `cms.css` |
| A web application | the three above and `@luz-ds/app` | the files of level 3, then `app.css` |

`@luz-ds/core` declares `@luz-ds/tokens` as a required peer dependency; `@luz-ds/site` declares both, and `@luz-ds/landing`, `@luz-ds/cms` and `@luz-ds/app` require tokens and core and take `@luz-ds/site` as an optional peer (install it if you use its pieces). npm and pnpm install required peers automatically; Yarn only warns, so list every package explicitly.

```bash
npm install @luz-ds/tokens                                   # level 1
npm install @luz-ds/tokens @luz-ds/core                      # level 2
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site         # level 3
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/landing   # a landing page
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/cms       # a blog or a newspaper
npm install @luz-ds/tokens @luz-ds/core @luz-ds/site @luz-ds/app       # a web application
```

### With a bundler

```js
import "@luz-ds/tokens/css";
import "@luz-ds/core/css";
import "@luz-ds/site/css"; // level 3 only
import "@luz-ds/landing/css"; // a landing page only
import "@luz-ds/cms/css"; // a blog or a newspaper only
import "@luz-ds/app/css"; // a web application only

import "@luz-ds/core";         // optional: the JavaScript, starts every behavior
import "@luz-ds/site";     // level 3, only if you use the search
```

`@luz-ds/core` and `@luz-ds/site` without `/css` are the scripts, not the stylesheets.

### From a CDN

Drop the lines for the levels you do not use:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/landing@0.1.0/dist/landing.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/cms@0.1.0/dist/cms.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/app@0.1.0/dist/app.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>
```

Pin an exact version and add an `integrity` hash in production; see [SECURITY.md](./SECURITY.md). A console warning tells you when a layer is loaded without the one below it.

> **Release status:** LUZ is in beta. The `0.1.0` snippets above work once the first release is published. Until then the packages in this repository are at `0.0.0`, with the changesets that release them as `0.1.0`.

### Other files you can load

| File | Package | What it is |
| --- | --- | --- |
| `base.css` + `components/<name>.css` | core | The reset and bare elements, then only the components you list, instead of `luz.css` |
| `classless.css` (`@luz-ds/core/classless.css`) | core | Styles bare `button`, fields, `select` and `table` inside `[data-luz-classless]`, for Markdown or a CMS |
| `print.css` | core | The print styles on their own; `luz.css` already contains them |
| `themes/_template.css` | core | The starting point of a theme of your own |
| `tokens.css`, `fonts.css` | tokens | The tokens without `@font-face`, or the `@font-face` only |
| `search.js` | site | The search element on its own (`@luz-ds/site/search`) |
| `consent.js` | site | The cookie banner (`@luz-ds/site/consent`): `site.js` does not include it |

### JavaScript modules

To load one behavior instead of the auto-initializing entry:

```js
import { initTabs } from "@luz-ds/core/tabs";
import { copyToClipboard } from "@luz-ds/core/clipboard";
```

Published modules: `theme`, `sidebar`, `clipboard`, `modal`, `highlight`, `player`, `tabs`, `utils`, `i18n`, `midi`, `table-sort`. Importing one has no side effects until you call its `init*()`. Every page works without JavaScript.

## What each package needs

The page shell of a whole page is site; the layout objects of an app with a sidebar are core; the hero of a landing page is landing. The full table, checked against the CSS, is on [How LUZ is organised](https://nandovejer.github.io/luz/docs/get-started/structure/#needs).

## Color modes and themes

**Color modes** belong to the tokens layer. The base system provides `light`, `dark` and `high-contrast`, selected with `data-theme` on `<html>`, or on any element to scope a mode to it:

```html
<html data-theme="dark"></html>
```

**Themes.** LUZ ships one look, Vejer, in the three modes above. A theme of your own is a set of semantic tokens under its own `data-theme`, with `data-mode` for its light, dark and high-contrast variants. Start from `@luz-ds/core/themes/_template.css` and list the name in `<html data-luz-themes="my-brand">` so the mode switcher remembers it.

Components use semantic tokens, never the primitive scales:

```css
/* Correct */
color: var(--luz-text-primary);
background: var(--luz-brand-fill);
border-color: var(--luz-divider);

/* Incorrect: breaks theming */
color: var(--luz-gray-100);
background: #0d0e11;
```

## Components

Every component has a page in the documentation with a live example, the markup to copy, when to use it and when not to.

- **Actions and input:** buttons, copy button, dropdown, form fields (text, date and time, range, color, file, checkbox and radio groups, switches), select
- **Show content:** accordion, avatar, card, code block, figure, icon grid, table, tag and badge
- **Feedback and status:** alert, modal, progress and meter, toast, tooltip
- **Navigation:** breadcrumb, pagination, sidebar, tabs, color mode switcher
- **Media:** video, audio and MIDI player
- **Helpers:** layout objects (`.o-*`), utility classes (`.u-*`) and keyframes

## For AI agents

LUZ is plain HTML and CSS, so an AI coding agent can write it when it knows which names exist. Give it this: read [`llms.txt`](https://nandovejer.github.io/luz/llms.txt) first, use only the classes in the `classes.json` of each package, and run `npx @luz-ds/check` on every HTML and CSS file it writes.

What an agent can read, what the check reports and what it does not do are on [Working with AI](https://nandovejer.github.io/luz/docs/get-started/ai/). The same page has a prompt you can paste.

## Accessibility

LUZ aims for WCAG 2.2 level AA: keyboard operation, visible focus, 4.5:1 text contrast in the three modes and a high-contrast mode are part of every component. Form controls are native HTML controls where possible.

Automated checks run on every change. No assistive technology has been used to test this release. The [accessibility statement](https://nandovejer.github.io/luz/docs/accessibility/) lists what is checked, what has not been tested and the known issues.

## License

MIT, including the fonts. Every bundled font is under the MIT License only: ET Book, in `@luz-ds/tokens`. Its notice ships next to the font files (`LICENSE-ETBook.txt`). Controls, labels, tables and code use the system fonts, so nothing else is bundled; `@luz-ds/core` ships no fonts.

---

## Work on LUZ

Everything above is for people who install the packages. The rest is for people who change them.

### Principles

- **Vanilla first.** No runtime frameworks and no browser-side dependencies. Native browser APIs are always preferred.
- **Tokens first.** Components consume semantic tokens, not primitive color scales.
- **Source-first workflow.** Edit `src/`, then regenerate `dist/`.
- **Accessibility first.** Keyboard behavior, visible focus states and ARIA contracts are part of the component surface. The rules are in [PRINCIPLES.md](./PRINCIPLES.md).

### Workspace

See [STRUCTURE.md](./dev/STRUCTURE.md) for the full annotated directory layout. Summary:

```text
luz-design-system/
├── apps/                      # Internal apps (not publishable)
│   ├── landing/               # Home page: what LUZ is for, why, and how to adopt it
│   └── docs/                  # The documentation: install, tokens, components, site patterns, HTML elements
├── packages/
│   ├── tokens/                # @luz-ds/tokens
│   │   ├── tokens.json        # Source of truth for primitives
│   │   ├── src/semantic.css   # Semantic tokens (light / dark / high-contrast)
│   │   ├── fonts/             # ET Book woff2 + licence
│   │   └── dist/              # Generated: do not edit directly
│   ├── core/                  # @luz-ds/core
│   │   ├── src/               # Edit here, never dist/
│   │   │   ├── settings/  generic/  elements/  objects/  utilities/
│   │   │   ├── components/    # One file per component
│   │   │   ├── classless/  print/
│   │   │   ├── themes/        # _template.css, the starting point of a theme of your own
│   │   │   └── *.js           # One module per behavior
│   │   └── dist/              # Generated: do not edit directly
│   ├── site/                  # @luz-ds/site
│   │   ├── src/
│   │   └── dist/
│   ├── landing/               # @luz-ds/landing (its own version, 0.x)
│   │   ├── src/
│   │   └── dist/
│   ├── cms/                   # @luz-ds/cms (its own version, 0.x)
│   │   ├── src/
│   │   └── dist/
│   └── app/                   # @luz-ds/app (its own version, 0.x)
│       ├── src/
│       └── dist/
├── docs/                      # Generated GitHub Pages site (pnpm pages:build): do not edit
├── scripts/                   # Build, tarball check and publish helpers
└── tests/                     # Vitest unit tests and Playwright UI tests
```

The home page (`apps/landing/`) and the documentation (`apps/docs/`) consume the packages during development.

### Requirements

- Node.js 20+ with ES module support
- `pnpm` as the package manager (`packageManager` is pinned in `package.json`)

### Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts Vite at `localhost:5173` (home page at `/`, documentation at `/docs/`). Its `predev` hook builds `dist/` first if any package is missing one.

| App | URL | Source |
| --- | --- | --- |
| Landing | `http://localhost:5173/` | `apps/landing/` |
| Documentation | `http://localhost:5173/docs/` | `apps/docs/` |

Edits to files under `apps/` reload on save. Edits to package sources (`packages/*/src`) need a rebuild (`pnpm build`, or `pnpm tokens:build` / `pnpm core:build` / `pnpm site:build` / `pnpm landing:build` / `pnpm cms:build` / `pnpm app:build`), and then a restart of `pnpm dev`: Vite does not pick up regenerated `dist/` files and keeps serving the old CSS until it restarts. To use a different port, pass it through: `pnpm dev --port 3000`.

To load the packages from this repository in a page of your own, point at `dist/`: `/packages/tokens/dist/luz-tokens.css`, `/packages/core/dist/luz.css`, `/packages/site/dist/site.css`, `/packages/landing/dist/landing.css`, `/packages/cms/dist/cms.css`, `/packages/app/dist/app.css` and `/packages/core/dist/luz.js`.

### Commands

```bash
pnpm dev             # Vite dev server
pnpm build           # tokens:build + core:build + site:build + landing:build + cms:build + app:build
pnpm tokens:build    # Regenerate packages/tokens/dist
pnpm core:build      # Regenerate packages/core/dist
pnpm site:build      # Regenerate packages/site/dist
pnpm landing:build   # Regenerate packages/landing/dist
pnpm cms:build       # Regenerate packages/cms/dist
pnpm app:build       # Regenerate packages/app/dist
pnpm lint:css        # Stylelint over packages/**/*.css and apps/**/*.css
pnpm lint:js         # ESLint over the JS of packages, apps, scripts and tests
pnpm test:unit       # Vitest (run `pnpm build` first: some suites read dist/)
pnpm test:ui         # Playwright; first time: pnpm test:ui:install
pnpm pages:build     # Build the GitHub Pages site into docs/
pnpm check:pack      # What each package would publish vs. the committed snapshot
pnpm audit:prod      # Production dependency audit
pnpm changeset       # Describe a change for the next release
```

### Testing

- **Unit (Vitest):** utilities, the MIDI parser (including malformed and hostile input), and dist contract checks: every `url()` in published CSS resolves, no docs-only selectors ship, `base.css` carries the settings components need.
- **UI (Playwright):** theme and mode switching, sidebar, modal focus trap, tabs keyboard behavior, the three adoption levels loaded as a consumer would load them, and the home and documentation pages (axe, no horizontal overflow, works without JavaScript, contrast of text).
- **Tarball contract (`pnpm check:pack`):** file list per package, `LICENSE` and font licences present, no sources or dotfiles, exports targets exist, no `workspace:` ranges.

See [TESTING.md](./dev/TESTING.md) for the detailed guide. Test tooling is dev-only and does not conflict with the vanilla-first runtime principle.

### Build flow

For the complete workflow see [DIST-RULES.md](./dev/DIST-RULES.md). The short version: edit `src/`, run the package's build, never edit `dist/`. Every build starts from a clean `dist/`.

**Tokens.** `packages/tokens/dist/` is composed from tracked sources: the primitives (Layer 1), generated from `packages/tokens/tokens.json`, and the handwritten `light`, `dark` and `high-contrast` blocks of `packages/tokens/src/semantic.css` (Layer 2). Outputs: `luz-tokens.css` (fonts + tokens), `tokens.css` (no `@font-face`), `fonts.css`, `tokens.json`, the DTCG files and `fonts/`.

The colour primitives are LUZ's own palette, computed in OKLCH by `scripts/build-palette.js` (one lightness curve shared by every family, a chroma curve and a hue per family): to change a colour, edit the numbers there and run `node scripts/build-palette.js`, which rewrites the `color` block of `tokens.json`. To add another primitive, edit `tokens.json`; to add a semantic token, edit all three blocks of `semantic.css`. Then:

```bash
pnpm tokens:build
```

**Core.** All source edits belong in `packages/core/src/`. After any change:

```bash
pnpm core:build
```

This regenerates `dist/luz.css`, `dist/base.css` (settings + reset + elements, the prerequisite for per-component CSS), `dist/components/*.css`, `dist/classless.css`, `dist/print.css`, the JS modules, the lazy `midi.js` and `table-sort.js` chunks and `dist/themes/*.css`. Core settings (z-index scale, motion, breakpoints, `--luz-font-heading`) ship with core, not with tokens.

**Site.** `@luz-ds/site` holds page patterns that are too opinionated for core. It is CSS first; `dist/site.js` defines the search element and warns when core is not loaded.

```bash
pnpm site:build
```

**Landing.** `@luz-ds/landing` holds the patterns of a landing page, on top of site. CSS only: `dist/landing.css` and `landing.min.css`, in the `luz.landing` layer. Site and landing build through one shared builder, `scripts/build-package.js` (a package for another kind of site adds a three-line `scripts/build-<name>.js`).

```bash
pnpm landing:build
```

**CMS.** `@luz-ds/cms` holds the patterns of a blog, a newspaper or any CMS, on top of site, through the same builder. CSS only: `dist/cms.css` and `cms.min.css`, in the `luz.cms` layer. Landing and cms never depend on each other.

```bash
pnpm cms:build
```

**App.** `@luz-ds/app` holds the header and the dashboard of a web application, on top of core's shell and sidebar, through the same builder. CSS only: `dist/app.css` and `app.min.css`, in the `luz.app` layer. Landing, cms and app never depend on each other.

```bash
pnpm app:build
```

### GitHub Pages

The public site is the optimized build of the apps, committed in `docs/` (landing at `/`, documentation at `/docs/`). Configure Pages to deploy from the `main` branch, `/docs` folder.

```bash
pnpm pages:build   # packages + Vite build with relative URLs, then commit docs/
```

`docs/` is generated: change the sources under `apps/` and `packages/`, then rebuild. URLs are relative, so the site works under `https://<user>.github.io/<repo>/` and on a custom domain.

### Releases

Tokens, core and site share one version and are released together with [changesets](https://github.com/changesets/changesets). A package for one kind of site (landing) has its own version, 0.x for now, and peer ranges on the major of the other three:

1. Add a changeset to your PR: `pnpm changeset`.
2. Merging to `main` opens a "version packages" PR.
3. Merging that PR runs CI, waits for approval in the `release` environment and publishes to npm with provenance (trusted publishing, no stored token).

Nobody publishes from a local machine. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

### Working with AI agents

[AGENTS.md](./AGENTS.md) holds the project context and rules. The specialist agents live in `.claude/agents/`:

| Agent | Role |
| --- | --- |
| `frontend-engineer` | Architecture and packaging, token and component coherence, docs and microcopy |
| `ux-designer` | UX reviews and handoff specs: tokens, states, keyboard and ARIA, Figma mapping |
| `accessibility-engineer` | WCAG 2.2 and EN 301 549 audits of components and pages |
| `test-runner` | Runs the gates and the unit and Playwright suites and reports the result |
| `security-auditor` | Supply chain, published tarballs, CI/CD hardening, code review for security |
| `safari-reviewer`, `firefox-reviewer` | Browser reviews, only with the owner's permission |
| `outside-reviewer` | An outside reviewer's report, only when the owner asks |

### Documentation index

| File | Purpose |
| --- | --- |
| **[PRINCIPLES.md](./PRINCIPLES.md)** | Red lines and strong rules every change must respect |
| **[VANILLA-FIRST.md](./dev/VANILLA-FIRST.md)** | Architectural philosophy: why vanilla, decision framework |
| **[STRUCTURE.md](./dev/STRUCTURE.md)** | Annotated monorepo directory layout |
| **[DIST-RULES.md](./dev/DIST-RULES.md)** | Build workflow: `src/` to `dist/` regeneration steps |
| **[QUICK-REFERENCE.md](./dev/QUICK-REFERENCE.md)** | Commands, naming conventions, token structure, component inventory |
| **[TESTING.md](./dev/TESTING.md)** | Test infrastructure and coverage strategy |
| **[AGENTS.md](./AGENTS.md)** | Project context and rules for AI agents |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | PR guidelines, checklist, releases |
| **[SECURITY.md](./SECURITY.md)** | Reporting, supply-chain practices, CDN/SRI guidance, audit history |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and migration notes |
