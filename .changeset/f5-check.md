---
"@luz-ds/check": minor
---

New package: `@luz-ds/check`, a command line (`npx @luz-ds/check`, the bin is `luz-check`) that reads the HTML and CSS of a project that uses LUZ and says what is wrong with them, offline. It is a tool for the person who writes the page and for the AI agent that writes it for them: it has no CSS, no layer and no dependency, imports only `node:fs`, `node:path` and `node:url`, and opens no connection. This version has the options `--help` and `--version` and the exit codes 0, 1 and 2; the rules that read your files follow. It needs Node 20 or later and has its own version, apart from tokens, core and site.
