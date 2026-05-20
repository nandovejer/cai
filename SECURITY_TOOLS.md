# Security Tools & Automation

Quick reference for security tools and automation in the CAI Design System repository.

---

## 🔒 Automated Security Verification

### Run Manual Verification

```bash
pnpm verify:security
```

**What it checks:** 23 automated security checks
- Secrets exposure (.npmrc, .env, .aws, .ssh)
- Configuration files (CODEOWNERS, dependabot.yml, SECURITY.md)
- Workflow permissions (explicit scopes)
- Linting configuration (ESLint, Stylelint)
- Package requirements (Node.js, pnpm versions)

**Expected output:**
```
✓ Security Verification Passed! (100%)
```

---

## 🪝 Git Pre-Commit Hook (Husky)

### Automatic Verification Before Every Commit

The pre-commit hook runs `verify:security` automatically when you commit:

```bash
$ git commit -m "my change"
🔒 Running security checks...
✓ Security Verification Passed! (100%)
✅ Security checks passed
[main abc1234] my change
```

**If security check fails:**
```bash
✗ Security Verification Failed
❌ Security verification failed. Commit aborted.
```

### Setup (One-time)

```bash
pnpm setup:husky
```

Or manually:
```bash
pnpm install husky --save-dev -w
pnpm husky install
chmod +x .husky/pre-commit
```

---

## 🤖 Dependabot Automation

**Configuration:** `.github/dependabot.yml`

**What it does:**
- Scans npm dependencies weekly (Mondays at 03:00 UTC)
- Scans GitHub Actions weekly (Mondays at 04:00 UTC)
- Auto-creates PRs for security updates
- Groups dev vs production dependencies
- Auto-rebases and auto-assigns to maintainer

**See also:** [GitHub Dependabot docs](https://docs.github.com/en/code-security/dependabot)

---

## 👤 Code Owner Enforcement

**Configuration:** `.github/CODEOWNERS`

**What it does:**
- Requires code review from @nandovejer for all files
- Specifically enforces review for:
  - `.github/workflows/` — CI/CD changes
  - `packages/tokens/` — Design tokens
  - `packages/core/` — Core design system
  - `packages/platform/` — Platform layer

**See also:** [GitHub CODEOWNERS docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

---

## 🔐 Workflow Permissions

**Configuration:** `.github/workflows/publish.yml`

**What it does:**
- Explicitly declares minimal permissions: `contents: read`
- Prevents workflows from modifying repository content
- Reduces attack surface of CI/CD pipelines

**Best practice:** All workflows should have explicit `permissions` blocks.

---

## 📋 Linting Configuration

### ESLint (`.eslintrc.json`)
Enforces JavaScript code quality:
- No `console.log` in production
- No `debugger` statements
- Require `const` over `var`
- Semicolons required
- Single quotes preferred

### Stylelint (`.stylelintrc.json`)
Enforces CSS standards:
- BEM naming convention
- No invalid hex colors
- No hardcoded colors (use CSS custom properties)
- Specific selector patterns

---

## 📁 Security Files Reference

### Configuration Files
- `.github/CODEOWNERS` — Code review enforcement
- `.github/dependabot.yml` — Dependency scanning
- `.github/workflows/ci.yml` — CI/CD pipeline
- `.github/workflows/publish.yml` — npm publishing
- `.eslintrc.json` — JavaScript linting
- `.stylelintrc.json` — CSS linting

### Scripts
- `scripts/verify-security.js` — 23 automated checks
- `scripts/setup-husky.js` — Husky installer
- `scripts/build-tokens.js` — Design tokens build
- `scripts/build-core.js` — Core design system build
- `scripts/build-platform.js` — Platform layer build

### Documentation
- `SECURITY.md` — Public security policy
- `SECURITY_AUDIT.md` — Technical audit details
- `SECURITY_ACTIONS.md` — Step-by-step GitHub UI setup
- `SECURITY_TOOLS.md` — This file (tools reference)
- `HUSKY_SETUP.md` — Husky setup and troubleshooting
- `docs/SECURITY_TOOLS.md` — In-depth tools guide

---

## 🚀 Quick Commands

```bash
# Run security verification
pnpm verify:security

# Setup Husky (first-time)
pnpm setup:husky

# Check GitHub setup status
node scripts/check-github-setup.js

# Lint CSS
pnpm lint:css

# Lint JavaScript
pnpm lint:js

# Run tests
pnpm test:unit
pnpm test:ui

# Build all packages
pnpm build
```

---

## ✅ Checklist: Before First Commit

- [ ] `pnpm install` (dependencies installed)
- [ ] `pnpm setup:husky` (git hooks configured)
- [ ] `pnpm verify:security` (passes 100%)
- [ ] `pnpm build` (no build errors)
- [ ] `pnpm lint:css && pnpm lint:js` (no linting errors)
- [ ] Branch protection enabled on GitHub (main branch)
- [ ] npm token configured in GitHub Secrets

---

## 🔗 Manual GitHub Setup (Required)

These require manual configuration in GitHub UI:

1. **Branch Protection** (Settings → Branches)
   - Require PR before merging
   - Require status checks: lint, test-unit, build
   - Require code review (1+ approval)

2. **npm Token** (npmjs.com → Settings → Tokens)
   - Create new granular access token
   - 30-day expiration
   - Scoped to @cai-ds/* packages

3. **GitHub Secret** (Settings → Secrets → Actions)
   - Name: `NPM_TOKEN`
   - Value: new npm token from step 2

---

## 📚 More Information

- [SECURITY.md](./SECURITY.md) — Public security policy
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) — Full audit details
- [SECURITY_ACTIONS.md](./SECURITY_ACTIONS.md) — Manual setup steps
- [HUSKY_SETUP.md](./HUSKY_SETUP.md) — Husky detailed guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines

---

**Last Updated:** May 20, 2026  
**Next Review:** August 20, 2026
