import json
import subprocess

BASE='http://192.168.0.10'
INTERFACE='en0'

def rpc(method, params=None):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
    for key, value in (params or {}).items():
        cmd += ['--data-urlencode', f'{key}={value}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode:
        return {'transportError':p.stderr.strip()}
    try:
        return json.loads(p.stdout)
    except Exception:
        return {'raw':p.stdout}

out={
  'identity':rpc('Shelly.GetDeviceInfo'),
  'scripts':rpc('Script.List'),
  'scriptStatus':rpc('Script.GetStatus',{'id':1}),
  'switch':rpc('Switch.GetStatus',{'id':0}),
  'bleConfig':rpc('BLE.GetConfig'),
  'bleStatus':rpc('BLE.GetStatus'),
}
print(json.dumps(out,indent=2,sort_keys=True))
