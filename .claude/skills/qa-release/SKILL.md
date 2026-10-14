---
name: qa-release
description: Run the LUZ release QA checklist: lint, size/strings/exceptions/pack/contrast checks, unit tests and Playwright (chromium and chromium-nojs), then write an evidence report and list what needs manual or browser review. Use before a release or when asked for "QA", "release check" or "evidence". Never runs firefox or webkit.
---

# QA release

Runs the same gates as CI plus the Playwright suites, and writes an evidence report. It decides nothing about browsers or assistive technology: it lists them.

## Do

1. **Run the runner** from the repo root (it takes several minutes; run it in the background and wait):

   ```bash
   node scripts/qa-release.js            # full, for a release
   node scripts/qa-release.js --fast     # packages already built: no build, no check:generated
   node scripts/qa-release.js --skip-ui  # no Playwright
   ```

   It runs, in order: `pnpm build`, `lint:css`, `lint:js`, `check:size`, `check:strings`, `check:exceptions`, `check:pack`, `check:contrast`, `check:generated`, `test:unit`, and Playwright with `--project=chromium --project=chromium-nojs` (3 workers: more can overload the dev server and give false failures).

2. **Read the report**, `test-results/qa-release/report-<timestamp>.md`. Do not paste the whole file back: give the owner the table and the list of failures.

3. **On a failure**, re-run only that step to tell a real failure from a load failure (a Playwright test that fails under load and passes alone is flaky: say so, do not hide it). Fix real failures, or say what blocks them. Never raise a ceiling in `budgets.json` and never update a visual snapshot to make the suite pass.

4. **Close with the manual list**, from the report's "Needs a person" section:
   - the open rows of the pending list in Claude's memory (`luz-browser-review-pending.md`): the security audit gives no OK while one is open (OWNER.md §4);
   - the components changed since the last tag, which need SR-6 testing: one `tests/manual/SR-6-evidence-template.md` copy each;
   - changesets waiting, uncommitted changes, changed snapshots.

## Never

- Run the `firefox` or `webkit` Playwright projects, or launch `firefox-reviewer` or `safari-reviewer`. Report the open rows of the pending list as blocking and ask the owner for permission (OWNER.md §3); do not add rows yourself, `frontend-engineer` does.
- Say a release is ready. Say which steps passed, which failed, and what still needs a person.

## Also useful

- `node scripts/smoke-consumer.js` packs the three packages, installs them in an empty project and loads a page from the installed files and from jsDelivr-style paths, offline.
- `pnpm exec playwright test tests/visual.spec.js --project=chromium` is the visual regression of the component demos; `--update-snapshots` only for an intended change, and look at every changed PNG.
