# Color modes and themes

Switch between light, dark and high contrast with one attribute, or make a look of your own.

Same markup, one attribute. Set `data-theme` on `<html>`, or on any element to scope a mode to it.

### Modes and themes

A color mode changes how light or dark the page is; a theme changes its whole identity. LUZ ships one look, in three modes. A theme of your own sits on top of it.

- The three modes ship with the tokens: `data-theme="light"`, `"dark"` and `"high-contrast"`. Light is the default, whatever the device's setting: [follow it with one script](https://nandovejer.github.io/luz/docs/tokens/modes/#system).
- The default look is Vejer, inspired by Vejer de la Frontera. It is the value the tokens have, not a file you load: ET Book for running text and headings, whitewash and sandstone surfaces, iron-black text, sky-blue links and actions, and every link underlined.
- LUZ ships no theme file. [Make your own](https://nandovejer.github.io/luz/docs/tokens/themes/): copy the template, change what you need, and check it.

Mode examples
```html
<html data-theme="dark">
<html data-theme="high-contrast">
<html data-theme="my-brand" data-mode="dark">
```

Every mode is measured against the same minimums: 4.5:1 for text, 3:1 for disabled text, borders and focus rings. The same measure runs on a theme of your own with `npx @luz-ds/tokens check-contrast`, or in the browser with [the contrast check](https://nandovejer.github.io/luz/docs/tokens/contrast/).

### Following the system or the clock

A page is light until it says otherwise: LUZ reads nothing of the visitor's device by itself. To start in dark when the device is in dark, set the attribute from a script in the head.

Following the system color mode
```html
<script>
  (function () {
    var mode;
    try { mode = localStorage.getItem("luz-theme"); } catch (e) {}
    if (["light", "dark", "high-contrast"].indexOf(mode) < 0) {
      mode = matchMedia("(prefers-contrast: more)").matches ? "high-contrast"
        : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = mode;
  })();
</script>
```

- Put it in `<head>`. It runs before the first paint, so the page does not flash light. Make it `<script type="module">` to keep it off the critical path: the page then paints light first, and switches.
- Under a CSP without `'unsafe-inline'`, serve it as a classic file in `<head>` or allow it by its `'sha256-…'` hash.
- A mode the reader chose wins. The color mode switcher stores it under `luz-theme`, and the script reads that first. The system setting is never stored, so the page keeps following it until the reader chooses.
- Without JavaScript the page stays light, and the radios of the switcher still change the mode for the session.
- It reads the setting once, when the page loads. To follow a change while the page is open, listen to the `change` event of `matchMedia()` and call `applyTheme(mode, { persist: false })` from `@luz-ds/core/theme`, only while `getStoredTheme()` is `null`.
- It sets the three modes. A theme of your own is set with `data-theme` and `data-mode`, as [the themes page](https://nandovejer.github.io/luz/docs/tokens/themes/) says.

The script sets the mode once. To keep following the system while the page is open, and to give the reader an Auto choice beside the three modes, wrap the switcher in [`<luz-mode>`](https://nandovejer.github.io/luz/docs/site/mode/), from `@luz-ds/site`.

- Auto follows the system: `prefers-contrast: more` gives high contrast, then `prefers-color-scheme: dark` gives dark, otherwise light.
- With `by="clock"` Auto follows the time of day instead, and writes the phase as `data-light`: see [how it works](https://nandovejer.github.io/luz/docs/site/mode/#how).
- A mode the reader chooses wins over both. Without JavaScript Auto is light.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
