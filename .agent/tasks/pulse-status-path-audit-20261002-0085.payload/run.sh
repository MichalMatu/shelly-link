#!/usr/bin/env bash
set -euo pipefail
BRANCH='pulse-v1-shared-ui'
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

echo '=== runtime reader definitions ==='
rg -n -l "readTimeAutomationRuntime|standalonePulseAutomationRuntime|timePulseAutomationRuntime" apps/mobile/src/features/automations apps/mobile/src/flows | sort
for f in $(rg -l "readTimeAutomationRuntime|standalonePulseAutomationRuntime|timePulseAutomationRuntime" apps/mobile/src/features/automations apps/mobile/src/flows | sort -u); do
  echo "--- $f"
  sed -n '1,460p' "$f"
done

echo '=== Script.Eval helpers and response parsing ==='
rg -n -C 8 "Script\.Eval|scriptEval|Eval" apps/mobile/src packages/shelly-client/src packages/script-generator/src --glob '*.ts' --glob '*.tsx' | head -n 900 || true

echo '=== standalone installation presentation references ==='
rg -n -C 8 "kind === 'pulse'|kind: 'pulse'|StandalonePulse|PulseInstalled|standalone pulse|standalonePulse" apps/mobile/src --glob '*.ts' --glob '*.tsx' | head -n 900 || true
