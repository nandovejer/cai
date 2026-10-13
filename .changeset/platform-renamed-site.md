---
"@cai-ds/site": major
"@cai-ds/core": major
---

`@cai-ds/platform` is now `@cai-ds/site`.

The package holds what every site needs above the components: page shell, site header, footer, sections, image frame, site search and language switcher. A piece is here when it needs data of the site or holds other pieces; everything else is in core. Packages for one kind of site (`cms`, `landing`) and for one CMS (`wordpress`) will build on it.

**Breaking**

- Package: `@cai-ds/platform` → `@cai-ds/site`. Files: `dist/platform.{css,min.css,js,min.js}` → `dist/site.{css,min.css,js,min.js}`. The export paths (`.`, `./search`, `./css`, `./css/min`, `./placeholders/*`) keep their shape.
- Cascade layer: `cai.platform` → `cai.site`. Core's layer order statement says `cai.site`.
- Classes: `.cai-platform-*` → `.cai-site-*`, except the site header: `.cai-platform-site-header*` → `.cai-site-header*`.
- Custom element: `<cai-platform-search>` → `<cai-site-search>`.
- Custom properties: `--cai-platform-lang-switcher-top` → `--cai-site-lang-switcher-top`, `--cai-platform-site-header-h` → `--cai-site-header-h`.
- The command block (`.cai-platform-command-block`) is removed. Copy its rules into your own CSS if you used it.

**Migrate**

Replace `@cai-ds/platform` with `@cai-ds/site` in your dependencies and imports, `cai-platform-site-header` with `cai-site-header`, then `cai-platform` with `cai-site`, and `cai.platform` with `cai.site` in any `@layer` statement of your own.
