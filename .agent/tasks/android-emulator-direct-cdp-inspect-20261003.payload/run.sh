#!/usr/bin/env bash
set -euo pipefail

git show origin/agent-control:.agent/tasks/android-emulator-googleapis-inspect-20261003.payload/run.sh > /tmp/android-direct-cdp-inspect.sh
python3 - /tmp/android-direct-cdp-inspect.sh <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text()
marker = 'echo "webview socket=$SOCKET"'
if marker not in s:
    raise SystemExit('webview marker not found')
prefix = s.split(marker, 1)[0] + marker + '\n'
tail = r'''
cat > apps/mobile/e2e/.tmp-android-webview-cdp.mjs <<'NODE'
import fs from 'node:fs';

const mode = process.argv[2];
const out = 'inspection/android-emulator-20261003';
const targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json());
const target = targets.find((entry) => entry.webSocketDebuggerUrl && (entry.type === 'page' || entry.type === 'webview')) ?? targets.find((entry) => entry.webSocketDebuggerUrl);
if (!target?.webSocketDebuggerUrl) throw new Error(`No debuggable page target: ${JSON.stringify(targets)}`);

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 10000);
  ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
  ws.addEventListener('error', (event) => { clearTimeout(timer); reject(event.error ?? new Error('CDP websocket error')); }, { once: true });
});
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
  else waiter.resolve(message.result ?? {});
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject, method });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(`Runtime.evaluate failed: ${response.exceptionDetails.text ?? 'unknown'}`);
  return response.result?.value;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (expression, label, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${label}`);
};
const clickByExactText = async (text) => {
  const value = JSON.stringify(text);
  const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === ${value}); if (!node) return false; node.click(); return true; })()`);
  if (!clicked) throw new Error(`Button not found by exact text: ${text}`);
};
const clickByAria = async (label) => {
  const value = JSON.stringify(label);
  const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === ${value}); if (!node) return false; node.click(); return true; })()`);
  if (!clicked) throw new Error(`Button not found by aria-label: ${label}`);
};
const report = async () => evaluate(`(() => ({
  viewport: {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight
  },
  headings: [...document.querySelectorAll('h1,h2,h3,h4')].map((el) => (el.textContent || '').trim()).filter(Boolean),
  buttons: [...document.querySelectorAll('button')].map((el) => el.getAttribute('aria-label') || (el.textContent || '').trim()).filter(Boolean),
  mainText: document.querySelector('main')?.innerText || ''
}))()`);

await call('Runtime.enable');
if (mode === 'dashboard') {
  const draft = {
    shellyNameInput: 'Shelly Plug S Gen3', shellyUrlInput: '',
    sensorProfileInput: 'xiaomi_lywsd03mmc_bthome_v2', sensorMacInput: '', sensorNameInput: '',
    shellyDevices: [],
    sensorDevices: [{ id: 'A4:C1:38:4F:24:CD', name: 'Przedpokój', runtimeAddress: 'A4:C1:38:4F:24:CD', profileId: 'xiaomi_lywsd03mmc_bthome_v2' }],
    selectedShellyId: '', selectedSensorId: 'A4:C1:38:4F:24:CD', additionalSensorIds: [], sensorAggregation: 'avg',
    diagnosticShellyId: '', rulePreset: 'heating', onThresholdInput: '19', offThresholdInput: '20',
    vpdAssistEnabled: false, vpdTargetInput: '1.2', rssiMinInput: '-85', staleTimeoutMinInput: '2', minChangeMinInput: '2', maxOnHoursInput: '4'
  };
  await evaluate(`(() => { localStorage.setItem('lcl.preferences.locale.v1', 'pl'); localStorage.setItem('lcl.hardwareSetupDraft.v9', ${JSON.stringify(JSON.stringify(draft))}); location.reload(); return true; })()`);
  await waitFor(`document.readyState === 'complete' || document.readyState === 'interactive'`, 'app reload');
  await waitFor(`[...document.querySelectorAll('button')].some((el) => (el.textContent || '').trim() === 'Termometry')`, 'Thermometers navigation');
  await clickByExactText('Termometry');
  await waitFor(`document.querySelector('main[aria-label="Termometry"]') !== null`, 'Thermometers dashboard');
  await sleep(700);
  fs.writeFileSync(`${out}/dashboard-report.json`, JSON.stringify(await report(), null, 2) + '\n');
} else if (mode === 'settings') {
  await waitFor(`[...document.querySelectorAll('button')].some((el) => el.getAttribute('aria-label') === 'Ustawienia termometru Przedpokój')`, 'thermometer settings button');
  await clickByAria('Ustawienia termometru Przedpokój');
  await waitFor(`[...document.querySelectorAll('h1,h2,h3')].some((el) => (el.textContent || '').trim() === 'Ustawienia termometru')`, 'Thermometer Settings');
  await sleep(700);
  fs.writeFileSync(`${out}/settings-report.json`, JSON.stringify(await report(), null, 2) + '\n');
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
ws.close();
NODE

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
'''
p.write_text(prefix + tail)
PY
chmod +x /tmp/android-direct-cdp-inspect.sh
/tmp/android-direct-cdp-inspect.sh
