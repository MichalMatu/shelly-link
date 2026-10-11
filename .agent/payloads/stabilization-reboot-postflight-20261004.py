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


def curl_once(path: str) -> tuple[bool, Any]:
    p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','4',BASE+path],capture_output=True,text=True)
    if p.returncode != 0:
        return False,p.stderr.strip()
    try:
        return True,json.loads(p.stdout)
    except Exception:
        return False,f'invalid JSON: {p.stdout[:200]}'


def require(path: str, attempts: int=5) -> Any:
    last=None
    for i in range(attempts):
        ok,value=curl_once(path)
        if ok:
            return value
        last=value
        if i+1<attempts:
            time.sleep(0.25)
    raise RuntimeError(f'{path} failed: {last}')


def script_source(script_id: int) -> str:
    parts=[]
    offset=0
    for _ in range(64):
        value=require(f'/rpc/Script.GetCode?id={script_id}&offset={offset}&len=1024')
        data=value.get('data')
        left=value.get('left')
        if not isinstance(data,str) or not isinstance(left,(int,float)):
            raise RuntimeError(f'invalid Script.GetCode response: {value!r}')
        parts.append(data)
        offset += len(data.encode('utf-8'))
        if left<=0:
            return ''.join(parts)
        if not data:
            raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def diag_state(diag: Any) -> dict[str,Any]:
    g=diag.get('g') if isinstance(diag,dict) else None
    y=diag.get('y') if isinstance(diag,dict) else None
    p=diag.get('p') if isinstance(diag,dict) else None
    if not isinstance(g,list) or len(g)<24:
        raise RuntimeError(f'invalid diag.g: {g!r}')
    return {
        'deviceUptimeSec': y[2] if isinstance(y,list) and len(y)>2 else None,
        'finalRelayOn': p[0] if isinstance(p,list) and p else None,
        'powerW': p[1] if isinstance(p,list) and len(p)>1 else None,
        'currentA': p[3] if isinstance(p,list) and len(p)>3 else None,
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

info=require('/rpc/Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')
scripts=require('/rpc/Script.List')
entries=scripts.get('scripts') if isinstance(scripts,dict) else None
if not isinstance(entries,list) or len(entries)!=1:
    raise RuntimeError(f'expected exactly one managed script: {entries!r}')
script=entries[0]
script_id=script.get('id')
if script_id != 1 or script.get('enable') is not True or script.get('running') is not True:
    raise RuntimeError(f'managed script did not recover: {script!r}')
script_status=require('/rpc/Script.GetStatus?id=1')
if script_status.get('running') is not True:
    raise RuntimeError(f'Script.GetStatus not running: {script_status!r}')
source=script_source(1)
source_sha=hashlib.sha256(source.encode('utf-8')).hexdigest()
source_bytes=len(source.encode('utf-8'))
if source_sha != EXPECTED_SOURCE_SHA256 or source_bytes != EXPECTED_SOURCE_BYTES:
    raise RuntimeError(f'production source fingerprint changed: {source_bytes} B {source_sha}')
schedules=require('/rpc/Schedule.List')
if not isinstance(schedules,dict) or schedules.get('jobs') not in ([],None):
    raise RuntimeError(f'unexpected schedules after reboot: {schedules!r}')
switch=require('/rpc/Switch.GetStatus?id=0')
diag=require('/script/1/diag')
state=diag_state(diag)
if not isinstance(state['deviceUptimeSec'],(int,float)) or state['deviceUptimeSec']>900:
    raise RuntimeError(f'uptime does not show a recent reboot: {state["deviceUptimeSec"]!r}')
if state['controlMode']!='auto' or state['safetyLockout'] is not False:
    raise RuntimeError(f'runtime did not recover healthy AUTO: {state!r}')

meta_raw=require('/rpc/KVS.Get?key=shellylink.history.meta')
meta_value=meta_raw.get('value') if isinstance(meta_raw,dict) else None
meta=None
if isinstance(meta_value,str):
    try: meta=json.loads(meta_value)
    except Exception: meta=None
records=[]
for slot in range(24):
    ok,item=curl_once(f'/rpc/KVS.Get?key=shellylink.history.{slot:02d}')
    if not ok or not isinstance(item,dict) or not isinstance(item.get('value'),str):
        continue
    try: segment=json.loads(item['value'])
    except Exception: continue
    if isinstance(segment,list) and len(segment)==2 and segment[0]==2 and isinstance(segment[1],list):
        for record in segment[1]:
            if isinstance(record,list) and len(record)==11:
                records.append({'slot':slot,'record':record})
recent=[x for x in records if isinstance(x['record'][1],(int,float)) and x['record'][1] <= state['deviceUptimeSec']+5]
boot=[x for x in recent if x['record'][6]=='b' and x['record'][7]=='st' and (x['record'][5] & 2)==0]
if not boot:
    raise RuntimeError(f'no recent History boot-safe-OFF record found; recent={recent!r}')

print(json.dumps({
    'identity': {'id':info.get('id'),'model':info.get('model'),'gen':info.get('gen'),'fw_id':info.get('fw_id'),'ver':info.get('ver')},
    'script':script,
    'scriptStatus':script_status,
    'sourceBytes':source_bytes,
    'sourceSha256':source_sha,
    'scheduleCount':len(schedules.get('jobs') or []),
    'switch': {'output':switch.get('output'),'apower':switch.get('apower'),'current':switch.get('current'),'voltage':switch.get('voltage')},
    'diagState':state,
    'historyMeta':meta,
    'recentHistoryRecords':recent,
    'bootSafeOffRecords':boot,
},indent=2,sort_keys=True))
