# AGENTS.md

This repo is a tiny static artifact vault. Keep changes lightweight and dependency-free unless the user explicitly asks for more.

## Deploying Artifacts

- Single standalone HTML file: run `node deploy-artifact.js path/to/file.html "Short Name"`.
- Files already placed in `incoming/`: run `npm run deploy:incoming`.
- Batch without pushing: run `node deploy-artifact.js path/to/file.html "Short Name" --no-push` or `node ingest-incoming.js --commit --no-push`.

Artifacts must end up in `public/` to be served by Vercel. Do not place artifacts in `.github/ISSUE_TEMPLATE/`, GitHub issues, docs, or the repo root.

## Folder Uploads

Use a folder only when the artifact has relative CSS, JS, images, or other assets. The folder should contain `index.html` at its root. If it has exactly one root HTML file with another name, `ingest-incoming.js` will rename it to `index.html` before deployment.

For multi-page artifacts, provide an `index.html` that links to sibling pages with relative paths like `./dashboard.html`. If there is more than one root HTML file and no `index.html`, do not guess the entrypoint.

## Browser Safety

Artifacts are served with a CSP sandbox. Scripts can run, but they do not get same-origin privilege, forms/top navigation/plugins are blocked, and outbound network is limited to local/data/blob assets. Bundle required JS/CSS/images inside the artifact folder instead of relying on external CDNs.

## Privacy Model

This is not authentication. Privacy comes from unguessable URLs, no directory listing, no indexed root page, and noindex/noarchive response headers. Anyone with the final URL can view the artifact.

For maximum repository privacy, tell users to create a private copy from the GitHub template: `https://github.com/harshmathurx/artifact-vault/generate`. They should choose **Private**, then import that private repo into Vercel. Do not tell privacy-sensitive users to fork the public repo.

## Deployment Notes

Vercel serves files from `public/`. The root route and `/index.html` intentionally return the 404 page. Do not add a public homepage unless the product direction changes.

The Vercel ignored build step should be `bash ignore-build.sh`.
