import json
import subprocess
import sys

BASE='http://shellyplugsg3-e4b063d7f530.local'
EXPECTED='shellyplugsg3-e4b063d7f530'

def get(path: str):
    p=subprocess.run(['curl','-sS','--connect-timeout','4','--max-time','8',BASE+path],capture_output=True,text=True)
    if p.returncode != 0:
        raise RuntimeError(f'curl failed {path}: {p.stderr.strip()}')
    try:
        return json.loads(p.stdout)
    except Exception as e:
        raise RuntimeError(f'invalid JSON {path}: {p.stdout[:200]}') from e

info=get('/rpc/Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED:
    raise RuntimeError(f'identity mismatch: {info.get("id")!r}')
methods=get('/rpc/Shelly.ListMethods')
scripts=get('/rpc/Script.List')
schedules=get('/rpc/Schedule.List')
switch=get('/rpc/Switch.GetStatus?id=0')
script_entries=scripts.get('scripts') if isinstance(scripts,dict) else None
if not isinstance(script_entries,list) or len(script_entries)!=1:
    raise RuntimeError(f'expected exactly one script, got {script_entries!r}')
script=script_entries[0]
script_id=script.get('id')
status=get(f'/rpc/Script.GetStatus?id={script_id}')
diag=get(f'/script/{script_id}/diag')
print(json.dumps({
  'identity': {'id': info.get('id'),'model': info.get('model'),'gen': info.get('gen'),'fw_id': info.get('fw_id'),'ver': info.get('ver')},
  'methods': methods,
  'script': script,
  'scriptStatus': status,
  'scheduleCount': len(schedules.get('jobs',[])) if isinstance(schedules,dict) and isinstance(schedules.get('jobs'),list) else None,
  'switch': {'output': switch.get('output'),'apower': switch.get('apower'),'current': switch.get('current'),'voltage': switch.get('voltage')},
  'diag': diag,
}, indent=2, sort_keys=True))
