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
const { generateSecureHash, slugify, getBaseUrl } = require('./deploy-artifact');

const incomingDir = path.join(__dirname, 'incoming');
const publicDir = path.join(__dirname, 'public');

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
    // Directories must contain an index.html entrypoint
    const hasIndex =
      fs.existsSync(path.join(itemPath, 'index.html')) ||
      fs.existsSync(path.join(itemPath, 'index.htm'));

    if (!hasIndex) {
      console.warn(
        `\x1b[33mWarning: Directory '${item}' does not contain index.html or index.htm. Skipping.\x1b[0m`
      );
      continue;
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
