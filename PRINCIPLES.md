# CAI — Principles and red lines

Inspired by the [GOV.UK Design System](https://design-system.service.gov.uk/). These rules govern every change to `packages/`, `apps/` and the docs. They sit above [VANILLA-FIRST.md](./.claude/VANILLA-FIRST.md) (which covers *how* we build) and tell you *what* we accept.

A rule here beats convenience, deadlines and "it looks nicer". If a change cannot meet these rules, it does not ship.

---

## 1. Accessibility first

Accessibility is the baseline, not a feature, a phase or a ticket.

- **Target: WCAG 2.2 level AA** for every style, component, pattern and app. AAA where it costs nothing (focus appearance, target size 44 px on touch controls, reduced motion).
- Every interactive component must work with **keyboard only**, with a **screen reader**, at **400 % zoom** (reflow to 320 px), in **forced-colors mode** and with **prefers-reduced-motion**. Test all five before opening the PR.
- **Focus is always visible.** Never `outline: none` without an equivalent `:focus-visible` style with 3:1 contrast against adjacent colours.
- **Colour is never the only signal.** Error, success, selected, disabled and current states need a second cue: text, icon, border, underline or weight.
- **Contrast minimums:** 4.5:1 for text, 3:1 for large text, UI borders, icons and focus rings, in all three themes (`light`, `dark`, `high-contrast`) and every custom theme.
- **Motion is opt-in.** Any animation longer than 150 ms or that moves content is disabled under `prefers-reduced-motion: reduce`. No auto-playing media, no parallax, no infinite loops.
- **Disabled controls are a last resort.** Prefer leaving the control enabled and explaining the error. If you must disable, keep the label readable (≥ 3:1).
- **Names come from the DOM.** Use `<label>`, visible text, `aria-labelledby`. `aria-label` is the fallback, never the default. No icon-only control ships without an accessible name.
- **Known issues are public.** Any confirmed accessibility defect goes in `CHANGELOG.md` under "Known issues" until fixed, with the WCAG criterion it fails.
- **User research includes disabled people.** A component "validated" only by its author is not validated.

## 2. Standards first

The web platform already solves most problems. Use it before you write anything.

Order of preference, strictly:

1. **Native HTML element or attribute** (`dialog`, `details`, `popover`, `<input type="…">`, `<output>`, `<progress>`, `<meter>`, `inert`, `hidden`, `autocomplete`, `required`, `inputmode`, `enterkeyhint`).
2. **Native CSS** (`:has()`, `:focus-visible`, `:user-invalid`, `@layer`, logical properties, `clamp()`, container queries, `scroll-snap`, `@starting-style`, anchor positioning when baseline).
3. **Native browser API from vanilla JS** (`Web Animations`, `IntersectionObserver`, `Clipboard`, `AbortController`, `CustomEvent`, `FormData`, constraint validation).
4. **Our own JS**, as small as possible, only once 1–3 are exhausted.

Rules:

- **Semantic HTML before ARIA.** The first rule of ARIA applies: if a native element has the semantics you need, do not add a `role`. `role="switch"` on a `<div>` is wrong; `<input type="checkbox" role="switch">` is right.
- **Bare elements are styled with `:where()`** (specificity 0) in `packages/core/src/elements/`. The consumer's rule and any `.cai-*` class must always win.
- **Design tokens are the only source of colour, space, type and motion values.** Components use semantic tokens only, never primitives, never literals.
- **Use `@supports` and baseline, not polyfills.** When a feature is not baseline, ship the degraded experience, not a shim.
- **Browser support policy: Baseline Widely Available** (a feature counts once it has shipped in Chrome, Edge, Firefox and Safari for 30 months). Those browsers get the full experience. Everything else gets a working, unstyled-or-less-styled page. We do not break older browsers; we just stop enhancing them.
- **Do not fight the browser.** Native focus rings, native scrollbars, native form controls, native `select`, native date pickers, native validation bubbles are kept unless there is a documented, evidenced reason.

## 3. JavaScript only when strictly necessary

JS is the last layer, never the foundation. A page built with CAI must be usable with JS disabled, failed or not yet loaded.

- **Three layers, in this order:** HTML that works alone → CSS that improves it → JS that enhances it. Design and document the no-JS state first.
- **If the standard does it, JS does not.** Opening a `dialog`, toggling `details`, showing a `popover`, validating a `required` field, scrolling to an anchor, copying with `<button type="submit">` in a form: none of these get custom JS. If JS exists for these today, it is technical debt to remove.
- **JS never conflicts with native behaviour.** No `preventDefault()` on native actions unless you are replacing them with something strictly better and documented. No re-implementing `Tab` order, `Escape`, form submission or link navigation.
- **JS is a fallback or an enhancement, never a requirement.** Legitimate uses today: roving tabindex for tabs, focus restoration after a dialog closes in browsers that do not do it, MIDI playback, copy-to-clipboard feedback, theme persistence. Each one must degrade: tabs become stacked sections, the theme switcher becomes a `<select>` in a form, the copy button becomes selectable text.
- **Feature-detect, never user-agent-sniff.** `if ("showPopover" in HTMLElement.prototype)`, `CSS.supports()`, `@supports`.
- **Importing a module has no side effects.** Only `init*()` touches the DOM. `init*()` is idempotent (calling it twice does not double-bind) and scoped (accepts a root element).
- **Hooks are `data-*` attributes, not classes.** `.cai-*` classes are for styling; JS binds to `data-cai-*` or ARIA attributes. Removing the JS must not change how it looks; removing the CSS must not change what it does.
- **No JS on the critical rendering path and no inline scripts.** Everything is `type="module"`, deferred, and heavy modules (`midi.js`) are lazy-loaded on demand. A one-time flash of the stored theme is accepted over a blocking script.
- **State lives in the DOM and in ARIA**, not in JS variables: `aria-expanded`, `aria-selected`, `open`, `hidden`, `checked`. CSS reads those attributes. `.is-*` classes are a mirror for styling, never the source of truth.
- **Size budget:** `cai.js` stays under 8 kB min+gzip excluding lazy chunks. A component that needs more than 2 kB of JS needs a written justification in its PR.

## 4. Text is part of the system

Words are a component. A button with the wrong label is a broken button.

- **Sentence case everywhere.** Headings, buttons, labels, tabs, menu items. Never Title Case, never ALL CAPS via content (CSS `text-transform` on a badge is fine; shouting text is not).
- **Buttons describe the action with a verb:** "Save changes", "Copy command", "Open navigation". Never "OK", "Submit", "Click here", "Yes".
- **Links say where they go.** Link text makes sense out of context. Never "here", "read more", "this page". The trailing full stop is outside the link.
- **No new tabs** by default. If a link must open a new tab, the link text says "(opens in new tab)" and the anchor carries `rel="noopener noreferrer"`.
- **Labels are visible and permanent.** A placeholder is a hint, never the label. Hint text goes in a visible element linked with `aria-describedby`.
- **Errors say what happened and how to fix it**, next to the field, in plain words, prefixed with "Error:" for screen readers. Never only a red border.
- **Plain language.** Short sentences, one idea each, common words, active voice. Write for someone in a hurry on a phone. Expand every acronym once.
- **Docs follow one structure per component:** *When to use* · *When not to use* · *How it works* · *Content guidance* · *Keyboard & ARIA* · *Known issues*. A component without "When not to use" is not documented.
- **Language is declared.** Every page has `<html lang>`; any inline fragment in another language has its own `lang`. Icons that carry meaning have text; icons that do not are `aria-hidden="true"`.
- **Microcopy is reviewed like code.** Changes to visible strings get the same review as changes to CSS.

## 5. Consistency over novelty

- **Do not invent new meanings.** Blue is interactive. Red is error or danger. Green is success. Yellow is warning. Do not reuse these colours decoratively and do not add a fifth status colour.
- **Do not restyle the primitives per app.** Buttons, inputs, links and focus rings look the same in the docs, the landing and any consumer. Apps add layout, not new component skins.
- **One component, one job.** No `.cai-card--as-button`, no `.cai-alert--as-modal`. If you need both, you need two components.
- **A component must be useful, unique, usable and consistent** (the GOV.UK contribution criteria). "I needed it once" is not a reason to add it to `core`. Put it in your app.
- **Prefer removing to adding.** A smaller system that is fully accessible beats a larger one with gaps. Every new component must list what it makes obsolete.

## 6. Resilience

The system must survive hostile conditions without becoming unusable.

- **Works without CSS:** source order is reading order; headings form an outline; no content-bearing pseudo-elements.
- **Works without JS:** see section 3.
- **Works with user styles:** no `!important` in components; respect user font-size (`rem`, never `px` for type); respect `prefers-color-scheme`, `prefers-contrast`, `prefers-reduced-motion`, `forced-colors`.
- **Works on slow networks:** fonts are self-hosted, `font-display: swap`, system fallback metrics tuned; no render-blocking JS; no third-party requests from a package.
- **Works in any writing direction:** logical properties only (`margin-inline-start`, not `margin-left`); test with `dir="rtl"` and with 30 % longer strings (German, Finnish).
- **Works at every viewport:** 320 px to 2560 px without horizontal scroll; `clamp()` type scale; no fixed heights on text containers.

## 7. Privacy and performance

- **No tracking, no analytics, no fonts or scripts from third-party domains** in any package or app. The only persistence is user preference (theme, mode) in `localStorage`, and the page must work if that throws.
- **Zero runtime dependencies**, forever. See [VANILLA-FIRST.md](./.claude/VANILLA-FIRST.md).
- **Bundled fonts are MIT**, with the licence next to them. See [AGENTS.md](./AGENTS.md).
- **Budgets per package (min+gzip):** `tokens` ≤ 3 kB, `core` CSS ≤ 15 kB, `core` JS ≤ 8 kB (excluding lazy chunks). A PR that exceeds a budget must raise the budget in this file with a reason.

## 8. Evidence and transparency

- **Decisions are written down.** A new component, a removed component, a changed default: all get an entry in the changeset and, when relevant, a line in the component's "Research" or "Known issues".
- **Accessibility statement.** The docs app publishes which WCAG 2.2 criteria are met, which are not, and which assistive technologies were tested (NVDA + Firefox, VoiceOver + Safari, TalkBack + Chrome, keyboard only, Windows High Contrast). Update it on every release.
- **Tests encode the rules.** Every rule in this file that can be checked by a machine gets a test in `tests/` (axe on every docs section, keyboard paths, reduced-motion, forced-colors, no-JS smoke). A rule without a test will be broken.

---

## Red lines

Non-negotiable. A PR that crosses one is closed, not reviewed.

1. **No runtime dependency** in any package. No framework, no helper library, no polyfill from npm.
2. **No component that needs JavaScript to be usable.** JS enhances; it never gates content or actions.
3. **No custom JS for behaviour the browser already provides** (`dialog`, `details`, `popover`, form validation, anchors, `select`).
4. **No `div` or `span` with a `role` when a native element exists** (`button`, `a`, `input`, `dialog`, `nav`, `table`).
5. **No `outline: none` without a visible `:focus-visible` replacement.**
6. **No state communicated by colour alone.**
7. **No text below 4.5:1 contrast** in any shipped theme, including hover and disabled states of the text itself.
8. **No animation that ignores `prefers-reduced-motion`.**
9. **No placeholder used as a label. No icon-only control without an accessible name.**
10. **No "click here", "read more", "OK" or Title Case in shipped strings.**
11. **No `target="_blank"` without "(opens in new tab)" in the link text and `rel="noopener noreferrer"`.**
12. **No primitive token or literal colour/space value in a component.** Semantic tokens only.
13. **No `!important` in `packages/`** and no bare-element rule outside `:where()`.
14. **No third-party network request** (fonts, scripts, images, analytics) from a package or from the docs app.
15. **No non-MIT font.**
16. **No hand edits to `dist/` or `docs/`.**
17. **No component merged without its documentation page** (the six sections in §4) **and its Keyboard & ARIA test.**
18. **No new status colour, no new meaning for an existing one.**
19. **No physical CSS properties** (`left`, `margin-right`, `padding-left`) where a logical one exists.
20. **No browser sniffing.** Feature detection only.

---

## Definition of done for a component PR

Copy into the PR description and tick every line. An unticked line blocks the merge.

```
- [ ] Native element or API used where one exists; any ARIA justified in the PR
- [ ] Works with JS disabled (describe the no-JS state)
- [ ] Keyboard: every action reachable and operable; focus visible; Escape/Enter/Space/arrows documented
- [ ] Screen reader: tested with at least one of NVDA, VoiceOver, TalkBack; names and states announced
- [ ] 400 % zoom / 320 px: no horizontal scroll, nothing clipped
- [ ] forced-colors and prefers-reduced-motion checked
- [ ] Contrast ≥ 4.5:1 text, ≥ 3:1 UI, in light, dark and high-contrast
- [ ] Only semantic tokens; logical properties; no !important
- [ ] Strings: sentence case, verb-first buttons, meaningful links, visible labels
- [ ] Docs page: When to use · When not to use · How it works · Content guidance · Keyboard & ARIA · Known issues
- [ ] Tests added (axe + keyboard) and `pnpm test:ui` green
- [ ] dist/ regenerated, `check-pack` updated, changeset added
```

---

## Rollout status

Applied on 2026-10-06. Open items are known gaps, listed so they are fixed rather than forgotten.

| Area | Rule | Status |
| --- | --- | --- |
| Switch | RL 4, RL 2 | Done: native `input[role=switch]`, no JS. |
| Modal | RL 2, RL 3 | Done: native `<dialog>`, `commandfor` with a feature-detected fallback. |
| Sidebar drawer | RL 2 | Done: native popover; JS keeps only the scroll-spy and closes the drawer after a link. |
| Color-mode switcher | RL 2 | Done: native radios, `:root:has()` in the tokens. A stored mode can flash once on load (no inline script). |
| Tabs | RL 2 | Done: links to visible panels, ARIA added by script. |
| Player | RL 4, RL 2 | Done: native `controls` without JS, `input[type=range]` sliders. MIDI needs JS and says so. |
| Progress | RL 4 | Done: native `<progress>`. |
| Copy buttons | RL 2 | Done: hidden until JS runs. |
| CSS hygiene | RL 5, 12, 13, 19 | Done: cascade layers, no `!important`, logical properties, no literal colours, reduced motion by tokens. |
| Strings | RL 10 | Done and checked by `pnpm check:strings`. |
| Guidance per component | RL 17 | Done for the 19 core components in the landing page; the platform docs are next. |
| Accessibility statement | section 8 | Done in the docs app. No screen reader has been used. |
| Tests | section 8 | Done: axe, no-JS, reduced motion, forced colors, size budgets. Firefox and WebKit projects are configured and run in CI; they were not run locally. |
| Tooltip Escape | WCAG 1.4.13 | Open, documented as a known issue. |
| Icon grid items | RL 4 | Open: `div` made `role="button"` by script. |
| Per-component keyboard tests | RL 17 | Open: tabs, dialog and drawer are covered; the other components are not. |
