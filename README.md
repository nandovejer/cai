<div align="center">

# CAI Design System

**Consistent Adaptive Identity**

A vanilla design system in plain CSS and ES modules.<br>
No framework. No build step for consumers.

[![CI](https://github.com/nandovejer/cai/actions/workflows/ci.yml/badge.svg)](https://github.com/nandovejer/cai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Status: beta](https://img.shields.io/badge/status-beta-orange)
![Runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933)
![pnpm](https://img.shields.io/badge/pnpm-9-f69220)

[Adoption levels](#adoption-levels) ·
[Development](#development) ·
[Components](#components-included) ·
[Releases](#releases) ·
[Contributing](./CONTRIBUTING.md)

</div>

---

> [!WARNING]
> **Beta.** The tokens, components and patterns work and are tested, but names, classes and behavior can still change before the stable release. Pin an exact version and read the changelog before you upgrade.

CAI is built with plain CSS, ES modules and native browser APIs. Adopt only the tokens, add the components, or take the whole app shell: the three layers are independent packages that stack in one direction.

```text
@cai-ds/tokens  ->  @cai-ds/core  ->  @cai-ds/platform
   standalone        needs tokens      needs core + tokens
```

## Contents

- [Adoption levels](#adoption-levels)
- [Principles](#principles)
- [Workspace](#workspace)
- [Development](#development) and [Commands](#commands)
- [Testing](#testing) and [Build Flow](#build-flow)
- [Using the packages](#using-the-packages-in-this-repo)
- [Color modes and themes](#color-modes-and-themes)
- [Components included](#components-included) and [Accessibility](#accessibility)
- [GitHub Pages](#github-pages) and [Releases](#releases)
- [Working with AI agents](#working-with-ai-agents) and [Documentation index](#documentation-index)

## Packages

The repository is a small monorepo with three package layers:

- [`@cai-ds/tokens`](./packages/tokens) — design tokens (CSS custom properties) and self-hosted MIT-licensed fonts
- [`@cai-ds/core`](./packages/core) — reusable CSS components and vanilla JS behaviors
- [`@cai-ds/platform`](./packages/platform) — app-shell patterns built on top of core

The landing (`apps/landing/`), the core + tokens docs (`apps/docs/`), the platform docs (`apps/platform-docs/`) and the HTML elements reference (`apps/html-elements/`) consume those packages during development.

## Adoption levels

The three packages are optional but layered: each one requires the layers below it and nothing above it. Adopt one level and stop there, or keep going.

| You want | Install | Load, in order |
| --- | --- | --- |
| Tokens only | `@cai-ds/tokens` | `cai-tokens.css` |
| Tokens + components | `@cai-ds/tokens` `@cai-ds/core` | `cai-tokens.css`, `cai.css`, optionally `cai.js` |
| Tokens + components + app shell | `@cai-ds/tokens` `@cai-ds/core` `@cai-ds/platform` | `cai-tokens.css`, `cai.css`, `platform.css`, optionally `cai.js` |

`@cai-ds/core` declares `@cai-ds/tokens` as a required peer dependency; `@cai-ds/platform` declares both. npm and pnpm install required peers automatically; Yarn only warns, so list every package explicitly.

```bash
npm install @cai-ds/tokens                                   # level 1
npm install @cai-ds/tokens @cai-ds/core                      # level 2
npm install @cai-ds/tokens @cai-ds/core @cai-ds/platform     # level 3
```

Or from a CDN — drop the lines for the layers you do not use:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/platform@3.0.0/dist/platform.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.min.js"></script>
```

Pin an exact version and add an `integrity` hash in production; see [SECURITY.md](./SECURITY.md). A console warning tells you when a layer is loaded without the one below it.

> **Release status:** CAI is in beta. The `3.0.0` snippets above work once the release is published. Until then the packages in this repository are versioned `2.0.0` with a pending major changeset.

## Principles

- **Vanilla first.** No runtime frameworks and no browser-side dependencies. Native browser APIs are always preferred.
- **Tokens first.** Components consume semantic tokens, not primitive color scales.
- **Source-first workflow.** Edit `src/`, then regenerate `dist/`.
- **Accessibility by default.** Keyboard behavior, visible focus states, and ARIA contracts are part of the component surface.

## Workspace

See [STRUCTURE.md](./.claude/STRUCTURE.md) for the full annotated directory layout. Summary:

```text
cai-design-system/
├── apps/                      # Internal apps (not publishable)
│   ├── landing/               # Landing: what CAI is, the three levels, everything live
│   ├── docs/                  # Core + tokens technical docs
│   ├── platform-docs/         # Platform docs and live demos
│   └── html-elements/         # Every current HTML element, live, and how CAI styles it
├── packages/
│   ├── tokens/                # @cai-ds/tokens
│   │   ├── tokens.json        # Source of truth for primitives
│   │   ├── src/semantic.css   # Semantic tokens (light / dark / high-contrast)
│   │   ├── fonts/             # ET Book woff2 + licence
│   │   └── dist/              # Generated — do not edit directly
│   ├── core/                  # @cai-ds/core
│   │   ├── src/               # Edit here, never dist/
│   │   │   ├── settings/  generic/  elements/  objects/
│   │   │   ├── components/    # One file per component
│   │   │   ├── themes/        # Custom visual identities (under review)
│   │   │   └── *.js           # One module per behavior
│   │   └── dist/              # Generated — do not edit directly
│   └── platform/              # @cai-ds/platform
│       ├── src/
│       └── dist/
├── docs/                      # Generated GitHub Pages site (pnpm pages:build) — do not edit
├── scripts/                   # Build, tarball check and publish helpers
└── tests/                     # Vitest unit tests and Playwright UI tests
```

## Requirements

- Node.js 20+ with ES module support
- `pnpm` as the package manager (`packageManager` is pinned in `package.json`)

## Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts Vite at `localhost:5173` (landing at `/`, core docs at `/docs/`, platform docs at `/platform/`, HTML elements at `/html/`). Its `predev` hook builds `dist/` first if any package is missing one.

If you change sources during dev, re-run `pnpm build` or a specific build command to regenerate the assets — the apps load the built `dist/` files.

### Running the landing page

1. Install dependencies once: `pnpm install`.
2. Start the dev server: `pnpm dev`.
3. Open [http://localhost:5173/](http://localhost:5173/). The landing lives in `apps/landing/` (`index.html`, `landing.css`, `landing.js`).

| App | URL | Source |
| --- | --- | --- |
| Landing | `http://localhost:5173/` | `apps/landing/` |
| Core + tokens docs | `http://localhost:5173/docs/` | `apps/docs/` |
| Platform docs | `http://localhost:5173/platform/` | `apps/platform-docs/` |
| HTML elements | `http://localhost:5173/html/` | `apps/html-elements/` |

Edits to files under `apps/landing/` reload on save. Edits to package sources (`packages/*/src`) need a rebuild (`pnpm build`, or `pnpm tokens:build` / `pnpm core:build` / `pnpm platform:build`), and then a restart of `pnpm dev`: Vite does not pick up regenerated `dist/` files and keeps serving the old CSS until it restarts. To use a different port, pass it through: `pnpm dev --port 3000`.

## Commands

```bash
pnpm dev             # Vite dev server
pnpm build           # tokens:build + core:build + platform:build
pnpm tokens:build    # Regenerate packages/tokens/dist
pnpm core:build      # Regenerate packages/core/dist
pnpm platform:build  # Regenerate packages/platform/dist
pnpm lint:css        # Stylelint over packages/**/*.css
pnpm lint:js         # ESLint over packages/**/*.js and scripts/**/*.js
pnpm test:unit       # Vitest (run `pnpm build` first: some suites read dist/)
pnpm test:ui         # Playwright; first time: pnpm test:ui:install
pnpm pages:build     # Build the GitHub Pages site into docs/
pnpm check:pack      # What each package would publish vs. the committed snapshot
pnpm audit:prod      # Production dependency audit
pnpm changeset       # Describe a change for the next release
```

## Testing

- **Unit (Vitest):** utilities, the MIDI parser (including malformed and hostile input), and dist contract checks — every `url()` in published CSS resolves, no docs-only selectors ship, `base.css` carries the settings components need.
- **UI (Playwright):** theme and mode switching, sidebar, modal focus trap, tabs keyboard behavior, the three adoption levels loaded as a consumer would load them, and the landing (inventory counts checked against the package sources, no horizontal overflow, works without JavaScript, contrast of landing text).
- **Tarball contract (`pnpm check:pack`):** file list per package, `LICENSE` and font licences present, no sources or dotfiles, exports targets exist, no `workspace:` ranges.

See [TESTING.md](./.claude/TESTING.md) for the detailed guide. Test tooling is dev-only and does not conflict with the vanilla-first runtime principle.

## Build Flow

For the complete workflow see [DIST-RULES.md](./.claude/DIST-RULES.md). The short version: edit `src/`, run the package's build, never edit `dist/`. Every build starts from a clean `dist/`.

### Tokens

`packages/tokens/dist/` is composed from tracked sources:

- **Layer 1 — Primitives:** generated from `packages/tokens/tokens.json`
- **Layer 2 — Semantics:** handwritten `light`, `dark` and `high-contrast` blocks in `packages/tokens/src/semantic.css`

Outputs: `cai-tokens.css` (fonts + tokens), `tokens.css` (no `@font-face`, bring your own fonts), `fonts.css`, `tokens.json`, and `fonts/`.

To add a primitive, edit `tokens.json`; to add a semantic token, edit all three blocks of `semantic.css`. Then:

```bash
pnpm tokens:build
```

### Core

All source edits belong in `packages/core/src/`. After any change:

```bash
pnpm core:build
```

This regenerates `dist/cai.css`, `dist/base.css` (settings + reset + elements, the prerequisite for per-component CSS), `dist/components/*.css`, the JS modules, the lazy `midi.js` chunk and `dist/themes/*.css`.

Core settings — z-index scale, motion, breakpoints, `--cai-font-heading` — ship with core, not with tokens.

### Platform

`@cai-ds/platform` is the app-level layer: shells and layout patterns that are too opinionated for core.

**Use platform when** you build a web app with a page shell, header, sections and footer and want design-system-aware patterns instead of repeating markup.

**Use core alone when** you build your own layout, a component library or embed CAI in a framework.

- `tokens` = primitive and semantic variables
- `core` = generic reusable components and behaviors
- `platform` = app shells and product-facing layout patterns

Current platform primitives:

- `.cai-platform-page` and `.cai-platform-page--gradient`
- `.cai-platform-content`, `.cai-platform-main`, `.cai-platform-section`
- `.cai-platform-page-header`, `__title`, `__lead`
- `.cai-platform-actions`, `.cai-platform-feature-grid`
- `.cai-platform-footer`, `.cai-platform-skip-link`
- `.cai-platform-command-block`, `__cmd`, `__prefix`

Platform is CSS-first. `dist/platform.js` is reserved for future platform-level helpers; today it only warns when core is not loaded.

```bash
pnpm platform:build
```

## Using The Packages In This Repo

Load the layers in order — tokens, then core, then platform:

```html
<link rel="stylesheet" href="/packages/tokens/dist/cai-tokens.css" />
<link rel="stylesheet" href="/packages/core/dist/cai.css" />
<link rel="stylesheet" href="/packages/platform/dist/platform.css" />
<script type="module" src="/packages/core/dist/cai.js"></script>
```

To load a single behavior instead of the auto-initializing entry:

```js
import { initTabs } from "@cai-ds/core/tabs";
import { copyToClipboard } from "@cai-ds/core/clipboard";
```

Published JS modules: `theme`, `sidebar`, `clipboard`, `modal`, `highlight`, `player`, `tabs`, `toggle`, `utils`, `midi`. Importing one has no side effects until you call its `init*()`.

## Color Modes And Themes

**Color modes** belong to the tokens layer. The base system provides `light`, `dark` and `high-contrast`, selected with `data-theme` on `<html>` — or on any element, to scope a mode to it:

```html
<html data-theme="dark"></html>
```

**Custom themes** (`minimalist`, `ricardoymortimer`) are complete visual identities shipped by `@cai-ds/core` under `dist/themes/`. They use `data-theme="<name>"` plus `data-mode` for their own light/dark/high-contrast variants.

> **Under review.** Custom themes are being reconsidered and are deliberately left out of the landing and of the three-layer adoption story. They still ship in core. One consequence to know about: `cai.js` applies `minimalist` when the visitor has no stored choice, overriding a `data-theme` you set in markup. If you need a base mode as your default, import the individual modules (for example `@cai-ds/core/clipboard`) instead of `cai.js`, and set `data-theme` yourself.

## Token Rules

Components must use semantic tokens:

```css
/* Correct */
color: var(--cai-text-primary);
background: var(--cai-brand-primary);
border-color: var(--cai-border-subtle);

/* Incorrect — breaks theming */
color: var(--cai-gray-100);
background: var(--cai-blue-60);
color: #161616;
```

Primitive tokens (`--cai-blue-*`, `--cai-gray-*`, etc.) are only used inside the tokens layer to define semantic tokens.

## Components Included

- **Foundations:** shell, container, grid, stack, media objects
- **Form:** text inputs, select, date/time pickers, range with output, meter, color picker, file upload, checkbox/radio groups, toggles, fieldset/legend, datalist
- **Actions:** buttons (primary, secondary, ghost, outline, danger, sizes), copy button
- **Display:** tags, badges, avatars, progress bars, tooltips, figures, icon grid
- **Feedback:** alerts, toasts, modal
- **Content:** cards, tables, tabs, breadcrumbs, code blocks
- **Navigation:** sidebar, color mode switcher
- **Media:** video player, audio player, MIDI player
- **Utilities:** visibility, SR-only, text helpers, flex shortcuts

Every one of them is rendered live on the landing (`apps/landing/`).

## Accessibility

- Keyboard navigation for all interactive components
- Visible focus states on every focusable element
- ARIA state management (tabs, toggles, players, mode switcher)
- `high-contrast` mode
- Form controls use native HTML controls where possible

Known gaps are tracked in the security and design reviews; the main ones are contrast of the primary button in dark mode and of code syntax colors.

## GitHub Pages

The public site is the optimized build of the four apps, committed in `docs/` (landing at `/`, core docs at `/docs/`, platform docs at `/platform/`, HTML elements at `/html/`). Configure Pages to deploy from the `main` branch, `/docs` folder.

```bash
pnpm pages:build   # packages + Vite build with relative URLs, then commit docs/
```

`docs/` is generated: change the sources under `apps/` and `packages/`, then rebuild. URLs are relative, so the site works under `https://<user>.github.io/<repo>/` and on a custom domain.

## Releases

The three packages share one version and are released together with [changesets](https://github.com/changesets/changesets):

1. Add a changeset to your PR: `pnpm changeset`.
2. Merging to `main` opens a "version packages" PR.
3. Merging that PR runs CI, waits for approval in the `release` environment and publishes to npm with provenance (trusted publishing, no stored token).

Nobody publishes from a local machine. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## Working With AI Agents

[AGENTS.md](./AGENTS.md) holds the project context and rules. Three specialist agents live in `.claude/agents/`:

| Agent | Role |
| --- | --- |
| `design-system-architect` | Layering, package contracts, build and publish strategy, component APIs |
| `npm-security-auditor` | Supply chain, published tarballs, CI/CD hardening, code review for security |
| `ux-designer` | UX review and developer handoff specs: tokens, states, keyboard and ARIA, Figma mapping |

## Documentation Index

| File | Purpose |
| --- | --- |
| **[VANILLA-FIRST.md](./.claude/VANILLA-FIRST.md)** | Architectural philosophy — why vanilla, decision framework |
| **[STRUCTURE.md](./.claude/STRUCTURE.md)** | Annotated monorepo directory layout |
| **[DIST-RULES.md](./.claude/DIST-RULES.md)** | Build workflow — `src/` → `dist/` regeneration steps |
| **[QUICK-REFERENCE.md](./.claude/QUICK-REFERENCE.md)** | Commands, naming conventions, token structure, component inventory |
| **[TESTING.md](./.claude/TESTING.md)** | Test infrastructure and coverage strategy |
| **[AGENTS.md](./AGENTS.md)** | Project context and rules for AI agents |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | PR guidelines, checklist, releases |
| **[SECURITY.md](./SECURITY.md)** | Reporting, supply-chain practices, CDN/SRI guidance, audit history |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and migration notes |

## License

MIT, including the fonts. Every bundled font is under the MIT License only: ET Book (tokens) and Comic Shanns (core). Their notices ship next to the font files (`LICENSE-*.txt`). Body, UI and code text use the system fonts, so nothing else is bundled.
