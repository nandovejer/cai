# Changesets

Each file here describes one change to the LUZ packages and how it affects the people who use them. Releases read them to choose the next version and to write the changelog.

- Add one with `pnpm changeset`: pick the packages, the kind of bump, and write what changed in plain words.
- Breaking changes say how to migrate.
- `@luz-ds/tokens`, `@luz-ds/core` and `@luz-ds/site` always share one version (`fixed` in `config.json`).

Never publish by hand: the release workflow does it from these files.
