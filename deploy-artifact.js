#!/usr/bin/env node

/**
 * deploy-artifact.js
 * ──────────────────
 * Automated secure deployment CLI for standalone HTML artifacts.
 *
 * Usage:
 *   node deploy-artifact.js <path/to/file.html> "<description>" [--no-push]
 *
 * What it does:
 *   1. Validates the input file (must be .html or .htm)
 *   2. Generates a cryptographically secure 12-char hash (rejection-sampled)
 *   3. Slugifies the description for a human-readable URL suffix
 *   4. Copies the file to public/<hash>-<slug>.html
 *   5. Stages, commits, and optionally pushes to Git
 *   6. Prints the clean Vercel URL
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse VERCEL_PROJECT_URL from the local .env file, falling back to
 * the process environment. Returns null if not found.
 */
function getBaseUrl() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex !== -1) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            if (key === 'VERCEL_PROJECT_URL') {
              return value || null;
            }
          }
        }
      }
    } catch (_) {
      // Ignore read errors — fall through to process.env
    }
  }
  return process.env.VERCEL_PROJECT_URL || null;
}

/**
 * Execute a Git command without shell expansion (safe from injection).
 * All arguments are passed as an array to child_process.spawnSync.
 */
function runGitCommand(args) {
  return spawnSync('git', args, {
    cwd: __dirname,
    encoding: 'utf8',
  });
}

/**
 * Generate a cryptographically secure alphanumeric hash string.
 * Uses rejection sampling to eliminate modulo bias entirely.
 *
 * @param {number} length - Desired hash length (default: 12)
 * @returns {string} Lowercase alphanumeric hash
 */
function generateSecureHash(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  while (hash.length < length) {
    const byte = crypto.randomBytes(1)[0];
    // 36 * 7 = 252 — discard bytes >= 252 for uniform distribution
    if (byte < 252) {
      hash += chars[byte % chars.length];
    }
  }
  return hash;
}

/**
 * Convert a freeform description into a URL-safe slug.
 *
 * @param {string} text - Human-readable description
 * @returns {string} Slugified string (lowercase, hyphen-separated)
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  const noPush = args.includes('--no-push');
  const cleanArgs = args.filter((arg) => arg !== '--no-push');

  if (cleanArgs.length < 2) {
    console.log('\x1b[31m\x1b[1mError: Missing arguments.\x1b[0m');
    console.log('\n\x1b[1mUsage:\x1b[0m');
    console.log(
      '  node deploy-artifact.js <path/to/local/file.html> "<description>" [--no-push]\n'
    );
    console.log('\x1b[1mOptions:\x1b[0m');
    console.log(
      '  --no-push   Commit locally but do not push to remote origin (useful for batching)\n'
    );
    console.log('\x1b[1mExample:\x1b[0m');
    console.log(
      '  node deploy-artifact.js ~/Downloads/dashboard.html "My Dashboard"\n'
    );
    process.exit(1);
  }

  const sourcePath = path.resolve(cleanArgs[0]);
  const description = cleanArgs[1];

  // Validate source file existence
  if (!fs.existsSync(sourcePath)) {
    console.error(
      `\x1b[31mError: Source file does not exist: ${sourcePath}\x1b[0m`
    );
    process.exit(1);
  }

  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) {
    console.error(
      `\x1b[31mError: Target path is not a file: ${sourcePath}\x1b[0m`
    );
    process.exit(1);
  }

  // Only accept HTML files
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext !== '.html' && ext !== '.htm') {
    console.error(
      `\x1b[31mError: Only standalone HTML files are allowed (received extension: ${ext})\x1b[0m`
    );
    process.exit(1);
  }

  // Generate unguessable output path
  const hash = generateSecureHash(12);
  const slug = slugify(description);

  if (!slug) {
    console.error(
      '\x1b[31mError: Description must contain at least one alphanumeric character.\x1b[0m'
    );
    process.exit(1);
  }

  const destFileName = `${hash}-${slug}.html`;
  const publicDir = path.join(__dirname, 'public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const destPath = path.join(publicDir, destFileName);

  try {
    fs.copyFileSync(sourcePath, destPath);
  } catch (err) {
    console.error(
      `\x1b[31mError copying file to public folder: ${err.message}\x1b[0m`
    );
    process.exit(1);
  }

  console.log(`\n\x1b[36m[1/3] File Obfuscated:\x1b[0m public/${destFileName}`);

  // ── Git Automation ──
  console.log('\x1b[36m[2/3] Automating Git operations...\x1b[0m');

  // Ensure we're in a git repo
  const gitCheck = runGitCommand(['rev-parse', '--is-inside-work-tree']);
  if (gitCheck.status !== 0) {
    console.log(
      '\x1b[33mWarning: Not a git repository. Initializing new git repo...\x1b[0m'
    );
    const initResult = runGitCommand(['init']);
    if (initResult.status !== 0) {
      console.error('\x1b[31mError initializing git repository.\x1b[0m');
      process.exit(1);
    }
    runGitCommand(['checkout', '-b', 'main']);
  }

  // Stage the new artifact
  const relDestPath = path.join('public', destFileName);
  const addResult = runGitCommand(['add', relDestPath]);
  if (addResult.status !== 0) {
    console.error(
      `\x1b[31mError adding file to Git index: ${addResult.stderr}\x1b[0m`
    );
    process.exit(1);
  }

  // Commit
  const commitMessage = `Add artifact: ${slug} (${hash})`;
  const commitResult = runGitCommand(['commit', '-m', commitMessage]);
  if (commitResult.status !== 0) {
    console.error(
      `\x1b[31mError committing changes: ${commitResult.stderr}\x1b[0m`
    );
    process.exit(1);
  }

  console.log('\x1b[32m✔ Committed successfully.\x1b[0m');

  // Push handling
  const remoteCheck = runGitCommand(['remote', 'get-url', 'origin']);
  if (noPush) {
    console.log(
      '\x1b[33mSkipping Git push (--no-push active). Changes committed locally.\x1b[0m'
    );
  } else if (remoteCheck.status === 0) {
    console.log('\x1b[36mPushing to main branch...\x1b[0m');
    const pushResult = runGitCommand(['push', 'origin', 'main']);
    if (pushResult.status === 0) {
      console.log('\x1b[32m✔ Pushed successfully to origin/main.\x1b[0m');
    } else {
      console.warn(
        `\x1b[33mWarning: Git push failed. You may need to push manually. Error: ${pushResult.stderr.trim()}\x1b[0m`
      );
    }
  } else {
    console.log(
      '\x1b[33mWarning: No remote "origin" found. Committed changes locally.\x1b[0m'
    );
    console.log(
      '\x1b[90mConfigure a remote by running: git remote add origin <repo-url> && git push -u origin main\x1b[0m'
    );
  }

  // ── URL Output ──
  console.log('\n\x1b[36m[3/3] Deployment URL:\x1b[0m');

  const baseUrl = getBaseUrl();
  const cleanRouteName = `${hash}-${slug}`; // Vercel cleanUrls makes .html optional

  if (baseUrl) {
    const cleanBaseUrl = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;
    console.log(`\x1b[32m\x1b[1m👉 ${cleanBaseUrl}/${cleanRouteName}\x1b[0m\n`);
  } else {
    console.log(
      `\x1b[32m\x1b[1m👉 https://<your-vercel-domain>/${cleanRouteName}\x1b[0m`
    );
    console.log(
      '\x1b[90m(Tip: Add VERCEL_PROJECT_URL=https://your-domain.com in a local .env file to view absolute URL)\x1b[0m\n'
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateSecureHash,
  slugify,
  getBaseUrl,
};
