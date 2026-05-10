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
