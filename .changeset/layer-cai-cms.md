---
"@cai-ds/tokens": minor
"@cai-ds/core": minor
---

The layer order statement that every published stylesheet repeats first names a new layer, `cai.cms` (the patterns of `@cai-ds/cms`), after `cai.landing` and before `cai.print`: `@layer cai.tokens, cai.themes, cai.settings, cai.generic, cai.elements, cai.objects, cai.components, cai.utilities, cai.site, cai.landing, cai.cms, cai.print;`. Landing and cms share no class, so their order decides nothing between them; cms comes after landing so no existing layer moved. Nothing changes for a page that does not load cms. If you write that statement yourself to put a layer of yours between two of CAI's, add `cai.cms` to it.
