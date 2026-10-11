import json
import subprocess

BASE = 'http://192.168.0.10'
INTERFACE = 'en0'
SCRIPT_ID = 1
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'


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


info = rpc('Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')
code = 'JSON.stringify(typeof Script!="undefined"&&Script.storage&&Script.storage.getItem?{s:1,v:Script.storage.getItem("c")}:{s:0})'
response = rpc('Script.Eval', {'id': SCRIPT_ID, 'code': code})
raw = response.get('result') if isinstance(response, dict) else None
parsed = json.loads(raw) if isinstance(raw, str) else None
print(json.dumps({
    'identity': info.get('id'),
    'evalResponse': response,
    'resultType': type(raw).__name__,
    'probeParsed': parsed,
    'storedType': type(parsed.get('v')).__name__ if isinstance(parsed, dict) and 'v' in parsed else None,
    'storedLength': len(parsed.get('v')) if isinstance(parsed, dict) and isinstance(parsed.get('v'), str) else None,
}, indent=2, sort_keys=True))
