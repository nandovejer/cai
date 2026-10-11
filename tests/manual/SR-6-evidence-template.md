# SR-6 evidence: manual testing with assistive technology

PRINCIPLES.md SR-6: a release that changes markup, CSS or JS of a component is tested by hand with the four pairs below. The accessibility statement lists only the combinations that were actually used for that release, so this file is the proof behind that list.

**How to use it.** Copy this file to `tests/manual/evidence/<version>/<component>.md` (one file per component and release), fill it in while you test, and commit it with the release. Leave a cell empty when it was not done: an empty cell is an honest "not tested". Never fill a result you did not observe.

## Header

| Field | Value |
| --- | --- |
| Component or pattern | |
| Docs page | |
| Package and version | `@cai-ds/…@…` |
| Release or commit tested | |
| What changed (changeset) | |
| Tester | |
| Date | YYYY-MM-DD |
| Page or fixture used | URL or file |

## Pairs

Use these four pairs. Write the exact versions: "latest" is not a version.

| Pair | Reader | Browser | System | Versions | Tested |
| --- | --- | --- | --- | --- | --- |
| NVDA + Firefox | NVDA | Firefox | Windows | | ☐ |
| VoiceOver + Safari | VoiceOver | Safari | macOS or iOS | | ☐ |
| TalkBack + Chrome | TalkBack | Chrome | Android | | ☐ |
| Orca + Firefox | Orca | Firefox | Linux | | ☐ |

## Tasks

Run each task on every pair. Add a row for what is specific to the component. Result: **pass**, **pass with issue** (it works, with a problem listed below), **fail**, or **n/a** (say why).

| # | Task | NVDA + Firefox | VoiceOver + Safari | TalkBack + Chrome | Orca + Firefox |
| --- | --- | --- | --- | --- | --- |
| 1 | Reach it by keyboard or by swipe, in a sensible order | | | | |
| 2 | Hear its name, its role and its current state | | | | |
| 3 | Do its main action | | | | |
| 4 | Hear the result of the action (a change of state, a message, a moved focus) | | | | |
| 5 | Hear an error or a disabled state, if it has one | | | | |
| 6 | Leave it, and find where focus went | | | | |
| 7 | With JavaScript off: do the main action | | | | |
| 8 | At 400 % zoom (320 px wide): do the main action | | | | |
| | *(component task)* | | | | |

## Issues found

One row per issue. A confirmed defect goes to the accessibility statement under Known issues, and to EXCEPTIONS.md until fixed, with the WCAG criterion it fails (PRINCIPLES.md section 1).

| # | Pair | Task | What was heard or seen | Expected | WCAG criterion | Severity | Issue or fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

Severity: **blocker** (the task cannot be done), **serious** (done with difficulty or a wrong announcement), **minor** (done, a rough edge).

## Verdict

- [ ] All four pairs tested, every task has a result
- [ ] No blocker or serious issue open, or each is a registered known issue
- [ ] The accessibility statement lists exactly the pairs ticked above for this release

Notes (what you could not test, and why):
