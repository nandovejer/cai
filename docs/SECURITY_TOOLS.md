# Security Tools & Scripts

This document describes the automated security tools and scripts available in the CAI Design System repository.

---

## Security Verification Script

**Purpose:** Automated verification of repository security configuration and secrets exposure.

### Usage

```bash
# Run security verification
pnpm verify:security

# Or directly
node scripts/verify-security.js
```

### What It Checks

✅ **Secret Exposure**
- `.gitignore` includes `.npmrc`, `.env`, `.aws`, `.ssh`
- `.npmrc` and `.env` files don't exist in working directory
- No `.npmrc` or `.env` files in git history

✅ **Configuration Files**
- `.github/CODEOWNERS` exists and assigns reviewers
- `.github/dependabot.yml` configured for npm and GitHub Actions
- `SECURITY.md` policy exists with reporting guidelines
- `.github/workflows/publish.yml` has explicit `permissions` block

✅ **Linting & Code Quality**
- `.eslintrc.json` configuration exists
- `.stylelintrc.json` configuration exists

✅ **Package Configuration**
- `package.json` specifies Node.js version requirement
- `package.json` specifies pnpm version requirement

### Example Output

```
✓ Security Verification Passed! (100%)

Passed (23):
  ✓ .npmrc is gitignored
  ✓ .env is gitignored
  ✓ CODEOWNERS file exists
  ✓ Dependabot configuration exists
  ✓ SECURITY.md policy exists
  ... and more
```

### Interpreting Results

| Status | Meaning | Action |
|--------|---------|--------|
| ✓ Passed (100%) | All checks pass | No action needed |
| ✗ Issues detected | Some checks failed | Review and fix issues |

---

## Pre-Commit Hook (Husky)

**Purpose:** Automatically run security verification before each commit.

### Setup

The pre-commit hook is configured at `.husky/pre-commit`. It runs `verify:security` before allowing commits.

**First-time setup:**

```bash
# If Husky is not installed, install it
pnpm install husky --save-dev

# Initialize git hooks
pnpm husky install
```

### Behavior

When you run `git commit`:

1. Husky triggers the `.husky/pre-commit` hook
2. Script runs `node scripts/verify-security.js`
3. If verification passes (✓) → commit proceeds
4. If verification fails (✗) → commit is aborted, fix issues first

**Example:**

```bash
$ git commit -m "feat: add new component"
🔒 Running security checks...
✓ Security Verification Passed! (100%)
✅ Security checks passed
[main abc1234] feat: add new component
```

**If security check fails:**

```bash
$ git commit -m "feat: add .env accidentally"
🔒 Running security checks...
✗ .env not present
✗ Security Verification Failed
❌ Security verification failed. Commit aborted.
```

---

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`.

**Jobs:**
- `lint` — CSS and JS linting
- `test-unit` — Unit tests with Vitest
- `build` — Build verification
- `test-ui` — UI tests with Playwright (main pushes only)

**All jobs must pass before merging to main.**

### Publish Workflow (`.github/workflows/publish.yml`)

Runs when `packages/*/package.json` versions change on `main`.

**Configuration:**
- Minimal permissions: `contents: read` only
- Uses `secrets.NPM_TOKEN` for authentication
- Publishes to npm registry

**Automatic npm publishing steps:**
1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Build all packages (`pnpm build`)
3. Publish each package to npm

---

## Dependabot

**Purpose:** Automated dependency scanning and security updates.

### Configuration (`.github/dependabot.yml`)

- **Weekly npm scanning** — Every Monday at 03:00 UTC
- **Weekly GitHub Actions scanning** — Every Monday at 04:00 UTC
- **Auto-rebase** — Automatically rebases dependency updates
- **Grouped updates** — Dev and production dependencies separate
- **Auto-assign** — Assigned to @nandovejer for review

### Behavior

When vulnerabilities are found:
1. Dependabot creates a PR with the security update
2. PR is auto-assigned to maintainer
3. Tests must pass before merging
4. Maintainer reviews and merges

---

## Code Owners (`.github/CODEOWNERS`)

**Purpose:** Enforce code review requirements for critical files.

### Configuration

```
* @nandovejer                    # All files require nandovejer's review
.github/workflows/ @nandovejer   # Workflows require review
packages/core/ @nandovejer       # Core package requires review
packages/tokens/ @nandovejer     # Tokens package requires review
```

### Behavior

- Pull requests cannot be merged without approval from code owners
- Only @nandovejer can approve changes to CAI packages
- GitHub automatically requests review from code owners

---

## Manual Security Tasks

The following tasks must be performed manually in GitHub:

### Branch Protection

**Location:** Settings → Branches → main

**Configuration:**
- ✅ Require PR before merging
- ✅ Require status checks (lint, test-unit, build)
- ✅ Require code owner approvals
- ✅ Dismiss stale PR approvals

### npm Token Rotation

**Location:** https://www.npmjs.com/settings/~/tokens

**Frequency:** Every 30 days or when regenerating

**Steps:**
1. Delete old token
2. Create new granular access token
3. Set 30-day expiration
4. Update GitHub secret `NPM_TOKEN`

---

## Security Best Practices

### Before Committing

Run verification:
```bash
pnpm verify:security
```

### Before Pushing

Run full test suite:
```bash
pnpm lint:css
pnpm lint:js
pnpm test:unit
pnpm build
```

### When Adding Dependencies

Always review what's being added:
```bash
git diff package.json pnpm-lock.yaml
pnpm install  # Uses frozen lockfile
```

### Secret Management

Never commit:
- `.npmrc` or `.env` files
- API keys or tokens
- Private credentials
- SSH keys

Use GitHub Secrets instead:
- Settings → Secrets and variables → Actions
- Referenced as `${{ secrets.SECRET_NAME }}` in workflows

---

## Troubleshooting

### "Security Verification Failed"

Check the output for specific failures:

```bash
$ pnpm verify:security
✗ .npmrc is NOT gitignored
```

**Fix:** Add `.npmrc` to `.gitignore`

### Pre-commit Hook Not Running

Ensure Husky is installed:

```bash
# Install Husky
pnpm install husky --save-dev

# Initialize hooks
pnpm husky install

# Make hook executable
chmod +x .husky/pre-commit
```

### Tests Pass Locally but Fail in CI

Check GitHub Actions logs:
1. Go to repository Actions tab
2. Find the failing workflow
3. Click the job to see detailed logs
4. Look for linting or test errors

---

## Further Reading

- [SECURITY.md](../SECURITY.md) — Public security policy
- [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) — Technical audit details
- [SECURITY_ACTIONS.md](../SECURITY_ACTIONS.md) — Manual setup steps
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contribution guidelines

