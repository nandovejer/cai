## What and why

<!-- What changes, and why. Link the issue. -->

## Licence and test first

- [ ] I license this work under the MIT licence (inbound = outbound) and I wrote it or say where it comes from
- [ ] The first commit is `test:` and fails without the change

## Changeset

- [ ] Added with `pnpm changeset`, saying how to migrate if it breaks something
- [ ] Not needed (docs or tests only)

## Definition of done

Tick every line. An unticked line needs an `EXCEPTIONS.md` row or blocks the merge. A line that does not apply says why.

**Accessibility and standards** ([PRINCIPLES.md](../PRINCIPLES.md))

- [ ] Native element or API used where one exists; any ARIA justified here
- [ ] Works with JS disabled (describe the no-JS state)
- [ ] Keyboard: every action reachable and operable; focus visible; keys documented
- [ ] Screen reader: tested with at least Orca + Firefox; names and states announced
- [ ] 400 % zoom / 320 px: no horizontal scroll, nothing clipped
- [ ] forced-colors and prefers-reduced-motion checked
- [ ] Contrast ≥ 4.5:1 text, ≥ 3:1 UI, in light, dark and high-contrast
- [ ] Only semantic tokens; logical properties; no `!important`
- [ ] Generated strings come from the i18n dictionary, in English and Spanish
- [ ] Strings: sentence case, verb-first buttons, meaningful links, visible labels
- [ ] Docs page: summary · example · Known issues · Code · Design (when to use, when not to use, …)
- [ ] Tests added (axe + keyboard) and Playwright green (`--project=chromium --project=chromium-nojs`)
- [ ] `pnpm check:size` and `pnpm check:exceptions` green
- [ ] `dist/` regenerated, `check-pack` updated

**Red lines** (a PR that crosses one is closed, not reviewed)

- [ ] No runtime dependency, no custom JS for native behaviour, nothing that needs JS to be usable
- [ ] No bare-element rule outside `:where()`, no primitive token or literal value in a component
- [ ] No hand edit to `dist/` or `docs/`; no size ceiling raised in `budgets.json`
- [ ] No third-party network request, no browser sniffing

**Vanilla checklist** ([AGENTS.md](../AGENTS.md)), for any JS

- [ ] Zero runtime dependencies added (`package.json` unchanged)
- [ ] No `import` of external libraries in any `.js` file
- [ ] Interactivity uses native APIs wherever possible
- [ ] Component works without a bundler (plain HTML + CSS + JS)

## Browsers

- [ ] Safari and Firefox: reviewed, or the change is listed under "Open" in [dev/BROWSER-REVIEWS.md](../dev/BROWSER-REVIEWS.md) and its row has a `needs-browser-review` issue (AGENTS.md section 6)
