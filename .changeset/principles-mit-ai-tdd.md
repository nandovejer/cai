---
"@cai-ds/tokens": patch
---

PRINCIPLES.md changes. Red line 13 now covers everything a package ships or the Pages site serves (code, fonts, icons, images, audio, examples): MIT only, no dual licences, no OFL or Creative Commons. Its check still covers fonts only, as the table says.

New red line 19, "Nothing only for AI agents": what CAI publishes for agents (`llms.txt`, class and element manifests, examples, the "For AI agents" README section) is generated from the docs and the source, never hand-written on the side. It is checked for now by `check-generated`, with the limit stated.

New strong rule SR-9, tests first: every change to `packages/`, `apps/` or `scripts/` starts with a failing `test: …` commit, and the definition of done says so.

The contributor guides (`VANILLA-FIRST.md`, `STRUCTURE.md`, `QUICK-REFERENCE.md`, `DIST-RULES.md`, `TESTING.md`, `BROWSER-REVIEWS.md`) moved from `.claude/` to `dev/`.
