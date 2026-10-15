---
"@luz-ds/core": patch
"@luz-ds/site": patch
"@luz-ds/check": patch
---

`dist/classes.json` of a package now ends with `hooks`, the `data-luz-*` attribute names the package's own CSS selects and its script reads or writes (`data-luz-classless`, `data-luz-sort`, `data-luz-spy`…), sorted, when there is at least one. `luz-check` reads them to tell a hook LUZ uses from an attribute it does not. No runtime or style change.
