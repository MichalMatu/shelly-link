import json
import subprocess
import time

BASE='http://192.168.0.10'
INTERFACE='en0'
EXPECTED='shellyplugsg3-e4b063d7f530'


def rpc(path: str, attempts: int = 5):
    last=None
    for index in range(attempts):
        p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','5',BASE+path],capture_output=True,text=True)
        if p.returncode == 0:
            try:
                return json.loads(p.stdout)
            except Exception as exc:
                last=f'invalid JSON: {p.stdout[:200]}'
        else:
            last=p.stderr.strip()
        if index + 1 < attempts:
            time.sleep(0.25)
    raise RuntimeError(f'{path} failed after {attempts} read-only attempts: {last}')


info=rpc('/rpc/Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED:
    raise RuntimeError(f'identity mismatch: {info!r}')
methods=rpc('/rpc/Shelly.ListMethods').get('methods',[])
for method in ('BLE.GetConfig','BLE.GetStatus','BLE.SetConfig'):
    if method not in methods:
        raise RuntimeError(f'missing advertised method: {method}')
ble_config=rpc('/rpc/BLE.GetConfig')
ble_status=rpc('/rpc/BLE.GetStatus')
sys_status=rpc('/rpc/Sys.GetStatus')
script_list=rpc('/rpc/Script.List')
switch=rpc('/rpc/Switch.GetStatus?id=0')
script_status=rpc('/rpc/Script.GetStatus?id=1')
diag=rpc('/script/1/diag')
print(json.dumps({
  'identity': {'id':info.get('id'),'model':info.get('model'),'gen':info.get('gen'),'fw_id':info.get('fw_id'),'ver':info.get('ver')},
  'bleConfig':ble_config,
  'bleStatus':ble_status,
  'sys': {'uptime':sys_status.get('uptime'),'restart_required':sys_status.get('restart_required')},
  'scriptList':script_list,
  'scriptStatus':script_status,
  'switch': {'output':switch.get('output'),'apower':switch.get('apower'),'current':switch.get('current'),'voltage':switch.get('voltage')},
  'diag':diag,
}, indent=2, sort_keys=True))
