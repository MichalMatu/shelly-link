#!/bin/sh
set -eu

git fetch origin refactor/plug-ui-unification agent-control golden/climate-ui-20260928 --quiet
git reset --hard origin/refactor/plug-ui-unification
git clean -fd
git checkout -B refactor/plug-ui-unification origin/refactor/plug-ui-unification
test "$(git rev-parse HEAD)" = "2a120f30d81568f2550ff857184c29a16deec6b9"
test -z "$(git status --porcelain)"

git show origin/agent-control:.agent/payloads/refine_time_setup_surface_20260928.py > /tmp/refine.py
python3 /tmp/refine.py
git show origin/agent-control:.agent/payloads/register_time_setup_css_gate_20260928.py > /tmp/register.py
python3 /tmp/register.py
git show origin/agent-control:.agent/payloads/repair_shared_time_grid_20260928.py > /tmp/repair.py
python3 /tmp/repair.py
git show origin/agent-control:.agent/payloads/stabilize_hardware_setup_relay_dialog_test_20260928.py > /tmp/stabilize.py
python3 /tmp/stabilize.py
pnpm exec prettier --write \
  apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx \
  apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.css \
  apps/mobile/src/theme/theme.css \
  apps/mobile/src/__tests__/hardware-setup.test.tsx \
  scripts/quality/ux-gate.mjs

pnpm --filter @lcl/mobile typecheck
pnpm --filter @lcl/mobile exec vitest run src/__tests__/hardware-setup.test.tsx --passWithNoTests
pnpm --filter @lcl/mobile exec vitest run src/__tests__/hardware-setup.test.tsx --passWithNoTests
pnpm quality:ux
pnpm quality:repo
git diff --check
pnpm --filter @lcl/mobile test

env -u CI LCL_E2E_PORT=6351 LCL_VISUAL_CONTRACT=1 pnpm exec playwright test \
  -c apps/mobile/playwright.config.ts \
  apps/mobile/e2e/led-settings.spec.ts:468 apps/mobile/e2e/responsive.spec.ts:640 \
  --workers=1 --reporter=line

git add \
  apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx \
  apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.css \
  apps/mobile/src/theme/theme.css scripts/quality/ux-gate.mjs
git commit -m 'Refine Time schedule setup surface'
git add apps/mobile/src/__tests__/hardware-setup.test.tsx
git commit -m 'Stabilize hardware setup relay dialog test'

env -u CI LCL_E2E_PORT=6352 LCL_VISUAL_CONTRACT=1 pnpm exec playwright test \
  -c apps/mobile/playwright.config.ts apps/mobile/e2e/responsive.spec.ts \
  --grep 'daily time automation installs and renders on phone-large' \
  --workers=1 --reporter=line --update-snapshots

python3 - <<'PY'
import subprocess
expected=['apps/mobile/e2e/responsive.spec.ts-snapshots/09-time-setup-darwin.png']
out=subprocess.check_output(['git','diff','--name-only','HEAD','--','apps/mobile/e2e'],text=True).splitlines()
out=[x for x in out if x.endswith('.png')]
print('VISUAL_DIFFS', *out, sep='\n')
if out != expected:
    raise SystemExit(f'unexpected visual diffs: {out!r}')
climate=['01-plugs-dashboard-darwin.png','02-climate-automation-darwin.png','03-climate-ble-darwin.png','05-climate-device-darwin.png','06-climate-script-darwin.png','07-climate-info-darwin.png']
base='apps/mobile/e2e/responsive.spec.ts-snapshots/'
for name in climate:
    current=subprocess.check_output(['git','rev-parse',f'HEAD:{base}{name}'],text=True).strip()
    golden=subprocess.check_output(['git','rev-parse',f'origin/golden/climate-ui-20260928:{base}{name}'],text=True).strip()
    if current != golden:
        raise SystemExit(f'Climate golden changed: {name}')
PY

git add apps/mobile/e2e/responsive.spec.ts-snapshots/09-time-setup-darwin.png
git commit -m 'Update refined Time setup visual baseline'
git push origin HEAD:refactor/plug-ui-unification
