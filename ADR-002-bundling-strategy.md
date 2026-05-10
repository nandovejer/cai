# ADR-002: JS Bundling Strategy for CAI Core

**Status:** Proposed  
**Date:** 2026-05-10  
**Scope:** F-02 critical issue — `build-core.js` distributes unresolved imports

---

## Problem

`packages/core/dist/cai.js` contains unresolved module imports:

```js
import { MidiPlayer } from "./midi.js";
import { formatTime } from "./utils.js";
```

When a consumer imports only `dist/cai.js` from a CDN or via `npm install @cai-ds/core`, the browser cannot find `midi.js` or `utils.js`. The consumer must manually fetch all three files and place them co-located — undocumented overhead, poor DX.

**Root cause:** `build-core.js` does simple file copying (`readFileSync` → `writeFileSync`) without bundling or module resolution.

---

## Constraints (from VANILLA-FIRST.md + DIST-RULES.md)

1. **Zero runtime external dependencies** — Rollup is a dev dependency; produced output is vanilla JS, no external imports.
2. **Consumers should not require a bundler** — `dist/` must be ready to use as-is in plain HTML + `<script type="module">`
3. **DIST-RULES.md** states: `dist/` is generated from `src/`, never edited directly.
4. **Two-file promise** — The brand promise is "2 files, 0 build step": `cai.css` and `cai.js`.

---

## Decision Options

### Option A: Bundle with Rollup ✅ RECOMMENDED

**Approach:**

- Add `rollup` + `rollup-plugin-terser` (optional, for minification) as `devDependencies`
- Rewrite `scripts/build-core.js` to:
  - Entry: `packages/core/src/cai.js`
  - Output: `packages/core/dist/cai.js` as a self-contained IIFE or ES module with all imports resolved
  - Inline `utils.js` (small, ~60 lines, always needed)
  - Keep `midi.js` as a lazy-loaded dynamic import chunk (loaded only if MIDI player is mounted)
- Update `package.json#exports` to expose only the single entry point:
  ```json
  {
    "main": "./dist/cai.js",
    "module": "./dist/cai.js",
    "exports": {
      ".": "./dist/cai.js",
      "./midi": "./dist/midi.js"
    }
  }
  ```

**Pros:**

- ✅ Single distributable file matches the "2 files" brand promise
- ✅ Consumer DX: one `<script>` tag, zero co-location concerns
- ✅ Aligns with vanilla-first: output is plain JS, no external deps
- ✅ MIDI functionality still works via dynamic import (lazy)
- ✅ Familiar approach for design systems (Bootstrap, Foundation, etc.)

**Cons:**

- ⚠️ Adds 1 dev dependency (Rollup)
- ⚠️ Slightly more complex build config
- ⚠️ Bundle size slightly larger (but negligible for CAI's small codebase)

**Implementation:**

1. `pnpm add -D rollup`
2. Rewrite `scripts/build-core.js` to use Rollup API or create `rollup.config.js`
3. Update `packages/core/package.json#exports`
4. Test: import `dist/cai.js` in a vanilla HTML file without co-locating other modules

---

### Option B: Keep Separate + Explicit Documentation

**Approach:**

- Leave `build-core.js` as-is (copy three files independently)
- Update `packages/core/package.json#exports` to expose all three modules explicitly
- Add detailed README + CONTRIBUTING guide explaining the three-module structure
- Add a note in the quick-start docs

**Pros:**

- ✅ Minimal code change
- ✅ No new dev dependencies
- ✅ Each module can be imported individually if desired

**Cons:**

- ❌ Violates the "2 files, 0 build step" brand promise
- ❌ Poor consumer DX — three files must be co-located
- ❌ Higher chance of misconfiguration (missing `utils.js` or `midi.js`)
- ❌ Documentation burden on maintenance (easy to forget to update when adding modules)

---

## Recommendation: **Option A (Rollup Bundling)**

**Rationale:**

1. CAI's core principle is **vanilla-first for consumers**, not build complexity
2. Rollup is minimal overhead (one devDep) vs. the burden it removes for users
3. The promise "2 files, 0 build step" implies that distribution should be self-contained
4. MIDI player as a lazy-loaded chunk is pragmatic: only loaded if the page actually uses it

**Rollup Config Style:**

```javascript
// Inline build in scripts/build-core.js or external rollup.config.js
// Entry: packages/core/src/cai.js
// Output: packages/core/dist/cai.js (ES module, not minified to preserve readability)
// Options:
//   - external: [] (nothing is external)
//   - inlineDynamicImports: false (keep midi.js as separate chunk for lazy loading)
```

---

## Next Steps

1. **Agent-ares approval:** Confirm Rollup approach is acceptable
2. **Implementation:** Rewrite `scripts/build-core.js` + test
3. **Validation:** `pnpm core:build` → verify `dist/cai.js` contains no external imports → smoke test in vanilla HTML
4. **Agent-martin:** Integration test with `dist/cai.js` standalone (no Vite)

---

## Fallback

If Rollup introduces unforeseen issues, revert to **Option B** with explicit `package.json#exports` documentation.
