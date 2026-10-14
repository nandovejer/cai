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

<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.1.0/dist/luz.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>

<!-- One modulepreload per lazy chunk, each with its own hash, before the
     script that imports it: the import uses the preload's verdict -->
<link
  rel="modulepreload"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/search.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>
<link
  rel="modulepreload"
  href="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/consent.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@luz-ds/site@0.1.0/dist/site.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>
```

Compute each hash from the file you are pinning:

```bash
curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
```

`luz.js` and `site.js` are ES modules and must be loaded with `type="module"`. SRI on an entry file does not cover the lazy chunks it imports on demand: core's `midi.js`, `table-sort.js` and `timeline.js`, and site's `search.js` (on a page with a `<luz-search>`) and `consent.js` (on a page with a `<luz-consent>`). Each chunk imports nothing, and each entry imports its chunks by fixed names next to it, never a URL built from the page. For full integrity coverage, add one `<link rel="modulepreload" integrity crossorigin>` per chunk the page may load, before the entry's `<script>`, as above: the browser checks the hash, and the entry's import uses that result instead of fetching the file again, so a chunk with a wrong hash never runs and the page stays as it is without JavaScript. Import maps with `integrity` are another way, for browsers that support them; they are not yet available in every browser LUZ supports. Self-hosting the files or installing from npm also works.

Range URLs such as `@luz-ds/core@3` are fine for prototypes, but they cannot carry an SRI hash and pick up new releases automatically.

2. **Set Content-Security-Policy (CSP) headers:**

```
Content-Security-Policy: 
  script-src 'self' cdn.jsdelivr.net;
  style-src 'self' cdn.jsdelivr.net;
  font-src 'self' cdn.jsdelivr.net;
```

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
