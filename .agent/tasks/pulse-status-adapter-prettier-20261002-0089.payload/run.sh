#!/usr/bin/env bash
set -euo pipefail
BRANCH='pulse-v1-shared-ui'
git fetch --prune origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
pnpm exec prettier --write apps/mobile/src/flows/installations/pulseOperationalStatus.ts >/dev/null
git diff -- apps/mobile/src/flows/installations/pulseOperationalStatus.ts
git reset --hard "origin/$BRANCH" >/dev/null
