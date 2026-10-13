<div align="center">

# CAI Design System

**Consistent Adaptive Identity**

A vanilla design system in plain CSS and ES modules.<br>
No framework. No build step for consumers.

[![CI](https://github.com/nandovejer/cai/actions/workflows/ci.yml/badge.svg)](https://github.com/nandovejer/cai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Status: beta](https://img.shields.io/badge/status-beta-orange)
![Runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)

[Install](#install-and-load) ·
[What each package needs](#what-each-package-needs) ·
[Components](#components) ·
[Accessibility](#accessibility) ·
[Documentation](https://nandovejer.github.io/cai/docs/) ·
[Work on CAI](#work-on-cai)

</div>

---

> [!WARNING]
> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

CAI is built with plain CSS, ES modules and native browser APIs. Adopt only the tokens, add the components, or take whole-page patterns: the three layers are independent packages that stack in one direction.

```text
@cai-ds/tokens  ->  @cai-ds/core  ->  @cai-ds/site
   standalone        needs tokens      needs core + tokens
```

The name stands for Consistent Adaptive Identity: one set of tokens that every component reads (consistent), that switches between light, dark and high contrast and reflows with the screen (adaptive), and that your own tokens can replace to carry your brand (identity).

- [`@cai-ds/tokens`](./packages/tokens): design tokens (CSS custom properties), the three color modes and the font.
- [`@cai-ds/core`](./packages/core): the components, the layout objects, the styles of bare HTML elements and optional JavaScript.
- [`@cai-ds/site`](./packages/site): page patterns (page shell, site header, footer, image frame) and the site search.

## Install and load

Each package needs the ones below it and nothing above it. Adopt one level and stop there, or keep going.

| You want | Install | Load, in order |
| --- | --- | --- |
| Tokens only | `@cai-ds/tokens` | `cai-tokens.css` |
| Tokens + components | `@cai-ds/tokens` `@cai-ds/core` | `cai-tokens.css`, `cai.css`, optionally `cai.js` |
| Tokens + components + page patterns | `@cai-ds/tokens` `@cai-ds/core` `@cai-ds/site` | `cai-tokens.css`, `cai.css`, `site.css`, optionally `cai.js` and `site.js` |

`@cai-ds/core` declares `@cai-ds/tokens` as a required peer dependency; `@cai-ds/site` declares both. npm and pnpm install required peers automatically; Yarn only warns, so list every package explicitly.

```bash
npm install @cai-ds/tokens                                   # level 1
npm install @cai-ds/tokens @cai-ds/core                      # level 2
npm install @cai-ds/tokens @cai-ds/core @cai-ds/site     # level 3
```

### With a bundler

```js
import "@cai-ds/tokens/css";
import "@cai-ds/core/css";
import "@cai-ds/site/css"; // level 3 only

import "@cai-ds/core";         // optional: the JavaScript, starts every behavior
import "@cai-ds/site";     // level 3, only if you use the search
```

`@cai-ds/core` and `@cai-ds/site` without `/css` are the scripts, not the stylesheets.

### From a CDN

Drop the lines for the levels you do not use:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/site@3.0.0/dist/site.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/site@3.0.0/dist/site.min.js"></script>
```

Pin an exact version and add an `integrity` hash in production; see [SECURITY.md](./SECURITY.md). A console warning tells you when a layer is loaded without the one below it.

> **Release status:** CAI is in beta. The `3.0.0` snippets above work once the release is published. Until then the packages in this repository are versioned `2.0.0` with a pending major changeset.

### Other files you can load

| File | Package | What it is |
| --- | --- | --- |
| `base.css` + `components/<name>.css` | core | The reset and bare elements, then only the components you list, instead of `cai.css` |
| `classless.css` (`@cai-ds/core/classless.css`) | core | Styles bare `button`, fields, `select` and `table` inside `[data-cai-classless]`, for Markdown or a CMS |
| `print.css` | core | The print styles on their own; `cai.css` already contains them |
| `themes/_template.css` | core | The starting point of a theme of your own |
| `tokens.css`, `fonts.css` | tokens | The tokens without `@font-face`, or the `@font-face` only |
| `search.js` | site | The search element on its own (`@cai-ds/site/search`) |
| `placeholders/*` | site | The images the image frame shows when it has no picture |

### JavaScript modules

To load one behavior instead of the auto-initializing entry:

```js
import { initTabs } from "@cai-ds/core/tabs";
import { copyToClipboard } from "@cai-ds/core/clipboard";
```

Published modules: `theme`, `sidebar`, `clipboard`, `modal`, `highlight`, `player`, `tabs`, `utils`, `i18n`, `midi`, `table-sort`. Importing one has no side effects until you call its `init*()`. Every page works without JavaScript.

## What each package needs

The page shell of a whole page is site; the layout objects of an app with a sidebar are core. The full table, checked against the CSS, is on [How CAI is organised](https://nandovejer.github.io/cai/docs/get-started/structure/#needs).

## Color modes and themes

**Color modes** belong to the tokens layer. The base system provides `light`, `dark` and `high-contrast`, selected with `data-theme` on `<html>`, or on any element to scope a mode to it:

```html
<html data-theme="dark"></html>
```

**Themes.** CAI ships one look, Vejer, in the three modes above. A theme of your own is a set of semantic tokens under its own `data-theme`, with `data-mode` for its light, dark and high-contrast variants. Start from `@cai-ds/core/themes/_template.css` and list the name in `<html data-cai-themes="my-brand">` so the mode switcher remembers it.

Components use semantic tokens, never the primitive scales:

```css
/* Correct */
color: var(--cai-text-primary);
background: var(--cai-brand-fill);
border-color: var(--cai-divider);

/* Incorrect: breaks theming */
color: var(--cai-gray-100);
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

## Accessibility

CAI aims for WCAG 2.2 level AA: keyboard operation, visible focus, 4.5:1 text contrast in the three modes and a high-contrast mode are part of every component. Form controls are native HTML controls where possible.

Automated checks run on every change. No assistive technology has been used to test this release. The [accessibility statement](https://nandovejer.github.io/cai/docs/accessibility/) lists what is checked, what has not been tested and the known issues.

## License

MIT, including the fonts. Every bundled font is under the MIT License only: ET Book, in `@cai-ds/tokens`. Its notice ships next to the font files (`LICENSE-ETBook.txt`). Controls, labels, tables and code use the system fonts, so nothing else is bundled; `@cai-ds/core` ships no fonts.

---

## Work on CAI

Everything above is for people who install the packages. The rest is for people who change them.

### Principles

- **Vanilla first.** No runtime frameworks and no browser-side dependencies. Native browser APIs are always preferred.
- **Tokens first.** Components consume semantic tokens, not primitive color scales.
- **Source-first workflow.** Edit `src/`, then regenerate `dist/`.
- **Accessibility first.** Keyboard behavior, visible focus states and ARIA contracts are part of the component surface. The rules are in [PRINCIPLES.md](./PRINCIPLES.md).

### Workspace

See [STRUCTURE.md](./.claude/STRUCTURE.md) for the full annotated directory layout. Summary:

```text
cai-design-system/
├── apps/                      # Internal apps (not publishable)
│   ├── landing/               # Home page: what CAI is for, why, and how to adopt it
│   └── docs/                  # The documentation: install, tokens, components, site patterns, HTML elements
├── packages/
│   ├── tokens/                # @cai-ds/tokens
│   │   ├── tokens.json        # Source of truth for primitives
│   │   ├── src/semantic.css   # Semantic tokens (light / dark / high-contrast)
│   │   ├── fonts/             # ET Book woff2 + licence
│   │   └── dist/              # Generated: do not edit directly
│   ├── core/                  # @cai-ds/core
│   │   ├── src/               # Edit here, never dist/
│   │   │   ├── settings/  generic/  elements/  objects/  utilities/
│   │   │   ├── components/    # One file per component
│   │   │   ├── classless/  print/
│   │   │   ├── themes/        # _template.css, the starting point of a theme of your own
│   │   │   └── *.js           # One module per behavior
│   │   └── dist/              # Generated: do not edit directly
│   └── site/              # @cai-ds/site
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

Edits to files under `apps/` reload on save. Edits to package sources (`packages/*/src`) need a rebuild (`pnpm build`, or `pnpm tokens:build` / `pnpm core:build` / `pnpm site:build`), and then a restart of `pnpm dev`: Vite does not pick up regenerated `dist/` files and keeps serving the old CSS until it restarts. To use a different port, pass it through: `pnpm dev --port 3000`.

To load the packages from this repository in a page of your own, point at `dist/`: `/packages/tokens/dist/cai-tokens.css`, `/packages/core/dist/cai.css`, `/packages/site/dist/site.css` and `/packages/core/dist/cai.js`.

### Commands

```bash
pnpm dev             # Vite dev server
pnpm build           # tokens:build + core:build + site:build
pnpm tokens:build    # Regenerate packages/tokens/dist
pnpm core:build      # Regenerate packages/core/dist
pnpm site:build  # Regenerate packages/site/dist
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

See [TESTING.md](./.claude/TESTING.md) for the detailed guide. Test tooling is dev-only and does not conflict with the vanilla-first runtime principle.

### Build flow

For the complete workflow see [DIST-RULES.md](./.claude/DIST-RULES.md). The short version: edit `src/`, run the package's build, never edit `dist/`. Every build starts from a clean `dist/`.

**Tokens.** `packages/tokens/dist/` is composed from tracked sources: the primitives (Layer 1), generated from `packages/tokens/tokens.json`, and the handwritten `light`, `dark` and `high-contrast` blocks of `packages/tokens/src/semantic.css` (Layer 2). Outputs: `cai-tokens.css` (fonts + tokens), `tokens.css` (no `@font-face`), `fonts.css`, `tokens.json`, the DTCG files and `fonts/`.

The colour primitives are CAI's own palette, computed in OKLCH by `scripts/build-palette.js` (one lightness curve shared by every family, a chroma curve and a hue per family): to change a colour, edit the numbers there and run `node scripts/build-palette.js`, which rewrites the `color` block of `tokens.json`. To add another primitive, edit `tokens.json`; to add a semantic token, edit all three blocks of `semantic.css`. Then:

```bash
pnpm tokens:build
```

**Core.** All source edits belong in `packages/core/src/`. After any change:

```bash
pnpm core:build
```

This regenerates `dist/cai.css`, `dist/base.css` (settings + reset + elements, the prerequisite for per-component CSS), `dist/components/*.css`, `dist/classless.css`, `dist/print.css`, the JS modules, the lazy `midi.js` and `table-sort.js` chunks and `dist/themes/*.css`. Core settings (z-index scale, motion, breakpoints, `--cai-font-heading`) ship with core, not with tokens.

**Site.** `@cai-ds/site` holds page patterns that are too opinionated for core. It is CSS first; `dist/site.js` defines the search element and warns when core is not loaded.

```bash
pnpm site:build
```

### GitHub Pages

The public site is the optimized build of the apps, committed in `docs/` (landing at `/`, documentation at `/docs/`). Configure Pages to deploy from the `main` branch, `/docs` folder.

```bash
pnpm pages:build   # packages + Vite build with relative URLs, then commit docs/
```

`docs/` is generated: change the sources under `apps/` and `packages/`, then rebuild. URLs are relative, so the site works under `https://<user>.github.io/<repo>/` and on a custom domain.

### Releases

The three packages share one version and are released together with [changesets](https://github.com/changesets/changesets):

1. Add a changeset to your PR: `pnpm changeset`.
2. Merging to `main` opens a "version packages" PR.
3. Merging that PR runs CI, waits for approval in the `release` environment and publishes to npm with provenance (trusted publishing, no stored token).

Nobody publishes from a local machine. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

### Working with AI agents

[AGENTS.md](./AGENTS.md) holds the project context and rules. The specialist agents live in `.claude/agents/`:

| Agent | Role |
| --- | --- |
| `frontend` | Architecture and packaging, token and component coherence, docs and microcopy |
| `ux` | UX reviews and handoff specs: tokens, states, keyboard and ARIA, Figma mapping |
| `accessibility` | WCAG 2.2 and EN 301 549 audits of components and pages |
| `tester` | Runs the gates and the unit and Playwright suites and reports the result |
| `npm-security-auditor` | Supply chain, published tarballs, CI/CD hardening, code review for security |
| `front-safari`, `front-firefox` | Browser reviews, only with the owner's permission |
| `sincero` | An outside reviewer's report, only when the owner asks |

### Documentation index

| File | Purpose |
| --- | --- |
| **[PRINCIPLES.md](./PRINCIPLES.md)** | Red lines and strong rules every change must respect |
| **[VANILLA-FIRST.md](./.claude/VANILLA-FIRST.md)** | Architectural philosophy: why vanilla, decision framework |
| **[STRUCTURE.md](./.claude/STRUCTURE.md)** | Annotated monorepo directory layout |
| **[DIST-RULES.md](./.claude/DIST-RULES.md)** | Build workflow: `src/` to `dist/` regeneration steps |
| **[QUICK-REFERENCE.md](./.claude/QUICK-REFERENCE.md)** | Commands, naming conventions, token structure, component inventory |
| **[TESTING.md](./.claude/TESTING.md)** | Test infrastructure and coverage strategy |
| **[AGENTS.md](./AGENTS.md)** | Project context and rules for AI agents |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | PR guidelines, checklist, releases |
| **[SECURITY.md](./SECURITY.md)** | Reporting, supply-chain practices, CDN/SRI guidance, audit history |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and migration notes |
