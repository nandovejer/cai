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
| EX-006 | SR-5 | — | The component and pattern pages have the new structure (summary, example, Known issues, Code and Design tabs), but not every section yet: today's guidance was moved into the tabs, not rewritten. Missing: *Copy the markup* on the core component pages (the platform patterns have it), *Variants and options*, *Without JavaScript* (still part of *How it works*), *Contrast and focus* (still part of *Keyboard and ARIA*), and *Do and don't*. Phases 5 (rewrite) and 6 (Do and don't) of `.claude/plans/docs-redesign.md` add them; `tests/docs-site.test.js` already checks their order when present. Remove when every page has all ten sections. EX-005 is kept for the search strings (phase 4). | 2026-10-09 |
