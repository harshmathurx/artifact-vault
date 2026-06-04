# Security Policy

If you find a security issue in this project, do not open a public GitHub issue. Email me directly at:

**harshmathurx@gmail.com**

Please include reproduction steps, the impact of the issue, and any proposed fixes. I'll acknowledge receipt within 48 hours and work on a fix or mitigation plan within a week.

---

## Security Model

The security model of `artifact-vault` is simple: **obscurity through unpredictability**.

This is not an authenticated vault. There are no users, no roles, and no access control lists (ACLs). Anyone who knows a file's URL can read it. If you need true access control, encryption-at-rest with access key rotation, or audit trails, **do not use this tool**. Use a document manager with authentication.

We secure files by making their URLs unguessable:
- Hashed filenames use a cryptographically secure, 12-character alphanumeric prefix (`a-z0-9`).
- Modulo bias is eliminated using rejection sampling in `crypto.randomBytes`.
- The prefix space is roughly $36^{12} \approx 4.7 \times 10^{18}$ combinations. Brute-forcing this space over HTTP is infeasible under any reasonable network constraints.

---

## Threat Model & Scope

We prioritize fixes for issues that break our privacy design.

### In Scope
- **URL Enumeration:** Flaws that make it possible to guess or predict generated hashes (e.g., generator seeds leaking, bias in character selection).
- **Directory Exposure:** Misconfigurations in routing rules (`vercel.json`) that allow a user to list the contents of the `/public` directory.
- **Information Leaks:** HTTP headers or server configurations leaking internal file paths or repository metadata.
- **Injection Vectors:** Vulnerabilities in the deployment scripts (`deploy-artifact.js` or `ingest-incoming.js`) that allow command injection or path traversal via file uploads.

### Out of Scope
- **Vercel Infrastructure:** Network level attacks, DNS hijacking, or physical security of Vercel servers (report these directly to Vercel).
- **Social Engineering:** Users leaking URLs in public chats or public repositories.
- **Client-Side Attacks:** General browser-based vulnerabilities unrelated to the headers set by this host.

---

## Supported Versions

Only the current major version is supported.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

---

## Acknowledgments

I'll gladly credit you in the release notes or the README if you report a valid vulnerability and coordinate disclosure responsibly.
