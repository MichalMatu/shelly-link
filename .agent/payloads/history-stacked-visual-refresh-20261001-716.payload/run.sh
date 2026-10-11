#!/usr/bin/env bash
set -euo pipefail
BRANCH='work/history-stacked-panels-20261001'
EXPECTED_HEAD='4161224d21c84fbd156e04701f61e1857d123fa7'
PORT=5187
LOG='/tmp/shelly-history-visual-vite.log'

git fetch --prune origin
git switch "$BRANCH"
git reset --hard "origin/$BRANCH"
[[ "$(git rev-parse HEAD)" == "$EXPECTED_HEAD" ]]
[[ -z "$(git status --porcelain)" ]]

pnpm --filter @lcl/mobile exec vite --host 127.0.0.1 --port "$PORT" --strictPort >"$LOG" 2>&1 &
VITE_PID=$!
cleanup() {
  kill "$VITE_PID" >/dev/null 2>&1 || true
  wait "$VITE_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORT/admin#shelly" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$PORT/admin#shelly" >/dev/null

env -u CI LCL_E2E_PORT="$PORT" LCL_VISUAL_CONTRACT=1 pnpm exec playwright test \
  -c apps/mobile/playwright.config.ts \
  apps/mobile/e2e/responsive.spec.ts \
  --grep "installed automation dashboard shows Shelly runtime on phone-large" \
  --update-snapshots \
  --reporter=line

CHANGED="$(git status --porcelain | sed 's/^...//')"
printf 'CHANGED|%s\n' "$CHANGED"
[[ "$(printf '%s\n' "$CHANGED" | sed '/^$/d' | wc -l | tr -d ' ')" == '1' ]]
printf '%s\n' "$CHANGED" | grep -q '23-climate-history-darwin.png'
git diff --check
git add -- "$CHANGED"
git commit --no-verify -m 'Refresh stacked History visual baseline'
git push --no-verify origin "$BRANCH"
echo "VISUAL_REFRESH_OK|$(git rev-parse HEAD)"
