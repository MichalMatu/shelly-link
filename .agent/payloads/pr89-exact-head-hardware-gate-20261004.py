import hashlib
import json
import subprocess
import time
from pathlib import Path
from typing import Any

BASE = 'http://192.168.0.10'
INTERFACE = 'en0'
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'
EXPECTED_MODEL = 'S3PL-00112EU'
EXPECTED_MAC = 'E4B063D7F530'
EXPECTED_BRANCH_HEAD = 'd291a42d175972d01836f2fdf0cb9d88e91792c0'
EXPECTED_OLD_SHA = 'eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
SCRIPT_ID = 1
POLL_SEC = 5
MISSING_ADDR = '000000000000'


def rpc_once(method: str, params: dict[str, Any] | None = None, max_time: int = 10) -> tuple[bool, Any]:
    cmd = ['curl', '-sS', '--interface', INTERFACE, '--connect-timeout', '2', '--max-time', str(max_time), '-G', f'{BASE}/rpc/{method}']
    for key, value in (params or {}).items():
        if isinstance(value, (dict, list)):
            encoded = json.dumps(value, separators=(',', ':'))
        elif isinstance(value, bool):
            encoded = 'true' if value else 'false'
        else:
            encoded = str(value)
        cmd += ['--data-urlencode', f'{key}={encoded}']
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        return False, p.stderr.strip()
    try:
        out = json.loads(p.stdout)
    except Exception:
        return False, f'invalid JSON: {p.stdout[:300]}'
    if isinstance(out, dict) and isinstance(out.get('code'), (int, float)) and out.get('code') < 0:
        return False, out
    return True, out


def read_rpc(method: str, params: dict[str, Any] | None = None, attempts: int = 5) -> Any:
    last = None
    for i in range(attempts):
        ok, value = rpc_once(method, params)
        if ok:
            return value
        last = value
        if i + 1 < attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{method} failed after read retries: {last!r}')


def mutate_once(method: str, params: dict[str, Any]) -> Any:
    ok, value = rpc_once(method, params, 12)
    if not ok:
        raise RuntimeError(f'{method} mutation failed without retry: {value!r}')
    return value


def read_path(path: str) -> Any:
    last = None
    for i in range(5):
        p = subprocess.run(['curl', '-sS', '--interface', INTERFACE, '--connect-timeout', '2', '--max-time', '8', BASE + path], capture_output=True, text=True)
        if p.returncode == 0:
            try:
                value = json.loads(p.stdout)
                if not (isinstance(value, dict) and isinstance(value.get('code'), (int, float)) and value.get('code') < 0):
                    return value
                last = value
            except Exception:
                last = p.stdout[:300]
        else:
            last = p.stderr.strip()
        if i < 4:
            time.sleep(0.4)
    raise RuntimeError(f'{path} failed: {last!r}')


def script_source() -> str:
    parts: list[str] = []
    offset = 0
    for _ in range(64):
        value = read_rpc('Script.GetCode', {'id': SCRIPT_ID, 'offset': offset, 'len': 1024})
        data = value.get('data') if isinstance(value, dict) else None
        left = value.get('left') if isinstance(value, dict) else None
        if not isinstance(data, str) or not isinstance(left, (int, float)):
            raise RuntimeError(f'invalid Script.GetCode: {value!r}')
        parts.append(data)
        offset += len(data.encode())
        if left <= 0:
            return ''.join(parts)
        if not data:
            raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def sha(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def diag_state() -> dict[str, Any]:
    d = read_path(f'/script/{SCRIPT_ID}/diag')
    g = d.get('g'); q = d.get('q'); p = d.get('p'); y = d.get('y')
    if not isinstance(g, list) or len(g) < 24 or not isinstance(q, list) or len(q) < 6:
        raise RuntimeError(f'invalid diag: {d!r}')
    return {
        'uptimeSec': y[2] if isinstance(y, list) and len(y) > 2 else None,
        'runtimeRelayOn': g[5],
        'reason': g[6],
        'mode': 'manual' if g[17] else 'auto',
        'automationRequestOn': g[18],
        'automationFault': g[21],
        'safetyLockout': g[22],
        'safetyReason': g[23],
        'temperatureC': g[1],
        'humidityPct': g[2],
        'staleTimeoutSec': q[4],
        'finalRelayOn': p[0] if isinstance(p, list) and p else None,
    }


def switch_state() -> dict[str, Any]:
    s = read_rpc('Switch.GetStatus', {'id': 0})
    if not isinstance(s, dict):
        raise RuntimeError(f'invalid Switch.GetStatus: {s!r}')
    return {k: s.get(k) for k in ('output', 'apower', 'current', 'voltage')}


def script_status() -> dict[str, Any]:
    s = read_rpc('Script.GetStatus', {'id': SCRIPT_ID})
    if not isinstance(s, dict):
        raise RuntimeError(f'invalid Script.GetStatus: {s!r}')
    return s


def eval_once(code: str) -> Any:
    value = mutate_once('Script.Eval', {'id': SCRIPT_ID, 'code': code})
    if not isinstance(value, dict):
        raise RuntimeError(f'invalid Script.Eval response: {value!r}')
    return value.get('result')


def runtime_state() -> dict[str, Any]:
    raw = eval_once('JSON.stringify({a:C.a,ss:C.ss,sa:R.sa,l:R.l,n:nw(),sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null))})')
    if not isinstance(raw, str):
        raise RuntimeError(f'cannot read runtime state: {raw!r}')
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise RuntimeError(f'invalid runtime state: {value!r}')
    return value


def assert_script_healthy(status: dict[str, Any], phase: str) -> None:
    if status.get('running') is not True or status.get('error_msg') or status.get('errors'):
        raise RuntimeError(f'{phase}: unhealthy script status: {status!r}')


def snapshot(phase: str, started: float) -> dict[str, Any]:
    d = diag_state()
    r = runtime_state()
    s = switch_state()
    st = script_status()
    assert_script_healthy(st, phase)
    snap = {
        'phase': phase,
        'elapsedSec': round(time.monotonic() - started, 1),
        'diag': d,
        'runtime': r,
        'switch': s,
        'scriptErrors': st.get('errors'),
        'scriptErrorMsg': st.get('error_msg'),
    }
    print('GATE_SAMPLE ' + json.dumps(snap, separators=(',', ':'), sort_keys=True), flush=True)
    return snap


def assert_identity(info: dict[str, Any]) -> None:
    actual_mac = str(info.get('mac', '')).replace(':', '').upper()
    if info.get('id') != EXPECTED_ID or info.get('model') != EXPECTED_MODEL or actual_mac != EXPECTED_MAC:
        raise RuntimeError(f'identity mismatch: {info!r}')


started = time.monotonic()
result: dict[str, Any] = {
    'accepted': False,
    'branchHead': EXPECTED_BRANCH_HEAD,
    'faultInjection': 'real device runtime sensor-address isolation; physical BLE remains enabled and scanner must remain running',
    'timeline': [],
}
address_changed = False
original_addr: str | None = None

candidate = Path('/tmp/climate-new-source.js').read_text()
old = Path('/tmp/climate-old-source.js').read_text()
if sha(old) != EXPECTED_OLD_SHA:
    raise RuntimeError(f'old backup hash mismatch: {sha(old)}')
candidate_sha = sha(candidate)
result['candidateSourceSha256'] = candidate_sha
result['candidateSourceBytes'] = len(candidate.encode())

info = read_rpc('Shelly.GetDeviceInfo')
assert_identity(info)
result['identity'] = {'id': info.get('id'), 'model': info.get('model'), 'mac': info.get('mac'), 'fw_id': info.get('fw_id')}

ble_cfg = read_rpc('BLE.GetConfig')
if not isinstance(ble_cfg, dict) or ble_cfg.get('enable') is not True:
    raise RuntimeError(f'BLE must be enabled: {ble_cfg!r}')
result['bleConfig'] = ble_cfg

installed = script_source()
if installed != candidate:
    raise RuntimeError(f'installed source is not exact candidate: {sha(installed)} != {candidate_sha}')

scripts = read_rpc('Script.List')
entries = scripts.get('scripts') if isinstance(scripts, dict) else None
if not isinstance(entries, list) or len(entries) != 1 or entries[0].get('id') != SCRIPT_ID or entries[0].get('running') is not True:
    raise RuntimeError(f'expected exactly one running managed script: {entries!r}')

# Give the freshly restarted runtime time to receive a real target frame.
baseline_deadline = time.monotonic() + 90
baseline = None
while time.monotonic() < baseline_deadline:
    snap = snapshot('baseline', started)
    result['timeline'].append(snap)
    d = snap['diag']; r = snap['runtime']; s = snap['switch']
    if r.get('sc') is not True:
        raise RuntimeError(f'baseline scanner liveness is not true: {r!r}')
    if d['safetyLockout'] is not False:
        raise RuntimeError(f'baseline safety lockout: {d!r}')
    age = (r.get('n') - r.get('l')) if isinstance(r.get('n'), (int, float)) and isinstance(r.get('l'), (int, float)) and r.get('l') else None
    if d['mode'] == 'auto' and d['automationFault'] is None and d['temperatureC'] is not None and d['humidityPct'] is not None and age is not None and 0 <= age < 30000 and s.get('output') == d['finalRelayOn']:
        baseline = snap
        baseline['sensorAgeMs'] = age
        break
    time.sleep(POLL_SEC)
if baseline is None:
    raise RuntimeError(f'fresh BLE/AUTO baseline not observed: {result["timeline"][-6:]!r}')
result['baseline'] = baseline

base_runtime = baseline['runtime']
base_sa = base_runtime.get('sa')
base_l = base_runtime.get('l')
base_uptime = baseline['diag'].get('uptimeSec')
if not isinstance(base_sa, (int, float)) or base_sa <= 0 or not isinstance(base_l, (int, float)) or base_l <= 0:
    raise RuntimeError(f'invalid baseline scanner/frame markers: {base_runtime!r}')

config = base_runtime
original_addr = config.get('a')
if config.get('ss') is not None:
    raise RuntimeError(f'gate currently supports the installed single-sensor runtime only: {config!r}')
if not isinstance(original_addr, str) or not original_addr or original_addr == MISSING_ADDR:
    raise RuntimeError(f'invalid original sensor address: {original_addr!r}')
result['originalSensorAddress'] = original_addr

changed = eval_once(f'C.a={json.dumps(MISSING_ADDR)};C.a')
if changed != MISSING_ADDR:
    raise RuntimeError(f'sensor address isolation not confirmed: {changed!r}')
address_changed = True

# Capture marker immediately after isolation. No target frames may advance R.l after this point.
isolated = snapshot('sensor-isolated', started)
result['timeline'].append(isolated)
loss_l = isolated['runtime'].get('l')
if isolated['runtime'].get('sc') is not True:
    raise RuntimeError('scanner stopped at start of target-frame-loss window')
if isolated['runtime'].get('sa') != base_sa:
    raise RuntimeError(f'scanner start marker changed during isolation setup: {base_sa!r} -> {isolated["runtime"].get("sa")!r}')

stale_timeout = baseline['diag'].get('staleTimeoutSec')
if not isinstance(stale_timeout, (int, float)) or not (30 <= stale_timeout <= 600):
    raise RuntimeError(f'unexpected stale timeout: {stale_timeout!r}')
# Always cross both the old 90 s silence watchdog threshold and the stale timeout.
loss_window_sec = max(float(stale_timeout) + 20.0, 110.0)
loss_deadline = time.monotonic() + loss_window_sec
stale = None
loss_samples = 0
while time.monotonic() < loss_deadline:
    snap = snapshot('sensor-missing', started)
    result['timeline'].append(snap)
    loss_samples += 1
    d = snap['diag']; r = snap['runtime']; s = snap['switch']
    if r.get('sc') is not True:
        raise RuntimeError(f'healthy-scanner invariant lost during target silence: {r!r}')
    if r.get('sa') != base_sa:
        raise RuntimeError(f'scanner start marker changed during sensor silence (restart evidence): {base_sa!r} -> {r.get("sa")!r}')
    if r.get('l') != loss_l:
        raise RuntimeError(f'target frame marker advanced while isolated: {loss_l!r} -> {r.get("l")!r}')
    if d['safetyLockout'] is not False:
        raise RuntimeError(f'hard safety lockout appeared during sensor silence: {d!r}')
    if isinstance(base_uptime, (int, float)) and isinstance(d.get('uptimeSec'), (int, float)) and d['uptimeSec'] + 2 < base_uptime:
        raise RuntimeError(f'device uptime regressed (unexpected reboot): {base_uptime!r} -> {d["uptimeSec"]!r}')
    if d['automationFault'] == 'st' and d['finalRelayOn'] is False and s.get('output') is False:
        stale = snap
    time.sleep(POLL_SEC)
if stale is None:
    raise RuntimeError('stale fail-OFF was not observed during the full silence window')
result['staleFailOff'] = stale
result['silenceEvidence'] = {
    'durationSec': loss_window_sec,
    'samples': loss_samples,
    'scannerRunningThroughout': True,
    'scannerStartMarkerBefore': base_sa,
    'scannerStartMarkerAfter': result['timeline'][-1]['runtime'].get('sa'),
    'sensorFrameMarkerAtIsolation': loss_l,
    'sensorFrameMarkerAfterSilence': result['timeline'][-1]['runtime'].get('l'),
    'noScannerRestartFromSensorSilence': True,
}

restored = eval_once(f'C.a={json.dumps(original_addr)};C.a')
if restored != original_addr:
    raise RuntimeError(f'sensor address restore not confirmed: {restored!r}')
address_changed = False

recovery_deadline = time.monotonic() + 120
recovery = None
while time.monotonic() < recovery_deadline:
    snap = snapshot('sensor-restored', started)
    result['timeline'].append(snap)
    d = snap['diag']; r = snap['runtime']; s = snap['switch']
    if r.get('sc') is not True:
        raise RuntimeError(f'scanner not running during recovery: {r!r}')
    if r.get('sa') != base_sa:
        raise RuntimeError(f'scanner start marker changed during recovery: {base_sa!r} -> {r.get("sa")!r}')
    if d['safetyLockout'] is not False:
        raise RuntimeError(f'hard safety lockout appeared during recovery: {d!r}')
    age = (r.get('n') - r.get('l')) if isinstance(r.get('n'), (int, float)) and isinstance(r.get('l'), (int, float)) and r.get('l') else None
    fresh_after_loss = isinstance(r.get('l'), (int, float)) and isinstance(loss_l, (int, float)) and r.get('l') > loss_l
    if fresh_after_loss and age is not None and 0 <= age < 30000 and d['automationFault'] is None and d['mode'] == 'auto' and d['temperatureC'] is not None and d['humidityPct'] is not None and s.get('output') == d['finalRelayOn']:
        recovery = snap
        recovery['sensorAgeMs'] = age
        break
    time.sleep(POLL_SEC)
if recovery is None:
    raise RuntimeError(f'fresh BLE AUTO recovery not observed: {result["timeline"][-8:]!r}')
result['recovery'] = recovery

post_source = script_source()
if post_source != candidate:
    raise RuntimeError(f'script source changed during hardware gate: {sha(post_source)}')
post_info = read_rpc('Shelly.GetDeviceInfo')
assert_identity(post_info)
post_status = script_status()
assert_script_healthy(post_status, 'postflight')
post_runtime = runtime_state()
if post_runtime.get('sc') is not True or post_runtime.get('sa') != base_sa:
    raise RuntimeError(f'postflight scanner invariant failed: {post_runtime!r}')
post_diag = diag_state(); post_switch = switch_state()
if post_diag['mode'] != 'auto' or post_diag['automationFault'] is not None or post_switch.get('output') != post_diag['finalRelayOn']:
    raise RuntimeError(f'postflight AUTO state mismatch: diag={post_diag!r} switch={post_switch!r}')

result['postflight'] = {'diag': post_diag, 'runtime': post_runtime, 'switch': post_switch, 'scriptStatus': post_status}
result['accepted'] = True
print('GATE_RESULT ' + json.dumps(result, indent=2, sort_keys=True), flush=True)
