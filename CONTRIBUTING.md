# Contributing to artifact-vault

This project is small on purpose. If you want to help, here's how.

---

## Getting the project running locally

1. Fork the repo and clone your fork:

```bash
git clone https://github.com/<your-username>/artifact-vault.git
cd artifact-vault
```

2. Copy the env template:

```bash
cp .env.example .env
```

3. There are no npm dependencies to install. The project uses only Node.js built-in modules (`fs`, `path`, `crypto`, `child_process`). If that changes in the future, run `npm install`.

4. Test the CLI:

```bash
# Create a dummy HTML file
echo '<h1>test</h1>' > /tmp/test.html

# Run the deploy script (it will commit locally but skip pushing)
node deploy-artifact.js /tmp/test.html "test artifact" --no-push
```

If you see a file appear in `public/` with a hashed name, it works.

---

## Making changes

### Branch naming

Use descriptive branch names. No enforced convention, just make it obvious what the branch does.

```
fix-env-parsing
add-netlify-support
update-404-page
```

### Commit messages

Follow conventional commits loosely. The format is `type: description`. Types that make sense here:

- `fix:` for bug fixes
- `feat:` for new features
- `docs:` for documentation changes
- `chore:` for tooling, CI, formatting

Examples:

```
fix: handle .env values containing equals signs
feat: add --dry-run flag to deploy script
docs: clarify build-skip setup in README
```

### Code style

- 2-space indentation, UTF-8, LF line endings (the `.editorconfig` handles this)
- Single quotes for strings in JavaScript
- No external dependencies unless absolutely necessary. The zero-dependency footprint is intentional.
- If you add a dependency, explain why in the PR description

---

## What to work on

Check the [issue tracker](https://github.com/harshmathurx/artifact-vault/issues) for open issues. If you want to work on something that doesn't have an issue yet, open one first so we can talk about it before you write code.

Good first contributions:

- Fixing typos or unclear documentation
- Adding tests for `deploy-artifact.js` or `ingest-incoming.js`
- Improving the 404 page
- Adding support for other hosting platforms (Netlify, Cloudflare Pages)

---

## Pull requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test them locally (deploy a test artifact, check the output)
4. Push your branch and open a PR against `main`
5. Fill out the PR template

A CI workflow runs on every PR. It creates a test HTML file, runs the deploy script with `--no-push`, and verifies the output file exists. Make sure that passes before requesting a review.

---

## Reporting bugs

Open an issue using the bug report template. Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Node.js version (`node --version`)
- Your OS

---

## Suggesting features

Open an issue using the feature request template. Describe the problem you're trying to solve, not just the solution you're imagining. Sometimes there's a simpler way.

---

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be decent to each other.
