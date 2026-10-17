# Layout and breakpoints

How wide content gets, and where the layout changes. Ships with @luz-ds/core.

Ships with core, not with tokens.

- Breakpoints are reference values: media queries cannot read custom properties, so write the number, such as `@media (max-width: 768px)`.
- Safari on a Mac with always-visible scrollbars does not count the scrollbar in width media queries (WebKit bug 52653), so a breakpoint is crossed when the window is up to about 15 px wider than its value.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
