# CAI — exceptions register

Strong rules (`SR-n` in [PRINCIPLES.md](./PRINCIPLES.md)) can be broken with a written reason. Red lines (`RL-n`) cannot, and `pnpm check:exceptions` fails if a row tries.

How to add one:

1. Take the next free `EX-nnn` id and add a row below.
2. If the exception lives in a file, put a comment `cai-exception: EX-nnn` next to the code (beside any `stylelint-disable` or `eslint-disable` it needs) and name that file in the *Where* column. If it has no single place in the code, write `—`.
3. Say what is excepted, why, and what would let us remove it.

Exceptions do not expire. Every major release reviews this list and removes what is no longer needed. Delete the row and the comment together when an exception is fixed.

| Id | Rule | Where | What and why | Added |
| --- | --- | --- | --- | --- |
| EX-001 | SR-5 | — | Keyboard tests exist for tabs, dialog and the drawer only. The other components still need one each. Remove when every component in `apps/landing` has its keyboard path tested. | 2026-10-08 |
| EX-003 | SR-8 | — | The tooltip cannot be dismissed with Escape without moving focus (WCAG 2.2 SC 1.4.13). Listed under "Known issues" in the changelog. Remove when the tooltip moves to a native popover. | 2026-10-08 |
| EX-004 | SR-8 | package.json | `pnpm audit` ignores two advisories that have no patched version and reach only dev tooling: GHSA-vfj7-8cjw-p6xm (`braces`, via `@changesets/cli`, DoS) and GHSA-hp3w-g68c-fv3c (`sprintf-js`, via changesets, DoS). `pnpm audit --prod` is clean. Remove each id from `pnpm.auditConfig.ignoreGhsas` as soon as a fixed version exists; review at every release. | 2026-10-09 |
| EX-005 | SR-7 | packages/platform/src/search.js | The search component does not use `@cai-ds/core/i18n`. Its fixed text (trigger, dialog title, field label, hint, close button, group names, empty state, no-results hint, A–Z link) is written in the markup, which PRINCIPLES §5 already lets win. The few strings the script writes — the result count, "{shown} of {n} results", "No results for “{query}”.", "Loading the search index…" and the error line — are read from `data-cai-label-*` attributes on the dialog; a missing attribute writes nothing (no English fallback in the module: it did not fit the platform JS ceiling). Why: importing core's i18n needs an import map on pages without a build step, and bundling it does not fit the platform JS ceiling (2 kB, red line 17). A Spanish page sets the `data-cai-label-*` attributes in Spanish. Remove when platform can reach `t()` without an import map and within its budget. | 2026-10-09 |
| EX-006 | SR-5 | — | The component and pattern pages have every Code section (*Copy the markup*, *Variants and options*, *How it works*, *Without JavaScript*, *Keyboard and ARIA*) and the written Design sections, but two Design sections are still missing: *Do and don't*, and *Contrast and focus* on every page but Search. Phase 6 of `.claude/plans/docs-redesign.md` adds them, with live examples and the tokens each part uses; `tests/docs-site.test.js` already checks their order when present. Remove when every page has all ten sections. | 2026-10-09 |
