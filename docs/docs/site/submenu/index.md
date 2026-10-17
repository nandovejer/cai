# Submenu

Groups a few links of a header under one button, so the header keeps a short row of links.

### Known issues
A submenu is a native `<details>`, which has no Escape key and does not close when you click elsewhere: it closes when you press its button again or open another one (in browsers that support `name` on `<details>`: Chrome and Edge 120, Safari 17.2, Firefox 130; in older ones several can be open at once). From 769 px an open box stays over the top of the page until then, and if you keep pressing Tab after it, a link of the page behind it can be hidden (WCAG 2.2 success criterion 2.4.11, Focus not obscured).

In the menu at 768 px and below this does not happen: the links are in the flow and Escape closes the whole menu. It has not been tested with a screen reader.

### Copy the markup
An item of the list of core’s [navbar](https://nandovejer.github.io/luz/docs/components/navbar/), in a [landing](https://nandovejer.github.io/luz/docs/landing/header/) or [CMS](https://nandovejer.github.io/luz/docs/cms/header/) header, whose content is a `<luz-submenu>` around a `<details>`: its `<summary>` is the button, and a list of links follows it. No class: the tag is the block, and its parts are found by their place.

Give every submenu of the header the same `name`, so opening one closes the others.

Submenu markup
```html
<nav class="luz-navbar" id="site-nav" aria-label="Main" popover>
  <ul class="luz-navbar__list">
    <li><a class="luz-navbar__link" href="/" aria-current="page">Home</a></li>
    <li>
      <luz-submenu>
        <details name="site-menu">
          <summary>Wines</summary>
          <ul>
            <li><a class="luz-navbar__link" href="/wines/red/">Red wines</a></li>
            <li><a class="luz-navbar__link" href="/wines/white/">White wines</a></li>
          </ul>
        </details>
      </luz-submenu>
    </li>
    <li><a class="luz-navbar__link" href="/visits/">Visits</a></li>
  </ul>
</nav>
```

### Variants and options
There are no variants. The attributes are the browser’s.

- `<luz-submenu>`: Around the `<details>`, with `display: contents`: it draws no box and adds no role. The `<summary>` looks like the links beside it, with a chevron; the list of links is indented under it, and from 769 px a box under it
- `name`: The same value on every submenu of the header: opening one closes the others. Browsers without it leave the others open
- `open`: Set by the browser. Do not write it in the markup: a submenu open on every page hides the page under it

### How it works
CSS from `@luz-ds/site` and a native `<details>`. No JavaScript: `<luz-submenu>` is a tag that no script ever defines.

- The browser opens and closes it, and tells assistive technology whether it is open. A submenu opens on a click, a tap, Enter or Space: never on hover, so it does not open under a pointer passing by, and it works the same on a touch screen.
- At 768 px and below, inside the header’s menu, the links of a group open in place, under their button, indented, and push the next links down.
- From 769 px, where the header’s links are a row, they open in a box under their button, over the page; the page does not move. The box of the last item opens toward the start of the row, so it stays in the window, in either direction of text.
- The chevron is drawn with two borders and has no text: the state is the one the browser exposes.
- It does not use the popover API: a popover sits in the top layer, so it could not open in place inside the menu.

### Without JavaScript
Nothing changes: there is no script. The links are plain links.

### Keyboard and ARIA
- **Order:** a closed submenu is one stop, its button. Open, its links come right after it, then the next item of the header.
- **Keys:** Enter or Space on the button opens and closes it; focus stays on the button. Tab and Shift+Tab move through the links. Escape does nothing in a submenu (see Known issues); in the header’s menu at 768 px and below it closes the menu and returns focus to the menu button.
- **Names:** the button’s name is its text. The browser exposes the expanded state of a `<summary>`: write no `aria-expanded`, no `role="menu"` and no `role="menuitem"`; these are links in a navigation landmark, not an application menu.
- **Current page:** put `aria-current="page"` on the link of the page, in the submenu too.

### When to use
Use it when the header needs more links than fit in a short row, and some of them belong together: the kinds of wine, the pages about the company.

### When not to use
Do not use it for a single link, or to hide pages most visitors need: put those in the row itself.

- Do not nest a submenu in a submenu: two levels hide pages from the visitor and are hard to use with a pointer and a keyboard.
- Do not put actions, forms or settings in it: it holds links to pages. For actions use buttons, or a [dropdown](https://nandovejer.github.io/luz/docs/components/dropdown/).
- If every group has many links, give each group a page of its own and link to it: a long submenu is a page in a box.

It replaces a dropdown navigation built with a script, and the hover menu. Nothing in LUZ is removed.
