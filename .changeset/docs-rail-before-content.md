---
"@luz-ds/docs": patch
"@luz-ds/check": patch
---

"On this page" comes before the content. The rail (`aside.luz-docs-rail`) now goes between the sidebar and `main` in the markup, and the shell draws it above the content in one column and from 60rem (`"nav rail" / "nav main"`); from 80rem it is still the third column, beside the content, with its sticky inner box. Move your `<aside class="luz-docs-rail">` before `<main>`; the skip link still goes to `main`, past the sidebar and the rail. A rail link's long word now breaks inside the column (`overflow-wrap: anywhere`), so a page does not scroll sideways at 400 % text. `@luz-ds/check` ships the same snapshot of the packages, so it releases with them.
