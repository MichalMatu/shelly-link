import hashlib
import json
import subprocess
import time
from typing import Any

BASE='http://192.168.0.10'
INTERFACE='en0'
EXPECTED='shellyplugsg3-e4b063d7f530'


def curl_once(path: str, *, connect: float = 2.0, total: float = 4.0) -> tuple[bool, Any]:
    p=subprocess.run([
        'curl','-sS','--interface',INTERFACE,'--connect-timeout',str(connect),
        '--max-time',str(total),BASE+path
    ],capture_output=True,text=True)
    if p.returncode != 0:
        return False, p.stderr.strip()
    try:
        return True, json.loads(p.stdout)
    except Exception:
        return False, f'invalid JSON: {p.stdout[:200]}'


def require(path: str, attempts: int = 3) -> Any:
    last: Any = None
    for index in range(attempts):
        ok, value=curl_once(path)
        if ok:
            return value
        last=value
        if index + 1 < attempts:
            time.sleep(0.2)
    raise RuntimeError(f'{path} failed after {attempts} read-only attempts: {last}')


def identity() -> dict[str, Any]:
    value=require('/rpc/Shelly.GetDeviceInfo')
    if value.get('id') != EXPECTED:
        raise RuntimeError(f'identity mismatch: {value.get("id")!r}')
    return value


def script_source(script_id: int) -> str:
    offset=0
    parts=[]
    for _ in range(64):
        value=require(f'/rpc/Script.GetCode?id={script_id}&offset={offset}&len=1024')
        data=value.get('data')
        left=value.get('left')
        if not isinstance(data,str) or not isinstance(left,(int,float)):
            raise RuntimeError(f'invalid Script.GetCode response at offset {offset}: {value!r}')
        parts.append(data)
        offset += len(data.encode('utf-8'))
        if left <= 0:
            return ''.join(parts)
        if not data:
            raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def diag_state(diag: Any) -> dict[str, Any]:
    g=diag.get('g') if isinstance(diag,dict) else None
    y=diag.get('y') if isinstance(diag,dict) else None
    p=diag.get('p') if isinstance(diag,dict) else None
    if not isinstance(g,list) or len(g)<24:
        raise RuntimeError(f'invalid diag.g: {g!r}')
    return {
        'deviceUptimeSec': y[2] if isinstance(y,list) and len(y)>2 else None,
        'finalRelayOn': p[0] if isinstance(p,list) and p else None,
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
    }


def snapshot() -> dict[str, Any]:
    info=identity()
    scripts=require('/rpc/Script.List')
    entries=scripts.get('scripts') if isinstance(scripts,dict) else None
    if not isinstance(entries,list) or len(entries)!=1:
        raise RuntimeError(f'expected exactly one script: {entries!r}')
    script=entries[0]
    script_id=script.get('id')
    if not isinstance(script_id,int):
        raise RuntimeError(f'invalid script id: {script_id!r}')
    source=script_source(script_id)
    schedules=require('/rpc/Schedule.List')
    switch=require('/rpc/Switch.GetStatus?id=0')
    script_status=require(f'/rpc/Script.GetStatus?id={script_id}')
    diag=require(f'/script/{script_id}/diag')
    return {
        'identity': {'id':info.get('id'),'model':info.get('model'),'gen':info.get('gen'),'fw_id':info.get('fw_id')},
        'script': script,
        'scriptStatus': script_status,
        'sourceSha256': hashlib.sha256(source.encode('utf-8')).hexdigest(),
        'sourceBytes': len(source.encode('utf-8')),
        'schedules': schedules,
        'switch': {'output':switch.get('output'),'apower':switch.get('apower'),'current':switch.get('current'),'voltage':switch.get('voltage')},
        'diagState': diag_state(diag),
    }


def is_reboot_transition(value: Any) -> bool:
    if not isinstance(value,dict):
        return False
    code=value.get('code')
    message=value.get('message')
    return code == -109 and isinstance(message,str) and 'shutting down' in message.lower()


pre=snapshot()
if pre['script'].get('enable') is not True or pre['scriptStatus'].get('running') is not True:
    raise RuntimeError('managed script must be enabled and running before reboot')
if pre['diagState']['controlMode'] != 'auto':
    raise RuntimeError(f'expected current runtime AUTO before reboot: {pre["diagState"]!r}')
if pre['diagState']['safetyLockout'] is not False:
    raise RuntimeError('refusing reboot test with active safety lockout')
if pre['switch'].get('output') is not False or pre['diagState']['finalRelayOn'] is not False:
    raise RuntimeError(f'refusing reboot test unless relay is explicitly OFF: {pre!r}')
methods=require('/rpc/Shelly.ListMethods').get('methods',[])
if 'Shelly.Reboot' not in methods:
    raise RuntimeError('Shelly.Reboot is not advertised')

# Identity was verified on this exact HTTP locator above. Send the mutating reboot RPC once.
reboot_started=time.monotonic()
p=subprocess.run([
    'curl','-sS','--interface',INTERFACE,'--connect-timeout','3','--max-time','6','-X','POST',
    '-H','Content-Type: application/json','-d','{"id":1,"method":"Shelly.Reboot"}',BASE+'/rpc'
],capture_output=True,text=True)
reboot_call={'returncode':p.returncode,'stdout':p.stdout.strip(),'stderr':p.stderr.strip()}

# Never replay the mutating RPC. Observe only; no retry is hidden in this loop.
offline_seen=False
reboot_transition_seen=False
reconnect_at=None
first_online_switch=None
observations=[]
for _ in range(120):
    elapsed=time.monotonic()-reboot_started
    ok_info, info=curl_once('/rpc/Shelly.GetDeviceInfo',connect=0.25,total=0.45)
    if not ok_info:
        offline_seen=True
        observations.append({'elapsedSec':round(elapsed,3),'online':False})
        time.sleep(0.1)
        continue
    if is_reboot_transition(info):
        reboot_transition_seen=True
        observations.append({'elapsedSec':round(elapsed,3),'online':False,'transition':'shutting-down'})
        time.sleep(0.1)
        continue
    if not isinstance(info,dict) or info.get('id') != EXPECTED:
        raise RuntimeError(f'post-reboot identity mismatch: {info!r}')
    if reconnect_at is None:
        reconnect_at=elapsed
    ok_switch, switch=curl_once('/rpc/Switch.GetStatus?id=0',connect=0.35,total=0.7)
    ok_script, script_status=curl_once('/rpc/Script.GetStatus?id=1',connect=0.35,total=0.7)
    ok_sys, sys_status=curl_once('/rpc/Sys.GetStatus',connect=0.35,total=0.7)
    ok_diag, diag=curl_once('/script/1/diag',connect=0.35,total=0.7)
    record={
        'elapsedSec':round(elapsed,3),
        'online':True,
        'switchOutput': switch.get('output') if ok_switch and isinstance(switch,dict) else None,
        'scriptRunning': script_status.get('running') if ok_script and isinstance(script_status,dict) else None,
        'uptimeSec': sys_status.get('uptime') if ok_sys and isinstance(sys_status,dict) else None,
        'diag': diag_state(diag) if ok_diag and isinstance(diag,dict) else None,
    }
    if first_online_switch is None and record['switchOutput'] is not None:
        first_online_switch=record['switchOutput']
    observations.append(record)
    if elapsed >= 12:
        break
    time.sleep(0.1)

if reconnect_at is None:
    raise RuntimeError('device did not reconnect after reboot')
if not offline_seen:
    raise RuntimeError('reboot did not produce an observable transport-offline interval')
if first_online_switch is not False:
    raise RuntimeError(f'first observable post-reboot relay state was not safe OFF: {first_online_switch!r}')

# Give BLE/runtime a bounded window to reacquire fresh input and settle.
time.sleep(5)
post=snapshot()
pre_uptime=pre['diagState']['deviceUptimeSec']
post_uptime=post['diagState']['deviceUptimeSec']
if not isinstance(pre_uptime,(int,float)) or not isinstance(post_uptime,(int,float)) or post_uptime >= pre_uptime:
    raise RuntimeError(f'device uptime did not reset: {pre_uptime!r} -> {post_uptime!r}')
if post['identity'] != pre['identity']:
    raise RuntimeError('canonical device identity/firmware changed across reboot')
if post['sourceSha256'] != pre['sourceSha256'] or post['sourceBytes'] != pre['sourceBytes']:
    raise RuntimeError('managed script source changed across reboot')
if post['schedules'] != pre['schedules']:
    raise RuntimeError('native schedules changed across reboot')
if post['script'].get('id') != pre['script'].get('id') or post['script'].get('enable') is not True or post['scriptStatus'].get('running') is not True:
    raise RuntimeError('managed script did not recover enabled/running with same id')
if post['diagState']['controlMode'] != 'auto':
    raise RuntimeError(f'Climate runtime did not recover AUTO: {post["diagState"]!r}')
if post['diagState']['safetyLockout'] is not False:
    raise RuntimeError(f'unexpected safety lockout after reboot: {post["diagState"]!r}')
if post['switch'].get('output') is not False or post['diagState']['finalRelayOn'] is not False:
    raise RuntimeError(f'post-reboot relay did not settle explicitly OFF: {post!r}')

print(json.dumps({
    'pre':pre,
    'rebootCall':reboot_call,
    'rebootTransitionSeen':reboot_transition_seen,
    'offlineSeen':offline_seen,
    'reconnectSec':round(reconnect_at,3),
    'firstOnlineSwitchOutput':first_online_switch,
    'observations':observations,
    'post':post,
},indent=2,sort_keys=True))
