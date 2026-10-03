#!/usr/bin/env bash
set -euo pipefail

git show origin/agent-control:.agent/tasks/android-emulator-googleapis-inspect-20261003.payload/run.sh > /tmp/android-googleapis-inspect2.sh
python3 - /tmp/android-googleapis-inspect2.sh <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
s = s.replace('/tmp/shelly-link-emulator-inspect.mjs', 'apps/mobile/e2e/.tmp-shelly-link-emulator-inspect.mjs')
s = s.replace('/tmp/shelly-link-emulator-dashboard.mjs', 'apps/mobile/e2e/.tmp-shelly-link-emulator-dashboard.mjs')
needle = '"$ADB" exec-out screencap -p > "$OUT/12-thermometers-dashboard-device.png"\n\npython3 - <<\'PY\''
replacement = '"$ADB" exec-out screencap -p > "$OUT/12-thermometers-dashboard-device.png"\nrm -f apps/mobile/e2e/.tmp-shelly-link-emulator-inspect.mjs apps/mobile/e2e/.tmp-shelly-link-emulator-dashboard.mjs\n\npython3 - <<\'PY\''
if needle not in s:
    raise SystemExit('cleanup insertion point not found')
s = s.replace(needle, replacement, 1)
p.write_text(s)
PY
chmod +x /tmp/android-googleapis-inspect2.sh
/tmp/android-googleapis-inspect2.sh
