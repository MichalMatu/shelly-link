import json
import subprocess
import time
from typing import Any

BASE = 'http://192.168.0.10'
INTERFACE = 'en0'
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'
SCRIPT_ID = 1


def curl_json(url: str, params: dict[str, Any] | None = None, attempts: int = 8) -> Any:
    last: Any = None
    for i in range(attempts):
        cmd = [
            'curl', '-sS', '--interface', INTERFACE,
            '--connect-timeout', '2', '--max-time', '8', '-G', url,
        ]
        for key, value in (params or {}).items():
            cmd += ['--data-urlencode', f'{key}={value}']
        p = subprocess.run(cmd, capture_output=True, text=True)
        if p.returncode == 0 and p.stdout.strip():
            try:
                value = json.loads(p.stdout)
                if not (isinstance(value, dict) and isinstance(value.get('code'), (int, float)) and value['code'] < 0):
                    return value
                last = value
            except Exception as exc:
                last = f'invalid json: {exc!r} body={p.stdout[:200]!r}'
        else:
            last = p.stderr.strip() or 'empty response'
        if i + 1 < attempts:
            time.sleep(1)
    raise RuntimeError(f'{url} failed: {last!r}')


info = curl_json(f'{BASE}/rpc/Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')

scripts = curl_json(f'{BASE}/rpc/Script.List')
switch = curl_json(f'{BASE}/rpc/Switch.GetStatus', {'id': 0})
diag = curl_json(f'{BASE}/script/{SCRIPT_ID}/diag')
g = diag.get('g') if isinstance(diag, dict) else None
p = diag.get('p') if isinstance(diag, dict) else None
if not isinstance(g, list) or len(g) < 24:
    raise RuntimeError(f'invalid diag.g: {g!r}')

result = {
    'identity': {
        'id': info.get('id'),
        'model': info.get('model'),
        'gen': info.get('gen'),
        'fw_id': info.get('fw_id'),
        'ver': info.get('ver'),
    },
    'scripts': scripts,
    'switch': {
        'output': switch.get('output'),
        'apower': switch.get('apower'),
        'current': switch.get('current'),
        'voltage': switch.get('voltage'),
    },
    'diag': {
        'temperatureC': g[1],
        'humidityPct': g[2],
        'runtimeRelayOn': g[5],
        'reason': g[6],
        'mode': 'manual' if g[17] else 'auto',
        'automationRequestOn': g[18],
        'automationFault': g[21],
        'safetyLockout': g[22],
        'safetyReason': g[23],
        'finalRelayOn': p[0] if isinstance(p, list) and p else None,
    },
}
print(json.dumps(result, indent=2, sort_keys=True))
