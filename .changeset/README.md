# Changesets

Each file here describes one change to the LUZ packages and how it affects the people who use them. Releases read them to choose the next version and to write the changelog.

- Add one with `pnpm changeset`: pick the packages, the kind of bump, and write what changed in plain words.
- Breaking changes say how to migrate (see "A breaking change" below).
- `@luz-ds/tokens`, `@luz-ds/core` and `@luz-ds/site` always share one version (`fixed` in `config.json`).

## A breaking change

LUZ is in beta, so a breaking change ships as a `minor` in 0.x. The bump alone says nothing to a reader, so the changeset says it in words: add a paragraph that starts with `Breaking:` and tells the reader how to migrate.

```md
---
"@luz-ds/core": minor
---

Rename the `.luz-btn--big` modifier to `.luz-btn--lg`.

Breaking: replace `.luz-btn--big` with `.luz-btn--lg` in your markup.
```

- The first line is the summary. Each `Breaking:` paragraph is copied as written into the "For AI agents" block of the package README (`scripts/ai-readme.js`, run by `pnpm release:version`), under the heading "Breaking changes", for the version being released.
- A changeset that bumps a package to `major` has a `Breaking:` paragraph too. A test fails without it.
- Write the paragraph so it can be read alone: name the old and the new thing, in code.

Never publish by hand: the release workflow does it from these files.
