#!/bin/bash

# ── Vercel Ignored Build Step ──
# https://vercel.com/docs/concepts/projects/overview#ignored-build-step
#
# Exit code 1: Proceed with Vercel deployment
# Exit code 0: Skip Vercel deployment
#
# Only rebuilds when public/ or vercel.json change — saves build minutes.

echo "Verifying changes for Vercel build trigger..."

# First commit — always build
if ! git rev-parse --quiet --verify HEAD^ >/dev/null; then
  echo "Initial commit detected. Proceeding with build."
  exit 1
fi

# Check for meaningful diffs
git diff --quiet HEAD^ HEAD public/ vercel.json

if [ $? -eq 0 ]; then
  echo "No changes detected in public/ or vercel.json. Skipping build."
  exit 0
else
  echo "Changes detected in public/ or vercel.json. Proceeding with build."
  exit 1
fi
