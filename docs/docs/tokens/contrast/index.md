# Contrast check

Check your own color overrides against the contrast LUZ promises, with one command or in the page, before they reach a user.

### Run it

LUZ keeps its own colors readable in light, dark and high contrast. The moment you override a token, that promise is yours. `check-contrast` reads the `--luz-*` declarations of your stylesheet, puts them over LUZ's tokens as the browser would, and measures the same pairs the component pages list. It needs Node 20 or later and nothing else. `luz-check`, the command of [@luz-ds/check](https://nandovejer.github.io/luz/docs/get-started/ai/), runs the same check on the stylesheets you name, next to its rules for the HTML and CSS of a page.

The command
```text
npx @luz-ds/tokens check-contrast my-theme.css
```

Name your files in the order the page loads them. Use `--json` for a machine-readable report, and `--strict` to make the warnings fail too.

Example output
```text
✗ light, high-contrast: --luz-text-secondary on surface-page is 2.8:1, needs 4.5:1 (text)
    --luz-text-secondary: #999 is set in my-theme.css:2
✗ contrast: 5 pairs fail (9 of 378 measurements) in light, dark, high-contrast
```

### What it checks

WCAG 2.x relative luminance, the contrast of WCAG 2.2 level AA. APCA is not used, because it is not part of the standard.

Pairs are checked in light, dark and high contrast, and in each `[data-theme="name"]` your file defines, as `name` and `name/light`, `name/dark` and `name/high-contrast`. Translucent colors are placed over the surface below them, as in the page. A *warning* is an aim LUZ sets itself, stricter than WCAG, such as the fill of a checked box against the page: it is shown and never fails the check unless you pass `--strict`.

### What it reads

- **Selectors:** `:root`, `html`, `[data-theme="x"]` and `[data-mode="y"]`, alone or together. A later rule wins over an earlier one of the same specificity, and a more specific selector wins over a later one. A `:root` override, loaded after LUZ, also reaches dark and high contrast unless that mode sets the token again: set a token per mode.
- **At-rules:** `@media (prefers-color-scheme: dark)` and `light`, and `@layer` and `@supports`, taken as true. The order of layers is not modeled.
- **Values:** `#rgb`, `#rrggbb` with or without alpha, `rgb()` and `hsl()` in either syntax, `white`, `black`, `transparent`, and `var()` chains.
- **Everything else is reported, not skipped:** a class selector, another media query or a rule it did not understand is listed as ignored. A color it cannot read, such as `color-mix()` or `oklch()`, counts as a failure, because a pair that was not measured is not a pair that passed.

### Exit codes

### In your build

The command fails the step on a failure, so one line is enough.

A package.json script
```json
{
  "scripts": {
    "check:contrast": "luz-tokens check-contrast src/theme.css"
  }
}
```

### Try it in the page

With JavaScript on, you can paste your overrides here and run the same check. Nothing leaves the page. Without it, use the command above: it does the same.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
