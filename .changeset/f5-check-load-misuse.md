---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`dist/classes.json` of a package can now give a class `hosts`, the elements the class may sit on, read from an `@host <class>: <selector>, …` line in the header comment of a stylesheet; core declares it for `.luz-btn` (`a`, `button` and `input` of type `button`, `submit` or `reset`). `luz-check` uses it, and adds the rules of loading (`load/tokens-missing`, `load/package-missing`, `load/layer-statement`, `load/order`, `load/no-stylesheet`), of misuse (`misuse/host-element`, `misuse/modifier-alone`, `misuse/part-orphan`, `misuse/state-class`) and of accessibility (`a11y/role-on-generic`, `a11y/link-no-href`). No runtime or style change: the comment is not in the minified CSS.
