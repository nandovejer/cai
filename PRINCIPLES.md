# LUZ — Principles and red lines

Inspired by the [GOV.UK Design System](https://design-system.service.gov.uk/). These rules govern every change to `packages/`, `apps/` and the docs. They sit above [VANILLA-FIRST.md](./dev/VANILLA-FIRST.md) (which covers *how* we build) and tell you *what* we accept.

LUZ is npm packages for developers who install it without talking to us: `@luz-ds/tokens` (standalone), `@luz-ds/core` (needs tokens) and `@luz-ds/site` (needs core and tokens), which share one version, and packages for one kind of site on top of them, each with its own version: `@luz-ds/landing`, `@luz-ds/cms`, `@luz-ds/app` and `@luz-ds/docs` (each needs core and tokens, and takes site as an optional peer).

**Human-first, AI-ready.** LUZ is made for the people who use the page first, and it is plain HTML and CSS with a closed list of names, so an AI agent can write it correctly too. **Every change starts with a failing test**: the first commit is `test:`, it fails without the change, and a bug fix starts with the test that reproduces it (`SR-9`). [How LUZ is built](https://nandovejer.github.io/luz/docs/get-started/how-luz-is-built/) says more.

---

## How the rules work

There are two levels.

- **Red lines (`RL-n`)** are absolute. No exception, no deadline, no "just this once". A PR that crosses one is closed, not reviewed.
- **Strong rules (`SR-n`)** are mandatory by default. A change may break one only with a written exception: a `luz-exception: EX-nnn` comment next to the code and a row in [EXCEPTIONS.md](./EXCEPTIONS.md). `pnpm check:exceptions` keeps the two in step. Everything in sections 1–9 that is not a red line is a strong rule (`SR-8`).
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
- **Custom themes are the consumer's responsibility.** LUZ guarantees the look it ships, in its three modes, and provides a tool to check a custom theme against the same minimums: `npx @luz-ds/tokens check-contrast <file.css>`, also in the page at `/docs/tokens/contrast/`.
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
- **Bare elements are styled with `:where()`** (specificity 0) in `packages/core/src/elements/`. The consumer's rule and any `.luz-*` class must always win.
- **Design tokens are the only source of colour, space, type and motion values.** Components use semantic tokens only, never primitives, never literals.
- **System fonts first.** The sans and mono stacks are the operating system's (`system-ui`, `ui-monospace`). A bundled face is added only when no system font does the job, and it must pass red line 13.
- **Use `@supports` and baseline, not polyfills.** When a feature is not baseline, ship the degraded experience, not a shim.
- **Browser support policy: Baseline Widely Available** (a feature counts once it has shipped in Chrome, Edge, Firefox and Safari for 30 months). Those browsers get the full experience. Newer features are progressive enhancements behind `@supports` or feature detection. Everything else gets a working, less-styled page.
- **Do not fight the browser.** Native focus rings, scrollbars, form controls, `select`, date pickers and validation bubbles are kept unless there is a documented, evidenced reason.

## 3. JavaScript only when strictly necessary

JS is the last layer, never the foundation. A page built with LUZ must be usable with JS disabled, failed or not yet loaded.

- **Three layers, in this order:** HTML that works alone → CSS that improves it → JS that enhances it. Design and document the no-JS state first.
- **If the standard does it, JS does not.** Opening a `dialog`, toggling `details`, showing a `popover`, validating a `required` field, scrolling to an anchor: none of these get custom JS.
- **JS never conflicts with native behaviour.** No `preventDefault()` on native actions unless you replace them with something strictly better and documented. No re-implementing `Tab` order, `Escape`, form submission or link navigation. **One case is allowed by name:** a site-wide search may take a shortcut with a modifier key (`Ctrl+K` and `Meta+K`, both accepted, with no platform detection), if the trigger shows it (visible "Ctrl K" hint and `aria-keyshortcuts`), the accessibility statement lists it, and it is ignored during IME composition and while focus is in a `textarea` or editable content. Single-character shortcuts are never allowed (WCAG 2.1.4).
- **JS is an enhancement, never a requirement.** Each use must degrade: tabs become stacked sections, the mode switcher becomes radios, the copy button becomes selectable text.
- **Feature-detect, never user-agent-sniff.** `if ("showPopover" in HTMLElement.prototype)`, `CSS.supports()`, `@supports`.
- **Importing a module has no side effects.** Only `init*()` touches the DOM. `init*()` is idempotent and scoped (accepts a root element).
- **Hooks are `data-*` attributes, not classes.** `.luz-*` classes are for styling; JS binds to `data-luz-*` or ARIA attributes.
- **No JS on the critical rendering path and no inline scripts.** Everything is `type="module"`, deferred, and heavy modules (`midi.js`) and modules few pages need (`table-sort.js`) are lazy-loaded.
- **State lives in the DOM and in ARIA**, not in JS variables: `aria-expanded`, `aria-selected`, `open`, `hidden`, `checked`. `.is-*` classes are a mirror for styling, never the source of truth.
- A component that needs more than 2 kB of JS needs a written justification in its PR.

## 4. Text is part of the system

Words are a component. A button with the wrong label is a broken button. These rules are mandatory for LUZ's own strings and docs. For consumers they are content guidance, written into each component's docs.

- **Sentence case and meaningful text (`SR-1`).** Headings, buttons, labels, tabs, menu items in sentence case. Buttons describe the action with a verb ("Save changes", "Copy command"); never "OK", "Submit", "Click here", "Yes". Links make sense out of context; never "here", "read more", "this page". The trailing full stop is outside the link.
- **No new tabs by default (`SR-2`).** If a link must open a new tab, its text says "(opens in new tab)" and it carries `rel="noopener noreferrer"`.
- **Labels are visible and permanent.** A placeholder is a hint, never the label. Hint text goes in a visible element linked with `aria-describedby`.
- **Errors say what happened and how to fix it**, next to the field, in plain words, prefixed with "Error:" for screen readers.
- **Plain language.** Short sentences, one idea each, common words, active voice. Expand every acronym once.
- **Microcopy is reviewed like code.**

## 5. Language

- **Generated text comes from the dictionary (`SR-7`).** Any visible text or accessible name that LUZ's JS writes comes from `@luz-ds/core/i18n`, never a literal in a module. English is in the entry; every other language LUZ ships is a lazy file, fetched only for the pages that declare it (`loadLocales()`). Consumers register more with `registerLocale()`.
- **The language is the page's.** Components read the nearest `lang` attribute, so a page declares its language once (WCAG 3.1.1) and multilingual fragments work by marking them with their own `lang` (WCAG 3.1.2). With no `lang`, LUZ falls back to English and warns in the console.
- **Authored HTML wins.** Text in the markup and `data-luz-label-*` attributes override the dictionary, which overrides English.
- **Works in any writing direction:** logical properties (`SR-4`: `margin-inline-start`, not `margin-left`); test with `dir="rtl"` and with 30 % longer strings.

## 6. Consistency over novelty

- **Do not invent new meanings.** Blue is interactive. Red is error or danger. Green is success. Yellow is warning.
- **Do not restyle the primitives per app.** Buttons, inputs, links and focus rings look the same in every app and consumer. Apps add layout, not new skins.
- **One component, one job.** No `.luz-card--as-button`. If you need both, you need two components.
- **Core or site.** `site` is what can go in any section: a piece that works anywhere on a page of any kind of site and acts for the site as a whole (its search, its cookie question, its language switch, its submenu, its banner). `core` holds everything that knows nothing about the site and fits inside anything (button, form, dialog), and the layout every page needs. Page structure (header, footer, hero, the rhythm of a page) is not `site`'s: it belongs to the package for that kind of site, composed from core's objects. The packages for one kind of site (`landing`, `cms`, `app` and `docs`) need `tokens` and `core`, and take `site` as an optional peer: they render without it. If in doubt, it belongs in the consumer's app.
- **A component must be useful, unique, usable and consistent** (the GOV.UK contribution criteria). "I needed it once" is not a reason to add it.
- **Prefer removing to adding.** Every new component lists what it makes obsolete.

## 7. Resilience

- **Works without CSS:** source order is reading order; headings form an outline; no content-bearing pseudo-elements.
- **Works without JS:** see section 3.
- **Works with user styles:** no `!important` in components (`SR-3`); `rem` for type, never `px`; respect `prefers-color-scheme`, `prefers-contrast`, `prefers-reduced-motion`, `forced-colors`.
- **Works on slow networks:** bundled fonts are self-hosted with `font-display: swap`; no render-blocking JS; no third-party requests.
- **Works at every viewport:** 320 px to 2560 px without horizontal scroll; `clamp()` type scale; no fixed heights on text containers.

## 8. Privacy and performance

- **No tracking, no analytics, no third-party domains.** The only things stored are the visitor's own display preferences — the color mode or theme, and on the docs site the last Code or Design tab — and, where a site uses site's cookie consent, the visitor's answer to it (the categories asked, the ones granted and when the answer expires), in `localStorage`, under a `luz-` key, with the value checked against the allowed list and no personal data. Every read and write is in `try`/`catch`: the page works the same if storage is blocked or throws.
- **Zero runtime dependencies**, forever.
- **Size budgets**, min+gzip, in [budgets.json](./budgets.json) and checked by `pnpm check:size`. The ceiling is red line 17; the other bands are warnings.

| Artifact | Warns below | Ideal | Warns above | Ceiling |
| --- | --- | --- | --- | --- |
| `tokens` CSS | 1 kB (a theme or scale is probably missing) | 1–3 kB | 3 kB | 5 kB |
| `core` CSS | — | ≤ 12 kB | 12 kB | 15 kB |
| `core` classless CSS (a file of its own, not in `luz.css`) | — | ≤ 2 kB | 2 kB | 3 kB |
| `core` JS entry (lazy chunks excluded) | — | ≤ 5 kB | 5 kB | 8 kB |
| `core` JS lazy chunk: `midi` | — | ≤ 3 kB | 3 kB | 4 kB |
| `core` JS lazy chunk: `table-sort` | — | ≤ 1 kB | 1 kB | 2 kB |
| `core` JS lazy chunk: `timeline` | — | ≤ 2 kB | 2 kB | 3 kB |
| `site` CSS | — | ≤ 2 kB | 2 kB | 4 kB |
| `site` JS entry (the loader; lazy chunks excluded) | — | ≤ 1 kB | 1 kB | 2 kB |
| `site` JS lazy chunk: `search` (loaded by `site.js` when the page has a `<luz-search>`) | — | ≤ 2 kB | 2 kB | 2.5 kB |
| `site` JS lazy chunk: `consent` (loaded by `site.js` when the page has a `<luz-consent>`) | — | ≤ 1 kB | 1 kB | 1.5 kB |
| `landing` CSS | — | ≤ 1 kB | 1 kB | 2 kB |
| `cms` CSS | — | ≤ 2 kB | 2 kB | 4 kB |
| `app` CSS | — | ≤ 1 kB | 1 kB | 2 kB |
| Each docs page, HTML uncompressed | — | ≤ 60 kB | 60 kB | 80 kB |
| `check` CLI bundle, `luz-check.js` (gzip, not minified so it can be read) | — | ≤ 36 kB | 36 kB | 40 kB |
| `llms.txt` and `llms-full.txt`, each uncompressed | — | ≤ 400 kB | 400 kB | 448 kB |
| Each manifest on Pages (`docs/manifests/**/*.json`), uncompressed | — | ≤ 48 kB | 48 kB | 64 kB |
| `docs` CSS | — | ≤ 2 kB | 2 kB | 4 kB |
| `core` JS lazy chunk: `i18n-es` (loaded by `luz.js` when the page's `lang` is `es`; one row per language) | — | ≤ 0.75 kB | 0.75 kB | 1 kB |
| `site` JS lazy chunk: `mode` (loaded by `site.js` when the page has a `<luz-mode>`) | — | ≤ 1 kB | 1 kB | 1.5 kB |
| The home light controller JS, `apps/landing/light/light.js` (gzip of the source; the LUZ website only, not a package) | — | ≤ 7.25 kB | 7.25 kB | 7.5 kB |
| The home light visual: `globe`, `apps/landing/light/globe.js` (loaded by `light.js` when the globe is the look) | — | ≤ 9.25 kB | 9.25 kB | 9.5 kB |
| The home light visual: `city`, `apps/landing/light/city.js` (loaded when the city is the look) | — | ≤ 9.75 kB | 9.75 kB | 10 kB |
| The home light visual: `map`, `apps/landing/light/map.js` (loaded when the map is the look) | — | ≤ 8 kB | 8 kB | 8.25 kB |

Docs pages are measured as the raw bytes of each built `docs/**/*.html`, without compression and without CSS or JS. A page that reaches the ceiling is split into two pages; the ceiling is never raised (red line 17).

The three rows after the docs pages are the AI-ready artifacts. The CLI bundle is measured gzipped but not minified, because a tool that reads your files should be readable; it is a command you run, no page downloads it. Its row was fixed once, on 2026-10-15, from the measured 33.9 kB of the first complete version (it had been an estimate before anything shipped) and is never raised afterwards. `llms-full.txt` and each manifest are measured as the raw bytes of the built `docs/**/*.txt` and `docs/manifests/**/*.json`. The row after them is the CSS of `@luz-ds/docs`, the package for a documentation site, with the ideal and the ceiling of site's and cms' CSS. Then comes a language file of core: one row per language, 0.75 kB ideal and 1 kB ceiling, fixed once from the first one (`es`) and never raised; a language that does not fit shortens its strings. The row after that is site's color mode chunk, the size of the consent one. The last four are the home page's `<home-light>` (`apps/landing/light/`, the website, not a package), measured as the gzip of each source file because it is served as written: each ceiling was fixed once, on 2026-10-16, as the first measured size rounded up to the next 256 bytes, the ideal 256 bytes below it, and is never raised. A visitor downloads the controller and one visual.

## 9. Evidence, transparency and stability

- **Decisions are written down.** A new component, a removed one, a changed default: each gets a changeset entry.
- **Accessibility statement.** The docs app publishes which WCAG 2.2 criteria and EN 301 549 clauses are met, which are not, and which assistive technologies were tested for the current release. Update it on every release.
- **Tests encode the rules.** Every rule here that a machine can check has a check in `tests/`, stylelint, ESLint or `scripts/check-*.js`.
- **Tests first (`SR-9`).** Every change to `packages/`, `apps/` or `scripts/` starts with a test that fails without it: a commit `test: …` that is red, then the change that makes it green. A bug fix starts with the test that reproduces it. A change no machine can check (wording, a docs page's prose) says so in its PR. The person or agent who writes the change does not write its test alone: the test is read before the code.
- **Docs per component (`SR-5`).** Every core component and site pattern has its own page with, in this order: a one-line summary, a live example, *Known issues* (always visible; "None known." when empty), and two tabs, **Code** and **Design**, that stack as plain sections without JavaScript. **Code**: *Copy the markup* · *Variants and options* · *How it works* · *Without JavaScript* · *Keyboard and ARIA*. **Design**: *When to use* · *When not to use* · *Do and don't* · *Writing the content* · *Contrast and focus* · *Tokens it uses*. Plus an axe and a keyboard test. *When to use* and *When not to use* are red line 18.
- **Beta.** LUZ is in beta: any release may break anything, always with a changeset that explains how to migrate. It leaves beta when every red line is checked by a tool, the EN 301 549 mapping is published, the public API (`.luz-*` classes, `data-luz-*` hooks, semantic tokens, JS exports) is frozen, the backlog in AGENTS.md is done, and the maintainer considers it stable. From then on, semantic versioning applies strictly: [VERSIONING.md](./VERSIONING.md) says what the public API is, how a deprecation runs, and the checklist for leaving beta.

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
13. **Nothing published or served under a licence other than the repository's (MIT), and MIT only.** It covers every file a package ships and every file the Pages site serves: code, fonts, icons, images, audio, examples. Dual-licensed work is not accepted, even when MIT is one of the options, and neither is OFL or Creative Commons. Third-party MIT work keeps its notice next to it (a font as `LICENSE-<Font>.txt`). Data in the public domain is accepted when its origin is noted next to it and in `dev/LICENSES.md` (the land of the home page's globe, Natural Earth; owner decision D9, 2026-10-16).
14. **No hand edits to `dist/` or `docs/`.**
15. **No new status colour, no new meaning for an existing one.**
16. **No browser sniffing.** Feature detection only.
17. **No artifact over its size ceiling** in budgets.json. Ceilings are never raised: optimise or remove instead.
18. **No component or pattern merged without its docs page, and that page says *When to use* and *When not to use*.**
19. **Nothing only for AI agents.** What LUZ publishes for an agent to read (`llms.txt`, manifests of classes and elements, examples, the "For AI agents" section of a README) is generated from the docs and the source a person reads, never written by hand on the side. An agent and a person always get the same facts.

### Which check covers which red line

Each red line has at least one check that fails when it is broken. The table is kept in step by `tests/red-line-map.test.js`: every line `RL-1` to `RL-18` appears once, and every file it names exists. The last column says what the check does not see.

| Line | Checked by | Not seen by the check |
| --- | --- | --- |
| RL-1 | `eslint.config.js`, `tests/red-lines.test.js` | A dependency loaded from a URL at run time (RL-12 covers the URL) |
| RL-2 | `tests/nojs.spec.js` | Components the spec does not open: it covers every docs page, not every state |
| RL-3 | `eslint.config.js` | A behaviour reimplemented under another name |
| RL-4 | `tests/red-lines.spec.js` | Markup a consumer writes; the check runs on every docs page and the landing page |
| RL-5 | `stylelint.config.js`, `tests/red-lines.spec.js` | A focus ring that is there but drawn too faintly on an unusual surface |
| RL-6 | `tests/red-lines.spec.js` | A state the spec does not list (selected, current, pressed, invalid, disabled are) |
| RL-7 | `scripts/check-contrast.js`, `tests/red-lines.spec.js` | Text over an image or a gradient |
| RL-8 | `stylelint.config.js`, `tests/red-lines.test.js`, `tests/media.spec.js` | An animation started from script |
| RL-9 | `tests/red-lines.spec.js` | Whether a name is *good*: it checks that one exists |
| RL-10 | `stylelint.config.js` | Apps and docs CSS (the rule covers `packages/`) |
| RL-11 | `scripts/stylelint/no-bare-element.js` | Nothing known |
| RL-12 | `eslint.config.js`, `tests/red-lines.test.js`, `tests/red-lines.spec.js` | A request made by a browser extension, or by an embedded `iframe` a consumer adds |
| RL-13 | `scripts/check-pack.js`, `tests/red-lines.test.js` | For now it checks fonts only: code or images copied into the repo without their origin, and the licence text being correct for the file |
| RL-14 | `scripts/check-generated.js` | A hand edit to `dist/`: it is ignored by git and a later build overwrites it, so only `docs/` can be committed edited, and that is what the check compares |
| RL-15 | `tests/red-lines.test.js` | Whether a *new use* of a status colour has the right meaning |
| RL-16 | `eslint.config.js` | Sniffing written through a library: there are none (RL-1) |
| RL-17 | `scripts/check-size.js` | Anything that is not in `budgets.json` |
| RL-18 | `tests/docs-site.test.js`, `tests/docs.spec.js` | Whether the text of *When to use* is true |
| RL-19 | `scripts/check-generated.js`, `scripts/check-ai.js`, `tests/ai-files.test.js` | The first compares `docs/` with a fresh build, the second regenerates the manifests, `llms.txt`, the examples, the README blocks and the agent snapshot and compares bytes, the third checks their facts. Prose only an agent would read is not seen, nor is the meaning of a description |

## Strong rules

Mandatory unless an exception is registered in [EXCEPTIONS.md](./EXCEPTIONS.md).

| Id | Rule | Where |
| --- | --- | --- |
| SR-1 | Sentence case, verb-first buttons, meaningful links, no "OK" or "click here" in LUZ's strings | §4, `pnpm check:strings` |
| SR-2 | No `target="_blank"` without "(opens in new tab)" and `rel="noopener noreferrer"` | §4 |
| SR-3 | No `!important` in `packages/` | §7, stylelint |
| SR-4 | Logical properties instead of physical ones | §5, stylelint |
| SR-5 | A docs page per component with summary, example, known issues and the Code and Design sections, plus an axe and a keyboard test | §9 |
| SR-6 | Manual testing with the four screen reader and browser pairs before a release that changes UI | §1 |
| SR-7 | Text generated by JS comes from the i18n dictionary | §5 |
| SR-8 | Every other rule in sections 1–9 | — |
| SR-9 | Tests first: the failing test is committed before the change that makes it pass | §9 |

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
- [ ] Generated strings come from the i18n dictionary, in the page's language
- [ ] Strings: sentence case, verb-first buttons, meaningful links, visible labels
- [ ] Docs page: summary · example · Known issues · Code (markup, variants, how it works, without JS, keyboard and ARIA) · Design (when to use, when not to use, do and don't, writing the content, contrast and focus, tokens it uses)
- [ ] Failing test committed first (`test: …`), then the change; axe + keyboard tests added and `pnpm test:ui` green
- [ ] `pnpm check:size` and `pnpm check:exceptions` green
- [ ] dist/ regenerated, `check-pack` updated, changeset added
```
