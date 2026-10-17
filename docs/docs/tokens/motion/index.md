# Motion

The durations and easings of every transition, which drop to zero when the reader asks for reduced motion. Ships with @luz-ds/core.

Take every duration from a token. Under `prefers-reduced-motion: reduce` all the durations become `0s`, so motion stops everywhere with no extra CSS.

Ships with core, not with tokens.

A transition with motion tokens
```css
.panel {
  transition: opacity var(--luz-duration-base) var(--luz-easing-standard);
}
```

- **Standard** for movement within the page, **enter** for things that arrive, **exit** for things that leave.
- **Spring** overshoots a little: keep it for small, playful details.
- Never hard-code a duration: it would ignore reduced motion.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
