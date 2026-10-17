# How LUZ is built

Three promises behind every release: it is made for people first and readable by AI agents, every change starts with a failing test, and nothing runs in your page that you did not load.

### Human-first, AI-ready

LUZ is made for the person who uses the page. It starts from native HTML, works with a keyboard and with JavaScript off, and aims for WCAG 2.2 level AA in three color modes.

Plain HTML and CSS with a closed list of class names is also easy for an AI agent to get right. The site publishes the list of names, and a command checks what the agent wrote. [Working with AI](https://nandovejer.github.io/luz/docs/get-started/ai/) has the files and the prompt.

### Tests first

Every change starts with a failing test. The test says what the change must do, and it exists before the change does.

The loop has two steps:

1. Commit a `test:` commit. The test must fail without the change, and it must fail for the right reason: the missing behaviour, not a typo in the test.
2. Commit the change that makes it pass. Nobody weakens a test to get it green.

A bug fix starts with the test that reproduces the bug. The test is read before the code.

The tests are of several kinds:

- **Unit tests**, with Vitest, for logic and values.
- **Browser tests**, with Playwright in Chromium, once with JavaScript and once without. They cover behaviour, the keyboard and the state of a page when the script does not run.
- **Accessibility tests.** axe scans every page in the light, dark and high contrast modes. A serious or critical problem fails the build.
- **Docs tests.** The contrast ratios and token lists on the docs pages are computed from the CSS and recomputed by a test, so they cannot drift from the code.
- **Size budgets.** A file that grows past its ceiling fails, and nobody raises a ceiling.
- **Checks** on the shipped strings, the licences and the contents of each package.

One command, `pnpm check:all`, runs all of them.

Safari and Firefox are not in that command. People review them before a release, and the open reviews are public.

The rules those checks enforce are in [PRINCIPLES.md](https://github.com/nandovejer/luz/blob/main/PRINCIPLES.md), and [TESTING.md](https://github.com/nandovejer/luz/blob/main/dev/TESTING.md) says how to write the test.

### Zero dependencies

The packages have no runtime dependency. They ship plain CSS and small ES modules that need no build step, and they use the browser's own elements and APIs before any script.

Size budgets are a red line: a check fails when a file grows past its ceiling, and nobody raises a ceiling to make it pass. Everything LUZ ships is under the MIT licence, and only the MIT licence. [Get started](https://nandovejer.github.io/luz/docs/get-started/) shows how to load it.
