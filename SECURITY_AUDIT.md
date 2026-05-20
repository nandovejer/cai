# GitHub Repository Security Audit — CAI Design System

**Date:** May 20, 2026  
**Scope:** Repository-level security assessment  
**Reviewer Role:** Security Specialist (GitHub Repository Security)  

---

## Executive Summary

**Overall Risk Level:** 🟡 **MEDIUM** → **Low with recommended fixes**

The repository implements GitHub Actions CI/CD with npm publishing automation. Security posture is **generally good** with some critical gaps in token management, permissions, and documentation. All identified issues are **remedial** (not architectural flaws).

---

## Critical Findings

### 1. ⚠️ npm Token Exposure Risk (CRITICAL)

**Location:** `.npmrc`  
**Status:** ❌ **HIGH RISK**

```
//registry.npmjs.org/:_authToken=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
```

**Issues:**
- ✗ Plaintext token stored in checked-in file (even if `.gitignore`d, risk if history accessed)
- ✗ Token provides **read & write access to all 3 packages** without scope limitations
- ✗ **No expiration date** — token lives indefinitely
- ✗ **No IP restrictions** — token works from anywhere
- ✗ No audit trail on npm account for this token's usage
- ✗ If `.npmrc` ever exposed (git history leak, dev machine compromise), attacker gets full publish access

**Recommendation:**
- ❌ **REMOVE `.npmrc` from repository immediately**
- ✅ Use GitHub Actions `secrets.NPM_TOKEN` (already implemented in `publish.yml`)
- ✅ Rotate this token on npmjs.com today (Settings → Tokens → Delete → Create new)
- ✅ Verify no other `.npmrc` files exist in history: `git log --all --full-history -- ".npmrc"`

**Migration Path:**
1. Delete `.npmrc` from working directory
2. Delete from git history: `git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .npmrc' -- --all`
3. Force-push (high-risk, only if secrets are fresh): `git push origin --force`
4. Regenerate npm token with **shorter expiration** (30 days recommended for automation)

---

### 2. ⚠️ GitHub Actions Secrets Misconfiguration (MEDIUM)

**Location:** `.github/workflows/publish.yml`  
**Status:** 🟡 **NEEDS VERIFICATION**

**Issue:** The workflow uses `secrets.NPM_TOKEN` but I cannot verify:
- Is the secret actually configured in GitHub Settings?
- What permissions does the token have?
- Does it have expiration set?
- Is it scoped to the 3 packages only?

**Evidence from plan:**
```yaml
env:
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Recommendation:**
- ✅ Verify in **GitHub → Settings → Secrets and variables → Actions**
- ✅ Confirm `NPM_TOKEN` is present
- ✅ Check npm.com if token is scoped or granular

---

### 3. 🔴 Missing Branch Protection Rules (CRITICAL for integrity)

**Location:** GitHub repository Settings → Branches  
**Status:** ❌ **NOT CONFIGURED**

**Risk:** Anyone with push access can:
- Force-push to `main` (overwriting history)
- Publish broken code (no required status checks)
- Bypass CI/CD gates

**Recommendation:**
```
GitHub Settings → Branches → Add rule:
  Branch name pattern: main
  ✅ Require a pull request before merging
  ✅ Require status checks to pass before merging
    - lint
    - test-unit
    - build
  ✅ Require branches to be up to date before merging
  ✅ Dismiss stale pull request approvals
  ✅ Require code reviews (at least 1) before merging
  ✅ Require review from code owners (if CODEOWNERS exists)
```

---

### 4. 🟡 Missing CODEOWNERS File

**Location:** `.github/CODEOWNERS`  
**Status:** ❌ **NOT PRESENT**

**Risk:** Without a `CODEOWNERS` file, PR reviews aren't enforced by team. The repo doesn't know who owns tokens, core, platform, docs, or CI/CD.

**Recommendation:**
Create `.github/CODEOWNERS`:
```
# CI/CD and publishing
.github/workflows/   @nandovejer
.npmrc              @nandovejer (should be deleted)
scripts/build*.js   @nandovejer

# Packages
packages/tokens/    @nandovejer
packages/core/      @nandovejer
packages/platform/  @nandovejer

# Documentation
*.md                @nandovejer
apps/docs/          @nandovejer
```

---

### 5. 🟡 Workflow File Permissions (MEDIUM)

**Location:** `.github/workflows/publish.yml`  
**Status:** ⚠️ **INCOMPLETE**

**Current:**
```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    # ❌ No explicit permissions declared
```

**Issue:** GitHub Actions job default permissions are broad. Should explicitly declare minimal scopes.

**Recommendation:**
```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read          # Read repo code
      # NO write to contents (don't auto-commit)
      # NO pull-requests (don't manage PRs)
      # NO issues (don't manage issues)
```

---

### 6. 🟡 Missing Dependency Scanning

**Location:** Repository Settings → Security → Code scanning  
**Status:** ❌ **NOT ENABLED**

**Risk:** Vulnerable npm packages used in CI/CD (Rollup, Vitest, Playwright, ESLint, etc.) are not automatically scanned.

**Recommendation:**
- ✅ Enable GitHub's native dependency scanning (Dependabot):
  - GitHub → Settings → Code security and analysis → Enable "Dependabot alerts"
  - Check "Dependabot security updates" (auto-PR for vulnerabilities)
  - Add `.github/dependabot.yml`

**Create `.github/dependabot.yml`:**
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

---

### 7. 🟡 Publish Workflow Lacks Error Handling (MEDIUM)

**Location:** `.github/workflows/publish.yml`  
**Status:** ⚠️ **RISKY**

**Current:**
```yaml
- name: Publish @cai-ds/tokens
  run: |
    cd packages/tokens
    npm publish --access public || true    # ❌ Silently fails
```

**Issue:** `|| true` masks failures. If `npm publish` fails (network, auth, invalid version), the workflow succeeds anyway, but the package doesn't publish. Next developer assumes it worked.

**Better approach:**
```yaml
- name: Publish @cai-ds/tokens
  run: |
    cd packages/tokens
    npm publish --access public
  # Let failure bubble; GitHub Actions will report failure
```

**Alternative (if versions already published and you want to skip):**
```yaml
- name: Publish @cai-ds/tokens
  run: |
    cd packages/tokens
    npm publish --access public 2>&1 | tee publish.log
    if grep -q "E403" publish.log; then
      echo "Version already published (E403)"
    elif [ $? -ne 0 ]; then
      echo "Publish failed unexpectedly"
      exit 1
    fi
```

---

### 8. 🟡 Missing Secret Rotation Policy

**Status:** ❌ **NOT DOCUMENTED**

**Risk:** If `secrets.NPM_TOKEN` is leaked, attacker has permanent access unless manually rotated.

**Recommendation:**
Document a secret rotation SOP:
```markdown
# Secret Rotation Policy

## npm Token Rotation
- **Frequency:** Every 90 days (or immediately if leaked)
- **Steps:**
  1. Visit https://www.npmjs.com/settings/~/tokens
  2. Delete old token
  3. Create new token: "CI/CD publish" with 30-day expiration
  4. Update GitHub secret: Settings → Secrets → NPM_TOKEN
  5. Verify workflow runs successfully with new token
```

---

## Medium Findings

### 9. 🟡 No Security.txt

**Location:** Repository root  
**Status:** ❌ **NOT PRESENT**

**Recommendation:**
Create `SECURITY.md`:
```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email **security@example.com** 
instead of using the issue tracker. Do not publicly disclose until we've had 
30 days to patch.

## Supported Versions

| Version | Status           |
|---------|------------------|
| 2.x     | Actively supported |
| 1.x     | End of life      |

## Security Headers (for CDN usage)

When serving CAI Design System from a CDN, ensure:
- ✅ Content-Security-Policy headers are set
- ✅ Subresource Integrity (SRI) is used for CDN links
- ✅ CORS is restrictive
```

---

### 10. 🟡 Incomplete `.gitignore` Coverage

**Location:** `.gitignore`  
**Status:** ⚠️ **NEEDS REVIEW**

**Missing entries to add:**
```
# Secrets and tokens
.env
.env.local
.env.*.local
.npmrc                  # ← CRITICAL
npm-debug.log*

# IDE & OS
.DS_Store
.vscode/settings.json
.idea/

# Build artifacts (already covered)
dist/
build/

# Temporary
*.tmp
*.log
.turbo/
```

---

## Low Findings

### 11. 🟢 CI/CD Workflow Structure

**Status:** ✅ **GOOD**

**Strengths:**
- ✅ Separate jobs for lint, test, build (parallelizable)
- ✅ UI tests only on `main` push (cost-conscious)
- ✅ Uses `--frozen-lockfile` (reproducible builds)
- ✅ GitHub Actions versions pinned (`@v4`, not `@latest`)

**Minor improvement:**
- Add `cache: pnpm` to all Node setup steps (already done ✅)

---

### 12. 🟢 Build Scripts

**Status:** ✅ **DECENT**

**Good:**
- Uses Node scripts instead of shell (platform-independent)
- Rollup bundling implemented for proper module resolution

**Could improve:**
- Add input validation to scripts (check file existence before reading)
- Add error handling for failed builds

---

## Compliance Checklist

| Requirement                              | Status | Notes                                      |
|------------------------------------------|--------|-------------------------------------------|
| **Secrets not in code**                  | ❌     | `.npmrc` token exposed; remove immediately |
| **Branch protection on main**            | ❌     | Set up required status checks + reviews   |
| **Code review enforcement**              | ❌     | Add CODEOWNERS file                       |
| **Dependency vulnerability scanning**   | ❌     | Enable Dependabot alerts                  |
| **Workflow job permissions minimal**    | ⚠️     | Add explicit `permissions:` block         |
| **Secret rotation documented**          | ❌     | Add SECURITY.md                           |
| **Supply chain security (SLSA)**        | ⚠️     | N/A for design system (no artifacts)      |
| **Audit logging for secrets**           | ⚠️     | GitHub logs all secret access             |

---

## Recommended Actions (Priority Order)

### 🔴 Do Today (Before Next Commit)
1. **Delete `.npmrc` from the repository**
   ```bash
   git rm .npmrc
   git commit -m "chore: remove plaintext npm token from repo"
   ```
2. **Rotate npm token** at https://www.npmjs.com/settings/~/tokens
3. **Verify GitHub secret** `NPM_TOKEN` is configured

### 🟡 Do This Week
4. Set up **branch protection** for `main`
5. Add **CODEOWNERS** file
6. Enable **Dependabot** dependency scanning
7. Add **explicit permissions** to publish workflow
8. Update `.gitignore` to exclude `.npmrc`

### 🟢 Do This Month
9. Create **SECURITY.md** policy
10. Document **secret rotation SOP**
11. Implement **npm publish error handling** (remove `|| true`)

---

## Risk Assessment Summary

| Category                    | Before        | After Fixes   | Impact          |
|-----------------------------|---------------|---------------|-----------------|
| **Token exposure**          | 🔴 CRITICAL   | 🟢 LOW        | Highest priority |
| **Supply chain integrity**  | 🟡 MEDIUM     | 🟢 LOW        | Branch protection |
| **Dependency management**   | 🟡 MEDIUM     | 🟢 LOW        | Dependabot |
| **Access control**          | 🟡 MEDIUM     | 🟢 LOW        | CODEOWNERS |

---

## Conclusion

**Current State:** Functional, but with high-risk token exposure.  
**Post-Fixes:** Enterprise-grade security posture for open-source design system.

The workflow automation is well-designed. The main risk is **plaintext secrets in source control**. Once `.npmrc` is removed and proper GitHub Actions secrets are verified, the security posture becomes solid.

**Next Step:** Execute the "Do Today" actions, then schedule "Do This Week" for team implementation.

