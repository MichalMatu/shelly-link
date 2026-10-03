
rm -rf "$OUT"
mkdir -p "$OUT"
git show origin/agent-control:.agent/tasks/android-emulator-direct-cdp-inspect2-20261003.payload/cdp.mjs > apps/mobile/e2e/.tmp-android-webview-cdp.mjs

node apps/mobile/e2e/.tmp-android-webview-cdp.mjs dashboard
"$ADB" exec-out screencap -p > "$OUT/12-thermometers-dashboard-device.png"
node apps/mobile/e2e/.tmp-android-webview-cdp.mjs settings
"$ADB" exec-out screencap -p > "$OUT/28-thermometer-settings-device.png"
rm -f apps/mobile/e2e/.tmp-android-webview-cdp.mjs

python3 - <<'PY'
from pathlib import Path
from PIL import Image
import json
out = Path('inspection/android-emulator-20261003')
summary = {}
for path in sorted(out.glob('*.png')):
    with Image.open(path) as image:
        summary[path.name] = {'width': image.width, 'height': image.height, 'mode': image.mode}
(out / 'image-metadata.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
PY

cat "$OUT/dashboard-report.json"
cat "$OUT/settings-report.json"
git status --short --untracked-files=all "$OUT"
git add "$OUT"
git commit -m 'Add Android emulator UX inspection evidence'
git push --no-verify origin HEAD:inspection/android-emulator-20261003
