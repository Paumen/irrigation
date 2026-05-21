#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

pip install -q --ignore-installed -r requirements.txt

if [ -f package.json ]; then
  npm install --silent --no-audit --no-fund
fi
