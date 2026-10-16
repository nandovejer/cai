# Contributing to LUZ

LUZ is open source and welcomes contributions of every size. Be kind: the [Code of Conduct](./CODE_OF_CONDUCT.md) applies everywhere in the project.

## Use or contribute

| I want to | How |
| --- | --- |
| Use it | LUZ is MIT: no registration, no telemetry. Install the packages from npm or load them from a CDN ([Get started](https://nandovejer.github.io/luz/docs/get-started/)). |
| Copy it | Copy any markup, style or script you need, and keep the MIT notice with it. |
| Fork it | MIT lets you fork, rename and ship it. Keep the notice and say what you changed. |
| Report a bug | [Open an issue](../../issues/new/choose) with the bug or accessibility form. A security problem goes private: see [SECURITY.md](./SECURITY.md). |
| Propose a change | Start in [Discussions](../../discussions) with the proposal form: the problem, who it affects, and what the platform already does. |
| Send a pull request | Commit a failing `test:` first, then the change that makes it pass. Run `pnpm check:all`. |
| Add a language | One JSON file of strings, never JavaScript, checked by a reader of the language ([the recipe](./AGENTS.md#adding-a-language-to-cores-scripts)). |
| Review in Safari/Firefox | Pick an issue labelled `needs-browser-review`, test the files it names and write what you see. |

## Licence

By opening a pull request you license your work under the MIT licence, the same as the project: inbound = outbound. If it includes code you did not write, say where it comes from and under which licence. Only MIT work is accepted: no dual licences, no other licence. AI-written code is welcome if you can explain every line of it and it passes the same checks.

## Report a bug

1. Search the [existing issues](../../issues) first.
2. Use the bug form, or the accessibility form when someone cannot use, perceive or understand something.
3. Give the browser and operating system, the steps to reproduce, what you expected and what happened.

## Propose a change

Proposals go to Discussions, work to the public Project. Say what problem you have, who else has it, and what plain HTML, CSS or the browser already do about it. What a new component has to be, and what we do not accept, is in [dev/DEFINITION-OF-DONE.md](./dev/DEFINITION-OF-DONE.md).

## Send a pull request

1. Fork the repository and make a branch.
2. Write the test first and commit it on its own: `test: what the change must do`. It must fail without your change. A bug fix starts with the test that reproduces it.
3. Make the change that turns it green. Do not edit `dist/` or `docs/` by hand: rebuild them.
4. Run `pnpm check:all`. It runs every check; fix what it reports.
5. Add a changeset with `pnpm changeset` when you change a published package.
6. Open the pull request and tick the boxes of its template. A red line crossed closes it.

Read [PRINCIPLES.md](./PRINCIPLES.md) for the rules and [AGENTS.md](./AGENTS.md) for the architecture. The details are in:

- [dev/TESTING.md](./dev/TESTING.md): how to test, and the accessibility checks.
- [dev/DEFINITION-OF-DONE.md](./dev/DEFINITION-OF-DONE.md): what a component, a token and a docs page need before they merge.
- [VERSIONING.md](./VERSIONING.md): versions, releases and what is supported.

## Questions

Ask in [Discussions](../../discussions). Thank you for helping.
