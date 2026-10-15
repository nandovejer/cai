# Astro build: LUZ in a real Astro project

The page `apps/docs/pages/get-started/bundler.html` ("With a bundler or framework") states what is written here. `tests/bundler-docs.test.js` keeps the page and this note in step (the version and the date of the "Built with Astro" line). This is a manual check, not a CI test: it installs about 200 transitive packages and needs a network.

Re-run it in F8 against the published packages and update this file, the "Built with Astro" line and the date on the page together.

## Run

| Field | Value |
| --- | --- |
| Date | 2026-10-15 |
| Astro | 7.3.8 |
| Node | 22.22.1 |
| Packages | `@luz-ds/tokens` and `@luz-ds/core`, packed from the checkout at 0.0.0 |
| Install | `npm install --legacy-peer-deps` against the local tarballs (at 0.0.0 the peers `^0.1.0` do not resolve; after 0.1.0 is published a plain `npm install @luz-ds/tokens @luz-ds/core` is right) |
| Config | `astro.config.mjs` empty: `defineConfig({})` |

## Project

```
my-site/
├─ package.json
├─ astro.config.mjs            (empty config: defineConfig({}))
└─ src/
   ├─ layouts/Base.astro       the two CSS imports, the script
   ├─ styles/site.css          your own CSS, last, outside any layer
   └─ pages/index.astro
```

`Base.astro` imports `@luz-ds/tokens/css`, `@luz-ds/core/css` and `../styles/site.css` in its frontmatter and has `<script>import "@luz-ds/core";</script>` before `</body>`. `site.css` holds `:root { --luz-type-base: 1.125rem; }`.

## What is verified

- `import "@luz-ds/tokens/css";` and `import "@luz-ds/core/css";` in the frontmatter of a layout build with `astro build` and serve with `astro dev` without any `astro.config.mjs` setting. Astro's documentation says an extensionless subpath import of a package needs `vite.ssr.noExternal`; LUZ's `./css` export did not need it (dev: HTTP 200, one `<style>` per file).
- The build output holds the layers in the declared order (`luz.tokens` first, `luz.print` last), the fonts as hashed assets, and the consumer's unlayered `:root { --luz-type-base: 1.125rem }` last.
- A `<script>` with `import "@luz-ds/core";` is bundled by Astro into one `type="module"` file with the lazy chunks split (about 23 kB unminified in that build; Astro's size, not LUZ's budget).
- `<link rel="stylesheet" integrity crossorigin>` in `<head>` and `<script type="module" src="https://…" integrity crossorigin>` are written out unchanged; `is:inline` on the script also leaves it as written. Astro processes only a `<script>` with no attributes other than `src`.
- Every module of `@luz-ds/core` and `@luz-ds/site` imports in plain Node with no `document` (10 modules tried, no error).

## Not verified

The page must not claim any of these:

- Vite on its own, Next, Nuxt, SvelteKit and webpack.
- Astro with a view transition router (the scripts would need `astro:page-load`), and `<ClientRouter />`.
- The `landing`, `cms` and `app` CSS imports (same shape, not built).
- A look at the built page in a browser (the build output was inspected, not browsed).
- Windows.
