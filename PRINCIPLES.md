# CAI — Principles and red lines

Inspired by the [GOV.UK Design System](https://design-system.service.gov.uk/). These rules govern every change to `packages/`, `apps/` and the docs. They sit above [VANILLA-FIRST.md](./.claude/VANILLA-FIRST.md) (which covers *how* we build) and tell you *what* we accept.

CAI is three npm packages for developers who install it without talking to us: `@cai-ds/tokens` (standalone), `@cai-ds/core` (needs tokens) and `@cai-ds/platform` (needs core and tokens).

---

## How the rules work

There are two levels.

- **Red lines (`RL-n`)** are absolute. No exception, no deadline, no "just this once". A PR that crosses one is closed, not reviewed.
- **Strong rules (`SR-n`)** are mandatory by default. A change may break one only with a written exception: a `cai-exception: EX-nnn` comment next to the code and a row in [EXCEPTIONS.md](./EXCEPTIONS.md). `pnpm check:exceptions` keeps the two in step. Everything in sections 1–9 that is not a red line is a strong rule (`SR-8`).
- **Aspirations** are marked as such. They guide the work but block nothing.

**Who decides.** The maintainer owns these rules and approves every exception. Changing this file needs its own changeset that says what changed and why, so the rules never erode silently.

**Migration.** Code that breaks a red line is fixed before the next release. Code that breaks a strong rule is registered in EXCEPTIONS.md and fixed over time.

---

## 1. Accessibility first

Accessibility is the baseline, not a feature, a phase or a ticket.

- **Target: WCAG 2.2 level AA**, mapped to **EN 301 549** (clauses 9 web, 10 non-web documents, 11 software where they apply), for every style, component, pattern and app. AAA where it costs nothing (focus appearance, target size 44 px on touch controls, reduced motion).
- Every interactive component must work with **keyboard only**, with a **screen reader**, at **400 % zoom** (reflow to 320 px), in **forced-colors mode** and with **prefers-reduced-motion**.
- **Focus is always visible.** Never `outline: none` without an equivalent `:focus-visible` style with 3:1 contrast against adjacent colours.
- **Colour is never the only signal.** Error, success, selected, disabled and current states need a second cue: text, icon, border, underline or weight.
- **Contrast minimums:** 4.5:1 for text, 3:1 for large text, UI borders, icons and focus rings, in the three shipped themes (`light`, `dark`, `high-contrast`).
- **Custom themes are the consumer's responsibility.** CAI guarantees its shipped themes and provides a tool to check a custom theme against the same minimums (backlog).
- **Motion is opt-in.** Any animation longer than 150 ms or that moves content is disabled under `prefers-reduced-motion: reduce`. No auto-playing media, no parallax, no infinite loops.
- **Disabled controls are a last resort.** Prefer leaving the control enabled and explaining the error. If you must disable, keep the label readable (≥ 3:1, red line 7) and mark the state with something other than colour.
- **Names come from the DOM.** Use `<label>`, visible text, `aria-labelledby`. `aria-label` is the fallback, never the default.
- **Known issues are public.** Any confirmed accessibility defect goes in `CHANGELOG.md` under "Known issues" and in EXCEPTIONS.md until fixed, with the WCAG criterion it fails.
- **Assistive technology testing (`SR-6`).** A release that changes markup, CSS or JS of a component is tested by hand with NVDA + Firefox, VoiceOver + Safari, TalkBack + Chrome and Orca + Firefox. The accessibility statement lists only the combinations that were actually used for that release.
- *Aspiration:* user research includes disabled people. A component validated only by its author says so in its docs.

## 2. Standards first

The web platform already solves most problems. Use it before you write anything.

Order of preference, strictly:

1. **Native HTML element or attribute** (`dialog`, `details`, `popover`, `<input type="…">`, `<output>`, `<progress>`, `<meter>`, `inert`, `hidden`, `autocomplete`, `required`, `inputmode`, `enterkeyhint`).
2. **Native CSS** (`:has()`, `:focus-visible`, `:user-invalid`, `@layer`, logical properties, `clamp()`, container queries, `scroll-snap`, `@starting-style`, anchor positioning when baseline).
3. **Native browser API from vanilla JS** (`Web Animations`, `IntersectionObserver`, `Clipboard`, `AbortController`, `CustomEvent`, `FormData`, constraint validation).
4. **Our own JS**, as small as possible, only once 1–3 are exhausted.

Rules:

- **Semantic HTML before ARIA.** If a native element has the semantics you need, do not add a `role`. `role="switch"` on a `<div>` is wrong; `<input type="checkbox" role="switch">` is right.
- **Bare elements are styled with `:where()`** (specificity 0) in `packages/core/src/elements/`. The consumer's rule and any `.cai-*` class must always win.
- **Design tokens are the only source of colour, space, type and motion values.** Components use semantic tokens only, never primitives, never literals.
- **System fonts first.** The sans and mono stacks are the operating system's (`system-ui`, `ui-monospace`). A bundled face is added only when no system font does the job, and it must pass red line 13.
- **Use `@supports` and baseline, not polyfills.** When a feature is not baseline, ship the degraded experience, not a shim.
- **Browser support policy: Baseline Widely Available** (a feature counts once it has shipped in Chrome, Edge, Firefox and Safari for 30 months). Those browsers get the full experience. Newer features are progressive enhancements behind `@supports` or feature detection. Everything else gets a working, less-styled page.
- **Do not fight the browser.** Native focus rings, scrollbars, form controls, `select`, date pickers and validation bubbles are kept unless there is a documented, evidenced reason.

## 3. JavaScript only when strictly necessary

JS is the last layer, never the foundation. A page built with CAI must be usable with JS disabled, failed or not yet loaded.

- **Three layers, in this order:** HTML that works alone → CSS that improves it → JS that enhances it. Design and document the no-JS state first.
- **If the standard does it, JS does not.** Opening a `dialog`, toggling `details`, showing a `popover`, validating a `required` field, scrolling to an anchor: none of these get custom JS.
- **JS never conflicts with native behaviour.** No `preventDefault()` on native actions unless you replace them with something strictly better and documented. No re-implementing `Tab` order, `Escape`, form submission or link navigation.
- **JS is an enhancement, never a requirement.** Each use must degrade: tabs become stacked sections, the theme switcher becomes radios, the copy button becomes selectable text.
- **Feature-detect, never user-agent-sniff.** `if ("showPopover" in HTMLElement.prototype)`, `CSS.supports()`, `@supports`.
- **Importing a module has no side effects.** Only `init*()` touches the DOM. `init*()` is idempotent and scoped (accepts a root element).
- **Hooks are `data-*` attributes, not classes.** `.cai-*` classes are for styling; JS binds to `data-cai-*` or ARIA attributes.
- **No JS on the critical rendering path and no inline scripts.** Everything is `type="module"`, deferred, and heavy modules (`midi.js`) are lazy-loaded.
- **State lives in the DOM and in ARIA**, not in JS variables: `aria-expanded`, `aria-selected`, `open`, `hidden`, `checked`. `.is-*` classes are a mirror for styling, never the source of truth.
- A component that needs more than 2 kB of JS needs a written justification in its PR.

## 4. Text is part of the system

Words are a component. A button with the wrong label is a broken button. These rules are mandatory for CAI's own strings and docs. For consumers they are content guidance, written into each component's docs.

- **Sentence case and meaningful text (`SR-1`).** Headings, buttons, labels, tabs, menu items in sentence case. Buttons describe the action with a verb ("Save changes", "Copy command"); never "OK", "Submit", "Click here", "Yes". Links make sense out of context; never "here", "read more", "this page". The trailing full stop is outside the link.
- **No new tabs by default (`SR-2`).** If a link must open a new tab, its text says "(opens in new tab)" and it carries `rel="noopener noreferrer"`.
- **Labels are visible and permanent.** A placeholder is a hint, never the label. Hint text goes in a visible element linked with `aria-describedby`.
- **Errors say what happened and how to fix it**, next to the field, in plain words, prefixed with "Error:" for screen readers.
- **Plain language.** Short sentences, one idea each, common words, active voice. Expand every acronym once.
- **Microcopy is reviewed like code.**

## 5. Language

- **Generated text comes from the dictionary (`SR-7`).** Any visible text or accessible name that CAI's JS writes comes from `@cai-ds/core/i18n`, never a literal in a module. English and Spanish ship built in; consumers register more with `registerLocale()`.
- **The language is the page's.** Components read the nearest `lang` attribute, so a page declares its language once (WCAG 3.1.1) and multilingual fragments work by marking them with their own `lang` (WCAG 3.1.2). With no `lang`, CAI falls back to English and warns in the console.
- **Authored HTML wins.** Text in the markup and `data-cai-label-*` attributes override the dictionary, which overrides English.
- **Works in any writing direction:** logical properties (`SR-4`: `margin-inline-start`, not `margin-left`); test with `dir="rtl"` and with 30 % longer strings.

## 6. Consistency over novelty

- **Do not invent new meanings.** Blue is interactive. Red is error or danger. Green is success. Yellow is warning.
- **Do not restyle the primitives per app.** Buttons, inputs, links and focus rings look the same in every app and consumer. Apps add layout, not new skins.
- **One component, one job.** No `.cai-card--as-button`. If you need both, you need two components.
- **Core or platform.** `core` holds pieces useful on any website (button, form, dialog). `platform` holds composed application patterns (app shell, layouts). If in doubt, it belongs in the consumer's app.
- **A component must be useful, unique, usable and consistent** (the GOV.UK contribution criteria). "I needed it once" is not a reason to add it.
- **Prefer removing to adding.** Every new component lists what it makes obsolete.

## 7. Resilience

- **Works without CSS:** source order is reading order; headings form an outline; no content-bearing pseudo-elements.
- **Works without JS:** see section 3.
- **Works with user styles:** no `!important` in components (`SR-3`); `rem` for type, never `px`; respect `prefers-color-scheme`, `prefers-contrast`, `prefers-reduced-motion`, `forced-colors`.
- **Works on slow networks:** bundled fonts are self-hosted with `font-display: swap`; no render-blocking JS; no third-party requests.
- **Works at every viewport:** 320 px to 2560 px without horizontal scroll; `clamp()` type scale; no fixed heights on text containers.

## 8. Privacy and performance

- **No tracking, no analytics, no third-party domains.** The only persistence is user preference (theme, mode) in `localStorage`, and the page must work if that throws.
- **Zero runtime dependencies**, forever.
- **Size budgets**, min+gzip, in [budgets.json](./budgets.json) and checked by `pnpm check:size`. The ceiling is red line 17; the other bands are warnings.

| Artifact | Warns below | Ideal | Warns above | Ceiling |
| --- | --- | --- | --- | --- |
| `tokens` CSS | 1 kB (a theme or scale is probably missing) | 1–3 kB | 3 kB | 5 kB |
| `core` CSS | — | ≤ 12 kB | 12 kB | 15 kB |
| `core` JS entry (lazy chunks excluded) | — | ≤ 5 kB | 5 kB | 8 kB |
| Each lazy chunk (`midi`) | — | ≤ 3 kB | 3 kB | 4 kB |
| `platform` CSS | — | ≤ 2 kB | 2 kB | 4 kB |
| `platform` JS | — | ≤ 1 kB | 1 kB | 2 kB |

## 9. Evidence, transparency and stability

- **Decisions are written down.** A new component, a removed one, a changed default: each gets a changeset entry.
- **Accessibility statement.** The docs app publishes which WCAG 2.2 criteria and EN 301 549 clauses are met, which are not, and which assistive technologies were tested for the current release. Update it on every release.
- **Tests encode the rules.** Every rule here that a machine can check has a check in `tests/`, stylelint, ESLint or `scripts/check-*.js`.
- **Docs per component (`SR-5`).** Six sections: *When to use* · *When not to use* · *How it works* · *Content guidance* · *Keyboard & ARIA* · *Known issues*, plus an axe and a keyboard test. The first two are red line 18.
- **Beta.** CAI is in beta: any release may break anything, always with a changeset that explains how to migrate. It leaves beta when every red line is checked by a tool, the EN 301 549 mapping is published, the public API (`.cai-*` classes, `data-cai-*` hooks, semantic tokens, JS exports) is frozen, the backlog in AGENTS.md is done, and the maintainer considers it stable. From then on, semantic versioning applies strictly.

---

## Red lines

Absolute. A PR that crosses one is closed, not reviewed.

1. **No runtime dependency** in any package. No framework, no helper library, no polyfill from npm.
2. **No component that needs JavaScript to be usable.** JS enhances; it never gates content or actions.
3. **No custom JS for behaviour the browser already provides** (`dialog`, `details`, `popover`, form validation, anchors, `select`).
4. **No `div` or `span` with a `role` when a native element exists** (`button`, `a`, `input`, `dialog`, `nav`, `table`).
5. **No `outline: none` without a visible `:focus-visible` replacement.**
6. **No state communicated by colour alone.**
7. **No text below 4.5:1 contrast** in any shipped theme, hover included. **Disabled text keeps at least 3:1**, and the disabled state has a cue other than colour (a dashed border on buttons).
8. **No animation that ignores `prefers-reduced-motion`.**
9. **No placeholder used as a label. No icon-only control without an accessible name.**
10. **No primitive token or literal colour/space value in a component.** Semantic tokens only.
11. **No bare-element rule outside `:where()`** in `packages/`.
12. **No third-party network request** (fonts, scripts, images, analytics) from a package or an app.
13. **No bundled font unless its only licence is the repository's (MIT).** Dual-licensed fonts are not accepted, even when MIT is one of the options. The notice ships next to it as `LICENSE-<Font>.txt`.
14. **No hand edits to `dist/` or `docs/`.**
15. **No new status colour, no new meaning for an existing one.**
16. **No browser sniffing.** Feature detection only.
17. **No artifact over its size ceiling** in budgets.json. Ceilings are never raised: optimise or remove instead.
18. **No component merged without *When to use* and *When not to use*** in its docs.

## Strong rules

Mandatory unless an exception is registered in [EXCEPTIONS.md](./EXCEPTIONS.md).

| Id | Rule | Where |
| --- | --- | --- |
| SR-1 | Sentence case, verb-first buttons, meaningful links, no "OK" or "click here" in CAI's strings | §4, `pnpm check:strings` |
| SR-2 | No `target="_blank"` without "(opens in new tab)" and `rel="noopener noreferrer"` | §4 |
| SR-3 | No `!important` in `packages/` | §7, stylelint |
| SR-4 | Logical properties instead of physical ones | §5, stylelint |
| SR-5 | All six docs sections and an axe + keyboard test per component | §9 |
| SR-6 | Manual testing with the four screen reader and browser pairs before a release that changes UI | §1 |
| SR-7 | Text generated by JS comes from the i18n dictionary | §5 |
| SR-8 | Every other rule in sections 1–9 | — |

---

## Definition of done for a component PR

Copy into the PR description and tick every line. An unticked line needs an EXCEPTIONS.md row or blocks the merge.

```
- [ ] Native element or API used where one exists; any ARIA justified in the PR
- [ ] Works with JS disabled (describe the no-JS state)
- [ ] Keyboard: every action reachable and operable; focus visible; Escape/Enter/Space/arrows documented
- [ ] Screen reader: tested with at least Orca + Firefox; names and states announced
- [ ] 400 % zoom / 320 px: no horizontal scroll, nothing clipped
- [ ] forced-colors and prefers-reduced-motion checked
- [ ] Contrast ≥ 4.5:1 text, ≥ 3:1 UI, in light, dark and high-contrast
- [ ] Only semantic tokens; logical properties; no !important
- [ ] Generated strings come from the i18n dictionary, in English and Spanish
- [ ] Strings: sentence case, verb-first buttons, meaningful links, visible labels
- [ ] Docs: When to use · When not to use · How it works · Content guidance · Keyboard & ARIA · Known issues
- [ ] Tests added (axe + keyboard) and `pnpm test:ui` green
- [ ] `pnpm check:size` and `pnpm check:exceptions` green
- [ ] dist/ regenerated, `check-pack` updated, changeset added
```
