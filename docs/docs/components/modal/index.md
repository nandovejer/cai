# Modal

Asks for a decision that must be made before the reader goes on, in a native dialog.

### Known issues
Some supported browsers do not have the `command` and `commandfor` attributes yet. In those browsers, with JavaScript off, the open button does nothing. Give the reader another way to the same action.

### Copy the markup
Modal markup
```html
<button class="luz-btn luz-btn--primary" type="button" commandfor="rename" command="show-modal">Rename project</button>

<dialog class="luz-modal" id="rename" aria-labelledby="rename-title">
  <div class="luz-modal__header">
    <button class="luz-modal__close" type="button" commandfor="rename" command="close" aria-label="Close dialog">×</button>
    <h2 class="luz-modal__title" id="rename-title">Rename project</h2>
  </div>
  <form method="dialog">
    <div class="luz-modal__body">
      <div class="luz-field">
        <label class="luz-field__label" for="rename-name">New name</label>
        <input class="luz-input" id="rename-name" type="text" autofocus>
      </div>
    </div>
    <div class="luz-modal__footer">
      <button class="luz-btn luz-btn--ghost" type="button" commandfor="rename" command="close">Cancel</button>
      <button class="luz-btn luz-btn--primary" value="rename">Rename project</button>
    </div>
  </form>
</dialog>
```

Fallback script code
```js
import { initModals } from "@luz-ds/core/modal";
initModals();
```

### Variants and options
One size and no modifiers: up to 600 px wide and 90 % of the viewport high, scrolling inside when the content is longer.

- `.luz-modal`: The dialog surface, with a dimmed and slightly blurred backdrop
- `.luz-modal__header`, `__title`: The title row, with a rule under it
- `.luz-modal__close`: The × button, at the end of the title row, 28 px at least
- `.luz-modal__body`: The content
- `.luz-modal__footer`: The buttons, at the end of the row, with a rule above them
- `command="show-modal"`, `command="close"`: Open and close the dialog named in `commandfor`

### How it works
A native `<dialog>`, styled by `components/modal.css` and opened as a modal.

- The browser does the hard part: the page behind is inert, focus stays inside, Escape closes, and focus goes back to the opener.
- Buttons open and close it with `command` and `commandfor`, with no script.
- `initModals()` from `modal.js` handles the same two commands in browsers that do not support them yet, and does nothing in the others. `luz.js` runs it.
- A `<form method="dialog">` inside closes the dialog when it is sent, and its `returnValue` is the value of the button pressed.

### Without JavaScript
In browsers that support `command`, everything works. In the others the open button does nothing: see Known issues.

### Keyboard and ARIA
Tab and Shift+Tab move inside the dialog only; Escape closes it.

- On open, focus goes to the first focusable element, or to the one with `autofocus`.
- Name the dialog with `aria-labelledby` pointing at its title.
- The × button needs `aria-label="Close dialog"`: its text is a symbol.

### When to use
Use a modal to ask for a decision or a short input that must be settled before the reader goes on.

- To confirm an action that cannot be undone.
- To ask for one or two values, such as a new name.

### When not to use
Do not use a modal for something the reader can ignore or come back to.

- For information about the page, use an [alert](https://nandovejer.github.io/luz/docs/components/alert/).
- For a confirmation that needs no answer, use a [toast](https://nandovejer.github.io/luz/docs/components/toast/).
- For a long form, use its own page.
- Never open a modal when the page loads.
