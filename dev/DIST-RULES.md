# Dist Rules — CRITICAL

**`dist/` folders are generated from `src/`. Never edit them directly.**

Nothing under `dist/` is committed (it is gitignored). `pnpm dev` runs
`scripts/check-dist.js` first and rebuilds automatically if any package's
dist is missing.

## Full Build

```bash
pnpm build  # Runs tokens:build + core:build + site:build + landing:build + cms:build + app:build + luzcheck:build
```

## @luz-ds/tokens

`dist/luz-tokens.css` is composed from three tracked sources:

| Part | Source | Edit here |
| --- | --- | --- |
| `@font-face` | `packages/tokens/fonts/fonts.css` | yes |
| Layer 1 — primitives | `packages/tokens/tokens.json` | yes |
| Layer 2 — semantic themes | `packages/tokens/src/semantic.css` | yes |

```bash
pnpm tokens:build
```

- **Adding a primitive:** edit `tokens.json`, rebuild.
- **Adding a semantic token:** edit `src/semantic.css` in all three blocks
  (`:root, [data-theme="light"]`, `[data-theme="dark"]`,
  `[data-theme="high-contrast"]`), rebuild.

## @luz-ds/core

After editing any file in `packages/core/src/`:

```bash
pnpm core:build
```

This:

1. Inlines the `@import` graph of `src/index.css` → `dist/luz.css` (+ `.min`).
   The import list in `src/index.css` (and `src/components/index.css`) is the
   **single source of truth** for cascade order.
2. Emits every `src/components/*.css` as `dist/components/<name>.css`
   (+ `.min`) for standalone consumption.
3. Bundles `src/luz.js` with Rollup → `dist/luz.js` (`midi.js` stays a
   separate lazy chunk).
4. Copies the individual ESM modules (`theme.js`, `sidebar.js`,
   `clipboard.js`, `modal.js`, `highlight.js`, `player.js`, `utils.js`)
   verbatim to `dist/` — the source IS the artifact (vanilla-first).
5. Copies + minifies `src/themes/*.css` → `dist/themes/`.

## @luz-ds/site

After editing `packages/site/src/`:

```bash
pnpm site:build
```

This inlines the `@import` graph of `src/index.css` →
`dist/site.css` (+ `.min`), syncs `site.js`, `search.js` and `consent.js` and bundles
each into a `.min.js`. It runs the shared
builder, `scripts/build-package.js`, which also emits every
`src/components/*.css` whose name does not start with `_` as
`dist/components/<name>.css` (+ `.min`), in the package's layer with the same
rebased `url()`s as the bundle, and `src/components/_print.css` as
`dist/print.css` (+ `.min`). The same holds for landing, cms and app.

## @luz-ds/landing

After editing `packages/landing/src/`:

```bash
pnpm landing:build
```

This inlines the `@import` graph of `src/index.css` → `dist/landing.css`
(+ `.min`), in the `luz.landing` layer, through the same shared builder,
and each component as `dist/components/<name>.css` (+ `.min`).
No JavaScript. Landing has its own version (0.x): after adding or removing a
published file, run `node scripts/check-pack.js --update`.

## @luz-ds/cms

After editing `packages/cms/src/`:

```bash
pnpm cms:build
```

This inlines the `@import` graph of `src/index.css` → `dist/cms.css`
(+ `.min`), in the `luz.cms` layer, through the same shared builder,
and each component as `dist/components/<name>.css` (+ `.min`).
No JavaScript (the table of contents uses core's scroll spy). CMS has its own
version (0.x): after adding or removing a published file, run
`node scripts/check-pack.js --update`.

## @luz-ds/app

After editing `packages/app/src/`:

```bash
pnpm app:build
```

This inlines the `@import` graph of `src/index.css` → `dist/app.css`
(+ `.min`), in the `luz.app` layer, through the same shared builder,
and each component as `dist/components/<name>.css` (+ `.min`).
No JavaScript (the sidebar's drawer is a native popover; core's script only
marks the current link). App has its own version (0.x): after adding or
removing a published file, run `node scripts/check-pack.js --update`.

## @luz-ds/check

After editing `packages/check/src/`:

```bash
pnpm luzcheck:build
```

This bundles `src/main.js` and the modules it imports into one file,
`dist/luz-check.js` (the bin; Node, ESM, not minified, a shebang, no source
map), through `scripts/build-check.js`. It has no CSS and no layer. It has its
own version (0.x): after adding or removing a published file, run
`node scripts/check-pack.js --update`.

---

## Custom Fonts in Theme Files

The theme template (`themes/_template.css`)
use self-hosted fonts via `@font-face` — no Google Fonts request at runtime.
The woff2 files live in `packages/core/fonts/custom-faces/` and are copied
into `packages/core/dist/fonts/custom-faces/` by `pnpm core:build` so the
relative `../fonts/custom-faces/…` URLs resolve from `dist/themes/`.

### Why Not Google Fonts?

Vanilla-first principle: **0 external runtime dependencies**. Self-hosted fonts are:

- ✅ Offline-ready
- ✅ Zero latency (bundled with the CSS)
- ✅ No analytics tracking
- ✅ Aligned with vanilla-first architecture
