---
"@luz-ds/core": minor
"@luz-ds/site": minor
---

Each package that ships a tag now ships `dist/custom-elements.json`, a Custom Elements Manifest (schema 2.1.0) for editors and AI agents: core describes `<luz-timeline>`; site describes `<luz-search>`, `<luz-consent>` and the CSS-only `<luz-lang-switch>`, `<luz-submenu>` and `<luz-banner>`, with their attributes, events and the docs page of each. It is exported as `./custom-elements.json` and named in the `customElements` field of `package.json`. It is generated from `@element`, `@attr` and `@fires` lines in the header comment of each source file, and the build fails when they and the code disagree. No runtime or style change.
