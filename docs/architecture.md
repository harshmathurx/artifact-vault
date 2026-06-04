# Architecture

This document explains how artifact-vault works internally. It is short because the system is simple.

---

## Overview

artifact-vault is a static file host. There is no server, no database, no build step. HTML files go into the `public/` directory. Vercel serves them from its CDN. The URL of each file is made unguessable by prepending a cryptographically random hash.

There are two ways to add files:

1. The CLI tool (`deploy-artifact.js`) runs locally and copies files into `public/`, then commits and pushes.
2. The GitHub UI upload path puts files in `incoming/`, and a GitHub Action moves them to `public/` with obfuscated names.

Both paths produce the same result: an HTML file in `public/` with a name like `q2w3e4r5t6y7-my-dashboard.html`.

---

## Hash generation

File names use a 12-character lowercase alphanumeric hash. The character set is `a-z0-9` (36 characters), giving 36^12 possible values, which is roughly 4.7 x 10^18.

The hash is generated using `crypto.randomBytes` with rejection sampling. Each random byte is checked against a threshold (252, which is 36 x 7) before being used. Bytes above that threshold are discarded. This eliminates modulo bias entirely, which matters when the character set size (36) does not evenly divide the byte range (256).

The resulting hash is concatenated with a slugified description to form the file name: `<hash>-<slug>.html`.

---

## Vercel routing

The `vercel.json` file defines three route rules in order:

1. Requests to `/` or `/index.html` return 404 with the custom error page. This prevents directory-style browsing.
2. The `"handle": "filesystem"` directive tells Vercel to check if the requested path matches an actual file in `public/`. If it does, serve it.
3. All other requests return 404.

Vercel's `cleanUrls` option strips the `.html` extension from URLs, so `public/abc123-dashboard.html` is accessible at `/abc123-dashboard`.

---

## Security headers

Every response includes these headers (set globally in `vercel.json`):

| Header | Value | Purpose |
|--------|-------|---------|
| X-Robots-Tag | noindex, nofollow, noarchive, nosnippet | Tells search engines and AI crawlers not to index, cache, or snippet any page |
| X-Content-Type-Options | nosniff | Prevents browsers from MIME-sniffing the response |
| X-Frame-Options | DENY | Blocks the page from being embedded in an iframe |
| Referrer-Policy | no-referrer | Prevents the artifact URL from leaking in referrer headers when clicking external links |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), interest-cohort=() | Disables unused browser APIs and opts out of FLoC/Topics |

The 404 page also includes a Content-Security-Policy meta tag that restricts script execution to `'none'` and blocks object embeds and frame ancestors.

---

## Build-skip optimization

Vercel rebuilds the project on every push by default. Since the project has no build step (it is just static files), this wastes build minutes on irrelevant commits like README edits.

The `ignore-build.sh` script is configured as Vercel's "Ignored Build Step." It compares the current commit with its parent and only proceeds with the build if `public/` or `vercel.json` changed. Everything else is skipped.

---

## GitHub Actions ingest pipeline

The `ingest-artifact.yml` workflow triggers when files are pushed to `incoming/` (excluding `.gitkeep`). It runs `ingest-incoming.js`, which:

1. Reads all non-hidden files in `incoming/`
2. For each HTML file: generates a hash, slugifies the original name, renames to `public/<hash>-<slug>.html`
3. For each directory with an `index.html`: obfuscates the folder name, moves the entire directory to `public/`
4. Skips non-HTML files with a warning
5. Writes a summary table to the GitHub Actions step summary with live URLs
6. Commits and pushes the changes

The workflow uses `actions/checkout@v4` with `fetch-depth: 0` to ensure the full history is available. It commits as `github-actions[bot]` and includes `[skip ci]` in the commit message to prevent recursive workflow triggers.

---

## What this is not

This is not an access control system. Anyone with the URL can view the file. The security model depends entirely on URL unpredictability. If you need per-user permissions, token-gated access, or audit logs, use something else.
