# Tokens

CSS custom properties for every colour, space, size and type value. Use the semantic ones: they change with the color mode.

### Two layers

- **Primitives** hold raw values: `--luz-blue-60`, `--luz-space-md`. They are the same in every mode.
- **Semantic tokens** give a colour a job: `--luz-text-primary`, `--luz-surface-page`. Each mode points them at different primitives.
- Space, size, radius, shadow and type scales are primitives that components use directly: they do not change with the mode.

Where the tokens come from
```text
packages/tokens/tokens.json        the source of the primitives
packages/tokens/src/semantic.css   the semantic colours, per mode
dist/luz-tokens.css                both layers, and the ET Book font
dist/tokens.css                    both layers, no font
```

### Use semantic colours, never primitive ones

A component that uses a primitive colour looks right in one mode and wrong in the others.

Semantic and primitive colour tokens
```css
/* Do: semantic tokens follow the mode */
.panel {
  color: var(--luz-text-primary);
  background: var(--luz-surface);
  border: 1px solid var(--luz-divider);
  padding: var(--luz-space-md);
}

/* Don't: a primitive colour stays the same in dark mode */
.panel {
  color: var(--luz-gray-100);
  background: var(--luz-blue-10);
}
```

### Text on a solid fill

Behind `--luz-text-on-fill`, use a fill token, not the brand or status colour.

- The fills: `--luz-brand-fill`, `--luz-brand-fill-hover`, `--luz-brand-fill-active` and `--luz-color-danger-fill`.
- In light and high contrast they equal the brand and danger colours. In dark mode they are a step darker: the dark brand colour is light enough to read as text, and white on it falls below 4.5:1.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
