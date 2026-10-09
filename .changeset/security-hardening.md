---
"@cai-ds/core": patch
---

Security hardening from the audit.

- `highlight.js` tokenises in one pass and escapes every piece once. The old chained replacements could match inside markup they had added and produce broken HTML. There was no XSS path, because the input was always escaped first.
- `MidiPlayer.load()` stops reading a response as soon as it passes 5 MB, even when the server sends no `content-length`.
- `i18n` looks up only its own languages, so `lang="constructor"` falls back to English.
- `registerLocale()` throws a `TypeError` when given something that is not a language tag, such as `"__proto__"`.

Repository only (not published): the demo audio is a 30-second clip generated in the repo, with no metadata, replacing a third-party recording. The apps have no inline scripts, `publish.js` checks the real tarball before upload, the version job installs with `--ignore-scripts`, pnpm is pinned to 9.15.9 with its hash, `source-map-js` is overridden to ≥ 1.2.2, two dev-only advisories with no fix are ignored (EX-004), and `CAI_PAGES_OUT` can only point to docs/ or a temp folder.
