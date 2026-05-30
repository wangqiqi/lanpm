#!/usr/bin/env bash
# Publish a draft GitHub Release via REST API (no local git / gh repo required).
set -euo pipefail

TAG="${1:?tag required}"
IS_PRERELEASE="${2:-false}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
TOKEN="${GH_TOKEN:?GH_TOKEN required}"

RELEASE_ID="$(curl -fsSL \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/releases/tags/${TAG}" \
  | jq -r .id)"

if [ -z "$RELEASE_ID" ] || [ "$RELEASE_ID" = "null" ]; then
  echo "Release not found for tag ${TAG}" >&2
  exit 1
fi

if [ "$IS_PRERELEASE" = "true" ]; then
  PAYLOAD='{"draft":false,"prerelease":true}'
else
  PAYLOAD='{"draft":false,"make_latest":true}'
fi

curl -fsSL -X PATCH \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/releases/${RELEASE_ID}" \
  -d "$PAYLOAD"

echo "Published ${TAG} on ${REPO}"
