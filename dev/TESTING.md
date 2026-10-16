# Testing Guide — LUZ Design System

This guide covers how to run tests locally and understand the testing setup.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run unit tests
pnpm test:unit

# Run UI/E2E tests
pnpm test:ui

# Run all linting
pnpm lint:css && pnpm lint:js

# Full CI simulation
pnpm lint:css && pnpm lint:js && pnpm build && pnpm test:unit
```

---

## Unit Tests (Vitest)

Unit tests validate pure functions and utilities in isolation.

### Run

```bash
pnpm test:unit
```

### What's Tested

- **formatTime(seconds)** — Time formatting (MM:SS)
- **isCustomTheme(theme)** — Theme validation
- **isValidMode(mode)** — Color mode validation
- **calculateProgress(current, duration)** — Progress calculation
- **escapeHtml(str)** — HTML escaping

### Files

- **tests/unit.test.js** — All unit tests (20 tests)
- **packages/core/src/utils.js** — Testable utilities
- **vitest.config.js** — Vitest configuration

### Coverage

Run with coverage:

```bash
pnpm test:unit -- --coverage
```

Coverage reports are generated in `.nyc_output/` and can be viewed as HTML.

---

## UI Tests (Playwright)

UI tests validate keyboard navigation, theme switching, modal behavior, and responsive layouts using Playwright.

### Run

```bash
# Starts dev server automatically, runs tests, generates report
pnpm test:ui
```

### What's Tested

- **Theme System**: Switching themes, persistence in localStorage
- **Sidebar Navigation**: Mobile toggle, Escape key, aria-expanded
- **Modal Keyboard & Focus**: Open/close, Escape key, focus trap, aria-dialog
- **Keyboard Navigation**: Tab order, focus indicators, accessibility attributes
- **Responsive Behavior**: Layouts at 480px, 768px, 1024px viewports

### Files

- **tests/ui.spec.js** — All UI smoke tests (14 test groups)
- **playwright.config.js** — Playwright configuration
- **playwright-report/** — Generated test report (after running tests)

### Debugging

View the HTML report after tests run:

```bash
# After running pnpm test:ui, open the report:
open playwright-report/index.html
```

Or run tests in headed mode to see the browser:

```bash
node_modules/.bin/playwright test --headed
```

Or run a specific test:

```bash
node_modules/.bin/playwright test tests/ui.spec.js -g "Theme System"
```

---

## Linting

### CSS

```bash
pnpm lint:css
```

Validates CSS in `packages/**/*.css` using Stylelint.

### JavaScript

```bash
pnpm lint:js
```

Validates JavaScript in `packages/**/*.js` and `scripts/**/*.js` using ESLint.

---

## Build

### Tokens

```bash
pnpm tokens:build
```

Regenerates `packages/tokens/dist/luz-tokens.css` primitives from `tokens.json`.

### Core

```bash
pnpm core:build
```

Regenerates:
- `packages/core/dist/luz.css` (from `src/`)
- `packages/core/dist/luz.js` (copy of `src/luz.js`)
- `packages/core/dist/midi.js` (copy of `src/midi.js`)
- Theme CSS files in `packages/core/dist/themes/`

### Site

```bash
pnpm site:build
```

Regenerates:
- `packages/site/dist/site.css` (from `src/`)
- `packages/site/dist/site.js` (copy of `src/site.js`)

### Full Build

```bash
pnpm build
```

Runs `tokens:build`, `core:build`, and `site:build` in sequence.

---

## CI/GitHub Actions

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests against `main` or `develop`
- Manual trigger via workflow dispatch

### CI Jobs

1. **test** (Node 18.x and 20.x)
   - Install dependencies
   - Lint CSS
   - Lint JS
   - Build tokens
   - Build core
   - Build site
   - Run unit tests

2. **e2e** (Node 20.x)
   - Install dependencies
   - Install Playwright browsers
   - Run UI tests
   - Upload Playwright report as artifact

---

## Workflow for Contributors

### Before opening a PR

```bash
# Install latest dependencies
pnpm install

# Lint everything
pnpm lint:css && pnpm lint:js

# Build
pnpm build

# Run unit tests
pnpm test:unit

# Optionally, run UI tests (slower, takes ~2-3 min)
pnpm test:ui
```

### Pre-commit checklist

- [ ] Linting passes: `pnpm lint:css && pnpm lint:js`
- [ ] Build succeeds: `pnpm build`
- [ ] Unit tests pass: `pnpm test:unit`
- [ ] No new `node_modules` files committed
- [ ] Meaningful commit message

### If tests fail in CI

1. **Check the GitHub Actions log** for the specific failure
2. **Reproduce locally**: Run the same test command
3. **Fix the issue** in the code
4. **Re-run tests** before pushing again

---

## Test Organization

```
tests/
├── unit.test.js       # Vitest unit tests (20 tests)
├── ui.spec.js         # Playwright UI tests (14 test groups)
└── setup.js           # Vitest global setup (localStorage mock)

vitest.config.js       # Vitest configuration
playwright.config.js   # Playwright configuration
```

---

## Testing and accessibility checks

What to cover when you change a component, and what to look at by hand. The first change is always a failing test (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

### Minimum Automated Baseline (Recommended)

To keep releases stable without heavy maintenance, use this minimum baseline:

- Unit tests for behavior in `packages/core/src/luz.js` and `packages/core/src/midi.js`
- UI smoke tests for critical flows in the documentation (`/docs/`, source in `apps/docs/pages/`)
- Automated a11y smoke on key pages/components

If you touch `packages/site/src/`, rebuild Site and verify the consuming apps still render correctly:

```bash
pnpm site:build
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

### Modals and dialogs

Use a native `<dialog>` opened with `showModal()`. The browser traps focus, closes on Escape, makes the page behind inert and returns focus to the opener. Do not write a focus trap.

Open and close it declaratively, with no JavaScript:

```html
<button type="button" commandfor="my-dialog" command="show-modal">Open dialog</button>

<dialog class="luz-modal" id="my-dialog" aria-labelledby="my-dialog-title">
  <h2 id="my-dialog-title">Delete this draft</h2>
  <p>This cannot be undone.</p>
  <button type="button" commandfor="my-dialog" command="close">Cancel</button>
  <button type="button" commandfor="my-dialog" command="close">Delete draft</button>
</dialog>
```

`initModals()` (called by `luz.js`) only supplies the two commands in browsers that do not implement them yet.

---

## Troubleshooting

### "Cannot find module 'vitest'"
Run `pnpm install` again to ensure dev dependencies are installed.

### "Port 5173 is already in use"
Another dev server is running. Kill it or use a different port in `playwright.config.js`.

### Playwright tests timeout
Ensure your machine can reach localhost:5173. Check that `pnpm dev` starts the Vite server.

### "Tests failed with: ENOENT node_modules/.bin/playwright"
Run `pnpm install` to install Playwright.

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [LUZ Design System Architecture](../AGENTS.md)
- [Contributing Guide](../CONTRIBUTING.md)
