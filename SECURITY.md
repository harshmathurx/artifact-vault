# Security policy

## Reporting a vulnerability

If you find a security issue, please do not open a public GitHub issue. Instead, email the maintainer directly:

**harshmathurx@gmail.com**

Include as much detail as you can: what the issue is, how to reproduce it, and what the impact could be. I will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days.

## Scope

This project is a static file host with no server-side logic, no authentication, and no database. The threat model is narrow:

- URL enumeration (brute-forcing hashed file names)
- Content injection via uploaded HTML files
- Misconfigured Vercel routing that exposes directory listings
- Information leakage through HTTP headers or error pages

If you find an issue in any of these areas, or something I haven't thought of, I want to hear about it.

## What's out of scope

- Vulnerabilities in Vercel's infrastructure itself (report those to Vercel)
- Social engineering attacks
- Issues that require physical access to the deployment machine

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Acknowledgments

If you report a valid security issue, I'm happy to credit you in the README (with your permission).
