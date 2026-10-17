# Testing

How to write and run the tests of LUZ. The rules they enforce are in [PRINCIPLES.md](../PRINCIPLES.md). [How LUZ is built](https://nandovejer.github.io/luz/docs/get-started/how-luz-is-built/#tests-first) says why the test comes first.

## Quick start

```bash
pnpm install
pnpm build                  # dist/ is generated, and the dev server needs it
pnpm test:unit              # Vitest
pnpm exec playwright test --project=chromium --project=chromium-nojs
pnpm check:all              # everything, in order
```

Install the browser once with `pnpm test:ui:install`.

`pnpm check:all` runs `scripts/qa-release.js`. It writes a report to `test-results/qa-release/`. Two flags make it faster:

```bash
pnpm check:all -- --skip-ui   # no Playwright
pnpm check:all -- --fast      # no build and no check:generated (not for a release)
```

## Tests first

Every change to `packages/`, `apps/` or `scripts/` starts with a test that fails without it (PRINCIPLES.md SR-9).

1. Write the test.
2. Run it and see it fail. Read the failure.
3. Commit it on its own: `test: what the change must do`.
4. Write the change. Do not edit the test to get it green.
5. Commit the change.

A bug fix starts with the test that reproduces the bug. In a pull request, CI checks the `test:` commit alone on top of the base and expects it to fail (`scripts/check-red-commit.js`). A change that no machine can check, such as the wording of a page, says so in its pull request.

### Prove the test is red for the right reason

A red test is only useful when it is red because the behaviour is missing. Check the failure message:

- It names the missing behaviour: a value that is not there yet, an element that does not exist yet, a rule that is not enforced yet.
- It is not an import error, a typo in a selector, a wrong URL or a timeout on a page that never loaded.
- It fails in the projects you expect. A no-JS test must fail with JavaScript off.

Then make the check go the other way. Write the smallest version of the change, or the expected value by hand, and see the test turn green. A test that passed before the change tests nothing: tighten it.

Never use `git stash`, `git checkout` or `git clean` to compare with the base in the shared tree. Use `git worktree` or `git show`.

## Which kind of test goes where

| You are testing | Write | File |
| --- | --- | --- |
| Logic, values, a generator, a build script, a page's structure or text read from source | A unit test (Vitest, Node, no browser) | `tests/<name>.test.js` |
| What a browser renders or does: layout, the keyboard, focus, a script, a theme, a viewport | A spec (Playwright) | `tests/<name>.spec.js` |
| The page with JavaScript off | A spec in the no-JS project | see [Without JavaScript](#without-javascript) |
| A page of the docs | A unit test of its structure and figures, and a spec if it behaves | `tests/docs-*.test.js`, `tests/docs-*.spec.js` |
| The look of a component demo | A visual spec | `tests/visual.spec.js` |
| A fixed page to load | A fixture | `tests/fixtures/` |
| A reader shared by several tests | A helper | `tests/helpers/` |

Vitest runs `tests/**/*.test.js`. Playwright runs `tests/**/*.spec.js`. A file with the wrong suffix is not run.

A component or pattern has both: a `.spec.js` for what it renders, the keyboard, the no-JS state and axe, and a `.test.js` for its values. Build the page of the test from a fixture in `tests/fixtures/` or from the docs page's demo. Docs pages and routes are found by `tests/helpers/docs-site.js`, so a new page is tested without editing a list.

The helpers you will meet:

| Helper | What it gives you |
| --- | --- |
| `design-tokens.js` | `contrast`, `formatRatio`, `resolveColor`, `tokensUsedBy`, `familyOf`, `evalLength`: figures computed from the sources |
| `html-dom.js` | A small element tree of a page, for unit tests of generated HTML (no jsdom) |
| `page-facts.js` | A docs page without its front matter: sections, tables, links |
| `docs-site.js` | The docs routes, and `routeOf(id)` to find a page by an id on it |
| `package-areas.js` | The docs area of each package of patterns |
| `known-tokens.js` | Every `--luz-*` token the sources declare |
| `scale-golden.js` | The type and space scales as literals. A deliberate change edits it and carries a changeset |
| `obscured.js` | `focusAndHitTest` and `ringBeyondInlineStart` |
| `settle.js` | `settled` and `faded`: wait until the page has stopped animating |
| `pixels.js` | Pixels of a screenshot, read in the page |
| `site-lights.js`, `site-loader.js` | The six lights of the site, and the loader's idle and network triggers |
| `check-*.js` | The harness for the rules of `@luz-ds/check` |

Read the head of a helper before you write another one.

## Run the tests

Run one file, then one test, then both projects:

```bash
pnpm test:unit tests/docs-design.test.js
pnpm test:unit tests/docs-design.test.js -t "covers the 57 pages"

pnpm exec playwright test tests/navbar.spec.js --project=chromium
pnpm exec playwright test tests/navbar.spec.js -g "Escape" --project=chromium
pnpm exec playwright test tests/navbar.spec.js --project=chromium --project=chromium-nojs
```

Playwright starts the dev server itself (`pnpm dev`) and reuses one that is already running on port 5173. Run `pnpm build` first. `pnpm dev` builds `dist/` when a package has none, but it does not notice a stale one.

To see what happened:

```bash
pnpm exec playwright test tests/navbar.spec.js --project=chromium --headed
pnpm exec playwright test tests/navbar.spec.js --project=chromium --ui
pnpm exec playwright show-report
```

Always pass `--project=chromium --project=chromium-nojs` (or one of them). Without `--project`, `pnpm test:ui` also runs the `firefox` and `webkit` projects, which are not for everyday work: see [What is not in check:all](#what-is-not-in-checkall).

## Without JavaScript

PRINCIPLES.md red line 2: every page is usable with JavaScript off. The `chromium-nojs` project in `playwright.config.js` runs with `javaScriptEnabled: false`. It runs only the files in its `testMatch` list.

- `tests/nojs.spec.js` runs only in `chromium-nojs`. It visits every page and says what must still work.
- To run your spec in both projects, add `'**/<name>.spec.js'` to the `testMatch` of `chromium-nojs`. The `chromium` project runs the same file with JavaScript on.
- A spec in both projects that needs JavaScript skips itself:

```js
test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');
```

- A spec that is not in the list runs in `chromium` only. When it has a no-JS part, set it in the file, for one `describe`:

```js
test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  // …
});
```

## Accessibility

`tests/a11y.spec.js` runs axe on every page of the docs, the home page in each language and the 404 page, in three modes: `light`, `dark` and `high-contrast`. The component pages run again with the Design tab open, because axe skips hidden content. A serious or critical violation fails the test. Moderate and minor ones are attached to the report.

A spec that scans one fixture does the same:

```js
import AxeBuilder from '@axe-core/playwright';
import { faded } from './helpers/settle.js';

await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode);
await faded(page);   // the page fades between modes; axe would read a colour half way
const { violations } = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
```

Axe finds about a third of the problems. Test the rest yourself in the spec: the keyboard (Tab order, Escape, Enter, Space, arrow keys), the focus ring, a viewport of 320 px with no sideways scroll, forced colours (`page.emulateMedia({ forcedColors: 'active' })`) and reduced motion.

### Hit test and obscured focus

WCAG 2.4.11: a focused control is not hidden by a sticky bar or rail. `tests/helpers/obscured.js` makes the test a pointer would make:

```js
import { focusAndHitTest, ringBeyondInlineStart } from './helpers/obscured.js';

const result = await focusAndHitTest(page.locator('.luz-copy-btn'));
expect(result.focused).toBe(true);
expect(result.covered, 'what is drawn over the control').toEqual([]);
```

- `focusAndHitTest(locator, { ends })` focuses the element, then asks `elementFromPoint` at its centre and 3 px inside both ends. `{ ends: false }` tests the centre only.
- `ringBeyondInlineStart(page)` reports how much of the focus ring a clipping ancestor hides. Focus the element with the keyboard first, then expect `hidden` to be 0 or less.

### Reduced motion and scroll checks

Core sets `scroll-behavior: smooth`, except under `prefers-reduced-motion`. A test that scrolls and then reads a position can read it half way. Do one of these:

```js
await page.emulateMedia({ reducedMotion: 'reduce' });   // before the check
await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
```

Then wait for the page to stop moving with `settled(page)` or `faded(page)`. Do not use `waitForTimeout` as the wait.

## Docs tests: never type a ratio

The pages of the docs state ratios, values and token lists. A test recomputes each one from the source and fails on drift. When you write a page, compute the figure with `tests/helpers/design-tokens.js`; never type it.

```js
import { contrast, formatRatio, tokensUsedBy, familyOf } from './helpers/design-tokens.js';

formatRatio(contrast('dark', 'text-muted', 'surface'));   // a mode, a colour and what it sits on
tokensUsedBy(page);          // the --luz-* tokens a component's own CSS reads, for a docs page
familyOf('--luz-text-muted'); // [label, route] of the token page that documents it
```

`tests/docs-design.test.js` checks the Design tab of every component and pattern page. `tests/docs-site.test.js` checks the structure of the page. If a token changes, the page that states it fails with the page and the row: update the page, not the test.

## Size budgets

`budgets.json` holds the ceiling of every built file (minified, then gzipped). It is a red line: never raise a ceiling. If a file does not fit, make it smaller or remove something.

```bash
pnpm build
pnpm check:size
```

`check:size` also fails when `budgets.json` and the table in PRINCIPLES.md §8 disagree. A new file gets a new row in both, never a higher number.

## The generated site

Some files are made by a build and are never edited by hand. Two checks keep them honest. Run `pnpm build` first.

```bash
pnpm check:generated   # docs/ (the Pages site) against a fresh build
pnpm check:ai          # manifests, llms.txt, examples and READMEs against their generators
```

- `check:generated` builds the site again into a temporary folder and compares it, file by file, with `docs/`. It fails on a hand edit, or on a change to `apps/` or `packages/` that was not followed by a rebuild. Fix it with `pnpm pages:build`, then commit `docs/`.
- `check:ai` regenerates the files for AI agents in memory and compares bytes. It fails with one line per stale file and what to run.

`dist/` is not committed; do not edit it.

## Flaky or real

A test that fails is real until you show it is not. Run it alone, on one worker:

```bash
pnpm exec playwright test tests/navbar.spec.js -g "Escape" --project=chromium --workers=1 --repeat-each=5
```

- It fails every time: the failure is real. Fix the code or the test.
- It passes alone and fails in the full run: look for shared state, a timing assumption (an animation, a theme fade, a lazy chunk) or a port. Wait for the state you need (`settled`, `faded`, `expect(…).toBeVisible()`), not for time.
- Do not add retries, widen a tolerance or skip the test to hide it. CI retries twice only so that a bad run shows up as flaky in the report.

Visual snapshots (`tests/visual.spec.js`) are Chromium on Linux only. Look at each changed PNG before you commit it. Make new ones with `--update-snapshots`.

## Linting and builds

```bash
pnpm lint:css     # stylelint: packages/ and apps/
pnpm lint:js      # ESLint: packages/, apps/, scripts/ and tests/
pnpm build        # tokens, core, site, landing, cms, app, docs and check
pnpm pages:build  # build, then the Pages site into docs/
```

## What `check:all` runs

In this order. A failed step does not stop the next one.

1. `pnpm build` (not with `--fast`)
2. `pnpm lint:css`
3. `pnpm lint:js`
4. `pnpm check:size`
5. `pnpm check:strings`
6. `pnpm check:exceptions`
7. `pnpm check:license`
8. `pnpm check:pack`
9. `pnpm check:contrast`
10. `pnpm check:generated` (not with `--fast`)
11. `pnpm check:ai`
12. `pnpm test:unit`
13. Playwright, `chromium` and `chromium-nojs` (not with `--skip-ui`)

After a deliberate change to what a package ships, run `node scripts/check-pack.js --update`.

## What is not in check:all

- **The `firefox` and `webkit` Playwright projects.** The maintainer runs them before a release, through the `firefox-reviewer` and `safari-reviewer` agents. Do not run them for everyday work.
- **The Safari and Firefox reviews.** What has not been reviewed yet is in the "Open" section of [BROWSER-REVIEWS.md](./BROWSER-REVIEWS.md), one row for each `needs-browser-review` issue. When you change CSS, HTML or JS that those browsers have not seen, add a row. To help, pick an issue with that label, test the files it names and write what you see. A row is closed only when both browsers have reviewed it.
- **Assistive technology.** NVDA, VoiceOver, TalkBack and Orca are tested by hand before a release (SR-6). Use `tests/manual/SR-6-evidence-template.md`, and state only the combinations you tested.

## A native dialog

Use a native `<dialog>` opened with `showModal()`. The browser traps focus, closes on Escape, makes the page behind inert and returns focus to the opener. Do not write a focus trap, and do not test the browser: test that your markup opens and closes it.

```html
<button type="button" commandfor="my-dialog" command="show-modal">Open dialog</button>

<dialog class="luz-modal" id="my-dialog" aria-labelledby="my-dialog-title">
  <h2 id="my-dialog-title">Delete this draft</h2>
  <p>This cannot be undone.</p>
  <button type="button" commandfor="my-dialog" command="close">Cancel</button>
  <button type="button" commandfor="my-dialog" command="close">Delete draft</button>
</dialog>
```

`initModals()` only supplies the two commands in browsers that do not implement them yet.

## Troubleshooting

- **The dev server starts slowly, or serves old code.** `pnpm dev` runs `scripts/check-dist.js`, which builds only when a `dist/` is missing. Run `pnpm build` after you change a package.
- **Port 5173 is in use.** Stop the other server. Playwright reuses one that is already running.
- **`Cannot find module` or `ENOENT … playwright`.** Run `pnpm install`.
- **A browser is missing.** Run `pnpm test:ui:install`.
