import hashlib
import json
import subprocess
import time
from typing import Any

BASE = 'http://192.168.0.10'
INTERFACE = 'en0'
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'
EXPECTED_SOURCE_SHA256 = 'eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
EXPECTED_SOURCE_BYTES = 8847
SCRIPT_ID = 1
POLL_SEC = 5


def curl_rpc_once(method: str, params: dict[str, Any] | None = None, max_time: int = 6) -> tuple[bool, Any]:
    cmd = [
        'curl', '-sS', '--interface', INTERFACE,
        '--connect-timeout', '2', '--max-time', str(max_time),
        '-G', f'{BASE}/rpc/{method}',
    ]
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
        value = json.loads(p.stdout)
    except Exception:
        return False, f'invalid JSON: {p.stdout[:300]}'
    if isinstance(value, dict) and isinstance(value.get('code'), (int, float)) and value.get('code') < 0:
        return False, value
    return True, value


def read_rpc(method: str, params: dict[str, Any] | None = None, attempts: int = 5) -> Any:
    last = None
    for i in range(attempts):
        ok, value = curl_rpc_once(method, params)
        if ok:
            return value
        last = value
        if i + 1 < attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{method} failed after read-only retries: {last!r}')


def mutate_once(method: str, params: dict[str, Any]) -> tuple[bool, Any]:
    return curl_rpc_once(method, params, max_time=10)


def read_path(path: str, attempts: int = 5) -> Any:
    last = None
    for i in range(attempts):
        p = subprocess.run([
            'curl', '-sS', '--interface', INTERFACE,
            '--connect-timeout', '2', '--max-time', '6',
            BASE + path,
        ], capture_output=True, text=True)
        if p.returncode == 0:
            try:
                value = json.loads(p.stdout)
                if not (isinstance(value, dict) and isinstance(value.get('code'), (int, float)) and value.get('code') < 0):
                    return value
                last = value
            except Exception:
                last = f'invalid JSON: {p.stdout[:300]}'
        else:
            last = p.stderr.strip()
        if i + 1 < attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{path} failed after read-only retries: {last!r}')


def script_source(script_id: int) -> str:
    parts: list[str] = []
    offset = 0
    for _ in range(64):
        value = read_rpc('Script.GetCode', {'id': script_id, 'offset': offset, 'len': 1024})
        data = value.get('data') if isinstance(value, dict) else None
        left = value.get('left') if isinstance(value, dict) else None
        if not isinstance(data, str) or not isinstance(left, (int, float)):
            raise RuntimeError(f'invalid Script.GetCode response: {value!r}')
        parts.append(data)
        offset += len(data.encode('utf-8'))
        if left <= 0:
            return ''.join(parts)
        if not data:
            raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def diag_state(diag: Any) -> dict[str, Any]:
    if not isinstance(diag, dict):
        raise RuntimeError(f'invalid diag: {diag!r}')
    g = diag.get('g')
    q = diag.get('q')
    p = diag.get('p')
    y = diag.get('y')
    if not isinstance(g, list) or len(g) < 24:
        raise RuntimeError(f'invalid diag.g: {g!r}')
    if not isinstance(q, list) or len(q) < 6:
        raise RuntimeError(f'invalid diag.q: {q!r}')
    return {
        'deviceUptimeSec': y[2] if isinstance(y, list) and len(y) > 2 else None,
        'runtimeRelayOn': g[5],
        'reason': g[6],
        'controlMode': 'manual' if g[17] else 'auto',
        'automationRequestOn': g[18],
        'manualRequestOn': g[20],
        'automationFault': g[21],
        'safetyLockout': g[22],
        'safetyReason': g[23],
        'temperatureC': g[1],
        'humidityPct': g[2],
        'staleTimeoutSec': q[4],
        'rssiMin': q[5],
        'finalRelayOn': p[0] if isinstance(p, list) and p else None,
        'powerW': p[1] if isinstance(p, list) and len(p) > 1 else None,
        'currentA': p[3] if isinstance(p, list) and len(p) > 3 else None,
    }


def same_ble_config(a: Any, b: Any) -> bool:
    return isinstance(a, dict) and isinstance(b, dict) and a == b


def snapshot(label: str, started: float) -> dict[str, Any]:
    diag = diag_state(read_path(f'/script/{SCRIPT_ID}/diag'))
    switch = read_rpc('Switch.GetStatus', {'id': 0})
    return {
        'label': label,
        'elapsedSec': round(time.monotonic() - started, 1),
        'diag': diag,
        'switch': {
            'output': switch.get('output') if isinstance(switch, dict) else None,
            'apower': switch.get('apower') if isinstance(switch, dict) else None,
            'current': switch.get('current') if isinstance(switch, dict) else None,
            'voltage': switch.get('voltage') if isinstance(switch, dict) else None,
        },
    }


started = time.monotonic()
info = read_rpc('Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')

scripts = read_rpc('Script.List')
entries = scripts.get('scripts') if isinstance(scripts, dict) else None
if not isinstance(entries, list) or len(entries) != 1:
    raise RuntimeError(f'expected exactly one managed script: {entries!r}')
script = entries[0]
if script.get('id') != SCRIPT_ID or script.get('enable') is not True or script.get('running') is not True:
    raise RuntimeError(f'managed script not healthy: {script!r}')

source = script_source(SCRIPT_ID)
source_bytes = len(source.encode('utf-8'))
source_sha = hashlib.sha256(source.encode('utf-8')).hexdigest()
if source_bytes != EXPECTED_SOURCE_BYTES or source_sha != EXPECTED_SOURCE_SHA256:
    raise RuntimeError(f'production source fingerprint changed: {source_bytes} B {source_sha}')

schedules = read_rpc('Schedule.List')
if not isinstance(schedules, dict) or schedules.get('jobs') not in ([], None):
    raise RuntimeError(f'unexpected schedules before BLE-loss test: {schedules!r}')

ble_backup = read_rpc('BLE.GetConfig')
if not isinstance(ble_backup, dict) or ble_backup.get('enable') is not True:
    raise RuntimeError(f'BLE preflight not enabled: {ble_backup!r}')

pre = snapshot('preflight', started)
pre_diag = pre['diag']
if pre_diag['controlMode'] != 'auto' or pre_diag['safetyLockout'] is not False or pre_diag['automationFault'] is not None:
    raise RuntimeError(f'preflight runtime not healthy AUTO: {pre_diag!r}')
if not isinstance(pre_diag['staleTimeoutSec'], (int, float)) or not (30 <= pre_diag['staleTimeoutSec'] <= 600):
    raise RuntimeError(f'unexpected stale timeout: {pre_diag["staleTimeoutSec"]!r}')
pre_uptime = pre_diag['deviceUptimeSec']

result: dict[str, Any] = {
    'identity': {
        'id': info.get('id'), 'model': info.get('model'), 'gen': info.get('gen'),
        'fw_id': info.get('fw_id'), 'ver': info.get('ver'),
    },
    'sourceBytes': source_bytes,
    'sourceSha256': source_sha,
    'bleBackup': ble_backup,
    'preflight': pre,
    'timeline': [],
}

disable_applied = False
restore_attempted = False
restore_verified = False

try:
    ok_disable, disable_response = mutate_once('BLE.SetConfig', {'config': {'enable': False}})
    result['disableResponse'] = disable_response
    ble_disabled = read_rpc('BLE.GetConfig')
    result['bleAfterDisable'] = ble_disabled
    if not isinstance(ble_disabled, dict) or ble_disabled.get('enable') is not False:
        raise RuntimeError(f'BLE disable not observed; mutation result={disable_response!r}, readback={ble_disabled!r}')
    disable_applied = True
    if isinstance(disable_response, dict) and disable_response.get('restart_required') is True:
        raise RuntimeError('BLE disable unexpectedly requires restart; refusing to turn this into a reboot test')
    if not ok_disable:
        result['disableMutationWasAmbiguousButReadbackConfirmed'] = True

    stale_deadline = time.monotonic() + float(pre_diag['staleTimeoutSec']) + 75.0
    stale_snapshot = None
    while time.monotonic() < stale_deadline:
        current = snapshot('ble-disabled', started)
        result['timeline'].append(current)
        d = current['diag']
        sw = current['switch']
        if d['safetyLockout'] is not False:
            raise RuntimeError(f'hard safety appeared during BLE-loss test: {d!r}')
        if d['automationFault'] == 'st' and d['finalRelayOn'] is False and sw['output'] is False:
            stale_snapshot = current
            break
        time.sleep(POLL_SEC)
    if stale_snapshot is None:
        raise RuntimeError(f'stale fail-OFF not observed before deadline; tail={result["timeline"][-6:]!r}')
    result['staleFailOff'] = stale_snapshot

    restore_attempted = True
    ok_restore, restore_response = mutate_once('BLE.SetConfig', {'config': ble_backup})
    result['restoreResponse'] = restore_response
    ble_restored = read_rpc('BLE.GetConfig')
    result['bleAfterRestore'] = ble_restored
    if not same_ble_config(ble_restored, ble_backup):
        raise RuntimeError(f'BLE backup restore not verified; mutation result={restore_response!r}, readback={ble_restored!r}')
    restore_verified = True
    if isinstance(restore_response, dict) and restore_response.get('restart_required') is True:
        raise RuntimeError('BLE restore unexpectedly requires restart; recovery would not be runtime-only')
    if not ok_restore:
        result['restoreMutationWasAmbiguousButReadbackConfirmed'] = True

    recovery_deadline = time.monotonic() + 240.0
    recovery_snapshot = None
    while time.monotonic() < recovery_deadline:
        current = snapshot('ble-restored', started)
        result['timeline'].append(current)
        d = current['diag']
        sw = current['switch']
        if d['safetyLockout'] is not False:
            raise RuntimeError(f'hard safety appeared during BLE recovery: {d!r}')
        if d['automationFault'] is None and d['controlMode'] == 'auto' and sw['output'] == d['finalRelayOn']:
            recovery_snapshot = current
            if d['automationRequestOn'] is False or d['finalRelayOn'] is True:
                break
        time.sleep(POLL_SEC)
    if recovery_snapshot is None or recovery_snapshot['diag']['automationFault'] is not None:
        raise RuntimeError(f'fresh-BLE AUTO recovery not observed before deadline; tail={result["timeline"][-8:]!r}')
    result['recovery'] = recovery_snapshot

    post_info = read_rpc('Shelly.GetDeviceInfo')
    if post_info.get('id') != EXPECTED_ID:
        raise RuntimeError(f'postflight identity mismatch: {post_info!r}')
    post_source = script_source(SCRIPT_ID)
    post_sha = hashlib.sha256(post_source.encode('utf-8')).hexdigest()
    if len(post_source.encode('utf-8')) != EXPECTED_SOURCE_BYTES or post_sha != EXPECTED_SOURCE_SHA256:
        raise RuntimeError(f'postflight source fingerprint changed: {len(post_source.encode("utf-8"))} B {post_sha}')
    post_scripts = read_rpc('Script.List')
    post_entries = post_scripts.get('scripts') if isinstance(post_scripts, dict) else None
    if not isinstance(post_entries, list) or len(post_entries) != 1 or post_entries[0].get('running') is not True:
        raise RuntimeError(f'managed script not running postflight: {post_entries!r}')
    post_schedules = read_rpc('Schedule.List')
    if post_schedules.get('jobs') not in ([], None):
        raise RuntimeError(f'schedules changed during BLE-loss test: {post_schedules!r}')
    post = snapshot('postflight', started)
    post_uptime = post['diag']['deviceUptimeSec']
    if isinstance(pre_uptime, (int, float)) and isinstance(post_uptime, (int, float)) and post_uptime < pre_uptime:
        raise RuntimeError(f'device rebooted during BLE-loss test: pre={pre_uptime}, post={post_uptime}')
    result['postflight'] = post
    result['scheduleCount'] = len(post_schedules.get('jobs') or [])
    result['accepted'] = True
finally:
    if disable_applied and not restore_verified and not restore_attempted:
        cleanup_ok, cleanup_response = mutate_once('BLE.SetConfig', {'config': ble_backup})
        result['cleanupRestoreResponse'] = cleanup_response
        try:
            cleanup_readback = read_rpc('BLE.GetConfig')
            result['cleanupBleReadback'] = cleanup_readback
            restore_verified = same_ble_config(cleanup_readback, ble_backup)
        except Exception as exc:
            result['cleanupReadbackError'] = repr(exc)
        if not cleanup_ok and not restore_verified:
            result['cleanupManualInterventionRequired'] = True

print(json.dumps(result, indent=2, sort_keys=True))
