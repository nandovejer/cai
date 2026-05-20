#!/usr/bin/env node

/**
 * Husky Setup Script
 * Initializes git hooks for security verification
 * Run: node scripts/setup-husky.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function log(color, symbol, message) {
  console.log(`${color}${symbol}${RESET} ${message}`);
}

function runCommand(cmd, description) {
  try {
    log(YELLOW, '⏳', `${description}...`);
    execSync(cmd, { stdio: 'inherit', cwd: REPO_ROOT });
    log(GREEN, '✓', description);
    return true;
  } catch (e) {
    log(RED, '✗', `${description} failed: ${e.message}`);
    return false;
  }
}

function checkHuskyInstalled() {
  try {
    execSync('npm list husky', { stdio: 'pipe', cwd: REPO_ROOT });
    return true;
  } catch {
    return false;
  }
}

function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, '755');
    return true;
  } catch (e) {
    console.error(`Failed to make ${filePath} executable:`, e.message);
    return false;
  }
}

async function main() {
  console.log(`\n${BOLD}${YELLOW}Husky Git Hooks Setup${RESET}\n`);

  // Check if git repo
  const gitDir = path.resolve(REPO_ROOT, '.git');
  if (!fs.existsSync(gitDir)) {
    log(RED, '✗', 'Not a git repository');
    process.exit(1);
  }
  log(GREEN, '✓', 'Git repository detected');

  // Check if Husky is installed
  if (!checkHuskyInstalled()) {
    log(YELLOW, '⚠', 'Husky not installed. Installing...');
    if (!runCommand('pnpm install husky --save-dev -w', 'Install Husky')) {
      log(RED, '✗', 'Failed to install Husky');
      process.exit(1);
    }
  } else {
    log(GREEN, '✓', 'Husky is installed');
  }

  // Initialize Husky
  if (!runCommand('pnpm husky install', 'Initialize Husky')) {
    log(RED, '✗', 'Failed to initialize Husky');
    process.exit(1);
  }

  // Make pre-commit hook executable
  const preCommitPath = path.resolve(REPO_ROOT, '.husky', 'pre-commit');
  if (fs.existsSync(preCommitPath)) {
    if (makeExecutable(preCommitPath)) {
      log(GREEN, '✓', 'Made pre-commit hook executable');
    } else {
      log(YELLOW, '⚠', 'Could not make pre-commit hook executable (may not be needed on Windows)');
    }
  }

  // Verify installation
  console.log(`\n${BOLD}${YELLOW}Verification${RESET}`);

  const huskyDir = path.resolve(REPO_ROOT, '.husky');
  if (fs.existsSync(huskyDir)) {
    log(GREEN, '✓', '.husky directory exists');
    const files = fs.readdirSync(huskyDir);
    files.forEach(file => {
      log(GREEN, '  ✓', file);
    });
  } else {
    log(RED, '✗', '.husky directory not found');
  }

  // Run test verification
  console.log(`\n${BOLD}${YELLOW}Testing${RESET}`);
  if (runCommand('node scripts/verify-security.js', 'Run security verification')) {
    console.log(`\n${GREEN}${BOLD}✓ Husky Setup Complete!${RESET}`);
    console.log(`\n${BOLD}Next Steps:${RESET}`);
    console.log(`  1. Try making a commit: git commit --allow-empty -m "test"`);
    console.log(`  2. You should see the security checks run`);
    console.log(`\n${BOLD}See docs:${RESET}`);
    console.log(`  - ${BOLD}HUSKY_SETUP.md${RESET} — Setup instructions`);
    console.log(`  - ${BOLD}docs/SECURITY_TOOLS.md${RESET} — Complete guide to security tools\n`);
    process.exit(0);
  } else {
    console.log(`\n${RED}${BOLD}⚠ Setup completed but security verification found issues${RESET}\n`);
    process.exit(1);
  }
}

main().catch(err => {
  log(RED, '✗', `Setup failed: ${err.message}`);
  process.exit(1);
});
