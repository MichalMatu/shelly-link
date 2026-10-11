set -eu
git fetch origin agent-control feature/rule-debounce-runtime
git reset --hard origin/feature/rule-debounce-runtime
test "$(git rev-parse HEAD)" = "878a12f09cdf769b5b86ac07a324306710ee5e56"
rm -f scripts/hardware/.tmp-debounce-smoke.ts
git show origin/agent-control:.agent/tasks/rule-debounce-hardware-smoke-20260930-073.payload/assets/smoke.ts > scripts/hardware/.tmp-debounce-smoke.ts
pnpm exec tsx scripts/hardware/.tmp-debounce-smoke.ts
rm -f scripts/hardware/.tmp-debounce-smoke.ts
test -z "$(git status --short)"
