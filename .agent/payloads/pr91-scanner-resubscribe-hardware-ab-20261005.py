import hashlib
import json
import subprocess
import time
from typing import Any

BASE = 'http://192.168.0.10'
IFACE = 'en0'
SCRIPT_ID = 1
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'
CHUNK_CHARS = 700


def decode(proc: subprocess.CompletedProcess[str], method: str) -> Any:
    if proc.returncode != 0:
        raise RuntimeError(f'{method} curl failed: {proc.stderr.strip()!r}')
    try:
        value = json.loads(proc.stdout)
    except Exception as exc:
        raise RuntimeError(f'{method} invalid JSON: {proc.stdout[:300]!r}') from exc
    if isinstance(value, dict) and isinstance(value.get('code'), (int, float)) and value['code'] < 0:
        raise RuntimeError(f'{method} RPC error: {value!r}')
    return value


def get_rpc(method: str, params: dict[str, Any] | None = None, attempts: int = 8) -> Any:
    last = None
    for i in range(attempts):
        cmd = ['curl', '-sS', '--interface', IFACE, '--connect-timeout', '2', '--max-time', '8', '-G', f'{BASE}/rpc/{method}']
        for key, value in (params or {}).items():
            cmd += ['--data-urlencode', f'{key}={value}']
        proc = subprocess.run(cmd, capture_output=True, text=True)
        try:
            return decode(proc, method)
        except Exception as exc:
            last = exc
            if i + 1 < attempts:
                time.sleep(1)
    raise RuntimeError(f'{method} failed: {last!r}')


def post_rpc(method: str, params: dict[str, Any] | None = None, max_time: int = 12) -> Any:
    body = json.dumps(params or {}, separators=(',', ':'))
    proc = subprocess.run(
        ['curl', '-sS', '--interface', IFACE, '--connect-timeout', '2', '--max-time', str(max_time), '-X', 'POST', '-H', 'Content-Type: application/json', '--data-binary', body, f'{BASE}/rpc/{method}'],
        capture_output=True,
        text=True,
    )
    return decode(proc, method)


def read_source() -> str:
    parts: list[str] = []
    offset = 0
    for _ in range(64):
        out = get_rpc('Script.GetCode', {'id': SCRIPT_ID, 'offset': offset, 'len': 1024})
        data = out.get('data') if isinstance(out, dict) else None
        left = out.get('left') if isinstance(out, dict) else None
        if not isinstance(data, str) or not isinstance(left, (int, float)):
            raise RuntimeError(f'bad code chunk {out!r}')
        parts.append(data)
        offset += len(data.encode())
        if left <= 0:
            return ''.join(parts)
        if not data:
            raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def put_source(text: str) -> None:
    chunks = [text[i:i + CHUNK_CHARS] for i in range(0, len(text), CHUNK_CHARS)] or ['']
    for index, chunk in enumerate(chunks):
        post_rpc('Script.PutCode', {'id': SCRIPT_ID, 'code': chunk, 'append': index > 0})


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def eval_read(code: str):
    return get_rpc('Script.Eval', {'id': SCRIPT_ID, 'code': code}).get('result')


def eval_post(code: str):
    return post_rpc('Script.Eval', {'id': SCRIPT_ID, 'code': code}).get('result')


def state() -> dict[str, Any]:
    raw = eval_read('JSON.stringify({sa:R.sa,l:R.l,n:nw(),sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),af:R.af,a:R.a,lk:R.lk})')
    if not isinstance(raw, str):
        raise RuntimeError(f'bad state eval {raw!r}')
    runtime = json.loads(raw)
    script = get_rpc('Script.GetStatus', {'id': SCRIPT_ID})
    switch = get_rpc('Switch.GetStatus', {'id': 0})
    return {
        'runtime': runtime,
        'script': {'running': script.get('running'), 'error_msg': script.get('error_msg'), 'errors': script.get('errors')},
        'switch': {'output': switch.get('output'), 'apower': switch.get('apower'), 'current': switch.get('current')},
    }


def wait_healthy(timeout: float = 90.0, require_fresh: bool = True) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        last = state()
        runtime = last['runtime']
        script = last['script']
        if script['running'] is True and not script['error_msg'] and not script['errors'] and runtime['sc'] is True:
            if not require_fresh or (isinstance(runtime['l'], (int, float)) and runtime['l'] > 0):
                return last
        time.sleep(3)
    raise RuntimeError(f'healthy runtime not observed: {last!r}')


def stop_scanner_cycle(index: int) -> dict[str, Any]:
    pre = wait_healthy(30)
    pre_sa = pre['runtime']['sa']
    pre_l = pre['runtime']['l']
    result = eval_post('(BLE.Scanner.stop||BLE.Scanner.Stop).call(BLE.Scanner);JSON.stringify({sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),sa:R.sa,l:R.l})')
    print(f'CYCLE_{index}_STOP_RESULT {result}', flush=True)
    time.sleep(1)
    after_stop = state()
    if after_stop['runtime']['sc'] is not False:
        raise RuntimeError(f'cycle {index}: scanner did not stop: {after_stop!r}')
    deadline = time.monotonic() + 75
    samples = []
    while time.monotonic() < deadline:
        snap = state()
        samples.append(snap)
        print(f'CYCLE_{index}_SAMPLE ' + json.dumps(snap, separators=(',', ':'), sort_keys=True), flush=True)
        runtime = snap['runtime']
        script = snap['script']
        if script['running'] is not True or script['error_msg'] or script['errors']:
            raise RuntimeError(f'cycle {index}: script unhealthy: {snap!r}')
        if runtime['sc'] is True and isinstance(runtime['sa'], (int, float)) and runtime['sa'] > pre_sa and isinstance(runtime['l'], (int, float)) and runtime['l'] > pre_l:
            return {'pre': pre, 'afterStop': after_stop, 'recovered': snap, 'samples': len(samples)}
        time.sleep(3)
    raise RuntimeError(f'cycle {index}: scanner restarted but fresh-frame recovery not observed within 75 s')


info = get_rpc('Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch {info!r}')
original = read_source()
original_sha = sha(original)
original_bytes = len(original.encode())

variants = [
    ('function bw(){if(br()===F)bs()}', 'function bw(){if(br()===F){BLE.Scanner.subscribe(function(e,x){ev(e,x)});bs()}}'),
    ('function bw(){if(br()===false)bs()}', 'function bw(){if(br()===false){BLE.Scanner.subscribe(function(e,x){ev(e,x)});bs()}}'),
]
selected = next(((old, new) for old, new in variants if original.count(old) == 1), None)
if selected is None:
    raise RuntimeError('current runtime does not contain exactly one expected main watchdog block')
old, new = selected
candidate = original.replace(old, new, 1)
candidate_sha = sha(candidate)

report: dict[str, Any] = {
    'identity': {'id': info.get('id'), 'model': info.get('model'), 'ver': info.get('ver')},
    'originalBytes': original_bytes,
    'originalSha256': original_sha,
    'candidateBytes': len(candidate.encode()),
    'candidateSha256': candidate_sha,
    'cycles': [],
}

mutation_started = False
try:
    # Safe OFF before replacing executable runtime.
    post_rpc('Switch.Set', {'id': 0, 'on': False})
    time.sleep(1)
    safe_switch = get_rpc('Switch.GetStatus', {'id': 0})
    if safe_switch.get('output') is not False:
        raise RuntimeError(f'relay failed safe-OFF before candidate deploy: {safe_switch!r}')
    post_rpc('Script.Stop', {'id': SCRIPT_ID})
    time.sleep(1)
    stopped = get_rpc('Script.GetStatus', {'id': SCRIPT_ID})
    if stopped.get('running') is not False:
        raise RuntimeError(f'script did not stop: {stopped!r}')
    mutation_started = True
    put_source(candidate)
    readback = read_source()
    if readback != candidate:
        raise RuntimeError(f'candidate readback mismatch: {len(readback.encode())} {sha(readback)}')
    post_rpc('Script.SetConfig', {'id': SCRIPT_ID, 'config': {'enable': True}})
    post_rpc('Script.Start', {'id': SCRIPT_ID})
    boot = wait_healthy(90)
    report['candidateBoot'] = boot
    report['cycles'].append(stop_scanner_cycle(1))
    time.sleep(5)
    report['cycles'].append(stop_scanner_cycle(2))
    report['candidateAccepted'] = True
finally:
    if mutation_started:
        try:
            post_rpc('Switch.Set', {'id': 0, 'on': False})
        except Exception:
            pass
        try:
            post_rpc('Script.Stop', {'id': SCRIPT_ID})
        except Exception:
            pass
        time.sleep(1)
        put_source(original)
        restored = read_source()
        report['restoredBytes'] = len(restored.encode())
        report['restoredSha256'] = sha(restored)
        report['restoredByteIdentical'] = restored == original
        if restored != original:
            raise RuntimeError(f'original runtime restore mismatch {len(restored.encode())} {sha(restored)} expected {original_bytes} {original_sha}')
        post_rpc('Script.SetConfig', {'id': SCRIPT_ID, 'config': {'enable': True}})
        post_rpc('Script.Start', {'id': SCRIPT_ID})
        restored_state = wait_healthy(90)
        report['restoredState'] = restored_state
        final_switch = get_rpc('Switch.GetStatus', {'id': 0})
        report['finalSwitch'] = {'output': final_switch.get('output'), 'apower': final_switch.get('apower'), 'current': final_switch.get('current')}

print('PR91_HARDWARE_AB ' + json.dumps(report, indent=2, sort_keys=True), flush=True)
