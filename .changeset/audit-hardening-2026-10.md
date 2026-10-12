---
"@cai-ds/core": patch
---

Security hardening from the pre-release audit. `escapeHtml` (`@cai-ds/core/utils`) now also escapes `'` as `&#39;`, so its output is safe inside single-quoted attributes too. `t()` fills a `{name}` placeholder only from the caller's own properties (`Object.hasOwn`), never from inherited ones such as `{constructor}`. The repository side: the publish job installs without lifecycle scripts, the docs site CSP no longer allows `data:` in frames and objects, and Dependabot waits 7 days before it proposes a new version.
