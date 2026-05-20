#!/usr/bin/env node

/**
 * GitHub Repository Setup Verification
 * Checks that GitHub-specific configurations are in place
 * Run: node scripts/check-github-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function log(color, symbol, message) {
  console.log(`${color}${symbol}${RESET} ${message}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.resolve(REPO_ROOT, filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    log(GREEN, '✓', `${description}: ${filePath}`);
    return true;
  } else {
    log(RED, '✗', `${description} missing: ${filePath}`);
    return false;
  }
}

function checkWorkflowExists(workflowName) {
  const fullPath = path.resolve(REPO_ROOT, '.github', 'workflows', `${workflowName}.yml`);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    log(GREEN, '✓', `Workflow exists: ${workflowName}`);
    return true;
  } else {
    log(RED, '✗', `Workflow missing: ${workflowName}`);
    return false;
  }
}

function main() {
  console.log(`\n${BOLD}${BLUE}GitHub Repository Setup Verification${RESET}\n`);

  let issues = 0;
  let passes = 0;

  console.log(`${BOLD}🔗 GitHub Workflows${RESET}`);
  if (checkWorkflowExists('ci')) passes++; else issues++;
  if (checkWorkflowExists('publish')) passes++; else issues++;

  console.log(`\n${BOLD}🔐 Security Configuration${RESET}`);
  if (checkFileExists('.github/CODEOWNERS', 'CODEOWNERS')) passes++; else issues++;
  if (checkFileExists('.github/dependabot.yml', 'Dependabot config')) passes++; else issues++;
  if (checkFileExists('SECURITY.md', 'Security policy')) passes++; else issues++;

  console.log(`\n${BOLD}🛠️ Build & Automation${RESET}`);
  if (checkFileExists('scripts/verify-security.js', 'Security verification script')) passes++; else issues++;
  if (checkFileExists('scripts/setup-husky.js', 'Husky setup script')) passes++; else issues++;
  if (checkFileExists('.husky/pre-commit', 'Pre-commit hook')) passes++; else issues++;
  if (checkFileExists('.eslintrc.json', 'ESLint config')) passes++; else issues++;
  if (checkFileExists('.stylelintrc.json', 'Stylelint config')) passes++; else issues++;

  console.log(`\n${BOLD}📚 Documentation${RESET}`);
  if (checkFileExists('SECURITY_AUDIT.md', 'Security audit')) passes++; else issues++;
  if (checkFileExists('SECURITY_ACTIONS.md', 'Action steps')) passes++; else issues++;
  if (checkFileExists('SECURITY_TOOLS.md', 'Tools guide')) passes++; else issues++;
  if (checkFileExists('HUSKY_SETUP.md', 'Husky setup guide')) passes++; else issues++;
  if (checkFileExists('docs/SECURITY_TOOLS.md', 'Detailed tools guide')) passes++; else issues++;

  console.log(`\n${BOLD}⚙️ Local Configuration${RESET}`);
  const hasGit = fs.existsSync(path.resolve(REPO_ROOT, '.git'));
  if (hasGit) {
    log(GREEN, '✓', 'Git repository initialized');
    passes++;
  } else {
    log(RED, '✗', 'Not a git repository');
    issues++;
  }

  const hasNodeModules = fs.existsSync(path.resolve(REPO_ROOT, 'node_modules'));
  if (hasNodeModules) {
    log(GREEN, '✓', 'Dependencies installed (node_modules exists)');
    passes++;
  } else {
    log(YELLOW, '⚠', 'Dependencies not installed (run: pnpm install)');
  }

  const hasHuskyHooks = fs.existsSync(path.resolve(REPO_ROOT, '.git', 'hooks', 'pre-commit'));
  if (hasHuskyHooks) {
    log(GREEN, '✓', 'Git hooks installed (.git/hooks exists)');
    passes++;
  } else {
    log(YELLOW, '⚠', 'Git hooks not installed yet (run: pnpm husky install)');
  }

  console.log(`\n${BOLD}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}SETUP STATUS${RESET}`);
  console.log(`${BOLD}${'='.repeat(60)}${RESET}`);

  if (issues === 0) {
    console.log(`\n${GREEN}${BOLD}✓ All security files are in place!${RESET}`);
    console.log(`\n${BOLD}Remaining manual steps (GitHub UI):${RESET}`);
    console.log(`  1. Enable branch protection on 'main'`);
    console.log(`     → Settings → Branches → Add rule`);
    console.log(`\n  2. Regenerate npm token`);
    console.log(`     → https://www.npmjs.com/settings/~/tokens`);
    console.log(`     → Delete old, create new (30-day expiration)`);
    console.log(`\n  3. Update GitHub secret NPM_TOKEN`);
    console.log(`     → Settings → Secrets → Actions → NPM_TOKEN`);
    console.log(`     → Paste new token from step 2`);
    console.log(`\n${YELLOW}Once complete, run:${RESET}`);
    console.log(`  pnpm verify:security  # Verify local setup`);
    console.log(`  git commit --allow-empty -m "test"  # Test pre-commit hook\n`);
    return 0;
  } else {
    console.log(`\n${RED}${BOLD}✗ ${issues} file(s) missing!${RESET}`);
    console.log(`\n${YELLOW}Please ensure all security files are committed and pushed.${RESET}\n`);
    return 1;
  }
}

process.exit(main());
