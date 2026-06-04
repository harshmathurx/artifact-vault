# artifact-vault

A quiet static host for HTML files. You deploy an artifact, it gets an unguessable URL, and nobody else can find it. No directory listings, no search engine indexing, no file name leaks.

Built for AI agent outputs, prototypes, dashboards, and anything you want to share with a link but not with the world.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fharshmathurx%2Fartifact-vault)

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## What it does

You give it an HTML file and a description. It generates a cryptographically random 12-character hash, slugifies the description, copies the file to `public/<hash>-<slug>.html`, commits, pushes, and prints the live URL. Vercel deploys it automatically.

The root URL returns a 404. Directory listings return a 404. Anything that isn't an exact file match returns a 404. Search engines are told to go away via `X-Robots-Tag`. The file name is unguessable.

That's it. There is no server, no database, no auth layer. Just static files behind obfuscated URLs on Vercel's CDN.

---

## How to set it up

### 1. Fork or use this template

Click the Vercel deploy button above, or fork the repo manually and connect it to Vercel yourself.

### 2. Clone your copy

```bash
git clone https://github.com/<your-username>/artifact-vault.git
cd artifact-vault
```

### 3. Set your domain

Copy the env template and fill in your Vercel project URL. This is optional, but without it the CLI will print placeholder URLs instead of real ones.

```bash
cp .env.example .env
```

Edit `.env`:

```
VERCEL_PROJECT_URL=https://your-project.vercel.app
```

That's the entire setup.

---

## Deploying an artifact

### From the command line

```bash
node deploy-artifact.js path/to/file.html "My Dashboard"
```

This will:
1. Validate the file (must be `.html` or `.htm`)
2. Generate a random hash like `q2w3e4r5t6y7`
3. Copy it to `public/q2w3e4r5t6y7-my-dashboard.html`
4. Stage, commit, and push to Git
5. Print the live URL

If you want to batch multiple artifacts before pushing:

```bash
node deploy-artifact.js file1.html "First thing" --no-push
node deploy-artifact.js file2.html "Second thing" --no-push
git push origin main
```

### From the GitHub UI

You can skip the terminal entirely:

1. Go to the `incoming/` folder on GitHub
2. Click **Add file** then **Upload files**
3. Drop your `.html` file in
4. Commit to `main`

A GitHub Action picks up the file, obfuscates the name, moves it to `public/`, and deploys it. The live URL shows up in the Actions run summary.

If your artifact has relative assets (images, CSS, JS), put them in a folder with an `index.html` at the root and upload the whole folder. The Action will obfuscate the folder name but keep the internal structure intact.

---

## How the security works

There is no authentication and no access control. The security model is URL obscurity, which is appropriate for non-sensitive artifacts. If someone has the link, they can view the file. If they don't have the link, they can't find it.

Specifically:

- File names use 12 alphanumeric characters generated with `crypto.randomBytes` and rejection sampling (no modulo bias). That's 36^12 possible hashes, roughly 4.7 x 10^18 combinations.
- Root and index requests return 404.
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` is set globally.
- `X-Content-Type-Options: nosniff` prevents MIME-type sniffing.
- `X-Frame-Options: DENY` blocks embedding in iframes.
- `Referrer-Policy: no-referrer` prevents URL leakage through referrer headers.
- `Permissions-Policy` disables camera, microphone, geolocation, and FLoC.

If you need actual access control (login, tokens, per-user permissions), this is not the right tool. Use a proper application server.

---

## Project structure

```
.
├── .github/
│   ├── workflows/
│   │   ├── ingest-artifact.yml    # Processes files uploaded via GitHub UI
│   │   └── ci.yml                 # Runs validation on PRs
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── FUNDING.yml
├── incoming/                      # Drop zone for GitHub UI uploads
│   └── .gitkeep
├── public/                        # Deployed artifacts live here
│   ├── 404.html                   # Custom error page
│   └── .gitkeep
├── docs/
│   └── architecture.md            # How everything fits together
├── deploy-artifact.js             # CLI deploy tool
├── ingest-incoming.js             # Ingestion script for GitHub Actions
├── ignore-build.sh                # Vercel build-skip optimization
├── vercel.json                    # Routing rules and security headers
├── package.json
├── .env.example
├── .editorconfig
├── .nvmrc
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── LICENSE
```

---

## Build-skip optimization

Vercel rebuilds on every push by default, which wastes build minutes when you change something unrelated like the README. The `ignore-build.sh` script tells Vercel to skip the build unless `public/` or `vercel.json` actually changed.

Set this in your Vercel project settings under **Settings > Git > Ignored Build Step** as `bash ignore-build.sh`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: fork, branch, change, test, PR. Keep it simple.

---

## License

MIT. See [LICENSE](LICENSE) for the full text.
