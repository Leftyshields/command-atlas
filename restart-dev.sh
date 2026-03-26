#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/brian/docker/command-atlas"

echo "Stopping existing dev servers (if any)..."
pkill -f "tsx watch src/index.ts" || true
pkill -f "vite" || true

echo "Starting API..."
(cd "$ROOT/api" && nohup npm run dev > /tmp/command-atlas-api.log 2>&1 &)

echo "Starting app..."
(cd "$ROOT/app" && nohup npm run dev > /tmp/command-atlas-app.log 2>&1 &)

echo "Done."
echo "API logs:  /tmp/command-atlas-api.log"
echo "App logs:  /tmp/command-atlas-app.log"
echo "App URL:   http://localhost:5173"
echo "API URL:   http://localhost:4000"
