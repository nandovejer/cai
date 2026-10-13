---
"@cai-ds/tokens": patch
"@cai-ds/core": patch
"@cai-ds/platform": patch
---

**Docs and text (no change to CSS or JavaScript)**

- The root `README.md` is for the person who installs CAI first (what to install, what to load, the real exports, the modules `theme`, `sidebar`, `clipboard`, `modal`, `highlight`, `player`, `tabs`, `utils`, `i18n` and `midi`), and the monorepo, release and agent notes are in one section at the end. It no longer lists `toggle`, says every component is on the home page, calls `platform.js` reserved or names a contrast gap that the checks do not find; it explains the name, Consistent Adaptive Identity, in one sentence.
- The bundler snippets of the `core` and `platform` READMEs import `@cai-ds/…/css` for the stylesheets: `@cai-ds/core` and `@cai-ds/platform` alone are the scripts. The platform README gives the placeholder file widths as they are (360, 720 and 1080 for `9x16`) and lists the language switcher.
- Get started: "How CAI is organised" gains "What each package needs", a table of every piece with its package and the name of CAI in one line; "Print styles" says that `cai.css` has no switch and what to do instead; the minimal page has its `<form>`. The footer of the `o-shell` snippet is a plain `<footer>`, which needs no platform.
- Platform: "Page templates" adds the blocks of an event page (hero with an image, programme, ticket plans, call to action, registration form), each with a Copy button, and a list of what CAI does not have for such a page.
- The home page no longer says "Accessible by default" (nor "accessible" in its title and description) in English, Spanish or Arabic: the accessibility statement says no assistive technology has been used to test this release, so the text says "built for accessibility" and links to it. The Spanish text is rewritten to read as Spanish.
- The accessibility statement drops the "Home page form" known issue (the home page has no form); the 404 page no longer says the docs moved in version 3.
