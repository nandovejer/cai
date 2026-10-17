# Code

Shows code inside a sentence, or in a block with syntax colours in every mode.

### Known issues
The highlighter is a set of patterns, not a parser: JSX tags, the contents of HTML `style` and `script` elements and unquoted attribute values stay plain. The colours are decoration only: assistive technology reads the code the same way.

### Copy the markup
Code block markup
```html
<pre class="luz-code-block" data-lang="css" tabindex="0" role="region" aria-label="Panel styles"><code>.panel {
  color: var(--luz-text-primary);
}</code></pre>
```

Inline code markup
```html
<p>Set the colour with <code class="luz-code-inline">--luz-text-primary</code>.</p>
```

Highlighting script code
```js
import { initHighlight } from "@luz-ds/core/highlight";
initHighlight();
```

### Variants and options
Two classes, and the language in an attribute.

- `.luz-code-block`: A block on the muted surface, mono font, scrolls sideways when a line is long
- `.luz-code-inline`: Code inside a sentence, in the code colour
- `data-lang`: The language: `html`, `css`, `js`, `jsx`, `json`, `bash`, `sh` or `shell`. Shown as a label on its own line above the code, at the end edge. Any other value is shown, not highlighted

### How it works
A `<pre>` with a `<code>` inside, styled by `components/code.css`. Highlighting is optional, from `highlight.js`.

- `highlightBlock(pre)` colours one block: it wraps the code in six `.tok-*` classes, one per `--luz-code-*` token.
- `initHighlight()` does it for every `pre.luz-code-block`, adds an `aria-label` to a block that has none ("CSS example"), and adds a copy button inside each block. Core gives that button no position: place it with your own CSS, or call `highlightBlock()` alone. `luz.js` runs `initHighlight()`.
- In forced colors every colour becomes the system text colour; bold keywords and italic comments stay.

### Without JavaScript
The block is plain, readable text in one colour. Nothing is lost but the colours.

### Keyboard and ARIA
A block can be wider than the screen, so it must take focus: Tab reaches it and the arrow keys scroll it.

- `tabindex="0"`, `role="region"` and an `aria-label` that names the code, so the focus stop has a name.
- Inline code needs nothing.

### When to use
Use a code block for code or terminal output the reader may read or copy, and inline code for names inside a sentence.

### When not to use
Do not use a code block for a long file or for text that is not code.

- For a whole file, link to the source.
- For a key the reader presses, use `<kbd>`.
