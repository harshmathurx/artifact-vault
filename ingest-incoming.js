#!/usr/bin/env node

/**
 * ingest-incoming.js
 * ──────────────────
 * Ingestion pipeline for files/folders added via the GitHub UI.
 * Moves items from /incoming to /public with cryptographic naming.
 *
 * Triggered by the GitHub Actions workflow on pushes to incoming/.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { generateSecureHash, slugify, getBaseUrl } = require('./deploy-artifact');

const incomingDir = path.join(__dirname, 'incoming');
const publicDir = path.join(__dirname, 'public');
const args = process.argv.slice(2);
const shouldCommit = args.includes('--commit');
const noPush = args.includes('--no-push');

function runGitCommand(gitArgs) {
  return spawnSync('git', gitArgs, {
    cwd: __dirname,
    encoding: 'utf8',
  });
}

function ensureGitIdentity() {
  const name = runGitCommand(['config', '--get', 'user.name']);
  const email = runGitCommand(['config', '--get', 'user.email']);
  const hasName = name.status === 0 && name.stdout.trim().length > 0;
  const hasEmail = email.status === 0 && email.stdout.trim().length > 0;

  if (hasName && hasEmail) {
    return;
  }

  console.error('\x1b[31mError: Git user identity is not configured.\x1b[0m');
  console.error('\nSet it for this repository, then run deploy:incoming again:\n');
  if (!hasName) {
    console.error('  git config user.name "Your Name"');
  }
  if (!hasEmail) {
    console.error('  git config user.email "you@example.com"');
  }
  console.error('\nUse --global instead of repository-local config if you want this on every repo.');
  process.exit(1);
}

function getRootHtmlFiles(dirPath) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return ext === '.html' || ext === '.htm';
    });
}

// Ensure target directories exist
if (!fs.existsSync(incomingDir)) {
  fs.mkdirSync(incomingDir, { recursive: true });
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Read incoming contents (ignore placeholder/meta files)
const items = fs
  .readdirSync(incomingDir)
  .filter((item) => item !== '.gitkeep' && !item.startsWith('.'));

if (items.length === 0) {
  console.log('No new items in incoming/ to process.');
  process.exit(0);
}

if (shouldCommit) {
  ensureGitIdentity();
}

const processedUrls = [];
const baseUrl = getBaseUrl();

for (const item of items) {
  const itemPath = path.join(incomingDir, item);
  let stats;

  try {
    stats = fs.statSync(itemPath);
  } catch (e) {
    console.error(`Error reading ${item}: ${e.message}`);
    continue;
  }

  let destName = '';
  let isDir = false;

  if (stats.isDirectory()) {
    // Directories need an entrypoint. If there is exactly one root HTML file,
    // promote it to index.html so folder uploads from agents still serve.
    const hasIndex =
      fs.existsSync(path.join(itemPath, 'index.html')) ||
      fs.existsSync(path.join(itemPath, 'index.htm'));

    if (!hasIndex) {
      const rootHtmlFiles = getRootHtmlFiles(itemPath);
      if (rootHtmlFiles.length === 1) {
        const rootHtmlPath = path.join(itemPath, rootHtmlFiles[0]);
        fs.renameSync(rootHtmlPath, path.join(itemPath, 'index.html'));
        console.log(
          `\x1b[36mPromoted ${item}/${rootHtmlFiles[0]} to ${item}/index.html\x1b[0m`
        );
      } else {
        console.warn(
          `\x1b[33mWarning: Directory '${item}' needs index.html or exactly one root HTML file. Skipping.\x1b[0m`
        );
        continue;
      }
    }

    const hash = generateSecureHash(12);
    const slug = slugify(item);
    destName = `${hash}-${slug}`;
    isDir = true;
  } else if (stats.isFile()) {
    const ext = path.extname(item).toLowerCase();
    if (ext !== '.html' && ext !== '.htm') {
      console.warn(
        `\x1b[33mWarning: File '${item}' is not an HTML file. Skipping.\x1b[0m`
      );
      continue;
    }

    const baseName = path.basename(item, ext);
    const hash = generateSecureHash(12);
    const slug = slugify(baseName);
    destName = `${hash}-${slug}.html`;
  } else {
    continue;
  }

  const destPath = path.join(publicDir, destName);

  try {
    fs.renameSync(itemPath, destPath);
    console.log(`\x1b[32m✔ Processed: ${item} -> public/${destName}\x1b[0m`);

    // Vercel cleanUrls makes .html optional in routes
    const cleanRoute = isDir ? destName : destName.replace(/\.html?$/, '');

    if (baseUrl) {
      const cleanBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;
      processedUrls.push({ name: item, url: `${cleanBaseUrl}/${cleanRoute}` });
    } else {
      processedUrls.push({
        name: item,
        url: `https://<your-vercel-domain>/${cleanRoute}`,
      });
    }
  } catch (err) {
    console.error(`\x1b[31mError moving ${item}: ${err.message}\x1b[0m`);
  }
}

// Write to GitHub Actions Step Summary if running in CI
if (process.env.GITHUB_STEP_SUMMARY && processedUrls.length > 0) {
  let summary = `### 🚀 New Artifacts Ingested & Deployed\n\n`;
  summary += `| Original Upload | Live Vercel URL |\n`;
  summary += `| --- | --- |\n`;
  for (const item of processedUrls) {
    summary += `| \`${item.name}\` | [View Live Artifact](${item.url}) |\n`;
  }
  try {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  } catch (e) {
    console.error('Failed to append to GITHUB_STEP_SUMMARY:', e.message);
  }
}

console.log('\n\x1b[36mLive URL Summaries:\x1b[0m');
for (const item of processedUrls) {
  console.log(`\x1b[32m👉 ${item.name}: ${item.url}\x1b[0m`);
}
console.log('');

if (shouldCommit && processedUrls.length > 0) {
  console.log('\x1b[36mCommitting processed artifacts...\x1b[0m');

  const addResult = runGitCommand(['add', '-A', 'incoming', 'public']);
  if (addResult.status !== 0) {
    console.error(`\x1b[31mError adding processed artifacts: ${addResult.stderr}\x1b[0m`);
    process.exit(1);
  }

  const diffResult = runGitCommand(['diff', '--cached', '--quiet']);
  if (diffResult.status === 0) {
    console.log('No processed artifact changes to commit.');
    process.exit(0);
  }

  const commitResult = runGitCommand([
    'commit',
    '-m',
    `chore(ingest): process ${processedUrls.length} artifact${processedUrls.length === 1 ? '' : 's'}`,
  ]);
  if (commitResult.status !== 0) {
    console.error(`\x1b[31mError committing processed artifacts: ${commitResult.stderr}\x1b[0m`);
    process.exit(1);
  }

  if (noPush) {
    console.log('\x1b[33mSkipping Git push (--no-push active).\x1b[0m');
  } else {
    const pushResult = runGitCommand(['push', 'origin', 'main']);
    if (pushResult.status !== 0) {
      console.warn(
        `\x1b[33mWarning: Git push failed. Push manually when ready. Error: ${pushResult.stderr.trim()}\x1b[0m`
      );
    } else {
      console.log('\x1b[32m✔ Pushed processed artifacts to origin/main.\x1b[0m');
    }
  }
}
