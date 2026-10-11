import json
import subprocess

BASE='http://192.168.0.10'
INTERFACE='en0'
EXPECTED_ID='shellyplugsg3-e4b063d7f530'

def rpc(method, params=None):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
    for k,v in (params or {}).items(): cmd += ['--data-urlencode', f'{k}={v}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode: raise RuntimeError(p.stderr.strip())
    out=json.loads(p.stdout)
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0: raise RuntimeError(repr(out))
    return out

info=rpc('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID: raise RuntimeError(f'identity mismatch {info!r}')
status=rpc('Script.GetStatus',{'id':1})
if status.get('running') is not True: raise RuntimeError(f'script not running {status!r}')
code='JSON.stringify({t:typeof BLE.Scanner.isRunning,r:BLE.Scanner.isRunning?BLE.Scanner.isRunning():null})'
result=rpc('Script.Eval',{'id':1,'code':code})
print(json.dumps({'identity':info,'scriptStatus':status,'eval':result},indent=2,sort_keys=True))
