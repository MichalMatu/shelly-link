import json
import subprocess
import time
from typing import Any

BASE = 'http://192.168.0.10'
INTERFACE = 'en0'
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'


def curl_once(path: str) -> tuple[bool, Any]:
    p = subprocess.run(
        [
            'curl', '-sS', '--interface', INTERFACE,
            '--connect-timeout', '2', '--max-time', '4',
            BASE + path,
        ],
        capture_output=True,
        text=True,
    )
    if p.returncode != 0:
        return False, p.stderr.strip()
    try:
        return True, json.loads(p.stdout)
    except Exception:
        return False, f'invalid JSON: {p.stdout[:200]}'


def require(path: str, attempts: int = 4) -> Any:
    last: Any = None
    for index in range(attempts):
        ok, value = curl_once(path)
        if ok:
            return value
        last = value
        if index + 1 < attempts:
            time.sleep(0.25)
    raise RuntimeError(f'{path} failed after {attempts} read-only attempts: {last}')


info = require('/rpc/Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')

method_response = require('/rpc/Shelly.ListMethods')
methods = method_response.get('methods') if isinstance(method_response, dict) else None
if not isinstance(methods, list):
    raise RuntimeError(f'invalid Shelly.ListMethods response: {method_response!r}')
methods = [m for m in methods if isinstance(m, str)]
radio_methods = sorted(
    m for m in methods
    if 'ble' in m.lower() or 'bthome' in m.lower() or 'bluetooth' in m.lower()
)

readbacks: dict[str, Any] = {}
for method in ('BLE.GetConfig', 'BLE.GetStatus', 'BTHome.GetConfig', 'BTHome.GetStatus'):
    if method in methods:
        readbacks[method] = require('/rpc/' + method)

scripts = require('/rpc/Script.List')
entries = scripts.get('scripts') if isinstance(scripts, dict) else None
if not isinstance(entries, list) or len(entries) != 1:
    raise RuntimeError(f'expected exactly one managed script: {entries!r}')
script = entries[0]
script_id = script.get('id')
if script_id != 1:
    raise RuntimeError(f'unexpected managed script id: {script_id!r}')
script_status = require('/rpc/Script.GetStatus?id=1')
switch = require('/rpc/Switch.GetStatus?id=0')
sys_status = require('/rpc/Sys.GetStatus')
diag = require('/script/1/diag')

# Keep the raw compact diagnostic arrays so the audit can map the installed
# runtime's stale timeout and current sensor/recovery state without changing it.
q = diag.get('q') if isinstance(diag, dict) else None
g = diag.get('g') if isinstance(diag, dict) else None
y = diag.get('y') if isinstance(diag, dict) else None
p = diag.get('p') if isinstance(diag, dict) else None
if not isinstance(g, list) or len(g) < 24:
    raise RuntimeError(f'invalid diag.g: {g!r}')

summary = {
    'identity': {
        'id': info.get('id'),
        'model': info.get('model'),
        'gen': info.get('gen'),
        'fw_id': info.get('fw_id'),
        'ver': info.get('ver'),
    },
    'radioMethods': radio_methods,
    'radioReadbacks': readbacks,
    'script': script,
    'scriptStatus': {
        'running': script_status.get('running'),
        'mem_used': script_status.get('mem_used'),
        'mem_peak': script_status.get('mem_peak'),
        'mem_free': script_status.get('mem_free'),
    },
    'deviceUptimeSec': sys_status.get('uptime') if isinstance(sys_status, dict) else None,
    'switch': {
        'output': switch.get('output'),
        'apower': switch.get('apower'),
        'current': switch.get('current'),
        'voltage': switch.get('voltage'),
    },
    'diag': {
        'q': q,
        'g': g,
        'y': y,
        'p': p,
        'controlMode': 'manual' if g[17] else 'auto',
        'automationRequestOn': g[18],
        'manualRequestOn': g[20],
        'automationFault': g[21],
        'safetyLockout': g[22],
        'safetyReason': g[23],
        'temperatureC': g[1],
        'humidityPct': g[2],
        'runtimeRelayOn': g[5],
        'reason': g[6],
    },
}
print(json.dumps(summary, indent=2, sort_keys=True))
