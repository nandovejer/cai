# Security Policy

## Reporting Vulnerabilities

**Please do NOT create a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in LUZ Design System, please report it privately:

- **GitHub Security Advisory:** https://github.com/nandovejer/luz/security/advisories/new

**Include in your report:**
- Description of the vulnerability
- Affected versions or components
- Steps to reproduce (if applicable)
- Potential impact
- Your suggested fix (if available)

**Response Timeline:**
- Initial response: Within 48 hours
- Patch release: Within 2 weeks (for critical issues)
- Public disclosure: Only after patch is released

Thank you for helping keep LUZ secure!

---

## Supported Versions

| Version | Status | Support Until | Security Fixes |
|---------|--------|---------------|----------------|
| **0.1.x** | ✅ Active | Current | Yes |

---

## Security Best Practices

### When Using LUZ Design System from CDN

1. **Pin an exact version and use Subresource Integrity (SRI)** so a file cannot change under you. Load the layers in order — tokens, core, site:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.1.0/dist/luz-tokens.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>

<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>

<!-- The import map comes first: an import map after a module script is
     ignored. Each lazy chunk gets its own hash here -->
<script type="importmap">
{
  "integrity": {
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/midi.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/table-sort.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/timeline.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/i18n-es.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/search.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/consent.min.js": "sha384-<hash>",
    "https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/mode.min.js": "sha384-<hash>"
  }
}
</script>

<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>

<!-- Optional, a performance hint only: it starts the download early and
     checks nothing outside Chromium -->
<link
  rel="modulepreload"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/search.min.js"
  crossorigin="anonymous"
/>
```

Compute each hash from the file you are pinning:

```bash
curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
```

`luz.js` and `site.js` are ES modules and must be loaded with `type="module"`. SRI on an entry file does not cover the lazy chunks it imports on demand: core's `midi.js`, `table-sort.js`, `timeline.js` and one language file per language a page declares (`i18n-es.min.js`), and site's `search.js` (on a page with a `<luz-search>`), `consent.js` (on a page with a `<luz-consent>`) and `mode.js` (on a page with a `<luz-mode>`). Each chunk imports nothing, and each entry imports its chunks by fixed names next to it, never a URL built from the page.

To check the chunks, use an import map with an `integrity` section, placed before the first module script, as above: the browser checks each file at the URL listed, whenever the entry imports it. It works in Chrome 127 and later, Safari 18 and later and Firefox 138 and later. An older browser ignores the `integrity` key and loads the chunks unchecked, so there is no protection there. A `<link rel="modulepreload" integrity>` is not a guard outside Chromium: Safari (WebKit) runs the file it preloaded without checking the hash, and Firefox fetches the file again without it, so a wrong hash does not block the file in either. Use `modulepreload` as a performance hint only. For browsers without import map integrity, self-hosting the files or installing from npm are the safe options.

Range URLs such as `@luz-ds/core@3` are fine for prototypes, but they cannot carry an SRI hash and pick up new releases automatically.

2. **Set Content-Security-Policy (CSP) headers:**

```
Content-Security-Policy: 
  script-src 'self' cdn.jsdelivr.net;
  style-src 'self' cdn.jsdelivr.net;
  font-src 'self' cdn.jsdelivr.net;
```

LUZ's chunks, the language files among them, are loaded by a dynamic `import()` from the entry. A CSP that allows scripts by hash or nonce, without `'strict-dynamic'`, blocks that `import()`: the language chunk does not load, and the page falls back to English, with one console warning. Add `'strict-dynamic'`, or allow the origin of the files as above. A language file is a module of the same origin as the entry and runs with its authority; the build writes it from a validated JSON file, so the bytes a contributor wrote are never the module.

3. **Use specific versions** (not latest):
- ✅ Good: `@luz-ds/core@0.1.0`
- ❌ Avoid: `@luz-ds/core@latest`

### When Installing from npm

1. **Always use a lock file** (pnpm-lock.yaml, package-lock.json):
```bash
pnpm install  # Uses pnpm-lock.yaml
```

2. **Use `--save` or `--save-dev`** to update lock file:
```bash
pnpm add @luz-ds/core --save
pnpm add vitest --save-dev
```

3. **Avoid `npm install` without lockfile** in production or CI/CD.

4. **Review dependency changes** in pull requests:
```bash
git diff package.json
git diff pnpm-lock.yaml
```

---

## Supply Chain Security

### For LUZ Package Maintainers

**Publishing:**
- Packages are published only by `.github/workflows/publish.yml`, through npm trusted publishing (OIDC). No npm token is stored in GitHub or on any machine, and every release carries a provenance attestation.
- The publish job runs in the `release` environment, which requires a reviewer's approval.
- The publish job installs with `--ignore-scripts`: no dependency lifecycle script runs while it can mint an OIDC token.
- A release happens only when the changesets "version packages" PR is merged, and only after lint, audit, build, unit tests and the tarball contract check (`pnpm check:pack`) pass.
- Nobody publishes from a laptop.

**Code Review Requirements:**
- Changes reach `main` through pull requests with passing status checks (branch ruleset).
- CODEOWNERS specifies the required reviewers per package.

**Dependencies:**
- Published packages have zero runtime dependencies.
- Dev dependencies are audited in CI (`pnpm audit --audit-level=high`); only allow-listed packages may run install scripts (`pnpm.onlyBuiltDependencies`).
- GitHub Actions are pinned to commit SHAs and kept current by Dependabot.
- Dependabot waits 7 days (`cooldown`) before proposing a new version, so a compromised release is usually pulled before it reaches a PR.

**Docs site (GitHub Pages):**
- Every page carries a Content Security Policy (`PAGES_CSP` in `vite.config.js`): scripts only from the site, and no `data:` URLs in frames or objects.

---

## Audit History

| Date | Finding | Status | Action |
|------|---------|--------|--------|
| 2026-05-20 | Plaintext npm token committed | ⚠️ Verify | The token is still readable in git history (commits `9669d54`, `9df4341`). It must be revoked on npmjs.com; removing the files did not remove it from history |
| 2026-05-20 | No code owner enforcement | ✅ Resolved | CODEOWNERS file added |
| 2026-05-20 | No dependency scanning | ✅ Resolved | Dependabot configured |
| 2026-09-30 | `main` is not protected | ⚠️ Open | Add a ruleset: PR required, status checks required, no force-push |
| 2026-09-30 | Publishing used a long-lived npm token, hid failures and skipped CI | ✅ Resolved | OIDC trusted publishing, changesets release PR, CI gate (requires the npm and GitHub settings above) |
| 2026-09-30 | MIDI parser could hang the page on malformed files | ✅ Resolved | Bounds and length validation, size and event limits, regression tests |
| 2026-09-30 | 40 advisories in dev dependencies | ✅ Resolved | vitest upgraded, unused dependencies and stale overrides removed |
| 2026-10-12 | `release` environment missing (GitHub would create it unprotected) and `main` still unprotected | ⚠️ Open | Create `release` with a required reviewer and main-only deployments; add the `main` ruleset; npm trusted publishers point at `publish.yml` + `release` |
| 2026-10-12 | The two token commits are still served by SHA on GitHub | ⚠️ Open | Revoke the token, ask GitHub Support to purge `9669d54` and `9df4341`, then delete `NPM_TOKEN` and disallow tokens on npm |
| 2026-10-12 | `escapeHtml` did not escape `'`; publish job ran install scripts with `id-token: write`; Pages CSP allowed `data:` frames and objects; no Dependabot cooldown | ✅ Resolved | `&#39;` escaped; `--ignore-scripts` in the publish job; `data:` dropped; 7-day cooldown |
| 2026-09-30 | Tarballs shipped without licence texts | ✅ Resolved | LICENSE per package, licence text next to every font (all fonts MIT since 2026-09-30) |

---

## Security Checklist

Before each release:

- [ ] All tests pass (`pnpm test:unit`, `pnpm test:ui`)
- [ ] Linting passes (`pnpm lint:css`, `pnpm lint:js`)
- [ ] No new dependencies added (or justified security exception)
- [ ] Dependencies are up-to-date (check Dependabot alerts)
- [ ] Version bumps follow semver (breaking changes = major)
- [ ] Every change has a changeset (`pnpm changeset`)
- [ ] `pnpm check:pack` passes (tarball contents match the snapshots)
- [ ] CDN URLs are tested (check jsDelivr links)
- [ ] Code review approved by CODEOWNERS

---

## Contact

**Security Maintainer:** @nandovejer  
**Private reports:** https://github.com/nandovejer/luz/security/advisories/new  
**GitHub Issues:** https://github.com/nandovejer/luz/issues

For non-security questions, use [CONTRIBUTING.md](./CONTRIBUTING.md) or GitHub discussions.

---

**Last Updated:** September 30, 2026
