---
"@luz-ds/core": patch
"@luz-ds/site": patch
"@luz-ds/check": patch
---

Fixes from the Safari and Firefox reviews. An import map with an `integrity` section is the way to check every lazy chunk in all three engines: `integrity` on a `modulepreload` link is not a guard in Safari and Firefox, only a performance hint, and the "Choose your snippet" page and SECURITY.md now say so and give the map. In Safari, focusing a text field with Tab no longer leaves it under the cookie band: `<luz-consent>` scrolls it back above the band. The timeline's Pause / Play button is no longer rewritten when its text has not changed, so a click on it is not lost in Safari. The site loader starts its idle chunks (search, cookie banner) after the `load` event, so they no longer delay it in Firefox.
