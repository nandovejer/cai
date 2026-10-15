---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
"@luz-ds/site": minor
"@luz-ds/landing": minor
"@luz-ds/cms": minor
"@luz-ds/app": minor
"@luz-ds/check": patch
---

Every package now exports `./classes.json`, the classes, custom properties and `data-luz-*` hooks its CSS and script define, and core and site also export `./custom-elements.json`, their custom elements with the attributes each one reads, for editors and AI agents. Both are generated from the built `dist/`, and the Pages site serves a copy of each under `/manifests/<package>/`, beside `llms.txt`, `llms-full.txt` and one example page per component. `pnpm check:ai` regenerates all of them and fails when a file on disk is stale. `luz-check` carries a snapshot of these manifests. No runtime or style change.
