#!/usr/bin/env bash
set -euo pipefail

git show origin/agent-control:.agent/tasks/android-emulator-googleapis-inspect-20261003.payload/run.sh > /tmp/android-direct-cdp-inspect2.sh
git show origin/agent-control:.agent/tasks/android-emulator-direct-cdp-inspect2-20261003.payload/tail.sh > /tmp/android-direct-cdp-tail.sh
python3 - /tmp/android-direct-cdp-inspect2.sh /tmp/android-direct-cdp-tail.sh <<'PY'
from pathlib import Path
import sys
base = Path(sys.argv[1])
tail = Path(sys.argv[2]).read_text()
s = base.read_text()
marker = 'echo "webview socket=$SOCKET"'
if marker not in s:
    raise SystemExit('webview marker not found')
prefix = s.split(marker, 1)[0] + marker + '\n'
base.write_text(prefix + tail)
PY
chmod +x /tmp/android-direct-cdp-inspect2.sh
/tmp/android-direct-cdp-inspect2.sh
