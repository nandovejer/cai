# Auto color mode

Adds an Auto choice to the color mode switcher, so the page follows the system setting or the time of day until the reader chooses a mode.

### Known issues
What to expect:

- With `by="clock"`, Auto is dark from 20:30 to 07:30 even when the device is set to light. The system setting is not read.
- With `prefers-contrast: more` and a dark setting together, Auto gives the high-contrast mode, which is light.
- In the Auto state the cycle button says Auto, not the mode Auto applied.
- Without [the script for the head](https://nandovejer.github.io/luz/docs/site/mode/#boot), a dark system can flash the wrong mode first.
- Auto and the legend are yours to translate. A name in `data-luz-themes` is left to core.
- It has not been tested with a screen reader.

### Copy the markup
Core's [color mode switcher](https://nandovejer.github.io/luz/docs/components/mode-switcher/) with a fourth radio, `auto`, checked, inside `<luz-mode>`. `site.min.js` loads the element's file, `mode.min.js`; a page without it loads that file on its own.

Put the icons in the labels, not `data-mode-icon` on the cycle button: with `luz.js` the button copies the checked label's icon, and core has no Auto icon for `data-mode-icon`.

Auto color mode markup
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"></script>

<luz-mode remember by="clock">
  <fieldset class="luz-mode-switcher luz-mode-switcher--cycle">
    <legend class="luz-mode-switcher__label">Color mode</legend>
    <label class="luz-mode-btn"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="auto" checked><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 7a5 5 0 0 0 0 10ZM23 14A5 5 0 0 1 17 8a5 5 0 1 0 6 6Z"/><path stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M11 3h0M5 6h0M2 12h0M5 18h0M11 21h0"/></svg>Auto</label>
    <label class="luz-mode-btn" data-theme="light"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="light"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="1.5 4.8"/></svg>Light</label>
    <label class="luz-mode-btn" data-theme="dark"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="dark"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/></svg>Dark</label>
    <label class="luz-mode-btn" data-theme="high-contrast"><input class="luz-mode-btn__input" type="radio" name="luz-theme" value="high-contrast"><svg class="luz-mode-btn__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M12 3a9 9 0 0 1 0 18Z"/></svg>High contrast</label>
  </fieldset>
</luz-mode>
```

#### Script for the head

This script, for `by="system"`, avoids the flash of the wrong mode: it sets `data-theme` before the first paint. It is recommended, not required. It takes the mode stored under `luz-theme`, then `prefers-contrast`, then `prefers-color-scheme`.

Under a CSP without `'unsafe-inline'`, serve it as a classic file in the `<head>` or allow it by its `'sha256-…'` hash.

Script for the head
```html
<script>
  (function () {
    var m;
    try { m = localStorage.getItem("luz-theme"); } catch (e) {}
    if (["light", "dark", "high-contrast"].indexOf(m) < 0)
      m = matchMedia("(prefers-contrast: more)").matches ? "high-contrast"
        : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = m;
  })();
</script>
```

### Variants and options
There are no variants. The attributes of `<luz-mode>`:

- `remember`: A boolean. Stores the choice under `luz-theme`, core's key. Auto removes it. Without it a reload starts in Auto
- `by`: What Auto follows: `system` (the default) or `clock`
- `for`: The `id` of the element that gets the attributes. `<html>` by default
- `light-attr`: The attribute that holds the phase of the day, `data-light` by default. Never `data-theme` or a `data-luz-*` attribute: they are not checked, and are the mode's and core's

### How it works
CSS from `@luz-ds/site` for the element's box and `@luz-ds/site/mode`, which defines `<luz-mode>`. `site.min.js` loads it when idle, on a page with a `<luz-mode>`. The radios and labels are core's: the element writes no text.

- **Auto by the system:** `prefers-contrast: more` gives `high-contrast`; otherwise `prefers-color-scheme: dark` gives `dark`; otherwise `light`. It follows a change while the page is open.
- **Auto by the clock:** `prefers-contrast: more` still wins. Otherwise the phase of the day decides: `dark` in the dark phases, `light` in the others, and it is written as `data-light`. It checks every minute and when the tab shows again.
- **A mode the reader chose:** It sets `data-theme` to it. With `by="clock"` the light is pinned: `afternoon` for Light, `night` for the others.
- **Storage:** only with `remember`, under core's `luz-theme`; a value that is not a mode is ignored.
- **With luz.js:** core's script ignores Auto, and its cycle button steps through all four.

The phases of the day, by the visitor's clock. Night runs through midnight.

- `night`: 22:30: 05:00: dark
- `dawn`: 05:00: 07:30: dark
- `morning`: 07:30: 12:00: light
- `afternoon`: 12:00: 17:30: light
- `sunset`: 17:30: 20:30: light
- `dusk`: 20:30: 22:30: dark

#### Properties, methods and event

- `el.mode`: The choice: `auto`, `light`, `dark` or `high-contrast`. Setting it chooses the radio
- `el.light`: The phase of the day now, or `null` unless `by="clock"`
- `preview(x)`: Shows another time of day: `x` is a phase name or an hour from 0 to 24. With Auto, `data-theme` follows it; with a mode chosen, only the light does. `preview(null)` goes back. Unless `by="clock"` it returns `false`
- `luz-mode:change`: Bubbles from the element at every change. Its `detail`: `mode` (the choice), `theme` (the `data-theme` applied), `light` (the phase, or `null`), `remembered` (`true` only with `remember` and a mode stored now) and `simulated` (`true` while a preview is active)

#### Two lights in one mode

With `by="clock"` the rest is your CSS: set only the semantic tokens that differ, as [a theme of your own](https://nandovejer.github.io/luz/docs/tokens/themes/) does. Measure each pair with the [contrast check](https://nandovejer.github.io/luz/docs/tokens/contrast/).

A day look and a night look
```css
[data-theme="light"][data-light="morning"] {
  --luz-surface-page: #fdf3dc;
  --luz-surface-muted: #fdf3dc;
  --luz-surface: #fffaf0;
}

[data-theme="dark"][data-light="night"] {
  --luz-surface-page: #0f1520;
  --luz-surface-muted: #0f1520;
  --luz-surface: #172030;
}
```

### Without JavaScript
The four radios show, even in the cycle variant, and core's tokens change the mode from the checked one. Auto is light. The system and the clock are not followed, and nothing is remembered.

### Keyboard and ARIA
- **Radios:** Tab reaches the group, the arrow keys choose Auto, Light, Dark or High contrast. With `luz.js`, the cycle button moves to the next of the four with Enter or Space.
- The legend and the labels are yours. The element adds no button, role or ARIA: the group is the fieldset and its radios.

### When to use
Use it when readers should not have to choose: the page follows their device or the time of day until they do.

- `by="system"` for a site that reads best in the light or the dark the reader's device is in.
- `by="clock"` for a site with a look for each part of the day, such as a venue or a weather page.

### When not to use
Do not use it when the site has one look in one mode: a switcher with no Auto is core's.

- Do not use `by="clock"` to promise the real sunrise: the hours are fixed.
