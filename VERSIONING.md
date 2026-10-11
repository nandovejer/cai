# CAI — Versioning, deprecation and leaving beta

> **Not in force yet.** CAI is in beta. **Nothing in this file is enforced before 1.0**: until then any release may break anything, always with a changeset that explains how to migrate (PRINCIPLES.md section 9). This file says what will apply from 1.0, so the public API can be frozen on purpose, and the checklist at the end says when that happens. A breaking change in beta may follow "How something is deprecated" below where it costs nothing; it is never promised.
>
> **"1.0" is a name for the first stable release, not a version number.** The packages are already at 2.x, so the release that leaves beta will be whatever major comes next. The word is the one the project uses for "semantic versioning starts to bind".

**Why a file of its own and not a section of PRINCIPLES.md.** PRINCIPLES.md is the rules a contributor must not break; changing it needs its own changeset so the rules never erode. This file is a contract with the people who install CAI: what they can rely on across a release. It changes when the API changes, and it is read by a different person at a different moment. PRINCIPLES.md section 9 links here.

---

## One version for three packages

`@cai-ds/tokens`, `@cai-ds/core` and `@cai-ds/platform` always share one version (changesets `fixed`), and the peer ranges are literal (`^X.0.0`). A breaking change in one is a major for all three, so a consumer never mixes a tokens `3` with a core `4`.

---

## What is public API

Everything below is public from 1.0. Everything not in this list is internal and may change in any release.

| Surface | Public | Not public |
| --- | --- | --- |
| **Tokens** | Every `--cai-*` custom property in `dist/tokens.css`: names, meaning and the roles they play (semantic tokens in the three base modes, primitives, space, type, radius, shadow). The DTCG file's group and token names | Custom properties a component declares for itself (`--cai-seek`, `--cai-seek-to`) |
| **Classes** | `.cai-*`, `.o-*`, `.u-*`, `.cai-platform-*`, in the markup the docs show, with their elements and modifiers (`--`, `__`) | `.is-*` state mirrors, selectors inside a component's CSS, descendant selectors the docs do not show |
| **Attributes** | `data-theme`, `data-mode`, `data-cai-*`, `data-cai-label-*`, `data-copy`, `data-copy-from`, and the ARIA the docs require | Attributes the docs site's own scripts use (`data-docs-*`) |
| **JS** | Every export of `@cai-ds/core` and `@cai-ds/platform` named in the docs and in AGENTS.md: the module paths, the function names and their arguments and return values | Anything not exported, and any export the docs do not name |
| **Events** | The `change` event, bubbling, that the color-mode cycle button dispatches on the radio it checks | Timing and order of internal updates |
| **Layers** | The names `cai`, `cai.tokens`, `cai.themes`, `cai.settings`, `cai.generic`, `cai.elements`, `cai.objects`, `cai.components`, `cai.utilities`, `cai.platform`, and their order | The rules inside a layer |
| **Text** | The i18n keys of `@cai-ds/core/i18n` and the `data-cai-label-*` attributes that override them | The wording of a string |
| **Packages** | The `exports` map of each package, the paths of the files it publishes, and the `cai-tokens` command: its arguments, its exit codes and its `--json` shape | The files under `scripts/`, `tests/` and `apps/` |

Markup is part of the API: a class that no longer does what the docs showed is a break, even if its name did not change.

---

## What a version number means (from 1.0)

**Major:** something a consumer relied on stops working, or means something else.
**Minor:** something new that cannot break existing use.
**Patch:** a fix that makes a thing do what it was documented to do.

### By surface

| Change | Version |
| --- | --- |
| Rename or remove a token, a class, an attribute, an export or a layer | **Major** |
| Change what a token means (a role, not a value), or reorder layers | **Major** |
| Change a function's arguments or return value in a way that breaks a call | **Major** |
| Add a token, a class, an attribute, an export, a component or a layer | **Minor** |
| Add an optional argument or a new value of an option | **Minor** |
| Add a new CAI theme or a new mode | **Minor** |
| Change the value of a token so that a component looks visibly different (a hue, a size, a space step) | **Minor** |
| Change the value of a token with no visible difference to a person, or to restore a contrast ratio it should have had | **Patch** |
| Change a value in a way that can break a layout that relied on it (a width, a breakpoint, a control height) | **Major** |
| Fix a bug against the documented behavior, including an accessibility defect | **Patch** |
| Make a component more accessible in a way that changes its markup requirement | **Major**, with a **Minor** alias if the old markup can keep working |

A contrast or accessibility fix is never held back for a major: where a value change is needed to meet the standard, it ships as a patch and says so in the changeset.

---

## How something is deprecated

A deprecation has four steps. Nothing is removed in a minor or a patch.

1. **Announce it** in the changeset (under "Deprecated", with the replacement) and in the docs: the page of the component says so under *Known issues*.
2. **Warn where a script can.** A JS export that is deprecated writes one `console.warn` per page, on first use, in the form `[cai] <name> is deprecated since <version>; use <replacement>`. It warns when the deprecated thing is used, never when the module loads. CSS cannot warn: a deprecated class, token or layer is announced in the changeset and on its docs page, and nowhere else.
3. **Keep an alias for at least one minor release.** The old token, class or export keeps working and does the same as its replacement. For a token, the old name is declared as `var(--cai-new-name)`. For a class, the old selector joins the new rule's selector list.
4. **Remove it in the next major**, and say so in that release's changeset with how to migrate.

The shortest life of a deprecated name is one minor release. A security or accessibility defect that cannot be fixed without breaking something is the one exception, and the changeset says why.

---

## Leaving beta: the checklist

CAI leaves beta when every line is ticked and the maintainer says it is stable. The status is a reading of the repository on 2026-10-11, not a promise: re-check it before any release.

| # | Criterion | Status | How it is checked |
| --- | --- | --- | --- |
| 1 | Every red line (RL-1 to RL-18) has a check that fails when it is broken, and the list of which check covers which line is written down | **Open**: checks exist for most (stylelint, ESLint, `check:size`, `check:strings`, the red-line suites), but the table RL-n → check has not been made | A table in this file or in PRINCIPLES.md that a test keeps in step |
| 2 | SR-6 done for every component: tested by hand with NVDA + Firefox, VoiceOver + Safari, TalkBack + Chrome and Orca + Firefox, with the evidence kept | **Open**: no assistive technology has been used on any release (the accessibility statement says so) | One filled `tests/manual/SR-6-evidence-template.md` per component |
| 3 | The EN 301 549 mapping is published, clause by clause | **Open**: the statement names the standard and the WCAG 2.2 target; there is no clause table | A page of the docs |
| 4 | The browser review ledger is empty: Safari and Firefox have both reviewed every component and file | **Open**: several rows are open | `.claude/BROWSER-REVIEWS.md`, and the security audit's OK (AGENTS.md section 6) |
| 5 | The contrast check for a consumer's own colors is published and documented | **Built, not released**: `npx @cai-ds/tokens check-contrast` and the page `/docs/tokens/contrast/` exist in the repository | A release that contains them |
| 6 | The cascade layers are documented and their names are frozen | **Built, not released**: the Cascade layers page and `tests/layers.*` exist | A release that contains them |
| 7 | No open issue of high severity: no blocker or serious accessibility defect, no broken export, no red-line breach | **Unknown**: the issue tracker has not been read for this | The GitHub issues, with the labels `accessibility` and `bug` |
| 8 | Public API frozen: the list above is complete and each item has a test or a docs page that names it | **Open** | A review of the table above against the packages |
| 9 | The backlog of AGENTS.md is done or removed on purpose | **Open**: dropdown or context menu, pagination, grid system, deprecated-elements table, `input` types grid | AGENTS.md |
| 10 | `docs/` is the build of the sources, and the full QA run passes (`pnpm qa:release`) | **Open**: `check:generated` fails until `docs/` is rebuilt | The QA report |
| 11 | The consumer smoke test passes against the packed tarballs, from a CDN-style path too | **Passes** today (`pnpm smoke:consumer`) | The script |
| 12 | Known issues of the accessibility statement are each registered in EXCEPTIONS.md with the WCAG criterion, or fixed | **Open**: Escape does not close the tooltip, the modal needs `command` support or JavaScript, and others | The statement and EXCEPTIONS.md |

When the table is all ticked, the next major is the stable release, and from it the sections above apply.

---

## Until 1.0

- Versions keep counting up (the packages are at 2.x). **Every major in beta is allowed to break any surface above**, each with a changeset that says how to migrate.
- No deprecation window is promised. Where an alias is cheap, it is kept.
- This file is documentation of intent: no script, no review and no release depends on it before 1.0.
