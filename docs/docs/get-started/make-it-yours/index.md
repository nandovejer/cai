# Make it yours

Change the colours, fonts, sizes, corners and shadows of LUZ with tokens, and adjust one component with CSS of your own.

LUZ is made to be changed from the outside. You do not edit its files: you write CSS of your own that loads after it, and the rule that matters is that your CSS wins.

### Change a token, not a component

LUZ's components read tokens: custom properties that start with `--luz-`. To change how LUZ looks, write the token again in your own CSS.

Every component that reads it follows.

The token override
```css
:root {
  --luz-radius-md: 2px;
}
```

- Write the token on `:root`, in CSS that is not inside an `@layer`.
- CSS outside any layer wins over every LUZ layer, wherever it sits in the file. You do not need `!important`, or a longer selector.
- If you use layers of your own, declare their order first. [Cascade layers](https://nandovejer.github.io/luz/docs/get-started/layers/) has the order and the three ways to override LUZ.
- Token names are on [the Tokens pages](https://nandovejer.github.io/luz/docs/tokens/). A token you write that LUZ does not read does nothing.

### Colours and modes

LUZ ships one look in three modes: light, dark and high contrast. Colours are semantic tokens, such as `--luz-brand-fill` and `--luz-surface-page`, and each one has a value for each mode.

To change them, [make your own theme](https://nandovejer.github.io/luz/docs/tokens/themes/): it gives you a template, the steps and where to load it. Then run [the contrast check](https://nandovejer.github.io/luz/docs/tokens/contrast/) on your colours, which measures the pairs LUZ promises to keep readable.

### Fonts

Two tokens say which font is used for what. Three more hold the font stacks.

- `--luz-font-body`: running text. The serif, ET Book, by default.
- `--luz-font-heading`: headings. The serif by default.
- `--luz-font-sans`, `--luz-font-serif` and `--luz-font-mono`: the three stacks. Controls, labels and tables use the sans, and code uses the mono.

The font override
```css
@font-face {
  font-family: "My Serif";
  src: url("/fonts/my-serif.woff2") format("woff2");
  font-display: swap;
}

:root {
  --luz-font-serif: "My Serif", georgia, serif;
}
```

- Your own `@font-face` goes in your CSS, as above. Setting `--luz-font-serif` changes the body and the headings, because both use it by default.
- To drop ET Book, load `tokens.css` instead of `luz-tokens.css`: `@luz-ds/tokens/tokens.css` from a bundler, `dist/tokens.min.css` from a CDN. It has the same tokens and no `@font-face`.
- On an element marked `lang="ar"`, body and headings already take the sans: ET Book has no Arabic letters. A rule of your own, outside LUZ's layers, still wins.
- A font you bring has its own licence. Read it before you publish the file.

[Typography](https://nandovejer.github.io/luz/docs/tokens/typography/) lists the font roles and the type scale.

### Text and space sizes

Three tokens, called knobs, set the size of the whole type scale and the whole space scale. Every type step, `--luz-text-xs` to `--luz-text-4xl`, and every space step, `--luz-space-3xs` to `--luz-space-4xl`, is worked out from them, so one line changes the page.

The three size knobs

- `--luz-type-base`: 1rem: The size of `--luz-text-base`. Every other step is computed from it.
- `--luz-type-ratio`: 1.25: The multiple between two steps above the base, and the divisor below it.
- `--luz-space-unit`: 0.25rem: The grid of the spacing scale: every space step is a multiple of it.

The size knobs
```css
:root {
  --luz-type-base: 1.125rem;
  --luz-type-ratio: 1.2;
  --luz-space-unit: 0.1875rem;
}
```

#### Rules for the knobs

- **Write lengths in rem.** A rem follows the font size the reader chose in their browser settings. A value in px pins the size and ignores that setting. Spacing is in rem too, so it grows with the text.
- **Set them on `:root`.** The steps are worked out once, on `:root`, and passed down as finished values. A knob on `body` or on a section changes nothing. Sizes are a choice for the whole page.

A knob that does nothing
```css
/* This changes nothing: the steps are already worked out on :root */
body {
  --luz-type-base: 1.5rem;
}
```

#### The ranges LUZ is tested at

- `--luz-type-base`: 0.875rem to 1.25rem.
- `--luz-type-ratio`: 1.125 to 1.5.
- `--luz-space-unit`: 0.1875rem to 0.3125rem, which is 3px to 5px at a 16px root.

Outside these ranges it still works, but nobody has looked at the result. The colour contrast check measures colours only: it does not look at sizes.

#### What does not move

- Small text keeps a floor. `--luz-text-xs` is never under 0.75rem and `--luz-text-sm` never under 0.875rem, whatever the base.
- On a touch screen, and at 768px and below, form text is never under 1rem.
- Control heights, `--luz-control-sm` to `--luz-control-xl` (28, 36, 44 and 56px), are not knobs. A smaller unit never makes a target smaller.
- Running text is `--luz-text-body`, 1.0625 times the base, so the base moves it too.

#### By width, or on paper

The knobs are on `:root`, so a media query can change them.

Knobs in media queries
```css
@media (min-width: 80em) {
  :root {
    --luz-type-base: 1.125rem;
  }
}

@media print {
  :root {
    --luz-type-base: 0.9375rem;
  }
}
```

#### Try them

These are the nine type sizes of five combinations of the knobs. The steps are `--luz-text-xs` to `--luz-text-4xl`, in px.

Type sizes at 16px root

- Default: 12: 14: 15: 16: 20: 25: 31: 39: 49
- Larger text `--luz-type-base: 1.125rem`: 12: 14: 16: 18: 23: 29: 36: 45: 56
- Tighter steps `--luz-type-ratio: 1.2`: 12: 14: 15: 16: 19: 23: 28: 34: 41
- Small base `--luz-type-base: 0.875rem`: 12: 14: 14: 14: 18: 23: 29: 36: 45
- Large and wide `--luz-type-base: 1.25rem; --luz-type-ratio: 1.333`: 12: 15: 18: 20: 27: 36: 48: 64: 85

- The table is for a root font size of 16px, the browser default. If the reader's browser is set to 20px, every size is 1.25 times larger. That is why the knobs are in rem.
- With a base of 0.875rem the floors hold: `--luz-text-sm`, `--luz-text-md` and `--luz-text-base` are all 14px.
- Each step is rounded to 1/16 rem, which is a whole pixel at a 16px root. A browser without `round()` uses the plain chain: at the defaults the three largest steps are at most 0.25px away.

[Typography](https://nandovejer.github.io/luz/docs/tokens/typography/) and [Spacing and sizing](https://nandovejer.github.io/luz/docs/tokens/spacing/) list each step with its formula.

### Corners

`--luz-radius-md` is the ceiling: no rectangle is rounder. It is the corner of buttons, cards, alerts, menus and dialogs.

Three more steps cover the other cases.

- `--luz-radius-none` (0px): a square corner, for a box that joins a neighbour.
- `--luz-radius-sm` (2px): small marks, such as inline code and a checkbox.
- `--luz-radius-full` (9999px): a pill or a circle, for shapes that are round by nature. It is not a corner for a box.

Square corners
```css
:root {
  --luz-radius-sm: 0;
  --luz-radius-md: 0;
}
```

[Radius](https://nandovejer.github.io/luz/docs/tokens/radius/) says which component uses which step.

### Shadows

Three tokens set how far a surface seems to float: `--luz-shadow-sm` for a card, `--luz-shadow-md` for tooltips and toasts, and `--luz-shadow-lg` for dialogs and the drawer.

LUZ redraws them in dark mode, and in high contrast it draws outlines instead. A rule on `:root` outside any layer wins in every mode, so one value serves them all.

If you want the dark ones heavier, set them for that mode as well.

Shadows for light and dark
```css
:root {
  --luz-shadow-md: 0 2px 6px rgba(0, 0, 0, 0.12);
}

[data-theme="dark"] {
  --luz-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
}
```

Never let a shadow be the only edge of a surface: it disappears in forced colors. [Shadows](https://nandovejer.github.io/luz/docs/tokens/shadows/) has the values, and [Color modes](https://nandovejer.github.io/luz/docs/tokens/modes/) how the three modes are chosen.

### Adjust one component

Change a token first: every component that reads it follows, in every mode. When one component needs a rule of its own, write it in CSS outside any layer.

It wins over every LUZ layer, so the selector can stay short.

A rule for one component
```css
.luz-btn {
  min-height: 3rem;
}
```

If your own CSS is in layers, declare the order first and put the rule in your layer. `app` comes after `luz`, so it wins.

Your own layers
```css
@layer reset, luz, app;

@layer app {
  .luz-btn {
    min-height: 3rem;
  }
}
```

Three things to avoid.

- **`!important`.** It is never needed: unlayered CSS and the order of layers decide first.
- **A status colour for something else.** Success, warning, danger and info keep their meaning, so do not use them to decorate.
- **Removing the focus ring.** `outline: none` leaves a keyboard user with no way to see where they are. Change its colour with `--luz-focus-ring` and check the result with [the contrast check](https://nandovejer.github.io/luz/docs/tokens/contrast/).

[Cascade layers](https://nandovejer.github.io/luz/docs/get-started/layers/) has the full order of LUZ's layers.

### Icons

LUZ draws 22 icons of its own, on [the Icon grid page](https://nandovejer.github.io/luz/docs/components/icon-grid/), which also has the markup. For hundreds, bring a set.

Whatever set you use, the pattern is the same:

1. Use an inline `<svg>` that takes `currentColor`. It follows the text colour and the mode, and it works in forced colors.
2. Mark it decorative with `aria-hidden="true"` and `focusable="false"`. Its name comes from the visible text beside it, or from a `.u-sr-only` span in the button.
3. Size it in em, such as `1.25em`, so it follows the text and the size knobs. There is no icon-size token on purpose. Inside `.luz-btn` an icon is 16px already.
4. Draw one icon many times from one `<symbol>` sprite in the same document, never `<use href="https://…">`, which browsers block across origins.
5. An icon never carries meaning alone: a status icon comes with words. Do not use a set's brand logos as a status or an action. They are trademarks, even where the set is MIT.

An icon beside a label
```html
<button class="luz-btn luz-btn--secondary" type="button">
  <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" aria-hidden="true" focusable="false">
    <use href="#icon-download"></use>
  </svg>
  Download
</button>
```

#### Sets with an MIT licence

These five are under the MIT licence only, the licence LUZ itself uses. Each licence file was read on 2026-10-15.

Icon sets under the MIT licence

- [Feather](https://github.com/feathericons/feather): MIT: [Feather licence file](https://github.com/feathericons/feather/blob/HEAD/LICENSE): A 24px grid and a 2px stroke, like LUZ's own icons. Check how recently the repository was updated before you choose it.
- [Heroicons](https://github.com/tailwindlabs/heroicons): MIT: [Heroicons licence file](https://github.com/tailwindlabs/heroicons/blob/HEAD/LICENSE): Outline icons at 24px, solid icons at 24, 20 and 16px.
- [Tabler Icons](https://github.com/tabler/tabler-icons): MIT: [Tabler Icons licence file](https://github.com/tabler/tabler-icons/blob/HEAD/LICENSE): A very large set. The stroke width can be changed; it is 2px by default.
- [Phosphor](https://github.com/phosphor-icons/core): MIT: [Phosphor licence file](https://github.com/phosphor-icons/core/blob/HEAD/LICENSE): Six weights. Take one, so the icons match.
- [Bootstrap Icons](https://github.com/twbs/icons): MIT: [Bootstrap Icons licence file](https://github.com/twbs/icons/blob/HEAD/LICENSE): A 16px grid.

Iconoir, Ionicons, Radix Icons and Fluent UI System Icons are also under MIT, as of 2026-10-15. They are not on this list to keep it short.

LUZ does not bundle these and does not test them. MIT asks you to keep the copyright notice: copy the notice of the set you take next to its icons, and check the licence file of the version you take.

#### Sets LUZ does not recommend

These are popular, and each has a licence that is not MIT only. The reason is listed so nobody adds them by mistake.

Icon sets that are not MIT only

- Lucide: ISC: ISC is a different licence from MIT.
- Remix Icon: Its own licence, Remix Icon License v1.0: It is not MIT. The repository and the npm package name different licences, so the set is unclear.
- Material Symbols and Material Design Icons: Apache-2.0: Apache-2.0 is not MIT.
- Font Awesome Free: Icons CC BY 4.0, fonts OFL 1.1, code MIT: The icons are under a Creative Commons licence and the fonts under OFL.
- Simple Icons: CC0-1.0: CC0 is not MIT.
- Octicons: MIT, with an exception: The licence file is MIT, but the README says the GitHub logos follow GitHub's logo guidelines. The set holds files that are not under MIT.

### What not to change

Everything above is safe to change. These are not, and each has a reason.

- **The colour scales.** Components read semantic tokens. Change those, in [a theme of your own](https://nandovejer.github.io/luz/docs/tokens/themes/), not the palette they are built on.
- **The status colours.** `--luz-color-success`, `--luz-color-warning`, `--luz-color-danger` and `--luz-color-info` mean what their names say. Do not use them for anything else.
- **The focus ring.** You can set its colour. You cannot remove it.
- **The 44px targets.** The control heights, `--luz-control-sm` to `--luz-control-xl`, are not knobs.
- **The files in `dist/`.** They are generated and replaced on every release. Your changes belong in your own CSS.
