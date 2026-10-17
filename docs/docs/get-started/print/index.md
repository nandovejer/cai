# Print styles

What LUZ changes on paper, and how to keep or change any of it, with one layer and no extra file when you load luz.css.

### What changes on paper

A page printed from LUZ is black text on white, without the parts that only work on a screen. It is one block of CSS in its own layer, `luz.print`, which loads with `luz.css`.

- **Colors.** Surfaces are white and text is black, whichever color mode the page was in. The tokens are set again for print, so every component follows, with no rule of its own. Status colors and code colors become black: each has an icon, a title or a weight besides its color.
- **Hidden.** Navigation (`nav`), the sidebar, the tab row, copy buttons, the color mode switch, the player, toasts and tooltips. Site also hides its skip link and search.
- **Links.** An external link prints its address after its text, in brackets. A link that looks like a button does not.
- **Breaks.** No page break inside a figure, a code block, a table, a table row, a quotation, an image, a card or an alert. A heading stays with the text after it.
- **Tables.** The header row repeats on every page of a table that spans pages. A wide table is not clipped.
- **Code.** A long line wraps, as paper cannot scroll.
- **Tabs.** Every panel prints, one after the other, not only the open one.
- **Motion.** No transition or animation, and no shadows.

### Loading it

- `luz.css` includes it. Nothing to add, and nothing to remove: the block is inside the file.
- If you load `base.css` and components one by one, print is not there. Add `@luz-ds/core/print.css` (`dist/print.css`) if you want it. It declares the layer order itself, as every file does.
- A site page also gets its own print rules, in `luz.site`.
- On a screen nothing changes: the whole block is inside `@media print`.

### Keep or change something

Your CSS wins over `luz.print`, as it wins over the rest of LUZ: a rule in your `app` layer, or in no layer at all. Put it in `@media print`.

Changing the print styles
```css
@layer reset, luz, app;

@layer app {
  @media print {
    /* Print the breadcrumb of this site */
    .site-breadcrumb {
      display: block;
    }

    /* Keep the page margins your own */
    @page {
      margin: 2cm;
    }
  }
}
```

- LUZ sets no `@page` margin and no paper size: they are yours.
- With `luz.css` there is no switch to turn them off: undo the rules you do not want in your own layer, as above. To have none of them, load `base.css` and the components one by one, and do not load `print.css`.

### What is not covered

- **Emulated, not printed.** The test renders a docs page with print media and reads the styles, in Chromium, Firefox and WebKit. No one has looked at a printed sheet, or at a PDF made by any browser.
- **The address of a link is drawn by CSS.** It is on paper and in a PDF's text, but not in the page, so a screen reader does not read it.
- **Backgrounds.** Browsers drop background colors and images when they print unless the reader turns "background graphics" on. LUZ relies on text, borders and weight, not on a filled background, to tell things apart.
- **Long tables and breaks.** A table taller than a page breaks anyway: the browser ignores "no break" when it cannot keep it. Safari does not honor `break-after: avoid`, so a heading may be left alone at the foot of a page there.
