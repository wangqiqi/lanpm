#!/usr/bin/env bash
# Resolve which GitHub Release tag to sync (R2 / manual dispatch).
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
TOKEN="${GH_TOKEN:?GH_TOKEN required}"
INPUT_TAG="${1:-}"
EVENT_NAME="${2:-workflow_dispatch}"
WORKFLOW_HEAD_BRANCH="${3:-}"

if [ -n "$INPUT_TAG" ]; then
  "$(dirname "$0")/normalize-tag.sh" "$INPUT_TAG"
  exit 0
fi

if [ "$EVENT_NAME" = "workflow_run" ] && [[ "$WORKFLOW_HEAD_BRANCH" == v* ]]; then
  echo "$WORKFLOW_HEAD_BRANCH"
  exit 0
fi

gh release view --repo "$REPO" --json tagName -q .tagName
