# Tabs

Switches between panels of related content in one place; without JavaScript the panels are stacked sections.

### Known issues
None known.

### Copy the markup
Tabs markup
```html
<nav class="luz-tabs" aria-label="Project">
  <a class="luz-tab" href="#project-summary">Summary</a>
  <a class="luz-tab" href="#project-settings">Settings</a>
</nav>
<div class="luz-tabpanel" id="project-summary">…</div>
<div class="luz-tabpanel" id="project-settings">…</div>
```

Tabs script code
```js
import { initTabs } from "@luz-ds/core/tabs";
initTabs();
```

### Variants and options
One look. The tab that opens first is the first one that matches:

- 1: The tab whose panel holds the element named in the URL fragment
- 2: A tab with `aria-selected="true"` or `.is-active` in the markup
- 3: The first tab

### How it works
A row of in-page links to the panels, styled by `components/tabs.css` and upgraded by `tabs.js`.

- `initTabs()` adds the ARIA tabs pattern: `role="tablist"`, `"tab"` and `"tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby` and a roving `tabindex`. It hides the inactive panels. `luz.js` runs it.
- A link to an element inside a hidden panel opens its tab, on load, on `hashchange` and on click.
- Inactive panels are `hidden="until-found"` where the browser supports it, so find in page reaches them and opens their tab.
- `activateTab(tab)` selects a tab from your own script.

### Without JavaScript
The tabs are a row of links, and every panel is shown, stacked, in order. Each link jumps to its panel.

Give each panel a heading, so the stacked page still reads well.

### Keyboard and ARIA
Tab moves into the tab row, to the selected tab; Tab again leaves for the panel.

- Left and Right (or Up and Down) move to the next tab and select it; Home and End go to the first and the last.
- Space or Enter selects the focused tab.
- In right-to-left text, Left and Right follow the reading direction.
- Name the tab row with `aria-label`; the name stays when it becomes a tab list.

### When to use
Use tabs to switch between panels of the same level that readers do not need side by side, such as the summary, settings and logs of one service.

### When not to use
Do not use tabs to move between pages, or to hide content readers need all at once.

- Between pages, use a [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/) or header links.
- For steps in order, use separate pages.
- More than five or six tabs do not fit a phone: use sections with headings.
