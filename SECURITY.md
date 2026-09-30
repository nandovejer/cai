# Security Policy

## Reporting Vulnerabilities

**Please do NOT create a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in CAI Design System, please report it privately:

- **GitHub Security Advisory:** https://github.com/nandovejer/cai/security/advisories/new

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

Thank you for helping keep CAI secure!

---

## Supported Versions

| Version | Status | Support Until | Security Fixes |
|---------|--------|---------------|----------------|
| **3.x** | ✅ Active | Current | Yes |
| **2.x** | ❌ EOL | — | No |
| **1.x** | ❌ EOL | 2025-12-31 | No |

---

## Security Best Practices

### When Using CAI Design System from CDN

1. **Pin an exact version and use Subresource Integrity (SRI)** so a file cannot change under you. Load the layers in order — tokens, core, platform:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@3.0.0/dist/cai-tokens.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.min.css"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
/>

<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@cai-ds/core@3.0.0/dist/cai.min.js"
  integrity="sha384-<hash>"
  crossorigin="anonymous"
></script>
```

Compute each hash from the file you are pinning:

```bash
curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
```

`cai.js` is an ES module and must be loaded with `type="module"`. SRI on the entry file does not cover the MIDI chunk it imports on demand (`midi.js`); pages that play MIDI and need full integrity coverage should self-host the files or install from npm.

Range URLs such as `@cai-ds/core@3` are fine for prototypes, but they cannot carry an SRI hash and pick up new releases automatically.

2. **Set Content-Security-Policy (CSP) headers:**

```
Content-Security-Policy: 
  script-src 'self' cdn.jsdelivr.net;
  style-src 'self' cdn.jsdelivr.net;
  font-src 'self' cdn.jsdelivr.net;
```

3. **Use specific versions** (not latest):
- ✅ Good: `@cai-ds/core@3.0.0`
- ❌ Avoid: `@cai-ds/core@latest`

### When Installing from npm

1. **Always use a lock file** (pnpm-lock.yaml, package-lock.json):
```bash
pnpm install  # Uses pnpm-lock.yaml
```

2. **Use `--save` or `--save-dev`** to update lock file:
```bash
pnpm add @cai-ds/core --save
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

### For CAI Package Maintainers

**Publishing:**
- Packages are published only by `.github/workflows/publish.yml`, through npm trusted publishing (OIDC). No npm token is stored in GitHub or on any machine, and every release carries a provenance attestation.
- The publish job runs in the `release` environment, which requires a reviewer's approval.
- A release happens only when the changesets "version packages" PR is merged, and only after lint, audit, build, unit tests and the tarball contract check (`pnpm check:pack`) pass.
- Nobody publishes from a laptop.

**Code Review Requirements:**
- Changes reach `main` through pull requests with passing status checks (branch ruleset).
- CODEOWNERS specifies the required reviewers per package.

**Dependencies:**
- Published packages have zero runtime dependencies.
- Dev dependencies are audited in CI (`pnpm audit --audit-level=high`); only allow-listed packages may run install scripts (`pnpm.onlyBuiltDependencies`).
- GitHub Actions are pinned to commit SHAs and kept current by Dependabot.

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
| 2026-09-30 | Tarballs shipped without licence texts | ✅ Resolved | LICENSE per package, OFL text next to every font |

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
**Private reports:** https://github.com/nandovejer/cai/security/advisories/new  
**GitHub Issues:** https://github.com/nandovejer/cai/issues

For non-security questions, use [CONTRIBUTING.md](./CONTRIBUTING.md) or GitHub discussions.

---

**Last Updated:** September 30, 2026
