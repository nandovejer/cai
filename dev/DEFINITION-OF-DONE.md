# Definition of done

What a change has to be before it merges. [CONTRIBUTING.md](../CONTRIBUTING.md) is the short version; this file is the detail it points to. The rules themselves are in [PRINCIPLES.md](../PRINCIPLES.md) and the architecture is in [AGENTS.md](../AGENTS.md).

## Before you code

1. Fork the repository
2. Create a branch: `git checkout -b fix/button-focus` or `feat/details-keyboard`
3. Make sure you've read [PRINCIPLES.md](../PRINCIPLES.md) (principles and red lines) and [AGENTS.md](../AGENTS.md) (architecture)

## Development commands

```bash
pnpm install
pnpm dev          # Start Vite dev server
pnpm lint:css     # Check CSS
pnpm lint:js      # Check JS
pnpm test:unit    # Unit tests
pnpm test:ui      # UI, axe, no-JS, reduced motion, forced colors (Chromium; Firefox and WebKit are run before a release)
pnpm build        # Full build
pnpm check:size   # Size budgets (PRINCIPLES.md section 8), including 80 kB per docs page
pnpm check:strings # Shipped strings (sentence case, no "OK" / "click here")
pnpm pages:build  # Rebuild the GitHub Pages site in docs/ (commit the result)
pnpm check:all    # Every check above and more, in one command
```

The build commands of each layer, for working on LUZ itself (moved here from the documentation site, which is for the people who use LUZ):

```bash
pnpm tokens:build    # packages/tokens/dist
pnpm core:build      # packages/core/dist
pnpm site:build  # packages/site/dist
pnpm build           # all three, in order

# Checks
pnpm lint:css
pnpm lint:js
pnpm check:contrast
pnpm test:unit
```

Edit the sources in `packages/<name>/src/` and rebuild: `dist/` is generated and never edited by hand.

## Which proposals fit

1. Check the public Project to ensure it aligns with the goals of the stable release
2. Features that require dependencies → likely ❌
3. Features that add complexity → discuss in a proposal first

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

## What a new component has to be

A component is added to `core` only when it is all of these (the same criteria the GOV.UK Design System uses):

- **Useful:** more than one team needs it, and a native element does not already solve it.
- **Unique:** no existing component covers the same job. Say which component it makes obsolete, if any.
- **Usable:** it works with a keyboard, with JavaScript off, with reduced motion and in forced-colors mode.
- **Consistent:** semantic tokens only, the shared focus ring, the shared wording rules in [PRINCIPLES.md](../PRINCIPLES.md).

Something you needed once belongs in your own app.

## Adding a token

- **A primitive:** edit `packages/tokens/tokens.json`, run `pnpm tokens:build`, and map it to a semantic token only if a component needs it.
- **A semantic token:** edit `packages/tokens/src/semantic.css` in all three mode blocks (light, dark, high contrast), then run `pnpm tokens:build`. Keep the name the same in the three modes, and use the semantic token in components. Document it on the Tokens pages of the docs site (`apps/docs/pages/tokens/`).

## What We Check

- **Code quality:** Stylelint, ESLint pass
- **Vanilla-first:** No new dependencies added
- **Backward compatible:** Semantic versioning (no breaking changes in minor releases)
- **Accessibility:** Keyboard support, focus states, ARIA labels where needed
- **Documentation:** Update README/docs if API changes
- **Package boundaries:** `tokens → core → site`, never the reverse

## Definition of done for a component

Copy this into the PR description. An unticked line blocks the merge.

```
- [ ] Native element or API used where one exists; any ARIA is justified in the PR
- [ ] Works with JS disabled (describe the no-JS state)
- [ ] Keyboard: every action reachable; focus visible; keys documented
- [ ] Screen reader: tested with NVDA, VoiceOver or TalkBack, or the statement says it was not
- [ ] 320 px / 400 % zoom: no horizontal scroll, nothing clipped
- [ ] forced-colors and prefers-reduced-motion checked
- [ ] Contrast >= 4.5:1 text, >= 3:1 UI, in light, dark and high-contrast
- [ ] Only semantic tokens; logical properties; no !important
- [ ] Strings: sentence case, verb-first buttons, meaningful links, visible labels
- [ ] Docs: When to use, When not to use, How it works, Content guidance, Keyboard and ARIA, Known issues
- [ ] Tests added (axe and keyboard) and pnpm test:ui green
- [ ] dist/ regenerated, check:pack updated, changeset added
```

The same twelve lines, with the red lines and the browser review, are in the [pull request template](../.github/pull_request_template.md).

## Checklist before a PR

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

## Documentation

- **The docs site** (`apps/docs/`, published at `/docs/`): one page per component, site pattern, token family and HTML element category, generated by `scripts/docs-site/` (see AGENTS.md, "Vite config and the docs site generator"). A new component gets its own page under `apps/docs/pages/components/`; the sidebar, the gallery, the breadcrumb, "On this page" and the A–Z index pick it up from its front matter. No page may exceed 80 kB of HTML: split it instead.
- **Code comments:** Explain *why*, not what (code is self-documenting)
- **CSS:** Include BEM class structure and state examples
- **JS:** Document function parameters, return values, and side effects
- **README:** Update if public API changes
- **Roadmap:** Update the public Project if you plan new features

Example CSS comment:

```css
/* Button — Primary action
   Modifiers: --primary, --secondary, --ghost, --outline, --danger
   States: :hover, :active, :disabled, :focus-visible
*/
```
