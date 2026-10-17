# Color mode switcher

Lets readers choose light, dark or high contrast: radios that work without JavaScript, or one button that cycles.

### Known issues
A stored color mode can flash once on load: `initThemeSystem()` is a deferred module and runs after the first paint, and LUZ ships no script for the `<head>`, by design. This site sets the mode before the first paint with a small script of its own.

### Copy the markup
Radio group markup
```html
<fieldset class="luz-mode-switcher">
  <legend class="luz-mode-switcher__label">Color mode</legend>
  <label class="luz-mode-btn" data-theme="light"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="light" checked>Light</label>
  <label class="luz-mode-btn" data-theme="dark"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="dark">Dark</label>
  <label class="luz-mode-btn" data-theme="high-contrast"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="high-contrast">High contrast</label>
</fieldset>
```

The cycle variant: the same radios, an icon in each label, and a button with one icon per mode.

Cycle variant markup
```html
<fieldset class="luz-mode-switcher luz-mode-switcher--cycle">
  <legend class="luz-mode-switcher__label">Color mode</legend>
  <button class="luz-mode-cycle" type="button" aria-label="Change color mode">
    <svg class="luz-mode-btn__icon" data-mode-icon="light" viewBox="0 0 24 24" aria-hidden="true">…</svg>
    <!-- the same for data-mode-icon="dark" and "high-contrast" -->
  </button>
  <span class="luz-mode-cycle__status" role="status"></span>
  <label class="luz-mode-btn" data-theme="light">
    <input class="luz-mode-btn__input" type="radio" name="luz-theme" value="light" checked>
    <svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>
    Light
  </label>
  <!-- the same for dark and high-contrast -->
</fieldset>
```

Mode script code
```js
import { initThemeSystem, initThemeCycle } from "@luz-ds/core/theme";
initThemeSystem();
initThemeCycle();
```

### Variants and options
- `.luz-mode-switcher`: The radio group, as a row of buttons; the checked one is filled
- `.luz-mode-switcher--cycle`: One button instead of the radios, when scripting is on
- `.luz-mode-cycle`: The cycle button; shows the icon whose `data-mode-icon` matches the checked radio
- `.luz-mode-cycle__status`: A hidden live region for the new mode; added by the script if missing
- `name="luz-theme"`: The radio name the tokens and `theme.js` listen to

### How it works
A native radio group, styled by `components/mode-switcher.css`. The radios are the control and the source of truth.

- The tokens re-scope the page from the checked radio with `:root:has()`, so choosing a mode works with no script.
- `initThemeSystem()` from `theme.js` sets `data-theme` on `<html>`, and stores the choice under `luz-theme` in `localStorage`. It starts from the attribute on `<html>`, light if there is none: [to start from the system's setting](https://nandovejer.github.io/luz/docs/tokens/modes/#system), set the attribute before it runs.
- `initThemeCycle()` turns each `--cycle` group into one button. Each press checks the next mode and fires its `change` event, so whatever listens to the radios applies it. It adds the button if the markup has none.
- A look of your own ([make one](https://nandovejer.github.io/luz/docs/tokens/themes/)) joins the choice when its name is listed in `data-luz-themes` on `<html>`: a stored value is accepted only for the three modes and for those names.
- `luz.js` runs both.
- To add an Auto choice that follows the system setting or the time of day, wrap the radios, with a fourth one for it, in [`<luz-mode>`](https://nandovejer.github.io/luz/docs/site/mode/) from `@luz-ds/site`.

### Without JavaScript
The three radios show, even in the cycle variant, and choosing one changes the mode of the page. The choice is not remembered on the next page.

### Keyboard and ARIA
Radios: Tab reaches the group, the arrow keys choose a mode.

- The cycle button: Tab reaches it, Enter or Space moves to the next mode.
- Its name says what it does and the current mode: "Change color mode. Current: Dark".
- A polite status announces the new mode: "Color mode: Dark".

### When to use
Offer a color mode switcher on every page of a site, in the same place, so readers can pick the mode they read best in.

- The radio group where there is room, such as a settings page or a sidebar footer.
- The cycle variant where space is short, such as a header or a page footer.

### When not to use
Do not use the cycle variant where readers compare the modes: the radio group shows all three at once.

- Do not hide it on a settings page only: a reader who cannot read the page cannot find the setting.
