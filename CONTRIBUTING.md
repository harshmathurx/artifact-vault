# Contributing to artifact-vault

This project is small on purpose. I want to keep it that way. The entire codebase fits in your head in ten minutes, and the zero-dependency footprint is a feature, not a bug. If you want to contribute, keep that constraint in mind.

---

## Local Setup

Setting this up locally is straightforward:

1. Fork and clone:
   ```bash
   git clone https://github.com/<your-username>/artifact-vault.git
   cd artifact-vault
   ```

2. Copy the env template:
   ```bash
   cp .env.example .env
   ```

3. Run smoke tests:
   ```bash
   # Create a dummy HTML file
   echo '<h1>test</h1>' > /tmp/test.html

   # Deploy it locally (creates the file but skips pushing)
   node deploy-artifact.js /tmp/test.html "smoke test" --no-push
   ```

If you see a new file with a random prefix inside `public/`, everything works.

---

## Rules of the Road

I have a few strong preferences. Following them saves us both time.

### 1. No Dependencies
The project uses Node.js standard library modules (`fs`, `path`, `crypto`, `child_process`). Do not add third-party npm packages unless you have a massive, undeniable reason. If you add one, you need to justify it in detail in the pull request. "It's easier" is not a justification.

### 2. Code Style
- Keep it plain JavaScript. No transpilers, no TypeScript, no build steps.
- Use 2-space indentation.
- Single quotes for JavaScript strings.
- Keep helper functions inside the script files unless they are reusable across both the local CLI and the Actions runner.

### 3. Git Etiquette
- Use clean, descriptive branch names (e.g., `fix-env-parsing`, `add-cloudflare-support`).
- Commit messages should tell me *what* changes and *why*. I don't care about strict Conventional Commits formats, but they are a good default.
- Squash your commits before requesting a review. I want a clean main history.

---

## What to Work On

Check the issue tracker first. If you want to build a feature that isn't documented in an issue, open one and talk to me before you write the code. I don't want to reject a PR you spent three hours on because it doesn't align with where I want to take the vault.

Good contributions:
- Platform support (e.g., adapters for Cloudflare Pages or Netlify).
- CI pipeline fixes.
- Performance tweaks to the file hashing script.
- Edge case fixes in shell parameter parsing.

---

## Submitting a PR

1. Fork the repo and branch off `main`.
2. Make your changes and test them locally.
3. If you add a feature, update the relevant docs.
4. Open the PR and fill out the template.
5. Make sure the GitHub Actions checks pass.

Once the automated tests pass, I'll take a look. If it makes sense and keeps the repo simple, I'll merge it.

---

## Code of Conduct

Be decent to each other. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.
