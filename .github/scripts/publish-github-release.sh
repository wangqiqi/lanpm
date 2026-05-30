#!/usr/bin/env bash
# Publish a draft GitHub Release via REST API (no local git / gh repo required).
#
# Usage: publish-github-release.sh <tag> [is_prerelease=true|false] [release_id]
#
# When git tag already exists, softprops may create an untagged draft; pass release_id
# from action outputs, or this script falls back to matching draft by tag/name.
set -euo pipefail

TAG="${1:?tag required}"
IS_PRERELEASE="${2:-false}"
RELEASE_ID="${3:-}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
TOKEN="${GH_TOKEN:?GH_TOKEN required}"
API="https://api.github.com/repos/${REPO}"

auth=(-H "Authorization: Bearer ${TOKEN}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

resolve_release_id() {
  if [ -n "$RELEASE_ID" ]; then
    echo "$RELEASE_ID"
    return 0
  fi

  local by_tag
  by_tag="$(curl -sS "${auth[@]}" "${API}/releases/tags/${TAG}" | jq -r '.id // empty')"
  if [ -n "$by_tag" ]; then
    echo "$by_tag"
    return 0
  fi

  # Untagged draft (common when the git tag already exists before draft upload)
  curl -sS "${auth[@]}" "${API}/releases?per_page=30" \
    | jq -r --arg tag "$TAG" --arg name "LanPM ${TAG}" '
        [.[] | select(.draft == true) |
          select(.tag_name == $tag or .name == $name)] |
        first | .id // empty'
}

RELEASE_ID="$(resolve_release_id)"

if [ -z "$RELEASE_ID" ]; then
  echo "Release not found for tag ${TAG} (no id, tag lookup, or matching draft)" >&2
  exit 1
fi

echo "Publishing release id=${RELEASE_ID} tag=${TAG} prerelease=${IS_PRERELEASE}"

if [ "$IS_PRERELEASE" = "true" ]; then
  PAYLOAD="$(jq -n --arg tag "$TAG" '{draft: false, prerelease: true, tag_name: $tag}')"
else
  PAYLOAD="$(jq -n --arg tag "$TAG" '{draft: false, make_latest: true, tag_name: $tag}')"
fi

curl -fsSL -X PATCH "${auth[@]}" "${API}/releases/${RELEASE_ID}" -d "$PAYLOAD"

echo "Published ${TAG} on ${REPO}"
