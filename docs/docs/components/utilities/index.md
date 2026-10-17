# Utility classes

Small u-* classes that do one thing each, for the cases a component does not cover.

Use a utility for a one-off adjustment. If you add the same utilities to the same element again and again, you need a component or a class of your own.

- Utilities win over components: they come last in the cascade.
- `.u-sr-only` hides text from the screen but not from screen readers. `.u-hidden` hides it from both.
- `.u-no-events` only stops the pointer: a keyboard can still reach and use the element. Never use it to disable a control.

**All 16 utility classes**
