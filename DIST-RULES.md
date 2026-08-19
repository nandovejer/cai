# Dist Rules — CRITICAL

**`dist/` folders are generated from `src/`. Never edit them directly.**

Nothing under `dist/` is committed (it is gitignored). `pnpm dev` runs
`scripts/check-dist.js` first and rebuilds automatically if any package's
dist is missing.

## Full Build

```bash
pnpm build  # Runs tokens:build + core:build + platform:build
```

## @cai-ds/tokens

`dist/cai-tokens.css` is composed from three tracked sources:

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

## @cai-ds/core

After editing any file in `packages/core/src/`:

```bash
pnpm core:build
```

This:

1. Inlines the `@import` graph of `src/index.css` → `dist/cai.css` (+ `.min`).
   The import list in `src/index.css` (and `src/components/index.css`) is the
   **single source of truth** for cascade order.
2. Emits every `src/components/*.css` as `dist/components/<name>.css`
   (+ `.min`) for standalone consumption.
3. Bundles `src/cai.js` with Rollup → `dist/cai.js` (`midi.js` stays a
   separate lazy chunk).
4. Copies the individual ESM modules (`theme.js`, `sidebar.js`,
   `clipboard.js`, `modal.js`, `highlight.js`, `player.js`, `utils.js`)
   verbatim to `dist/` — the source IS the artifact (vanilla-first).
5. Copies + minifies `src/themes/*.css` → `dist/themes/`.

## @cai-ds/platform

After editing `packages/platform/src/`:

```bash
pnpm platform:build
```

This inlines the `@import` graph of `src/index.css` →
`dist/platform.css` (+ `.min`) and syncs `platform.js`.

---

## Custom Fonts in Theme Files

Theme files (`cai-theme-ricardoymortimer.css`, `cai-theme-minimalist.css`)
use self-hosted fonts via `@font-face` — no Google Fonts request at runtime.
The woff2 files live in `packages/tokens/fonts/custom-faces/` and are copied
into `packages/core/dist/fonts/custom-faces/` by `pnpm core:build` so the
relative `../fonts/custom-faces/…` URLs resolve from `dist/themes/`.

### Why Not Google Fonts?

Vanilla-first principle: **0 external runtime dependencies**. Self-hosted fonts are:

- ✅ Offline-ready
- ✅ Zero latency (bundled with the CSS)
- ✅ No analytics tracking
- ✅ Aligned with vanilla-first architecture
