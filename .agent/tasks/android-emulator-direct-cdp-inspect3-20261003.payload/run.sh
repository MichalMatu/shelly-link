#!/usr/bin/env bash
set -euo pipefail

git show origin/agent-control:.agent/tasks/android-emulator-googleapis-inspect-20261003.payload/run.sh > /tmp/android-direct-cdp-inspect3.sh
git show origin/agent-control:.agent/tasks/android-emulator-direct-cdp-inspect3-20261003.payload/tail.sh > /tmp/android-direct-cdp-tail3.sh
python3 - /tmp/android-direct-cdp-inspect3.sh /tmp/android-direct-cdp-tail3.sh <<'PY'
from pathlib import Path
import sys
base = Path(sys.argv[1])
tail = Path(sys.argv[2]).read_text()
s = base.read_text()
marker = 'echo "webview socket=$SOCKET"'
if marker not in s:
    raise SystemExit('webview marker not found')
base.write_text(s.split(marker, 1)[0] + marker + '\n' + tail)
PY
chmod +x /tmp/android-direct-cdp-inspect3.sh
/tmp/android-direct-cdp-inspect3.sh
