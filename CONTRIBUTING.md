# Contributing to CAI Design System

Thank you for your interest in contributing! CAI is a community-driven project, and we welcome contributions of all kinds.

## Code of Conduct

- Be respectful and inclusive
- No harassment, discrimination, or hostile behavior
- Report issues to maintainers privately if needed

## How to Contribute

### Bug Reports & Issues

1. Search [existing issues](../../issues) first
2. Include:
   - Browser/environment details (OS, browser version)
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshot if relevant
3. Use descriptive titles

**Example:**
> Button focus outline missing on dark theme in Safari 15

### Feature Requests

1. Check [ROADMAP.md](./ROADMAP.md) to ensure it aligns with v1.x goals
2. Features that require dependencies → likely ❌
3. Features that add complexity → discuss in issue first

**Good candidates:**
- ✓ New semantic HTML element styling
- ✓ Keyboard/a11y improvements
- ✓ Theme refinements
- ✓ Documentation

**Poor candidates:**
- ❌ New JS framework wrapper
- ❌ Add npm dependencies
- ❌ 100+ new components
- ❌ Runtime build steps

### Pull Requests

#### Before You Code

1. Fork the repository
2. Create a branch: `git checkout -b fix/button-focus` or `feat/details-keyboard`
3. Make sure you've read [AGENTS.md](./AGENTS.md) (architecture & principles)

#### Development

```bash
pnpm install
pnpm dev          # Start Vite dev server
pnpm lint:css     # Check CSS
pnpm lint:js      # Check JS
pnpm test:unit    # Unit tests (when configured)
pnpm test:ui      # UI smoke + a11y smoke (when configured)
pnpm build        # Full build
```

#### What We Check

- **Code quality:** Stylelint, ESLint pass
- **Vanilla-first:** No new dependencies added
- **Backward compatible:** Semantic versioning (no breaking changes in minor releases)
- **Accessibility:** Keyboard support, focus states, ARIA labels where needed
- **Documentation:** Update README/docs if API changes
- **Package boundaries:** `tokens → core → platform`, never the reverse

#### Checklist Before PR

- [ ] Branch name is descriptive (`fix/issue-name` or `feat/feature-name`)
- [ ] Commits are atomic (one feature/fix per commit)
- [ ] `pnpm lint:css` and `pnpm lint:js` pass
- [ ] `pnpm test:unit` passes (if JS behavior was changed)
- [ ] `pnpm test:ui` passes for affected flows (if UI behavior was changed)
- [ ] Rebuilt dist: `pnpm build`
- [ ] Updated docs (if needed)
- [ ] No dependencies added
- [ ] A11y: focus states, keyboard support, ARIA if applicable
- [ ] Tested in at least 1 modern browser (Chrome, Firefox, Safari)

#### PR Template

```markdown
## What

Brief description of the change.

## Why

Why is this change needed? Link to issue if applicable.

## Testing

How to verify the fix/feature works.

## Screenshots/Demo

If UI change, include screenshot or link to demo.
```

---

## Testing & A11y

### Minimum Automated Baseline (Recommended)

To keep releases stable without heavy maintenance, use this minimum baseline:

- Unit tests for behavior in `packages/core/src/cai.js` and `packages/core/src/midi.js`
- UI smoke tests for critical flows in `apps/docs/index.html`
- Automated a11y smoke on key pages/components

If you touch `packages/platform/src/`, rebuild Platform and verify the consuming apps still render correctly:

```bash
pnpm platform:build
pnpm build
```

Suggested commands:

```bash
pnpm test:unit
pnpm test:ui
```

Suggested scope for UI smoke:

- Theme switch and persistence
- Sidebar open/close on mobile
- Modal open/close, Escape, focus trap/restore
- Keyboard navigation in tabs and player controls
- Core responsive checks at 480px, 768px, 1024px

Notes:

- These tools are development-only dependencies (not runtime dependencies).
- Keep UI tests small and high-value; do not enforce full pixel-perfect snapshots.
- **For detailed instructions, see [TESTING.md](./.claude/TESTING.md)**

### Keyboard Testing
- Tab through all interactive elements
- Escape closes modals/details
- Enter/Space activate buttons
- Arrow keys work in tabs/similar components
- Focus always visible

### Focus Testing
- All focusable elements have `:focus-visible` styles
- Focus order matches visual/logical order
- No focus traps (unless intended)

### Visual Testing
- Dark mode looks correct
- High contrast mode readable
- Responsive at 480px, 768px, 1024px

### A11y Checklist

Before submitting a component:

- [ ] Semantic HTML (no div abuse)
- [ ] Keyboard accessible
- [ ] Focus indicators visible (2px outline minimum)
- [ ] Color contrast ≥4.5:1
- [ ] ARIA labels/roles where needed
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No flashing >3/second

### Focus Trap for Modals & Dialogs

For components that overlay the page (modals, dropdowns, popovers), use `createFocusTrap()` to prevent focus from escaping:

```javascript
// In your component's show/open handler:
const modal = document.getElementById('my-modal');
const trap = createFocusTrap(modal);
trap.activate();  // Focus cycles within modal, Shift+Tab/Tab trap at boundaries

// In your component's close/hide handler:
trap.deactivate(); // Restore focus to the trigger element
```

**Behavior:**
- On Tab in last focusable element → focus jumps to first
- On Shift+Tab in first focusable element → focus jumps to last
- Calls `.focus()` on previously active element when deactivated
- Automatically skips hidden/disabled elements

**Example: Modal trigger**

```html
<button id="open-modal">Open Dialog</button>
<dialog id="my-modal">
  <h2>Confirm</h2>
  <p>Are you sure?</p>
  <button id="confirm">Confirm</button>
  <button id="cancel">Cancel</button>
</dialog>

<script>
  const modal = document.getElementById('my-modal');
  const trap = createFocusTrap(modal);

  document.getElementById('open-modal').addEventListener('click', () => {
    modal.showModal();
    trap.activate();
  });

  document.getElementById('confirm').addEventListener('click', () => {
    modal.close();
    trap.deactivate();
  });

  document.getElementById('cancel').addEventListener('click', () => {
    modal.close();
    trap.deactivate();
  });

  // Also handle Escape key (browser does this for <dialog> by default)
  modal.addEventListener('cancel', () => {
    trap.deactivate();
  });
</script>
```

---

## Documentation

- **Code comments:** Explain *why*, not what (code is self-documenting)
- **CSS:** Include BEM class structure and state examples
- **JS:** Document function parameters, return values, and side effects
- **README:** Update if public API changes
- **ROADMAP.md:** Update if planning new features

Example CSS comment:

```css
/* Button — Primary action
   Modifiers: --primary, --secondary, --ghost, --outline, --danger
   States: :hover, :active, :disabled, :focus-visible
*/
```

---

## Publishing & Versioning

The three packages are versioned together (same version number) with [changesets](https://github.com/changesets/changesets) and published by GitHub Actions. Nobody publishes from a local machine.

**Workflow:**

1. Make your changes on a branch and describe them:
   ```bash
   pnpm changeset
   ```
   Pick the bump (patch / minor / major) and write the changelog entry. Commit the generated `.changeset/*.md` file with your PR.

2. Merge the PR into `main`. The Release workflow (`.github/workflows/publish.yml`) opens or updates a **"chore(release): version packages"** PR that bumps the versions and writes the changelogs.

3. Merge that PR when you want to release. The workflow then:
   - runs lint, audit, build, unit tests and the tarball contract check
   - waits for approval in the `release` environment
   - publishes every version that is not on npm yet, tokens first, with provenance

Publishing uses npm trusted publishing (OIDC), so there is no npm token to manage.

### Before opening a PR

```bash
pnpm build
pnpm test:unit
pnpm check:pack
```

`pnpm check:pack` compares what each package would publish against `packages/<name>/pack-files.txt`. If you add or remove a published file on purpose, update the snapshots with `node scripts/check-pack.js --update` and commit them.

### Dependency ranges between packages

`@cai-ds/core` and `@cai-ds/platform` declare the layers below them as `peerDependencies` with literal ranges (`^3.0.0`). Do not use the `workspace:` protocol there; changesets updates the ranges on a major release.

---

## Questions?

- Open a discussion in [Issues](../../issues)
- Check [AGENTS.md](./AGENTS.md) for architecture

## Thank You

Every contribution — big or small — helps make CAI better! 🙏
