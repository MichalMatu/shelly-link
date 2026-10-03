#!/usr/bin/env bash
set -euo pipefail

SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
ADB="$SDK/platform-tools/adb"
EMU="$SDK/emulator/emulator"
AVDMANAGER="$SDK/cmdline-tools/latest/bin/avdmanager"
AVD="lcl_ui_inspect"
PACKAGE="app.shellylink.mobile"
APK="apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
OUT="inspection/android-emulator-20261003"
EMU_LOG="/tmp/shelly-link-googleapis-emulator.log"
EMU_PID=""
mkdir -p "$OUT"

cleanup() {
  set +e
  "$ADB" emu kill >/dev/null 2>&1
  if [[ -n "$EMU_PID" ]]; then
    kill "$EMU_PID" >/dev/null 2>&1
    for _ in $(seq 1 20); do
      kill -0 "$EMU_PID" >/dev/null 2>&1 || break
      sleep 0.25
    done
    kill -9 "$EMU_PID" >/dev/null 2>&1
    wait "$EMU_PID" >/dev/null 2>&1
  fi
  "$AVDMANAGER" delete avd -n "$AVD" >/dev/null 2>&1
}
trap cleanup EXIT

# Build first, while the emulator is not consuming host memory.
pnpm --filter @lcl/mobile build
pnpm --filter @lcl/mobile exec cap sync android
printf 'sdk.dir=%s\n' "$SDK" > apps/mobile/android/local.properties
(
  cd apps/mobile/android
  ./gradlew --no-daemon assembleDebug
)
test -f "$APK"

# Create an ephemeral non-Play-Store AVD from the already-installed image.
"$AVDMANAGER" delete avd -n "$AVD" >/dev/null 2>&1 || true
printf 'no\n' | "$AVDMANAGER" create avd \
  --force \
  --name "$AVD" \
  --package 'system-images;android-36;google_apis;arm64-v8a' \
  --device 'medium_phone'
CONFIG="$HOME/.android/avd/$AVD.avd/config.ini"
python3 - "$CONFIG" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
lines = path.read_text().splitlines()
updates = {
    'hw.cpu.ncore': '2',
    'hw.ramSize': '1536',
    'hw.gpu.enabled': 'yes',
    'hw.gpu.mode': 'host',
    'PlayStore.enabled': 'false',
    'fastboot.forceColdBoot': 'yes',
    'fastboot.forceFastBoot': 'no',
}
out = []
seen = set()
for line in lines:
    if '=' in line:
        key = line.split('=', 1)[0].strip()
        if key in updates:
            out.append(f'{key} = {updates[key]}')
            seen.add(key)
            continue
    out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f'{key} = {value}')
path.write_text('\n'.join(out) + '\n')
PY

echo '--- temporary AVD config ---'
grep -E '^(PlayStore.enabled|hw.cpu.ncore|hw.ramSize|hw.gpu|hw.lcd|image.sysdir|tag.id)' "$CONFIG" || true

"$ADB" kill-server >/dev/null 2>&1 || true
ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL=5 "$EMU" \
  -avd "$AVD" \
  -no-snapshot \
  -no-audio \
  -no-boot-anim \
  -no-window \
  -gpu host \
  -feature -Vulkan \
  -cores 2 \
  -memory 1536 \
  >"$EMU_LOG" 2>&1 &
EMU_PID=$!
echo "emulator pid=$EMU_PID"

ADB_READY=0
for _ in $(seq 1 150); do
  if "$ADB" devices | awk 'NR>1 && $1 ~ /^emulator-/ && $2=="device" {found=1} END {exit found?0:1}'; then
    ADB_READY=1
    break
  fi
  kill -0 "$EMU_PID" >/dev/null 2>&1 || {
    echo 'Emulator exited before ADB became ready.' >&2
    tail -160 "$EMU_LOG" >&2 || true
    exit 1
  }
  sleep 1
done
if [[ "$ADB_READY" != "1" ]]; then
  echo 'Ephemeral google_apis AVD did not become an ADB device within 150 seconds.' >&2
  tail -200 "$EMU_LOG" >&2 || true
  exit 1
fi

BOOT_READY=0
for _ in $(seq 1 180); do
  if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    BOOT_READY=1
    break
  fi
  sleep 1
done
if [[ "$BOOT_READY" != "1" ]]; then
  echo 'Android did not finish boot within 180 seconds after ADB appeared.' >&2
  tail -200 "$EMU_LOG" >&2 || true
  exit 1
fi

echo '--- emulator ready ---'
"$ADB" devices -l
"$ADB" shell wm size
"$ADB" shell wm density
"$ADB" shell getprop ro.product.model
"$ADB" shell getprop ro.build.version.release

"$ADB" install -r -t "$APK"
"$ADB" shell pm grant "$PACKAGE" android.permission.BLUETOOTH_SCAN >/dev/null 2>&1 || true
"$ADB" shell pm grant "$PACKAGE" android.permission.BLUETOOTH_CONNECT >/dev/null 2>&1 || true
"$ADB" shell pm grant "$PACKAGE" android.permission.ACCESS_FINE_LOCATION >/dev/null 2>&1 || true
"$ADB" shell am force-stop "$PACKAGE"
"$ADB" shell am start -W -n "$PACKAGE/.MainActivity"

SOCKET=""
for _ in $(seq 1 60); do
  SOCKET="$("$ADB" shell cat /proc/net/unix 2>/dev/null | sed -n 's/.*@\(webview_devtools_remote_[0-9][0-9]*\).*/\1/p' | head -1 | tr -d '\r')"
  [[ -n "$SOCKET" ]] && break
  sleep 1
done
if [[ -z "$SOCKET" ]]; then
  echo 'No debuggable WebView socket found.' >&2
  "$ADB" shell cat /proc/net/unix | grep -E 'webview_devtools|chrome_devtools' || true
  exit 1
fi
"$ADB" forward --remove tcp:9222 >/dev/null 2>&1 || true
"$ADB" forward tcp:9222 "localabstract:$SOCKET"

echo "webview socket=$SOCKET"
cat > /tmp/shelly-link-emulator-inspect.mjs <<'NODE'
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())[0];
if (!page) throw new Error('No WebView page.');

const draft = {
  shellyNameInput: 'Shelly Plug S Gen3', shellyUrlInput: '',
  sensorProfileInput: 'xiaomi_lywsd03mmc_bthome_v2', sensorMacInput: '', sensorNameInput: '',
  shellyDevices: [],
  sensorDevices: [{
    id: 'A4:C1:38:4F:24:CD', name: 'Przedpokój', runtimeAddress: 'A4:C1:38:4F:24:CD',
    profileId: 'xiaomi_lywsd03mmc_bthome_v2'
  }],
  selectedShellyId: '', selectedSensorId: 'A4:C1:38:4F:24:CD', additionalSensorIds: [],
  sensorAggregation: 'avg', diagnosticShellyId: '', rulePreset: 'heating',
  onThresholdInput: '19', offThresholdInput: '20', vpdAssistEnabled: false, vpdTargetInput: '1.2',
  rssiMinInput: '-85', staleTimeoutMinInput: '2', minChangeMinInput: '2', maxOnHoursInput: '4'
};
await page.evaluate((value) => {
  localStorage.setItem('lcl.preferences.locale.v1', 'pl');
  localStorage.setItem('lcl.hardwareSetupDraft.v9', JSON.stringify(value));
}, draft);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Termometry', exact: true }).click();
await page.getByRole('main', { name: 'Termometry' }).waitFor({ state: 'visible' });
await page.waitForTimeout(600);
const dashboardViewport = await page.evaluate(() => ({
  innerWidth: window.innerWidth, innerHeight: window.innerHeight, dpr: window.devicePixelRatio,
  scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
  scrollHeight: document.documentElement.scrollHeight
}));
fs.writeFileSync('inspection/android-emulator-20261003/dashboard-report.json', JSON.stringify({
  viewport: dashboardViewport,
  headings: await page.getByRole('heading').allTextContents(),
  buttons: await page.getByRole('button').allTextContents(),
  mainText: await page.locator('main').innerText()
}, null, 2));
await page.screenshot({ path: 'inspection/android-emulator-20261003/12-thermometers-dashboard-webview.png', fullPage: true });

await page.getByRole('button', { name: 'Ustawienia termometru Przedpokój' }).click();
await page.getByRole('heading', { name: 'Ustawienia termometru' }).waitFor({ state: 'visible' });
await page.waitForTimeout(600);
const settingsViewport = await page.evaluate(() => ({
  innerWidth: window.innerWidth, innerHeight: window.innerHeight, dpr: window.devicePixelRatio,
  scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
  scrollHeight: document.documentElement.scrollHeight
}));
fs.writeFileSync('inspection/android-emulator-20261003/settings-report.json', JSON.stringify({
  viewport: settingsViewport,
  headings: await page.getByRole('heading').allTextContents(),
  buttons: await page.getByRole('button').allTextContents(),
  mainText: await page.locator('main').innerText()
}, null, 2));
await page.screenshot({ path: 'inspection/android-emulator-20261003/28-thermometer-settings-webview.png', fullPage: true });
await browser.close();
NODE

node /tmp/shelly-link-emulator-inspect.mjs
"$ADB" exec-out screencap -p > "$OUT/28-thermometer-settings-device.png"

cat > /tmp/shelly-link-emulator-dashboard.mjs <<'NODE'
import { chromium } from '@playwright/test';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts().flatMap((context) => context.pages())[0];
await page.getByRole('button', { name: 'Termometry', exact: true }).click();
await page.getByRole('main', { name: 'Termometry' }).waitFor({ state: 'visible' });
await page.waitForTimeout(500);
await browser.close();
NODE
node /tmp/shelly-link-emulator-dashboard.mjs
"$ADB" exec-out screencap -p > "$OUT/12-thermometers-dashboard-device.png"

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

git status --short --untracked-files=all "$OUT"
git add "$OUT"
git commit -m 'Add Android emulator UX inspection evidence'
git push --no-verify origin HEAD:inspection/android-emulator-20261003
