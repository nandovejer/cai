# Icon grid

Lets readers browse a set of icons by name and copy the SVG of each one.

### Known issues
None known.

### Copy the markup
Icon grid markup
```html
<ul class="luz-icon-grid">
  <li class="luz-icon-item">
    <span class="luz-icon-display"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg></span>
    <span class="luz-icon-name" id="icon-plus">Plus</span>
    <button class="luz-copy-btn" type="button" id="icon-plus-copy" aria-labelledby="icon-plus-copy icon-plus" data-copy="&lt;svg …&gt;…&lt;/svg&gt;">Copy SVG</button>
  </li>
</ul>
```

The same icons as a sprite: paste it once in the page, then draw each one with `<use>`. The sprite works only in the same document (`href="#id"`); a `<use>` that points at a file on another origin, a CDN included, is blocked by browsers.

Icon sprite markup
```html
<svg width="0" height="0" aria-hidden="true" focusable="false">
  <symbol id="luz-icon-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
  <symbol id="luz-icon-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="luz-icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></symbol>
  <symbol id="luz-icon-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></symbol>
  <symbol id="luz-icon-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="luz-icon-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
  <symbol id="luz-icon-chevron-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
  <symbol id="luz-icon-chevron-up" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></symbol>
  <symbol id="luz-icon-chevron-end" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
  <symbol id="luz-icon-arrow-end" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="luz-icon-cart" viewBox="0 0 24 24"><path d="M3 4h2.5l2.2 10.5h9.6L19.5 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></symbol>
  <symbol id="luz-icon-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-4 3.6-6 7.5-6s6.9 2 7.5 6"/></symbol>
  <symbol id="luz-icon-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7.5l8.5 6 8.5-6"/></symbol>
  <symbol id="luz-icon-calendar" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/></symbol>
  <symbol id="luz-icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
  <symbol id="luz-icon-map-pin" viewBox="0 0 24 24"><path d="M12 21s7-5.8 7-11.5a7 7 0 0 0-14 0C5 15.2 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>
  <symbol id="luz-icon-download" viewBox="0 0 24 24"><path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14"/></symbol>
  <symbol id="luz-icon-external" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></symbol>
  <symbol id="luz-icon-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5v.01"/></symbol>
  <symbol id="luz-icon-warning" viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.01"/></symbol>
  <symbol id="luz-icon-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></symbol>
  <symbol id="luz-icon-filter" viewBox="0 0 24 24"><path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/></symbol>
</svg>

<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#luz-icon-cart"/></svg>
```

An icon beside a label, and an icon alone. A button names itself from its text, so give an icon-only button a name in a `.u-sr-only` span, not an `aria-label`: the span is translated with the page.

Icon in a button markup
```html
<!-- With a label: the icon is 16 px inside a button -->
<button class="luz-btn luz-btn--primary" type="submit">
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 4h2.5l2.2 10.5h9.6L19.5 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>
  Add to cart
</button>

<!-- Icon only: the name is real text, hidden from the eye -->
<button class="luz-btn luz-btn--ghost" type="button">
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  <span class="u-sr-only">Menu</span>
</button>
```

Two icons point to the end of the line: `chevron-end` and `arrow-end`, marked with `data-luz-flip`. In right-to-left text, LUZ mirrors anything with that attribute using the rule below, in core's utilities layer, so you write nothing. Add the attribute to an icon of your own that points to the end of the line.

Right-to-left rule, shipped in luz.utilities
```css
:where([data-luz-flip]):dir(rtl) {
  transform: scaleX(-1);
}
```

### Variants and options
There are no modifiers. The grid fits as many columns of at least 100 px as the width allows.

- `.luz-icon-grid`: The list: a grid with no bullets
- `.luz-icon-item`: One bordered cell: icon, name, copy button
- `.luz-icon-display`: A 48 × 48 px box that centres the icon, in the secondary text colour
- `.luz-icon-name`: The name under the icon

### How it works
A `<ul>` of icons, styled by `components/icon-grid.css`. The copy buttons are [copy buttons](https://nandovejer.github.io/luz/docs/components/copy-button/), wired by `clipboard.js`.

- Each button carries the icon's SVG, escaped, in `data-copy`.
- The 22 icons are LUZ's own, drawn for it on a 24 × 24 grid with a 2 px round stroke in `currentColor`. They are not a package and no file is loaded: copy the SVG, or the sprite, into your page.
- An icon is 24 × 24 px as written, and 16 px inside a `.luz-btn`. For an icon that must follow the text size, set `width="1.5em" height="1.5em"`.

### Without JavaScript
The copy buttons are hidden. The grid still shows every icon and its name.

### Keyboard and ARIA
Tab reaches each copy button; Enter or Space copies the SVG.

- Each button is named by its own text and the icon's name, with `aria-labelledby`: "Copy SVG Plus".
- The icons are `aria-hidden="true"` and `focusable="false"`: the name is the text under them, or the `.u-sr-only` text of the button that holds them.
- Info and warning always come with words. A lone glyph says nothing to someone who cannot see its shape or its colour: put the words beside it, or give a stand-alone icon `role="img"` and a name.
- The result of each copy is announced in a polite live region.

### When to use
Use an icon grid to let readers browse a set of icons and copy the one they need.

### When not to use
Do not use it to lay out icons that do something: it is a catalogue, not a toolbar.

- For a row of actions, use buttons with text in an [action group](https://nandovejer.github.io/luz/docs/components/layout/#objects-actions).
- Never use an icon as the only label of an action: give it its name as text, visible or in a `.u-sr-only` span.
- For a logo or an illustration, use an `<img>` or an SVG at its own size.
- For hundreds of icons, bring your own set: LUZ's has 22.
