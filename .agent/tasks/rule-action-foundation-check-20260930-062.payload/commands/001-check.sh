set -eu
git fetch origin main feature/rule-action-expansion
git reset --hard origin/feature/rule-action-expansion
printf '\n== branch ==\n'
git status --short --branch
git rev-parse HEAD
printf '\n== focused tests ==\n'
pnpm --filter @lcl/automation-core test
pnpm --filter @lcl/automation-core typecheck
printf '\n== runtime byte parity ==\n'
git show origin/main:packages/script-generator/src/shelly/generate.ts >/dev/null
cat > scripts/.tmp-runtime-parity.ts <<'TS'
import { createDefaultShellyThermostatConfig, generateShellyThermostatScript } from '@lcl/script-generator';
const configs = [
  createDefaultShellyThermostatConfig('xiaomi_lywsd03mmc_bthome_v2', 'heating'),
  createDefaultShellyThermostatConfig('tp357_custom_v1', 'humidifying')
];
for (const config of configs) {
  const code = generateShellyThermostatScript(config);
  console.log(config.sensor.profileId, new TextEncoder().encode(code).length);
}
TS
pnpm exec tsx scripts/.tmp-runtime-parity.ts > /tmp/rule-action-feature-runtime.txt
git worktree add --detach /tmp/shelly-link-main-parity origin/main >/dev/null
(
  cd /tmp/shelly-link-main-parity
  pnpm exec tsx scripts/.tmp-runtime-parity.ts > /tmp/rule-action-main-runtime.txt
)
diff -u /tmp/rule-action-main-runtime.txt /tmp/rule-action-feature-runtime.txt
rm -rf /tmp/shelly-link-main-parity
rm -f scripts/.tmp-runtime-parity.ts /tmp/rule-action-main-runtime.txt /tmp/rule-action-feature-runtime.txt
printf '\n== repo gate ==\n'
pnpm check
printf '\n== diff ==\n'
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
