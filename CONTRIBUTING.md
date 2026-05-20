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
3. Make sure you've read [CLAUDE.md](./CLAUDE.md) (architecture & principles)

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
- **For detailed instructions, see [TESTING.md](./TESTING.md)**

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

### Automated npm Publishing

CAI Design System uses GitHub Actions to automatically publish packages to npm when version changes are merged to `main`. No manual npm publishing is needed.

**Workflow:**

1. Make your changes (features, fixes, etc.)
2. When ready to release, run:
   ```bash
   pnpm changeset
   ```
   This creates a changelog entry describing what changed (follows semver).

3. Verify the changeset looks correct, then run:
   ```bash
   pnpm changeset version
   ```
   This auto-bumps all affected package versions (tokens, core, platform).

4. Commit and push to `main`:
   ```bash
   git add .changeset packages/*/package.json
   git commit -m "chore: release packages"
   git push origin main
   ```

5. **GitHub Actions automatically handles the rest:**
   - Workflow `.github/workflows/publish.yml` detects version changes
   - Installs dependencies, builds all packages
   - Publishes to npm registry as `@cai-ds/tokens`, `@cai-ds/core`, `@cai-ds/platform`

**Note:** You need npm account access as a member of the `@cai-ds` organization.

### Testing Before Release

To verify your changes build and publish correctly locally:

```bash
pnpm build
# Verify the new version doesn't already exist on npm:
npm view @cai-ds/tokens versions | grep "X.Y.Z"
```

### Troubleshooting Publishes

| Error | Cause | Solution |
|-------|-------|----------|
| "Package already published" | Version exists on npm | It's already live; no action needed |
| "E403 permission denied" | Not an org member or invalid token | Check npm org membership: `npm org ls cai-ds` |
| "Not found" | npm can't find your package | Run `pnpm build` first; check package.json |

---

## Release Process (Legacy)

*Note: This is now automated via GitHub Actions. Keep for reference if manual release is needed.*

1. Ensure all tests pass: `pnpm test:unit && pnpm test:ui`
2. Use `pnpm changeset` to describe changes
3. Run `pnpm changeset version` to bump versions
4. Push to `main` — GitHub Actions publishes automatically

---

## Questions?

- Open a discussion in [Issues](../../issues)
- Check [CLAUDE.md](./CLAUDE.md) for architecture
- Review [ACCESSIBILITY_AUDIT.md](./ACCESSIBILITY_AUDIT.md) for a11y standards

## Thank You

Every contribution — big or small — helps make CAI better! 🙏
