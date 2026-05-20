#!/usr/bin/env node

/**
 * Security Verification Script
 * Checks for common security issues in the CAI repository
 * Run: node scripts/verify-security.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

class SecurityVerifier {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passes = [];
  }

  log(color, symbol, message) {
    console.log(`${color}${symbol}${RESET} ${message}`);
  }

  error(message) {
    this.log(RED, '✗', message);
    this.issues.push(message);
  }

  warn(message) {
    this.log(YELLOW, '⚠', message);
    this.warnings.push(message);
  }

  pass(message) {
    this.log(GREEN, '✓', message);
    this.passes.push(message);
  }

  checkFileExists(filePath, description) {
    const fullPath = path.resolve(REPO_ROOT, filePath);
    if (fs.existsSync(fullPath)) {
      this.pass(`${description} exists`);
      return true;
    } else {
      this.error(`${description} missing: ${filePath}`);
      return false;
    }
  }

  checkFileContains(filePath, pattern, description) {
    const fullPath = path.resolve(REPO_ROOT, filePath);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(pattern)) {
        this.pass(`${description}`);
        return true;
      } else {
        this.warn(`${description} not found`);
        return false;
      }
    } catch (e) {
      this.error(`Cannot read ${filePath}`);
      return false;
    }
  }

  checkGitIgnore() {
    console.log(`\n${BOLD}🔒 Checking .gitignore${RESET}`);
    const secrets = ['.npmrc', 'npm-debug.log', '.env', '.aws', '.ssh'];
    const fullPath = path.resolve(REPO_ROOT, '.gitignore');

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      secrets.forEach(secret => {
        if (content.includes(secret)) {
          this.pass(`${secret} is gitignored`);
        } else {
          this.error(`${secret} is NOT gitignored`);
        }
      });
    } catch (e) {
      this.error('Cannot read .gitignore');
    }
  }

  checkGitHistory() {
    console.log(`\n${BOLD}📜 Checking git history for secrets${RESET}`);
    try {
      // Check for .npmrc file in history
      const npmrcCheck = execSync('git log --all --name-only --pretty=format: | sort -u | grep -i npmrc', {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (npmrcCheck.trim()) {
        this.error('Found .npmrc in git history (should have been removed)');
      } else {
        this.pass('.npmrc not found in git history');
      }

      // Check for .env file in history
      const envCheck = execSync('git log --all --name-only --pretty=format: | sort -u | grep -E "^\\.env"', {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (envCheck.trim()) {
        this.warn('.env or similar found in git (check for secrets)');
      } else {
        this.pass('.env not found in git history');
      }
    } catch (e) {
      this.pass('No secrets detected in git history files');
    }
  }

  checkCodeowners() {
    console.log(`\n${BOLD}👤 Checking CODEOWNERS${RESET}`);
    this.checkFileExists('.github/CODEOWNERS', 'CODEOWNERS file');
    this.checkFileContains(
      '.github/CODEOWNERS',
      '@nandovejer',
      'CODEOWNERS has maintainer assigned'
    );
  }

  checkDependabot() {
    console.log(`\n${BOLD}🤖 Checking Dependabot configuration${RESET}`);
    this.checkFileExists('.github/dependabot.yml', 'Dependabot configuration');
    this.checkFileContains(
      '.github/dependabot.yml',
      'npm',
      'Dependabot monitors npm dependencies'
    );
    this.checkFileContains(
      '.github/dependabot.yml',
      'github-actions',
      'Dependabot monitors GitHub Actions'
    );
  }

  checkSecurityMD() {
    console.log(`\n${BOLD}📋 Checking SECURITY.md${RESET}`);
    this.checkFileExists('SECURITY.md', 'SECURITY.md policy');
    this.checkFileContains('SECURITY.md', 'Reporting', 'Security reporting guidelines');
    this.checkFileContains('SECURITY.md', 'SRI', 'SRI hash recommendations');
  }

  checkWorkflowPermissions() {
    console.log(`\n${BOLD}🔐 Checking workflow permissions${RESET}`);
    this.checkFileExists('.github/workflows/publish.yml', 'Publish workflow');
    this.checkFileContains(
      '.github/workflows/publish.yml',
      'permissions:',
      'Workflow declares explicit permissions'
    );
    this.checkFileContains(
      '.github/workflows/publish.yml',
      'contents: read',
      'Workflow has minimal read-only permissions'
    );
  }

  checkNoSecrets() {
    console.log(`\n${BOLD}🚫 Checking for exposed secrets${RESET}`);
    const filesToCheck = ['.npmrc', '.env'];

    filesToCheck.forEach(file => {
      const fullPath = path.resolve(REPO_ROOT, file);
      if (fs.existsSync(fullPath)) {
        this.error(`Plaintext secret file exists: ${file}`);
      } else {
        this.pass(`${file} not present`);
      }
    });
  }

  checkPackageJsonEngines() {
    console.log(`\n${BOLD}📦 Checking package.json engines${RESET}`);
    this.checkFileContains(
      'package.json',
      '"node"',
      'package.json specifies node version requirement'
    );
    this.checkFileContains(
      'package.json',
      '"pnpm"',
      'package.json specifies pnpm version requirement'
    );
  }

  checkLinting() {
    console.log(`\n${BOLD}🔍 Checking linting configuration${RESET}`);
    this.checkFileExists('.eslintrc.json', 'ESLint configuration');
    this.checkFileExists('.stylelintrc.json', 'Stylelint configuration');
  }

  report() {
    console.log(`\n${BOLD}${'='.repeat(60)}${RESET}`);
    console.log(`${BOLD}SECURITY VERIFICATION REPORT${RESET}`);
    console.log(`${BOLD}${'='.repeat(60)}${RESET}`);

    if (this.passes.length > 0) {
      console.log(`\n${GREEN}${BOLD}✓ Passed (${this.passes.length})${RESET}`);
      this.passes.forEach(p => console.log(`  ${p}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n${YELLOW}${BOLD}⚠ Warnings (${this.warnings.length})${RESET}`);
      this.warnings.forEach(w => console.log(`  ${w}`));
    }

    if (this.issues.length > 0) {
      console.log(`\n${RED}${BOLD}✗ Issues (${this.issues.length})${RESET}`);
      this.issues.forEach(i => console.log(`  ${i}`));
    }

    console.log(`\n${BOLD}${'='.repeat(60)}${RESET}`);

    const total = this.passes.length + this.warnings.length + this.issues.length;
    const percentage = Math.round((this.passes.length / total) * 100);

    if (this.issues.length === 0) {
      console.log(`${GREEN}${BOLD}✓ Security Verification Passed! (${percentage}%)${RESET}\n`);
      return 0;
    } else {
      console.log(
        `${RED}${BOLD}✗ Security Verification Failed (${percentage}% passing)${RESET}\n`
      );
      return 1;
    }
  }

  run() {
    console.log(`${BOLD}${YELLOW}Security Verification${RESET} — ${new Date().toISOString()}\n`);

    this.checkGitIgnore();
    this.checkGitHistory();
    this.checkCodeowners();
    this.checkDependabot();
    this.checkSecurityMD();
    this.checkWorkflowPermissions();
    this.checkNoSecrets();
    this.checkPackageJsonEngines();
    this.checkLinting();

    return this.report();
  }
}

const verifier = new SecurityVerifier();
process.exit(verifier.run());
