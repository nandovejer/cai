# Copy button

Copies a command or a value to the clipboard, and says it did.

### Known issues
The Clipboard API needs a secure context (https, or localhost while you develop). Elsewhere the copy fails. The failure is announced to screen readers only: the button shows no message, so a sighted reader sees nothing happen. The text can still be selected and copied by hand.

### Copy the markup
Copy button markup
```html
<code class="luz-code-inline">npm install @luz-ds/core</code>
<button class="luz-copy-btn" type="button" data-copy="npm install @luz-ds/core" aria-label="Copy the install command">Copy</button>
```

Copy script code
```js
import { initCopyButtons } from "@luz-ds/core/clipboard";
initCopyButtons();
```

### Variants and options
One class and one attribute. The look does not change.

- `.luz-copy-btn`: Small mono button, 24 px high; hidden until the script runs
- `data-copy`: The exact text to copy
- `.is-copied`: Set by the script for about a second after a copy: success colour, label "Copied"

### How it works
A native `<button>`, styled by `components/copy-btn.css` and wired by `clipboard.js`.

- `initCopyButtons()` listens for clicks on any `.luz-copy-btn` and copies its `data-copy`. `luz.js` runs it.
- For about a second the label reads "Copied", then goes back.
- A polite live region says "Copied to clipboard", or that the copy failed. The texts come from `i18n.js`, in the language of the page.
- `copyToClipboard(text, el)` does the same for your own controls.

### Without JavaScript
The button is hidden, because it would do nothing. The text it copies stays on the page, so the reader selects and copies it.

### Keyboard and ARIA
Tab reaches the button; Enter or Space copies. Focus stays on the button.

- The visible label is "Copy"; the `aria-label` starts with it and says what is copied: "Copy the install command".
- The result is announced in a polite live region shared by every copy button.

### When to use
Use a copy button for a short string the reader will paste somewhere else: a command, a token name, a key.

### When not to use
Do not use a copy button where selecting the text is just as easy, or as the only way to get the content.

- For long text, show it in a [code block](https://nandovejer.github.io/luz/docs/components/code/) the reader can select.
