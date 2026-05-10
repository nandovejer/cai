# Dist Rules — CRITICAL

**`dist/` folders are generated from `src/`. Never edit them directly.**

## @cai-ds/core

After editing any file in `packages/core/src/`:

### CSS regeneration

Concatenate all ITCSS layers into `dist/cai.css`:

```python
layers = [
    "packages/core/src/settings/_settings.css",
    "packages/core/src/generic/_reset.css",
    "packages/core/src/elements/_elements.css",
    "packages/core/src/objects/_objects.css",
    "packages/core/src/components/_components.css",
    "packages/core/src/utilities/_utilities.css",
]
dist = "\n\n".join(open(p).read() for p in layers)
open("packages/core/dist/cai.css", "w").write(dist)
```

### JS synchronization

Copy modified JS files:

```bash
cp packages/core/src/cai.js packages/core/dist/cai.js
cp packages/core/src/midi.js packages/core/dist/midi.js
```

Or run:

```bash
pnpm core:build
```

## @cai-ds/platform

After editing `packages/platform/src/`:

```bash
pnpm platform:build
```

This regenerates:

- `packages/platform/dist/platform.css`
- `packages/platform/dist/platform.js`

## @cai-ds/tokens

The `cai-tokens.css` file has TWO layers:

- **Layer 1** (~100 lines): Primitives generated from `tokens.json`
- **Layer 2** (~250 lines): Semantic themes (light, dark, high-contrast) — handwritten

Running `pnpm tokens:build` regenerates Layer 1 **while preserving Layer 2**.

### Adding a new primitive color:

1. Edit `tokens.json`
2. Run `pnpm tokens:build`
3. Themes are unchanged

### Adding a new semantic token:

1. Edit `cai-tokens.css` directly in the three theme blocks
2. This change is permanent — no build step needed

## Full Build

```bash
pnpm build  # Runs tokens:build + core:build + platform:build
```

---

## Custom Fonts in Theme Files

As of v2.0.0, theme files (`cai-theme-ricardoymortimer.css`, `cai-theme-minimalist.css`) no longer depend on Google Fonts. They use self-hosted fonts via `@font-face` declarations.

### Current State (Migration in Progress)

- `cai-theme-ricardoymortimer.css` requires:

  - Freckle Face (weight 400)
  - Space Grotesk (weights 300, 400, 500, 600, 700)

- `cai-theme-minimalist.css` requires:
  - DM Sans (weights 200, 300, 400, 500)

These fonts are defined in the theme files with placeholders (`@font-face` with `src:` commented out). To complete the migration:

### Migration Steps

1. **Download font files** (woff2 format preferred):

   - Freckle Face: https://fonts.google.com/specimen/Freckle+Face
   - Space Grotesk: https://fonts.google.com/specimen/Space+Grotesk
   - DM Sans: https://fonts.google.com/specimen/DM+Sans

2. **Place in `packages/tokens/fonts/`:**

   ```
   packages/tokens/fonts/
   ├── custom-faces/          (← create this directory)
   │   ├── FreckeFace-Regular.woff2
   │   ├── SpaceGrotesk-Light.woff2
   │   ├── SpaceGrotesk-Regular.woff2
   │   ├── SpaceGrotesk-Medium.woff2
   │   ├── SpaceGrotesk-SemiBold.woff2
   │   ├── SpaceGrotesk-Bold.woff2
   │   ├── DMSans-ExtraLight.woff2
   │   ├── DMSans-Light.woff2
   │   ├── DMSans-Regular.woff2
   │   └── DMSans-Medium.woff2
   ```

3. **Uncomment `src:` in theme files:**

   - `packages/core/src/themes/cai-theme-ricardoymortimer.css`
   - `packages/core/src/themes/cai-theme-minimalist.css`

4. **Update paths if needed** — verify the relative paths in `@font-face` declarations match your font file locations.

5. **Rebuild:**
   ```bash
   pnpm core:build
   ```

### Why Not Google Fonts?

Vanilla-first principle: **0 external runtime dependencies**. Google Fonts requires an HTTP request to `fonts.googleapis.com` at runtime, making themes dependent on network availability. Self-hosted fonts are:

- ✅ Offline-ready
- ✅ Zero latency (bundled with the CSS)
- ✅ No analytics tracking
- ✅ Aligned with vanilla-first architecture
