import hashlib
import json
import subprocess

BASE = 'http://192.168.0.10'
INTERFACE = 'en0'
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'
EXPECTED_OLD_SHA = 'eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
SCRIPT_ID = 1

OLD = '''var bt=BLE.Scanner.stop||BLE.Scanner.Stop;\nfunction bs(){if(bt)bt.call(BLE.Scanner);R.sa=nw();var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bw(){if(R.sa&&nw()-(R.l||R.sa)>9e4)bs();}'''
NEW = '''function br(){if(BLE.Scanner.isRunning)return BLE.Scanner.isRunning();if(BLE.Scanner.IsRunning)return BLE.Scanner.IsRunning();return null}\nfunction bs(){R.sa=nw();if(br()===true)return;var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bw(){if(br()===false)bs();}'''


def rpc(method, params=None):
    cmd = [
        'curl', '-sS', '--interface', INTERFACE,
        '--connect-timeout', '2', '--max-time', '8',
        '-G', f'{BASE}/rpc/{method}'
    ]
    for key, value in (params or {}).items():
        cmd += ['--data-urlencode', f'{key}={value}']
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    value = json.loads(proc.stdout)
    if isinstance(value, dict) and isinstance(value.get('code'), (int, float)) and value['code'] < 0:
        raise RuntimeError(f'{method}: {value!r}')
    return value


def source():
    chunks = []
    offset = 0
    for _ in range(64):
        value = rpc('Script.GetCode', {'id': SCRIPT_ID, 'offset': offset, 'len': 1024})
        data = value.get('data')
        left = value.get('left')
        if not isinstance(data, str) or not isinstance(left, (int, float)):
            raise RuntimeError(f'invalid Script.GetCode: {value!r}')
        chunks.append(data)
        offset += len(data.encode())
        if left <= 0:
            return ''.join(chunks)
        if not data:
            raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


sha = lambda text: hashlib.sha256(text.encode()).hexdigest()
info = rpc('Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')
scripts = rpc('Script.List')
entries = scripts.get('scripts') if isinstance(scripts, dict) else None
if not isinstance(entries, list) or len(entries) != 1 or entries[0].get('id') != SCRIPT_ID or entries[0].get('running') is not True:
    raise RuntimeError(f'expected one running managed script: {entries!r}')
old = source()
if sha(old) != EXPECTED_OLD_SHA:
    raise RuntimeError(f'unexpected installed source hash: {sha(old)}')
if old.count(OLD) != 1:
    raise RuntimeError(f'expected exactly one old watchdog block, found {old.count(OLD)}')
new = old.replace(OLD, NEW)
if new.replace(NEW, OLD) != old:
    raise RuntimeError('candidate differs outside watchdog substitution')
print(json.dumps({
    'identity': {'id': info.get('id'), 'model': info.get('model'), 'gen': info.get('gen'), 'ver': info.get('ver')},
    'script': entries[0],
    'oldBytes': len(old.encode()),
    'oldSha256': sha(old),
    'candidateBytes': len(new.encode()),
    'candidateSha256': sha(new),
    'deltaBytes': len(new.encode()) - len(old.encode()),
    'onlyWatchdogBlockChanged': True,
    'candidateHasScannerLiveness': 'BLE.Scanner.isRunning' in new,
    'candidateHasSensorSilenceRestart': 'nw()-(R.l||R.sa)>9e4' in new,
}, indent=2, sort_keys=True))
