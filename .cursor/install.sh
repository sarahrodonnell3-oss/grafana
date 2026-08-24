#!/usr/bin/env bash
set -euo pipefail

# Grafana pins its Node version in .nvmrc. In the Cloud Agent VM an older Node is
# injected ahead of nvm on PATH, so we install and activate the pinned version
# explicitly here (and in start-frontend.sh) rather than relying on shell PATH.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

NODE_VERSION="$(cat .nvmrc)"
nvm install "$NODE_VERSION" >/dev/null
nvm alias default "$NODE_VERSION" >/dev/null
corepack enable
export PATH="$NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH"

# Install frontend dependencies. COREPACK_ENABLE_DOWNLOAD_PROMPT avoids an
# interactive prompt the first time corepack fetches the pinned Yarn release.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export YARN_ENABLE_PROGRESS_BARS=false
yarn install --immutable

# Warm the Go module cache for the checked-out revision so the first backend
# build in the `make run` terminal is fast.
go mod download
