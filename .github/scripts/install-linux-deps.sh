#!/usr/bin/env bash
# Linux CI deps for Electron / verify:m7 (Ubuntu 22.04 + 24.04/noble).
set -euo pipefail

MODE="${1:-verify}"

sudo apt-get update

COMMON=(
  build-essential
  python3
  libgtk-3-0
  libnss3
  libgbm1
)

RELEASE_EXTRA=(
  libnotify4
  libxss1
  libxtst6
  xdg-utils
  libatspi2.0-0
  libfuse2
)

# Ubuntu 24.04 (noble): libasound2 → libasound2t64
install_asound() {
  if sudo apt-get install -y libasound2t64 2>/dev/null; then
    return 0
  fi
  sudo apt-get install -y libasound2
}

sudo apt-get install -y "${COMMON[@]}"
install_asound

if [ "$MODE" = "release" ]; then
  sudo apt-get install -y "${RELEASE_EXTRA[@]}"
fi

echo "Linux deps installed (mode=$MODE)"
