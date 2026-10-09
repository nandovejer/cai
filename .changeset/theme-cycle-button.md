---
"@cai-ds/core": minor
---

**New:** a cycle variant of the color-mode switcher. Add `cai-theme-switcher--cycle` to the `fieldset.cai-theme-switcher` and `initThemeCycle()` (exported from `@cai-ds/core/theme`, run by `cai.js`) replaces the three radios with one button. Each press checks the next mode and fires its `change` event, so `initThemeSystem()` or your own script applies it. The button shows the icon of the current mode, is named "Change color mode. Current: …" and a polite status announces the new mode. Without JavaScript the three radios stay as they are.

Each mode can carry an icon: an inline `<svg class="cai-theme-btn__icon" aria-hidden="true">` inside its label, drawn in `currentColor`. Two new strings, `changeMode` and `modeChanged`, ship in English and Spanish.
