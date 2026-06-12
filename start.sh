#!/usr/bin/env bash
set -euo pipefail

# Vibe Builder launcher — installs deps if missing, then runs backend + frontend.
cd "$(dirname "$0")"

if ! command -v claude >/dev/null 2>&1; then
  echo "ERROR: the 'claude' CLI is not on PATH. Install Claude Code and run 'claude login' first." >&2
  exit 1
fi

if [ ! -d node_modules ] || [ ! -d backend/node_modules ] || [ ! -d frontend/node_modules ]; then
  echo "Installing dependencies…"
  npm run install:all
fi

echo "Starting Vibe Builder…"
echo "  backend:  http://127.0.0.1:4317"
echo "  frontend: http://127.0.0.1:5317"
npm run dev
