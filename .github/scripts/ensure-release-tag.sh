#!/usr/bin/env bash
# Create git tag on commit if missing (after GitHub Release is published).
set -euo pipefail

TAG="${1:?tag required}"
SHA="${2:?commit sha required}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
TOKEN="${GH_TOKEN:?GH_TOKEN required}"

auth=(-H "Authorization: Bearer ${TOKEN}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

if curl -fsSL "${auth[@]}" "https://api.github.com/repos/${REPO}/git/ref/tags/${TAG}" >/dev/null 2>&1; then
  echo "Git tag ${TAG} already exists — skip"
  exit 0
fi

curl -fsSL -X POST "${auth[@]}" "https://api.github.com/repos/${REPO}/git/refs" \
  -d "$(jq -n --arg ref "refs/tags/${TAG}" --arg sha "$SHA" '{ref: $ref, sha: $sha}')"

echo "Created git tag ${TAG} → ${SHA}"
