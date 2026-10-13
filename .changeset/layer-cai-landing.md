---
"@cai-ds/tokens": minor
"@cai-ds/core": minor
---

The layer order statement that every published stylesheet repeats first names a new layer, `cai.landing` (the patterns of `@cai-ds/landing`), after `cai.site` and before `cai.print`: `@layer cai.tokens, cai.themes, cai.settings, cai.generic, cai.elements, cai.objects, cai.components, cai.utilities, cai.site, cai.landing, cai.print;`. Nothing changes for a page that does not load landing. If you write that statement yourself to put a layer of yours between two of CAI's, add `cai.landing` to it.
