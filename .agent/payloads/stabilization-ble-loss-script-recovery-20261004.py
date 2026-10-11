import hashlib
import json
import subprocess
import time
from typing import Any

BASE='http://192.168.0.10'
INTERFACE='en0'
EXPECTED_ID='shellyplugsg3-e4b063d7f530'
EXPECTED_SOURCE_SHA256='eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
EXPECTED_SOURCE_BYTES=8847
SCRIPT_ID=1


def call_once(method: str, params: dict[str, Any] | None = None, max_time: int = 10):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
    for k,v in (params or {}).items():
        if isinstance(v,(dict,list)):
            s=json.dumps(v,separators=(',',':'))
        elif isinstance(v,bool):
            s='true' if v else 'false'
        else:
            s=str(v)
        cmd += ['--data-urlencode',f'{k}={s}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode != 0:
        return False,p.stderr.strip()
    try:
        value=json.loads(p.stdout)
    except Exception:
        return False,f'invalid JSON: {p.stdout[:200]}'
    if isinstance(value,dict) and isinstance(value.get('code'),(int,float)) and value.get('code') < 0:
        return False,value
    return True,value


def read(method: str, params: dict[str, Any] | None = None, attempts: int = 5):
    last=None
    for i in range(attempts):
        ok,value=call_once(method,params,6)
        if ok:
            return value
        last=value
        if i+1<attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{method} read failed: {last!r}')


def read_path(path: str, attempts: int = 5):
    last=None
    for i in range(attempts):
        p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','6',BASE+path],capture_output=True,text=True)
        if p.returncode == 0:
            try:
                value=json.loads(p.stdout)
                if not (isinstance(value,dict) and isinstance(value.get('code'),(int,float)) and value.get('code')<0):
                    return value
                last=value
            except Exception:
                last=f'invalid JSON: {p.stdout[:200]}'
        else:
            last=p.stderr.strip()
        if i+1<attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{path} read failed: {last!r}')


def source():
    parts=[]
    offset=0
    for _ in range(64):
        value=read('Script.GetCode',{'id':SCRIPT_ID,'offset':offset,'len':1024})
        data=value.get('data') if isinstance(value,dict) else None
        left=value.get('left') if isinstance(value,dict) else None
        if not isinstance(data,str) or not isinstance(left,(int,float)):
            raise RuntimeError(f'invalid Script.GetCode: {value!r}')
        parts.append(data)
        offset += len(data.encode('utf-8'))
        if left<=0:
            return ''.join(parts)
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def diag_state():
    diag=read_path(f'/script/{SCRIPT_ID}/diag')
    g=diag.get('g') if isinstance(diag,dict) else None
    p=diag.get('p') if isinstance(diag,dict) else None
    y=diag.get('y') if isinstance(diag,dict) else None
    if not isinstance(g,list) or len(g)<24:
        raise RuntimeError(f'invalid diag.g: {g!r}')
    return {
        'uptimeSec': y[2] if isinstance(y,list) and len(y)>2 else None,
        'mode': 'manual' if g[17] else 'auto',
        'automationRequestOn': g[18],
        'automationFault': g[21],
        'safetyLockout': g[22],
        'safetyReason': g[23],
        'runtimeRelayOn': g[5],
        'reason': g[6],
        'temperatureC': g[1],
        'humidityPct': g[2],
        'finalRelayOn': p[0] if isinstance(p,list) and p else None,
    }

info=read('Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')
ble=read('BLE.GetConfig')
if ble != {'enable': True, 'rpc': {'enable': True}}:
    raise RuntimeError(f'BLE config is not restored canonical backup: {ble!r}')
scripts=read('Script.List')
entries=scripts.get('scripts') if isinstance(scripts,dict) else None
if not isinstance(entries,list) or len(entries)!=1 or entries[0].get('id')!=SCRIPT_ID or entries[0].get('running') is not True:
    raise RuntimeError(f'expected running managed script: {entries!r}')
pre_source=source()
pre_sha=hashlib.sha256(pre_source.encode('utf-8')).hexdigest()
if len(pre_source.encode('utf-8')) != EXPECTED_SOURCE_BYTES or pre_sha != EXPECTED_SOURCE_SHA256:
    raise RuntimeError(f'source fingerprint changed: {len(pre_source.encode("utf-8"))} B {pre_sha}')
pre=diag_state()
sw=read('Switch.GetStatus',{'id':0})
if pre['mode']!='auto' or pre['automationFault']!='st' or pre['safetyLockout'] is not False:
    raise RuntimeError(f'expected safe stale AUTO before recovery: {pre!r}')
if pre['finalRelayOn'] is not False or sw.get('output') is not False:
    raise RuntimeError(f'expected relay OFF before script recovery: diag={pre!r}, switch={sw!r}')

ok_stop,stop_response=call_once('Script.Stop',{'id':SCRIPT_ID})
if not ok_stop:
    raise RuntimeError(f'Script.Stop failed without retry: {stop_response!r}')
status_stopped=read('Script.GetStatus',{'id':SCRIPT_ID})
if status_stopped.get('running') is not False:
    raise RuntimeError(f'script did not stop: {status_stopped!r}')
sw_stopped=read('Switch.GetStatus',{'id':0})
if sw_stopped.get('output') is not False:
    raise RuntimeError(f'relay changed while stopping already-safe runtime: {sw_stopped!r}')

ok_start,start_response=call_once('Script.Start',{'id':SCRIPT_ID})
if not ok_start:
    raise RuntimeError(f'Script.Start failed without retry: {start_response!r}')
status_started=read('Script.GetStatus',{'id':SCRIPT_ID})
if status_started.get('running') is not True:
    raise RuntimeError(f'script did not start: {status_started!r}')

timeline=[]
deadline=time.monotonic()+180
recovered=None
while time.monotonic()<deadline:
    d=diag_state()
    s=read('Switch.GetStatus',{'id':0})
    item={'diag':d,'switch':{'output':s.get('output'),'apower':s.get('apower'),'current':s.get('current'),'voltage':s.get('voltage')}}
    timeline.append(item)
    if d['safetyLockout'] is not False:
        raise RuntimeError(f'hard safety appeared after script restart: {d!r}')
    if d['mode']=='auto' and d['automationFault'] is None and s.get('output')==d['finalRelayOn']:
        recovered=item
        if d['automationRequestOn'] is False or d['finalRelayOn'] is True:
            break
    time.sleep(5)
if recovered is None or recovered['diag']['automationFault'] is not None:
    raise RuntimeError(f'script restart did not restore fresh-BLE AUTO before deadline: tail={timeline[-8:]!r}')

post_source=source()
post_sha=hashlib.sha256(post_source.encode('utf-8')).hexdigest()
if len(post_source.encode('utf-8')) != EXPECTED_SOURCE_BYTES or post_sha != EXPECTED_SOURCE_SHA256:
    raise RuntimeError(f'post source fingerprint changed: {len(post_source.encode("utf-8"))} B {post_sha}')
if read('BLE.GetConfig') != ble:
    raise RuntimeError('BLE config drifted during script restart recovery')
post_sched=read('Schedule.List')
if post_sched.get('jobs') not in ([],None):
    raise RuntimeError(f'schedules changed: {post_sched!r}')

print(json.dumps({
    'identity': {'id':info.get('id'),'model':info.get('model'),'fw_id':info.get('fw_id'),'ver':info.get('ver')},
    'bleConfig':ble,
    'preflight':pre,
    'stopResponse':stop_response,
    'startResponse':start_response,
    'recovery':recovered,
    'timelineTail':timeline[-8:],
    'sourceBytes':EXPECTED_SOURCE_BYTES,
    'sourceSha256':post_sha,
    'scheduleCount':len(post_sched.get('jobs') or []),
    'accepted':True,
},indent=2,sort_keys=True))
