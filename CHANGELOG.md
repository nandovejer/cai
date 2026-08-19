# Changelog

All notable changes to this project are documented here.

## Unreleased

### Fixed — Modularization release
- **CRITICAL — semantic token layer restored to source control.** The Layer 2 semantic tokens (default light/dark/high-contrast themes) previously lived only inside the generated, gitignored `dist/cai-tokens.css`; a clean clone built a system with undefined CSS variables. They now live in `packages/tokens/src/semantic.css` and `pnpm tokens:build` composes fonts + primitives + semantic deterministically (the fragile "preserve from previous dist" logic is gone).
- `@cai-ds/core/utils` export now works: `dist/utils.js` (and every behavior module) is emitted by the build.
- Deleted `scripts/midi.js` — an orphaned, outdated duplicate of `packages/core/src/midi.js`.
- Custom themes no longer leak global primitives: their duplicated `:root` scale re-declarations were removed (spacing/sizing/type now come from `@cai-ds/tokens`) and their intentional radius/shadow overrides are scoped to `[data-theme="…"]`. **Themes now require `cai-tokens.css` to be loaded first.**
- `scripts/check-dist.js` now checks all three packages' dist (not just tokens) before skipping the build.
- ESLint migrated to flat config (`eslint.config.js`) — `pnpm lint:js` was broken under ESLint 9. `pnpm lint:css` no longer lints generated `dist/` files.
- Tokens README documented the wrong attribute for base modes (`data-mode` → `data-theme`).
- Modal overlays use `var(--cai-bg-overlay)` instead of hardcoded `rgba(0,0,0,.5)`.
- Version alignment: `@cai-ds/tokens` bumped to `2.0.0`; all CDN snippets pin `@2`.

### Changed — BREAKING (migration note)
- **`body` no longer forces `display: flex; min-height: 100vh`.** The app-shell layout is opt-in: add `class="o-shell"` to `<body>` (grid shell with sidebar), as the bundled apps already do. Bare-body consumers relying on the implicit flex shell must add the class.

### Added — Modularization release
- **Per-component CSS distribution:** `packages/core/src/components/` now holds one file per component (21 files + `index.css` barrel); the build emits both the full `dist/cai.css` bundle and `dist/components/<name>.css` (+ `.min`) for standalone consumption via `@cai-ds/core/components/*`.
- **Modular JS API:** `cai.js` split into side-effect-free ESM modules — `theme.js`, `sidebar.js`, `clipboard.js`, `modal.js`, `highlight.js`, `player.js` — each published as `@cai-ds/core/<module>`. The `cai.js` entry re-exports the full API (it previously exported nothing) and keeps the auto-init behavior.
- Single source of truth for CSS layer order: build scripts inline the `@import` graph of `src/index.css` instead of maintaining duplicate file lists.
- Focus-visible rings for theme switcher buttons, copy buttons, and links; removed `!important` from the button disabled state.
- `apps/platform-docs/package.json` (proper workspace membership) and regression tests for the semantic layer + modular artifacts.

### Planned
- WCAG 2.1 AA audit + fixes
- Screen reader testing (VoiceOver, NVDA, JAWS)
- Documentation: a11y testing guide

### Added (v2.0.0)
- **CAI Platform package:** Added `@cai-ds/platform` as the app-level layer above core for shells, content wrappers, page headers, skip links, command blocks, and layout patterns.
- **Platform build pipeline:** Added `pnpm platform:build` and included platform in the root `pnpm build` flow.
- **Platform docs:** Added installation and usage guidance for the optional Platform layer in docs and README.
- **Modal Component:** Full `.cai-modal` with semantic `<dialog>` element
  - Header/title/close button section
  - Body for content
  - Footer for action buttons
  - Backdrop with blur effect
  - Smooth fade-in animation
- **Modal JavaScript API:** `initModals()` auto-initializes all modals on page load
  - `data-modal-trigger="id"` opens a modal
  - `data-modal-close="id"` closes a modal
  - Escape key closes active modal
  - Focus trap prevents Tab/Shift+Tab escape during modal interaction
  - Focus automatically restored to trigger button on close
- **Modal A11y:**
  - Semantic `<dialog>` element (native accessibility)
  - `aria-label` on close button
  - Full keyboard support (Tab, Escape)
  - Focus management (trap + restore)
  - Blur backdrop for focus isolation
- **Documentation:**
  - Interactive modal demo in docs
  - Keyboard & ARIA matrix (Tab, Shift+Tab, Escape behavior)
  - Implementation code example
  - Sidebar navigation link
- **Focus Trap Utility:** `createFocusTrap(element)` for modals, dialogs, popovers. Constrains Tab/Shift+Tab within container, restores focus on deactivate. Documented in CONTRIBUTING.md with example.
- **Toast A11y Improvements:**
  - Success toasts: `role="status"` + `aria-live="polite"`
  - Error toasts: `role="alert"` + `aria-live="assertive"`
  - Close buttons: `aria-label="Dismiss notification"` + proper `<button>` elements
- **Video Player Captions:**
  - Native `<track kind="captions">` element support
  - Browser-built-in CC toggle (usually CC button in video controls)
  - Multiple language support via srclang attribute
  - WebVTT format (.vtt files)
  - Subsection in docs with implementation guide
  - Sample captions.vtt file included
- **English standardization (continued):** Fixed remaining Spanish in a11y documentation table

---

## [1.2.0] — May 8, 2026

### Added
- **HTML5 Semantic Elements:** Styled `<details>`, `<summary>`, `<mark>`, `<kbd>`, `<time>`, `<figure>`, `<figcaption>`, `<output>`, `<meter>`
- **Keyboard Accessibility:** Escape key closes all open `<details>` elements
- **`.cai-figure` component:** Enhanced figure styling with media + caption
- **Semantic headings:** All `.docs-section__title`, `.docs-subsection__title`, and `.docs-group-header__label` converted from divs to `<h2>` and `<h3>`
- **Landing page:** GitHub Pages-ready landing at root (`/`) with hero, features, quick-start
- **Responsive mobile:** Landing page fully responsive (tested 480px, 768px, 1024px+)
- **English documentation:** All Spanish text standardized to English across docs
- **Improved a11y:** Back-to-top button with IntersectionObserver, skip link, `aria-current` for active nav
- **Multipage Vite build:** Landing at root, docs at `/apps/docs/`

### Fixed
- CSS comment header in token generation (`build-tokens.js`) — unclosed comment no longer swallows tokens
- Spacing token sort order — `--cai-space-01` through `--cai-space-12` now generated in correct sequence
- Heading font reference — `h1-h6` now correctly use `--cai-font-heading` semantic token instead of primitive
- Landing page layout — inherited `body { display: flex }` overridden with proper responsive block/flex behavior on mobile

### Changed
- **Architecture:** Monorepo now formalizes the package hierarchy as `tokens → core → platform`.
- **Consumer apps:** Docs and landing now consume shared app-level patterns from `@cai-ds/platform` instead of keeping duplicated local shell styles.
- `pnpm build` now includes Vite multipage build for GitHub Pages
- Distribution structure: Core assets at `dist/`, landing at `dist/index.html`, docs at `dist/docs/index.html`
- Documentation: Shifted from div-based title structure to semantic headings (h2/h3)
- Version bumped to 1.2.0 (from 1.1.0)

### Removed
- Root `build-tokens.js` compatibility shim; canonical token builds now run from `scripts/build-tokens.js` or `pnpm tokens:build`.

### Technical
- Core CSS compiled: `packages/core/dist/cai.css` now includes HTML element base styles
- Core JS updated: `initDetailsKeyboard()` added for Escape support, `initDocHeadings()` now no-op
- Vite build optimized: 13 modules transformed, ~200ms build time

---

## [1.1.0] — Previous Release

### Added
- Initial token system (primitives + semantic layers)
- Base components (buttons, forms, cards, tables, alerts, etc.)
- Media players (video, audio, MIDI)
- Two custom themes (Minimalist, Ricardo & Mortimer)
- Theme switcher with light/dark/high-contrast modes
- Keyboard navigation (Tab, Enter, Space, Escape)
- Sidebar drawer for mobile
- Documentation site with component showcase

### Features
- ITCSS architecture (Settings → Generic → Elements → Objects → Components → Utilities)
- CSS custom properties (150+ tokens)
- No runtime dependencies
- Vanilla JS (Web APIs only)
- Semantic HTML-first approach

---

## Version Strategy

**Semantic Versioning:**
- **MAJOR (2.0.0):** Breaking changes to public API
- **MINOR (1.x.0):** New features, backward compatible
- **PATCH (1.0.x):** Bug fixes only

**Release Cadence:**
- Minor releases every 3–4 months
- Patches as needed
- Majors only when breaking changes justify it

---

## Notes for Contributors

When adding changelog entries:
- Use present tense ("Add" not "Added", "Fix" not "Fixed") for unreleased changes
- Group under `### Added`, `### Fixed`, `### Changed`, `### Removed`, `### Deprecated`
- Reference issues/PRs: `[#123](../../issues/123)`
- Explain *user impact*, not technical details
