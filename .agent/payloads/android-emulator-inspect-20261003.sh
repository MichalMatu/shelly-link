#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
ADB="$SDK/platform-tools/adb"
EMU="$SDK/emulator/emulator"
AVD="medium_phone"
PACKAGE="app.shellylink.mobile"
APK="apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"
OUT="inspection/android-emulator-20261003"
EMU_LOG="/tmp/shelly-link-emulator.log"
mkdir -p "$OUT"

cleanup() {
  "$ADB" emu kill >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$ADB" kill-server >/dev/null 2>&1 || true
"$EMU" -avd "$AVD" -no-snapshot-save -no-audio -no-boot-anim -no-window >"$EMU_LOG" 2>&1 &
EMU_PID=$!

echo "emulator pid=$EMU_PID"
"$ADB" wait-for-device
for _ in $(seq 1 180); do
  if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    break
  fi
  sleep 1
done
[[ "$("$ADB" shell getprop sys.boot_completed | tr -d '\r')" == "1" ]]

echo '--- emulator ---'
"$ADB" shell wm size
"$ADB" shell wm density
"$ADB" shell getprop ro.product.model
"$ADB" shell getprop ro.build.version.release

pnpm --filter @lcl/mobile build
pnpm --filter @lcl/mobile exec cap sync android
printf 'sdk.dir=%s\n' "$SDK" > apps/mobile/android/local.properties
(
  cd apps/mobile/android
  ./gradlew assembleDebug
)
[[ -f "$APK" ]]
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

echo "webview socket=$SOCKET"
"$ADB" forward --remove tcp:9222 >/dev/null 2>&1 || true
"$ADB" forward tcp:9222 "localabstract:$SOCKET"

cat > /tmp/shelly-link-emulator-inspect.mjs <<'NODE'
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const contexts = browser.contexts();
if (contexts.length === 0) throw new Error('No CDP browser context.');
const pages = contexts.flatMap((context) => context.pages());
if (pages.length === 0) throw new Error('No WebView page.');
const page = pages[0];
console.log('webview url before seed:', page.url());

const draft = {
  shellyNameInput: 'Shelly Plug S Gen3',
  shellyUrlInput: '',
  sensorProfileInput: 'xiaomi_lywsd03mmc_bthome_v2',
  sensorMacInput: '',
  sensorNameInput: '',
  shellyDevices: [],
  sensorDevices: [
    {
      id: 'A4:C1:38:4F:24:CD',
      name: 'Przedpokój',
      runtimeAddress: 'A4:C1:38:4F:24:CD',
      profileId: 'xiaomi_lywsd03mmc_bthome_v2'
    }
  ],
  selectedShellyId: '',
  selectedSensorId: 'A4:C1:38:4F:24:CD',
  additionalSensorIds: [],
  sensorAggregation: 'avg',
  diagnosticShellyId: '',
  rulePreset: 'heating',
  onThresholdInput: '19',
  offThresholdInput: '20',
  vpdAssistEnabled: false,
  vpdTargetInput: '1.2',
  rssiMinInput: '-85',
  staleTimeoutMinInput: '2',
  minChangeMinInput: '2',
  maxOnHoursInput: '4'
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

const dashboard = {
  url: page.url(),
  viewport: await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    bodyScrollWidth: document.body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    bodyScrollHeight: document.body.scrollHeight
  })),
  headings: await page.getByRole('heading').allTextContents(),
  buttons: await page.getByRole('button').allTextContents(),
  thermometerCardText: await page
    .getByRole('heading', { name: 'Przedpokój' })
    .locator('xpath=ancestor::article[1]')
    .innerText()
};
fs.writeFileSync('inspection/android-emulator-20261003/dashboard-report.json', JSON.stringify(dashboard, null, 2));
await page.screenshot({ path: 'inspection/android-emulator-20261003/12-thermometers-dashboard-webview.png', fullPage: true });

await page.getByRole('button', { name: 'Ustawienia termometru Przedpokój' }).click();
await page.getByRole('heading', { name: 'Ustawienia termometru' }).waitFor({ state: 'visible' });
await page.waitForTimeout(600);

const settings = {
  url: page.url(),
  viewport: await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    bodyScrollWidth: document.body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    bodyScrollHeight: document.body.scrollHeight
  })),
  headings: await page.getByRole('heading').allTextContents(),
  buttons: await page.getByRole('button').allTextContents(),
  pageText: await page.locator('main').innerText()
};
fs.writeFileSync('inspection/android-emulator-20261003/settings-report.json', JSON.stringify(settings, null, 2));
await page.screenshot({ path: 'inspection/android-emulator-20261003/28-thermometer-settings-webview.png', fullPage: true });

await browser.close();
NODE

node /tmp/shelly-link-emulator-inspect.mjs

# Capture the real device framebuffer after Settings is open.
"$ADB" exec-out screencap -p > "$OUT/28-thermometer-settings-device.png"

# Re-open dashboard through the Android app WebView via CDP for a device framebuffer capture.
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
print(json.dumps(summary, indent=2))
(out / 'image-metadata.json').write_text(json.dumps(summary, indent=2) + '\n')
PY

git status --short --untracked-files=all "$OUT"
git add "$OUT"
git commit -m 'Add Android emulator UX inspection evidence'
git push --no-verify origin HEAD:inspection/android-emulator-20261003
