#!/bin/sh
set -eu
python3 - <<'PY'
import subprocess
lines = subprocess.check_output(
    ['git', 'status', '--short', '--', 'apps/mobile/e2e'], text=True
).splitlines()
changed = {line[3:] for line in lines if len(line) >= 4}
expected = {
    'apps/mobile/e2e/responsive.spec.ts',
    'apps/mobile/e2e/visual-contract.ts',
    'apps/mobile/e2e/responsive.spec.ts-snapshots/12-thermometers-dashboard-darwin.png',
    'apps/mobile/e2e/responsive.spec.ts-snapshots/22-thermometer-detail-darwin.png',
}
print('E2E_CHANGED', sorted(changed))
if changed != expected:
    raise SystemExit(f'unexpected Thermometer E2E visual changes: {sorted(changed)}')
PY
