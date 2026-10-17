---
"@luz-ds/tokens": minor
"@luz-ds/core": minor
"@luz-ds/check": patch
---

The layer statement that every stylesheet repeats now names `luz.docs`, after `luz.app` and before `luz.print` (`luz.tokens, luz.themes, luz.settings, luz.generic, luz.elements, luz.objects, luz.components, luz.utilities, luz.site, luz.landing, luz.cms, luz.app, luz.docs, luz.print`). No existing layer moves. If you repeat the statement in your own stylesheet, add `luz.docs` before `luz.print`; a stylesheet that does not is not affected unless it loads `@luz-ds/docs`.
