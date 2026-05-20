# Security Policy

## Reporting Vulnerabilities

**Please do NOT create a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in CAI Design System, please report it privately:

- **Email:** security-report@example.com (replace with your contact)
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
| **2.x** | ✅ Active | Current | Yes |
| **1.x** | ❌ EOL | 2025-12-31 | No |

---

## Security Best Practices

### When Using CAI Design System from CDN

1. **Use Subresource Integrity (SRI) hashes** to verify files haven't been tampered with:

```html
<link 
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css"
  integrity="sha384-PLACEHOLDER-HASH"
  crossorigin="anonymous"
/>

<script 
  src="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js"
  integrity="sha384-PLACEHOLDER-HASH"
  crossorigin="anonymous"
></script>
```

*(Replace `PLACEHOLDER-HASH` with the actual SRI hash from jsDelivr)*

2. **Set Content-Security-Policy (CSP) headers:**

```
Content-Security-Policy: 
  script-src 'self' cdn.jsdelivr.net;
  style-src 'self' cdn.jsdelivr.net;
  font-src 'self' cdn.jsdelivr.net;
```

3. **Use specific versions** (not latest):
- ✅ Good: `@cai-ds/core@2.0.0`
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

**Token & Secret Management:**
- npm tokens are stored only in GitHub Secrets (never in `.npmrc`)
- Tokens have specific scopes: only `@cai-ds/*` packages
- Token expiration: 30 days (rotated regularly)
- No human has plaintext token access in day-to-day work

**Publishing Automation:**
- All npm publishes happen via GitHub Actions (`.github/workflows/publish.yml`)
- Workflow runs only on `main` branch when `package.json` versions change
- All publishes are logged and auditable

**Code Review Requirements:**
- All changes to `main` branch require PR + code review (enforced by branch protection)
- Status checks must pass: lint, test, build
- CODEOWNERS file specifies required reviewers per package

---

## Audit History

| Date | Finding | Status | Action |
|------|---------|--------|--------|
| 2026-05-20 | plaintext npm token in `.npmrc` | ✅ Resolved | Token removed from history, regenerated |
| 2026-05-20 | No branch protection on main | ✅ Resolved | Branch protection enabled |
| 2026-05-20 | No code owner enforcement | ✅ Resolved | CODEOWNERS file added |
| 2026-05-20 | No dependency scanning | ✅ Resolved | Dependabot configured |

---

## Security Checklist

Before each release:

- [ ] All tests pass (`pnpm test:unit`, `pnpm test:ui`)
- [ ] Linting passes (`pnpm lint:css`, `pnpm lint:js`)
- [ ] No new dependencies added (or justified security exception)
- [ ] Dependencies are up-to-date (check Dependabot alerts)
- [ ] Version bumps follow semver (breaking changes = major)
- [ ] CHANGELOG.md is updated
- [ ] CDN URLs are tested (check jsDelivr links)
- [ ] Code review approved by CODEOWNERS

---

## Contact

**Security Maintainer:** @nandovejer  
**Security Email:** security-report@example.com (or use GitHub Security Advisory)  
**GitHub Issues:** https://github.com/nandovejer/cai/issues

For non-security questions, use [CONTRIBUTING.md](./CONTRIBUTING.md) or GitHub discussions.

---

**Last Updated:** May 20, 2026  
**Next Review:** August 20, 2026
