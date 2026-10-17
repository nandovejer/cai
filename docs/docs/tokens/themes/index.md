# Make your own theme

LUZ ships one look in three color modes. A theme of your own is a file of semantic tokens: start from the template, check it, load it.

### What a theme is

A **color mode** says how light or dark the page is: `light`, `dark` or `high-contrast`. A **theme** is a whole identity: colors, and optionally the fonts, radii and shadows. Every theme has the three modes.

- LUZ ships **one look**, Vejer, in the three modes. It is the default: with no attribute you get its light mode.
- A theme of your own overrides **semantic tokens** only. It never changes a primitive, and it never touches a component's CSS.
- You name it with `data-theme` and pick its mode with `data-mode`.
- Overriding tokens and making a theme are the same thing: a theme is a named set of overrides, with a mode for each of its looks.

### Make one, step by step

1. **Copy the template.** It is `@luz-ds/core/themes/_template.css`. Every value in it is LUZ's own, so it passes the contrast check before you change anything.
2. **Rename it.** Replace `my-brand`, three times, by the name of your theme: lowercase letters, digits and hyphens.
3. **Change what you need.** Start with the brand colors and the surfaces. Keep the three blocks complete: a token left out of the dark block takes its light value.
4. **Check it.** Run the command in [Check it](https://nandovejer.github.io/luz/docs/tokens/themes/#check) until it passes.
5. **Load it** after `luz-tokens.css` and `luz.css`, and set the attribute.
6. **List it** in `data-luz-themes`, so the mode switcher remembers the visitor's choice.

Loading a theme
```html
<link rel="stylesheet" href="luz-tokens.css">
<link rel="stylesheet" href="luz.css">
<link rel="stylesheet" href="my-brand.css">

<html lang="en" data-theme="my-brand" data-luz-themes="my-brand">
<!-- or, in its dark mode -->
<html lang="en" data-theme="my-brand" data-mode="dark" data-luz-themes="my-brand">
```

A small theme can be only the tokens that differ, in the first block: what you leave out takes LUZ's value. Fill the dark and high-contrast blocks as well if you offer those modes.

A minimal theme
```css
[data-theme="my-brand"] {
  --luz-brand-primary: #0057ff;
  --luz-brand-hover: #0043c2;
  --luz-brand-active: #003399;
  --luz-brand-fill: #0057ff;
  --luz-focus-ring: #0057ff;
  --luz-surface-page: #f8faff;
}
```

### The tokens a theme sets

The template names all of them, in each of its three blocks. They are the same tokens as the [color page](https://nandovejer.github.io/luz/docs/tokens/color/), with the job of each; this is the list, by group.

**Optional, and not in the three blocks:** `--luz-font-body`, `--luz-font-heading` and `--luz-font-serif` for the fonts, `--luz-radius-sm` and `-md` for the corners, and `--luz-shadow-sm`, `-md` and `-lg`. Set them in the first block.

**Not in a theme:** the sizes (`--luz-type-base`, `--luz-type-ratio` and `--luz-space-unit`) are set on `:root`, not in a theme. A theme changes colours per mode; the sizes are one page-wide choice. See [Typography](https://nandovejer.github.io/luz/docs/tokens/typography/) and [Spacing](https://nandovejer.github.io/luz/docs/tokens/spacing/).

### Check it

The command
```text
npx @luz-ds/tokens check-contrast my-brand.css
```

- It reads the theme as the browser would: the first block is the light mode, and each `data-mode` block lays on top of it.
- The minimums are 4.5:1 for text, 3:1 for disabled text, borders, field borders and focus rings, in all three modes. Exit code `1` when a pair fails.
- You can also paste the theme into [the contrast check](https://nandovejer.github.io/luz/docs/tokens/contrast/) in the page.
- **LUZ guarantees only what it ships.** Your theme is as accessible as this check says, and no more.

### Layers, modes and scope

- **Layers.** Put the theme in `@layer luz.themes` to keep it below your own CSS, or leave it unlayered to win over all of LUZ. Either way it wins over `luz.tokens`. [The layers page](https://nandovejer.github.io/luz/docs/get-started/layers/) has the order.
- **One zone.** `data-theme` works on any element: the theme applies to that element and what is inside it. A date or time picker and a select take their color scheme from an ancestor `data-theme`, so for those put the attribute on `<html>`.
- **Forced colors.** A reader who forces colors sees system colors, not your theme. Nothing to do: the components handle it.
- **Print.** The `luz.print` layer sets paper colors whatever the theme.
- **The OS preference.** With no stored choice and no attribute, the page is light. To follow `prefers-color-scheme`, [set `data-theme` from a short script](https://nandovejer.github.io/luz/docs/tokens/modes/#system): it is on the color modes page.

### Limits

- One theme at a time on an element. Mix a theme and a mode, not two themes.
- The mode switcher knows only the names in `data-luz-themes`: a name that is not listed works as an attribute, and is not remembered.
- `light-dark()` is not used: it is not Baseline Widely available before 2026-11-13.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
