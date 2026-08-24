#!/usr/bin/env bash
set -euo pipefail

# Activate the Node version pinned in .nvmrc (see install.sh for why this is
# needed) before starting the @grafana/ui Storybook dev server.
export NVM_DIR="$HOME/.nvm"
NODE_VERSION="$(cat .nvmrc)"
export PATH="$NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH"

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Focused workshop workload: the @grafana/ui component library Storybook.
# Serves on http://localhost:9001 (port is defined by the workspace script).
exec yarn workspace @grafana/ui storybook
