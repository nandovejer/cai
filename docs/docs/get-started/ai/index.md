# Working with AI

What an AI coding agent can read, how to check what it wrote, and the accessibility reviewer you can give it.

### Check what an agent wrote

`npx @luz-ds/check` reads the HTML and CSS of a project, offline, and says which LUZ classes, elements, load order and color tokens are wrong. It reads files and writes nothing.

The files an agent can read are linked from `llms.txt`. The commands with paths, the options and exit codes (`npx @luz-ds/check --help`), a sample of the output, the fields of `--json` and the tables of the files and of the rules are on the page at the URL above.

### What check blocks and what it warns about

Each rule has an id such as `class/unknown`, shown in every finding. A rule that blocks makes the exit code 1.

### The accessibility reviewer

The same package prints an agent definition for an AI coding assistant: a reviewer that reads the source of a page and gives advice on accessibility. Copy it into your project.

The command that copies the reviewer
```bash
npx @luz-ds/check agent > .claude/agents/luz-accessibility-reviewer.md
```

- **It overwrites.** The `>` replaces a file that is already there. Use another path, or put your copy under version control first, if you edited it.
- **It is read-only.** It has three tools, `Read`, `Grep` and `Glob`: it reads, searches and lists files, and writes nothing. Read-only does not mean harmless, because `Read` has no path limit. Read the file before you use it, and review any change to it as you would code.

The other notes on the reviewer are on the page at the URL above.

### What this does not do

A run with no findings says what the checker did not find in the files it read. It is not a test of the page.

- **It does not run a browser.** It reads files, so anything that depends on how a page renders, such as layout, focus order or the colors a browser works out, is not seen.
- **Contrast is measured for your tokens only.** It measures the `--luz-*` colors you set in your own color tokens file. A color written straight into a rule is not measured against anything. How the pairs are read is on [Contrast check](https://nandovejer.github.io/luz/docs/tokens/contrast/).
- **A class built at run time is not seen.** A name put together in a script, such as `"luz-" + name`, or written by a template, is not in the file, so it is not checked.
- **It does not check names, labels, alt text, headings and language.** Whether a button has a name, an image a useful alternative, the headings an order and the page a language is not read, and a run with no findings says nothing about them.
- **It does not replace testing with a screen reader.** No assistive technology is used, by the command or by the reviewer. What has not been tested is listed in [the accessibility statement](https://nandovejer.github.io/luz/docs/accessibility/#h-a11y-not-tested).
- **It does not call a network.** It runs offline, with the data in your `node_modules` or in its own package.
- **Discovery by `llms.txt` is by link.** This site is not at the root of a host, so an agent does not find the file by itself: give it the URL, as the prompt above does.
- **Exit code 0 is not an accessibility result.** It says that no rule above blocks in the files that were read.
- **The messages are in English.** They are not translated, whatever the language of the page.
