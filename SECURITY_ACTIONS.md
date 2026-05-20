# ⚠️ Critical Security Actions — CAI Repository

**Status:** 🔴 **HIGH PRIORITY** — Action required before next public use  
**Created:** May 20, 2026  
**Owner:** Repository maintainer (nandovejer)

---

## 🔴 CRITICAL (Do TODAY — Before Next Commit)

### 1. Remove `.npmrc` Token from Repository

**Why:** Plaintext npm token in source code is a **supply-chain attack vector**.

**Current State:**
```
File: .npmrc
Contains: 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
Status: ✗ EXPOSED in git history
```

**Action:**
```bash
# 1. Delete from working directory
rm .npmrc

# 2. Remove from git history (DESTRUCTIVE)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .npmrc' -- --all

# 3. Force push (⚠️ CAREFULLY — only if no other branches rely on history)
git push origin --force-with-lease
```

**Why `--force-with-lease`?** Safer than `--force`; rejects if someone else has pushed.

**Verification:**
```bash
# Confirm token is gone from all commits
git log --all --oneline | wc -l
git show HEAD:.npmrc  # Should show "fatal: path '.npmrc' does not exist in 'HEAD'"
```

---

### 2. Regenerate npm Token (Security Rotation)

**Why:** The old token was likely viewed during setup; compromise potential is high.

**Steps:**

1. Visit: https://www.npmjs.com/settings/~/tokens

2. **Find and DELETE** the token:
   - Look for: `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`
   - Click **"Delete"**

3. **Create new token:**
   - Click **"Generate New Token"** (or **"Create new token"**)
   - Type: **Granular access token** (not Classic)
   - Permissions:
     - ✅ Read and write packages
   - Packages and scopes:
     - ✅ @cai-ds/tokens
     - ✅ @cai-ds/core
     - ✅ @cai-ds/platform
   - Expiration: **30 days** (short-lived for CI/CD)
   - Name: `ci-github-actions-publish`

4. **Copy the new token** (appears once only)

5. **Update GitHub Secret:**
   - Go to: https://github.com/nandovejer/cai/settings/secrets/actions
   - Find: `NPM_TOKEN`
   - Click **"Update"**
   - Paste new token
   - Click **"Update secret"**

6. **Test:**
   ```bash
   # Make a tiny version bump
   cd packages/tokens
   npm version patch
   # Push to main
   git push origin main
   
   # Watch: https://github.com/nandovejer/cai/actions
   # "Publish to npm" job should complete successfully
   ```

---

### 3. Verify GitHub Actions Secret Exists

**Check that `NPM_TOKEN` secret is actually configured:**

1. Go to: https://github.com/nandovejer/cai/settings/secrets/actions
2. Look for `NPM_TOKEN` in the list
3. If missing → click **"New repository secret"** and add it with the new token from step 2

---

## 🟡 HIGH (Do This Week)

### 4. Enable Branch Protection on `main`

**Why:** Prevents accidental or malicious overwrites; requires CI/CD to pass.

**Steps:**

1. Go to: https://github.com/nandovejer/cai/settings/branches

2. Click **"Add branch protection rule"**

3. Configure:
   - **Branch name pattern:** `main`
   - ✅ **Require a pull request before merging**
     - (At least 1 approval required)
   - ✅ **Require status checks to pass before merging**
     - Select: `lint`, `test-unit`, `build`
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Dismiss stale pull request approvals**
   - ✅ **Require code reviews before merging**
     - (minimum number: 1)
   - Save

**Result:** Main branch is now protected. All changes require:
1. Pull request
2. Passing CI/CD checks
3. Code review approval

---

### 5. Add CODEOWNERS File

**Why:** Enforces code review by appropriate maintainer.

**Create file:** `.github/CODEOWNERS`

```
# Default owner for all files
* @nandovejer

# CI/CD workflows
.github/workflows/   @nandovejer

# Design tokens and build scripts
packages/tokens/     @nandovejer
scripts/build*.js    @nandovejer

# Core design system
packages/core/       @nandovejer

# Platform layer
packages/platform/   @nandovejer

# Documentation
*.md                 @nandovejer
apps/docs/           @nandovejer
```

**Commit:**
```bash
git add .github/CODEOWNERS
git commit -m "chore: add CODEOWNERS for PR review enforcement"
git push origin main
```

---

### 6. Enable Dependabot (Dependency Scanning)

**Why:** Automatically detects vulnerable npm packages.

**Steps:**

1. Go to: https://github.com/nandovejer/cai/settings/security_analysis

2. Enable:
   - ✅ **Dependabot alerts**
   - ✅ **Dependabot security updates** (auto-PR for vulnerabilities)

3. Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - nandovejer
    assignees:
      - nandovejer
```

**Commit:**
```bash
git add .github/dependabot.yml
git commit -m "chore: enable Dependabot for dependency scanning"
git push origin main
```

---

### 7. Add Explicit Permissions to Publish Workflow

**Why:** Limit what the GitHub Actions job can do.

**File:** `.github/workflows/publish.yml`

**Add this after `runs-on:`:**

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read        # Can read repo code
      # NO write to repo, PRs, issues, or discussions
```

**Commit:**
```bash
git add .github/workflows/publish.yml
git commit -m "chore: add explicit permissions to publish workflow"
git push origin main
```

---

## 🟢 NICE-TO-HAVE (This Month)

### 8. Create SECURITY.md Policy

**File:** `SECURITY.md` in repo root

```markdown
# Security Policy

## Reporting Vulnerabilities

**Do NOT** create a public GitHub issue for security vulnerabilities.

Email: **security@cai-ds.com** (or your contact)

Include:
- Description of the vulnerability
- Affected versions
- Reproduction steps (if possible)

We will respond within **48 hours** and work toward a patch.

## Supported Versions

| Version | Status           | Until          |
|---------|------------------|----------------|
| 2.x     | Actively supported | Current |
| 1.x     | End of life      | 2025-12-31 |

## Security Best Practices

When using CAI Design System:

- **CDN Usage:** Add Subresource Integrity (SRI) hashes:
  ```html
  <link 
    rel="stylesheet" 
    href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css"
    integrity="sha384-HASH-HERE"
    crossorigin="anonymous"
  >
  ```

- **CSP Headers:** Set a Content-Security-Policy:
  ```
  script-src 'self' cdn.jsdelivr.net;
  style-src 'self' cdn.jsdelivr.net;
  ```

- **npm Installation:** Always use `--save` or lock files (pnpm-lock.yaml)

## Audit History

- **2026-05-20:** Initial security audit (SECURITY_AUDIT.md)
  - Identified: plaintext token exposure
  - Status: Remedial actions taken
```

---

## Summary Checklist

Copy-paste this into a GitHub issue to track progress:

```markdown
# Security Remediation Checklist

## 🔴 CRITICAL (This week)
- [ ] Remove `.npmrc` from git history
- [ ] Regenerate npm token (30-day expiration)
- [ ] Verify GitHub `NPM_TOKEN` secret is configured
- [ ] Test publish workflow with new token

## 🟡 HIGH (This week)
- [ ] Enable branch protection on `main`
- [ ] Create `.github/CODEOWNERS`
- [ ] Enable Dependabot alerts & security updates
- [ ] Add `.github/dependabot.yml`
- [ ] Add explicit permissions to publish workflow

## 🟢 NICE (This month)
- [ ] Create `SECURITY.md` policy
- [ ] Document secret rotation SOP
- [ ] Add npm SRI hashes to documentation
```

---

## Post-Action Verification

After completing all steps, verify:

1. **No plaintext secrets in repo:**
   ```bash
   git log --all -p | grep "npm_" | wc -l  # Should be 0
   ```

2. **Branch protection active:**
   - Try pushing to main from a branch → should be denied
   - PR without approval → merge button disabled

3. **Dependabot configured:**
   - Check GitHub repo → **Insights → Dependency graph → Dependabot alerts**

4. **Token works:**
   - Trigger a version bump and push to main
   - Verify `Publish to npm` workflow runs successfully

---

## Questions?

Refer to:
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) — Full technical security audit
- [DOCUMENTATION_ANALYSIS.md](./DOCUMENTATION_ANALYSIS.md) — Docs consolidation
- GitHub docs: https://docs.github.com/en/code-security

---

**Next Review:** June 20, 2026 (30 days)

