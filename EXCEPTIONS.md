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
