---
"@luz-ds/core": minor
"@luz-ds/check": patch
---

English stays in the entry; every other language LUZ ships is a lazy file, fetched only for the pages that declare it. `loadLocales()` is new, and `luz.js` calls it at boot, so a page with `<html lang="es">` makes one request for `i18n-es.min.js` and a page in English makes none. A language is a JSON file, `packages/core/src/i18n/<code>.json`, that the build validates and writes as `dist/i18n-<code>.js`; it is published as `@luz-ds/core/i18n/<code>`. The dictionary has two more keys, `previous` and `next`. `initTabs()`, `initCopyButtons()`, `initThemeSystem()` and `initThemeCycle()` take a `defer` flag that leaves `data-luz-js` and the strings to a later call.

Breaking: `@luz-ds/core/i18n` and the standalone modules (`/highlight`, `/player`, `/theme`, `/clipboard`) no longer carry Spanish. Before `initHighlight()`, `initPlayers()` and `initThemeCycle()` on a page that is not in English, call `await loadLocales()` from `@luz-ds/core/i18n`, or `registerLocale("es", …)` with your own strings. The `luz.js` entry does it for you.
