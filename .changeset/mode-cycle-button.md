---
"@cai-ds/core": minor
---

**New:** `cai-mode-switcher` (formerly `cai-theme-switcher`, `cai-theme-btn`, `cai-theme-cycle`) and a cycle variant of the color-mode switcher. Add `cai-mode-switcher--cycle` to the `fieldset.cai-mode-switcher` and `initThemeCycle()` (exported from `@cai-ds/core/theme`, run by `cai.js`) replaces the three radios with one button, or wires the `.cai-mode-cycle` button the markup already has (one `data-mode-icon` icon per mode: the icon of the checked mode shows by CSS, with no flash on load; without scripting the radios show and the button hides). Each press checks the next mode and fires its `change` event, so `initThemeSystem()` or your own script applies it. The button shows the icon of the current mode, is named "Change color mode. Current: …" and a polite status announces the new mode. Without JavaScript the three radios stay as they are.

Each mode can carry an icon: an inline `<svg class="cai-mode-btn__icon" aria-hidden="true">` inside its label, drawn in `currentColor`. Two new strings, `changeMode` and `modeChanged`, ship in English and Spanish.
