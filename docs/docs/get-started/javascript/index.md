# JavaScript modules

What each optional script adds, how to load only the one you need, and what a page does without them.

Every LUZ page works without JavaScript. The scripts add behaviour on top: copying, highlighting, a cycling color mode button, scroll spy, players, tabs, sorting a table and a timeline.

### Load all of it, or one module

All modules markup
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"></script>
```

One module code
```js
import { initTabs } from "@luz-ds/core/tabs";
initTabs();
```

- `luz.js` starts every module when the page loads.
- Importing a single module does nothing until you call its `init` function.
- `midi.js`, `table-sort.js` and `timeline.js` are chunks of their own: `luz.js` loads each one on demand, and only on a page that needs it.
- The site search is in `@luz-ds/site`: see [Search](https://nandovejer.github.io/luz/docs/site/search/). So is the cookie banner, a module of its own that `site.js` does not include: see [Cookie consent](https://nandovejer.github.io/luz/docs/site/consent/). The Auto color mode is a third module of the same kind, `mode.js`, loaded by `site.js` only on a page with a `<luz-mode>`: see [Auto color mode](https://nandovejer.github.io/luz/docs/site/mode/).

### The modules

**All 13 JavaScript modules**

#### Languages and the strings scripts write

English is in the entry. Every other language LUZ ships is a small file, fetched at start for a page whose `<html lang>`, or any `lang` outside a link or an option, names it; a page in English makes no request.

With the individual modules, call `loadLocales()` yourself, and `await loadLocales()` before `initHighlight()`, `initPlayers()` and `initThemeCycle()`. A file that cannot load is one console warning, and English.

For a language LUZ does not ship, set `data-luz-label-*` once on `<html>` or `<body>`, or call `registerLocale()` before the scripts start.

To check the file, put an import map with an `integrity` section for it before the first module script, on the pages in that language only. A `modulepreload` link with `integrity` is not a guard in Safari or Firefox: use it as a performance hint.

A language for LUZ is a pull request: the JSON file `packages/core/src/i18n/<code>.json`, one line in the `files` map of `i18n.js` and a budget row. The steps are in AGENTS.md.

### Without JavaScript

What each behaviour falls back to when the script does not run:

- [Tabs](https://nandovejer.github.io/luz/docs/components/tabs/): Links, and every panel stacked
- [Color mode switcher](https://nandovejer.github.io/luz/docs/components/mode-switcher/): Three radios that still change the mode; not remembered
- [Auto color mode](https://nandovejer.github.io/luz/docs/site/mode/): The four radios still change the mode; Auto is light, and neither the system nor the clock is followed
- [Copy button](https://nandovejer.github.io/luz/docs/components/copy-button/): Hidden; the text stays selectable
- [Player](https://nandovejer.github.io/luz/docs/components/player/): The browser's own media controls; MIDI shows its fallback text
- [Modal](https://nandovejer.github.io/luz/docs/components/modal/): Opens where the browser supports `command`; elsewhere the open button does nothing
- [Code](https://nandovejer.github.io/luz/docs/components/code/): Plain text, no colours
- [Table](https://nandovejer.github.io/luz/docs/components/table/): A heading with a link sorts on the server; a plain heading is not sortable. Rows are never hidden
- [Timeline](https://nandovejer.github.io/luz/docs/components/timeline/): An ordered list with a line and a dot per item; every item is visible
- [Sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/): Works, drawer included; the current link does not follow the scroll
- [Table of contents](https://nandovejer.github.io/luz/docs/cms/toc/) and other `data-luz-spy` lists: Links to the sections; no link is marked as the one in view
