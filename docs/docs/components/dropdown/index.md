# Dropdown

A button that opens a short list of actions or links, anchored under it.

### Known issues
There are no arrow keys: Tab moves between the actions, as in any list of buttons. A browser without CSS anchor positioning opens the list as a sheet at the bottom of the screen instead of under the button.

### Copy the markup
Dropdown markup
```html
<div class="luz-dropdown">
  <button class="luz-btn luz-btn--secondary" type="button" popovertarget="project-actions">Actions</button>
  <div class="luz-dropdown__menu" id="project-actions" popover>
    <ul class="luz-dropdown__list">
      <li><a class="luz-dropdown__item" href="/project/edit/">Edit</a></li>
      <li><button class="luz-dropdown__item" type="button">Duplicate</button></li>
      <li><hr class="luz-dropdown__separator"></li>
      <li><button class="luz-dropdown__item luz-dropdown__item--danger" type="button">Delete project</button></li>
    </ul>
  </div>
</div>
```

### Variants and options
- `.luz-dropdown`: The wrapper: the button and its panel, side by side in the source. It scopes the anchor, so several dropdowns on a page each open under their own button
- `popovertarget` and `popover`: The button names the panel by its `id`; the panel is the popover. The browser does the rest
- `.luz-dropdown__menu`: The panel: a surface with an edge and a shadow, at least 12 rem wide, scrolling when it is taller than 24 rem
- `.luz-dropdown__list`: The `<ul>` of actions
- `.luz-dropdown__item`: A link or a button, at least 44 px high and the width of the panel
- `.luz-dropdown__item--danger`: A destructive action, in the danger color
- `aria-disabled="true"`: An action that is not available now: disabled text color, and it keeps its place in the tab order so a reader can find out it exists
- `.luz-dropdown__separator`: A rule between two groups of actions, an `<hr>` in its own `<li>`

### How it works
A native [popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) opened by a button with `popovertarget`, styled by `components/dropdown.css`. There is no JavaScript.

- The browser puts the panel in the top layer, closes it on Escape or a click outside, returns the focus to the button and tells assistive technology whether it is expanded.
- Where the browser has CSS anchor positioning (Chrome and Edge 125, Safari 26, Firefox 147) the panel opens under the button at its start edge, and flips above when there is no room. Without it the panel is a sheet at the bottom of the screen.
- In a browser without the popover API the list stays in the page, under the button, and every action still works.
- It is a list of actions, not an ARIA `menu`: that role promises arrow keys, a roving tabindex and typeahead, which LUZ does not script. Plain links and buttons keep every behaviour the browser gives them.

### Without JavaScript
Nothing changes: the popover is HTML. The actions that are buttons need your own script to do something, as any button does; the ones that are links work as they are.

### Keyboard and ARIA
Enter or Space on the button opens the panel; the focus stays on the button, and the panel follows it in the tab order. Tab moves to the first action, then through the others, and Shift+Tab goes back.

Escape closes the panel and returns the focus to the button.

- Give the button a name that says what is inside: “Actions”, “More options for Ana”, not a bare “…”.
- An unavailable action uses `aria-disabled="true"` and no `disabled`, so it stays reachable and a screen reader says it exists. Do not run its action when it is activated.
- The panel is not a dialog and holds no form: for a decision or a form, use the [modal](https://nandovejer.github.io/luz/docs/components/modal/).

### When to use
Use a dropdown for three to seven related actions on one thing, when showing them all would crowd the page: the actions of a row in a table, of a card, of a project.

### When not to use
Do not use a dropdown to pick a value, or to hide the main action.

- To pick one value of a form, use a [select](https://nandovejer.github.io/luz/docs/components/select/).
- For the main action of a page, use a visible [button](https://nandovejer.github.io/luz/docs/components/button/).
- For the sections of a site, use a [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/) or a navigation list.
- LUZ has no context menu on right click. The browser's own menu is the reader's, and replacing it breaks copy, paste and spelling help; give the same actions in a dropdown.
