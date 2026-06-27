# artifact-vault

I built this because I kept doing the same thing manually. An agent generates an HTML file. I want to share it. I don't want it indexed, archived, or discoverable. I don't want to spin up a server. I just want a link that works and goes away when I stop caring about it.

This is an unlisted static file host on Vercel. Files get cryptographically random URLs. Nothing is indexed. The root returns a 404. That's the whole thing.

[![Use this template](https://img.shields.io/badge/Use_this_template-private_copy-2ea44f?logo=github)](https://github.com/harshmathurx/artifact-vault/generate)

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## What it actually does

You give the CLI an HTML file and a description. It generates a 12-character hash using `crypto.randomBytes` with rejection sampling (no modulo bias), slugifies the description, copies the file to `public/<hash>-<slug>.html`, commits, pushes, and prints the URL.

Vercel picks up the push, skips the build if nothing in `public/` changed (saves your build minutes), and serves the file from its CDN.

If you don't want to use the terminal, you can drop files into `incoming/` via the GitHub UI and a GitHub Action handles the rest.

The URL looks like this: `https://your-vault.vercel.app/q2w3e4r5t6y7-my-dashboard`

Nobody finds that by accident.

---

## What it is not

It is not an access control system. There is no login, no token, no per-user permissions. The security model is URL unpredictability. Anyone with the link can view the file.

If you need gated access, use a proper application server. This tool is for sharing prototypes and agent outputs with people you're already talking to, not for hosting anything sensitive.

I want to be clear about this upfront because I've seen people reach for the wrong tool and then wonder why it didn't protect them. URL obscurity is a real thing, and it's appropriate here. It's not authentication.

---

## Setup

This takes about three minutes.

### 1. Create a private copy

Click **Use this template** above.

On GitHub:

1. Choose your account or organization
2. Name the repo
3. Select **Private**
4. Click **Create repository**

Do not fork the public repo if privacy matters. A public GitHub fork is public. Create a private copy from the template instead.

### 2. Connect it to Vercel

In Vercel, import the private GitHub repo you just created. Vercel can deploy from a private repo after you grant it access.

If you intentionally want a fast public clone instead, you can use Vercel's clone flow:

```text
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fharshmathurx%2Fartifact-vault
```

For the privacy-first flow, use the GitHub template path above.

### 3. Clone your private copy

```bash
git clone https://github.com/<your-username>/artifact-vault.git
cd artifact-vault
```

Make sure Git can create commits from this repo:

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

Use `--global` if you want those settings to apply to every repo on your machine.

### 4. Set your domain (optional, but useful)

Without this, the CLI prints a placeholder URL instead of the real one. With it, you get the actual link immediately after deploying. You have full control over the domain setup: you can configure a free subdomain on `vercel.app` (e.g., `yourname-artifacts.vercel.app`) or point your own custom domain (e.g., `artifacts.yourname.com`) directly in your Vercel project settings.

```bash
cp .env.example .env
```

Edit `.env`:

```
VERCEL_PROJECT_URL=https://your-project.vercel.app
```

If you use the GitHub UI upload flow, add the same value as a GitHub Actions secret so the workflow summary can print real links:

1. Open your repo on GitHub
2. Go to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Name it `VERCEL_PROJECT_URL`
5. Set the value to your Vercel project URL, for example `https://your-project.vercel.app`

That's it. No npm install. No build step. The deploy script uses only Node.js built-ins.

### 5. Point Vercel at the build-skip script

In your Vercel project settings, go to **Settings > Git > Ignored Build Step** and set it to:

```
bash ignore-build.sh
```

This tells Vercel to skip rebuilding when only the README or CI config changed. Without it, every commit triggers a build. With it, only changes to `public/` or `vercel.json` do.

---

## Deploying an artifact

### From the terminal

```bash
node deploy-artifact.js path/to/file.html "My Dashboard"
```

The script validates the file, generates the hash, copies, commits, pushes, and prints the URL. Done.

To batch multiple files before pushing:

```bash
node deploy-artifact.js file1.html "First thing" --no-push
node deploy-artifact.js file2.html "Second thing" --no-push
git push origin main
```

### From the GitHub UI

If you don't have a terminal handy:

1. Go to `incoming/` in your GitHub repo
2. Click **Add file** then **Upload files**
3. Drop in your `.html` file
4. Commit to `main`

A GitHub Action processes it, moves it to `public/` with an obfuscated name, and prints the live URL in the run summary.

Do not upload artifacts to `.github/ISSUE_TEMPLATE/`, GitHub issues, docs, or the repo root. Vercel only serves deployed artifacts after they land in `public/`.

If your artifact has relative assets (CSS, JS, images), put everything in a folder with `index.html` at the root and upload the whole folder. If the folder has exactly one root HTML file with another name, such as `document name.html`, the ingest script renames it to `index.html` automatically. The Action obfuscates the folder name but leaves the internal structure alone, so relative paths still resolve.

### From VS Code

Drop files or folders into `incoming/`, then run:

```bash
npm run deploy:incoming
```

This processes `incoming/`, moves artifacts to `public/`, commits, pushes to `origin/main`, and lets Vercel deploy from the push.

---

## How the URL security works

The hash is 12 characters from the set `a-z0-9`. That's 36^12 values, roughly 4.7 x 10^18. Brute-forcing that over HTTP, even with aggressive rate limiting disabled, would take longer than you care about.

I used rejection sampling because naive modulo on `randomBytes` introduces bias when the character set size (36) doesn't evenly divide the byte range (256). It's a small thing but it's the right way to do it. The threshold is 252 (36 x 7), bytes at or above that are discarded and resampled.

Headers set on every response:

- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` — search engines and AI crawlers are told to leave
- `Content-Security-Policy: sandbox allow-scripts; ...` — artifact scripts can run, but without same-origin privilege, arbitrary outbound network, forms, plugins, or top navigation
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `X-Frame-Options: DENY` — no embedding in iframes
- `Referrer-Policy: no-referrer` — the URL doesn't leak via referrer headers when users click external links
- `Permissions-Policy` — camera, microphone, geolocation, and FLoC disabled

The 404 page has a strict CSP: `script-src 'none'`, `object-src 'none'`, `frame-ancestors 'none'`. Nothing executes on the error page.

---

## Project structure

```
.
├── .github/
│   ├── workflows/
│   │   ├── ingest-artifact.yml    # Processes GitHub UI uploads
│   │   └── ci.yml                 # Validates the deploy script on PRs
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── FUNDING.yml
├── docs/
│   └── architecture.md            # How everything fits together
├── incoming/                      # Drop zone for GitHub UI uploads
│   └── .gitkeep
├── public/                        # Served by Vercel
│   ├── 404.html
│   └── .gitkeep
├── deploy-artifact.js             # CLI deploy tool
├── ingest-incoming.js             # GitHub Actions ingestion runner
├── AGENTS.md                      # Minimal agent operating contract
├── ignore-build.sh                # Vercel build-skip script
├── vercel.json                    # Routing and security headers
├── package.json
├── .env.example
├── .editorconfig
└── .nvmrc
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT. See [LICENSE](LICENSE).
