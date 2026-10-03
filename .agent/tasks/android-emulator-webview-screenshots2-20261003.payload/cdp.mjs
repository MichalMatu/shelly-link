import fs from 'node:fs';

const mode = process.argv[2];
const out = 'inspection/android-emulator-20261003';
const targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json());
const target = targets.find((entry) => entry.webSocketDebuggerUrl && (entry.type === 'page' || entry.type === 'webview')) ?? targets.find((entry) => entry.webSocketDebuggerUrl);
if (!target?.webSocketDebuggerUrl) throw new Error(`No debuggable WebView target: ${JSON.stringify(targets)}`);

const keepAlive = setInterval(() => {}, 1000);
const ws = new WebSocket(target.webSocketDebuggerUrl);
const failPending = (error) => {
  for (const waiter of pending.values()) waiter.reject(error);
  pending.clear();
};
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 10_000);
  ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
  ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP websocket error')); }, { once: true });
});

let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  clearTimeout(waiter.timer);
  if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
  else waiter.resolve(message.result ?? {});
});
ws.addEventListener('close', () => failPending(new Error('CDP websocket closed')));
ws.addEventListener('error', () => failPending(new Error('CDP websocket failed')));
const call = (method, params = {}, timeoutMs = 10_000) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => {
    pending.delete(id);
    reject(new Error(`${method}: timeout after ${timeoutMs} ms`));
  }, timeoutMs);
  pending.set(id, { resolve, reject, method, timer });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(`Runtime.evaluate failed: ${response.exceptionDetails.text ?? 'unknown exception'}`);
  return response.result?.value;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (expression, label, timeoutMs = 15_000) => {
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
const readReport = () => evaluate(`(() => ({
  viewport: { innerWidth: window.innerWidth, innerHeight: window.innerHeight, dpr: window.devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight },
  headings: [...document.querySelectorAll('h1,h2,h3,h4')].map((el) => (el.textContent || '').trim()).filter(Boolean),
  buttons: [...document.querySelectorAll('button')].map((el) => el.getAttribute('aria-label') || (el.textContent || '').trim()).filter(Boolean),
  mainText: document.querySelector('main')?.innerText || ''
}))()`);
const capture = async (path) => {
  const result = await call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }, 20_000);
  fs.writeFileSync(path, Buffer.from(result.data, 'base64'));
};

try {
  if (mode === 'dashboard') {
    const draft = {
      shellyNameInput: 'Shelly Plug S Gen3', shellyUrlInput: '', sensorProfileInput: 'xiaomi_lywsd03mmc_bthome_v2', sensorMacInput: '', sensorNameInput: '', shellyDevices: [],
      sensorDevices: [{ id: 'A4:C1:38:4F:24:CD', name: 'Przedpokój', runtimeAddress: 'A4:C1:38:4F:24:CD', profileId: 'xiaomi_lywsd03mmc_bthome_v2' }],
      selectedShellyId: '', selectedSensorId: 'A4:C1:38:4F:24:CD', additionalSensorIds: [], sensorAggregation: 'avg', diagnosticShellyId: '', rulePreset: 'heating',
      onThresholdInput: '19', offThresholdInput: '20', vpdAssistEnabled: false, vpdTargetInput: '1.2', rssiMinInput: '-85', staleTimeoutMinInput: '2', minChangeMinInput: '2', maxOnHoursInput: '4'
    };
    const serializedDraft = JSON.stringify(draft);
    await evaluate(`(() => { localStorage.setItem('lcl.preferences.locale.v1', 'pl'); localStorage.setItem('lcl.hardwareSetupDraft.v9', ${JSON.stringify(serializedDraft)}); return true; })()`);
    await evaluate('location.reload(); true');
    await waitFor(`[...document.querySelectorAll('button')].some((el) => (el.textContent || '').trim() === 'Termometry')`, 'Thermometers navigation', 20_000);
    await clickByExactText('Termometry');
    await waitFor(`document.querySelector('main[aria-label="Termometry"]') !== null`, 'Thermometers dashboard');
    await sleep(700);
    fs.writeFileSync(`${out}/dashboard-webview-report.json`, `${JSON.stringify(await readReport(), null, 2)}\n`);
    await capture(`${out}/12-thermometers-dashboard-webview.png`);
  } else if (mode === 'settings') {
    await waitFor(`[...document.querySelectorAll('button')].some((el) => el.getAttribute('aria-label') === 'Ustawienia termometru Przedpokój')`, 'thermometer settings button');
    await clickByAria('Ustawienia termometru Przedpokój');
    await waitFor(`[...document.querySelectorAll('h1,h2,h3')].some((el) => (el.textContent || '').trim() === 'Ustawienia termometru')`, 'Thermometer Settings');
    await sleep(700);
    fs.writeFileSync(`${out}/settings-webview-report.json`, `${JSON.stringify(await readReport(), null, 2)}\n`);
    await capture(`${out}/28-thermometer-settings-webview.png`);
  } else {
    throw new Error(`Unknown inspection mode: ${mode}`);
  }
} finally {
  clearInterval(keepAlive);
  ws.close();
}
