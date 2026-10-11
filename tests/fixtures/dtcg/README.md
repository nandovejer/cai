# DTCG schemas, version 2025.10

Copies of the official JSON Schemas of the Design Tokens Community Group, kept here so the tests need no network:

- `2025.10/format.json` ← https://www.designtokens.org/schemas/2025.10/format.json
- `2025.10/resolver.json` ← https://www.designtokens.org/schemas/2025.10/resolver.json

Retrieved 2026-10-11, unchanged. Both are draft-07 and self-contained (every `$ref` points at an `$id` inside the file). The specification they belong to is the "Design Tokens Format Module 2025.10", a Final Community Group Report of 28 October 2025: https://www.designtokens.org/TR/2025.10/format/ (and `/resolver/`).

When the Community Group publishes a newer version, replace both files, change `DTCG_VERSION` in `scripts/tokens-dtcg.js`, and run `pnpm tokens:build` and `pnpm test:unit`.
