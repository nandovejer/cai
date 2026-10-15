# @luz-ds/check

A command line that reads the HTML and CSS of a project that uses LUZ and says what is wrong with them, offline. It is for the person who writes the page and for the AI agent that writes it for them. It is a tool, not a stylesheet: it loads nothing in a page.

> **Beta, version 0.x.** This package has its own version, apart from tokens, core and site. Pin an exact version and read the changelog before you upgrade.

## Usage

```bash
npx @luz-ds/check --help
npx @luz-ds/check index.html css/site.css
npx @luz-ds/check src --json
```

Say `npx @luz-ds/check`, with the scope. The bare name `luz-check` is the command the package installs, not the name to run with `npx`.

A path is a file, a folder (read recursively: `.html`, `.htm` and `.css`) or a quoted glob such as `"src/**/*.html"`; with no path it reads the current folder. `--ext .astro,.vue` reads those extensions as HTML, `--json` prints the report as JSON, `--strict` fails on a warning too, and `--config <file>` reads a configuration other than `luz-check.json`.

The rules are in this version. They find a class or an element that LUZ does not have (`class/unknown`, `element/unknown`), a stylesheet that is not loaded or is loaded in the wrong order (`load/package-missing`, `load/order`), a class on an element it does not belong on (`misuse/host-element`) and, in a theme file, a colour pair that is below its contrast minimum (`theme/contrast`). A file it cannot read as HTML or CSS is reported as `parse/error`, and one it did not read as `file/skipped`: a link, a file over 1 MiB, one it may not open. A rule either blocks, and the exit code is 1, or warns. Every rule, what it finds and whether it blocks is listed on [Working with AI](https://nandovejer.github.io/luz/docs/get-started/ai/#rules). The command never follows a link and never quotes your files.

| Exit code | Meaning |
| --- | --- |
| 0 | nothing blocks |
| 1 | at least one finding blocks (with `--strict`, any warning) |
| 2 | the command was used wrongly, a configuration cannot be read, or there is nothing to read |

It reads source files only. It does not check names, labels, alt text, headings or the language of a page, and a run with no findings says nothing about them.

## The accessibility reviewer

`agent` prints an agent definition for a project that uses an AI coding assistant: a read-only accessibility reviewer (it can read, search and list files, and write nothing) for WCAG 2.2 level AA and EN 301 549. It reads source files, so it gives advice from reading code, not test results. Copy it into your project:

```bash
npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md
```

The `>` overwrites a file that is already there: use another path, or check the file in first, if you edited your copy. The copy is yours to read before you use it, and anyone who can write to your project can change it.

The same file is in the package as the export `@luz-ds/check/agents/accessibility.md`, for a build step that copies it. A folder named `agent` in your project is still read as a path: write `./agent`.

## Requirements

It needs Node 20 or later and nothing else: no dependency, no network, no environment variable, no script on install. It reads files and writes to the terminal only.

<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/check` 0.0.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

Not released yet: 0.0.0 is the workspace's placeholder; the first release is 0.1.0. Nothing is deprecated and nothing breaks.

### Read first

1. `README.md` in this package: what the command does and its exit codes.
2. `npx @luz-ds/check --help`: the command's options, from the version you run.
3. https://nandovejer.github.io/luz/llms.txt: the index of the documentation, short enough for a small context.
4. https://nandovejer.github.io/luz/llms-full.txt: the same pages in full.
5. https://nandovejer.github.io/luz/examples/: one standalone page of markup for each component and pattern.

### Load order

`@luz-ds/check` is a command, not a stylesheet: it loads nothing in a page and needs no other LUZ package.

### Check what you write

Run `npx @luz-ds/check <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md`.

`@luz-ds/check` is not on npm yet: it ships with the first release.

<!-- luz:ai-agents:end -->

## License

MIT
