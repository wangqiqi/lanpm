#!/usr/bin/env bash
# Normalize tag to v-prefixed form (v1.0.0-rc.78).
set -euo pipefail
RAW="${1:?tag required}"
RAW="${RAW#v}"
echo "v${RAW}"
