import hashlib
import json
import subprocess
import time
from pathlib import Path
from typing import Any

BASE='http://192.168.0.10'
INTERFACE='en0'
EXPECTED_ID='shellyplugsg3-e4b063d7f530'
EXPECTED_OLD_SHA='eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
EXPECTED_OLD_BYTES=8847
EXPECTED_CORRUPT_SHA='72df30515d74c08f6f490f96d89e88bbf16a6d55728f2cd70b1af4a289350791'
SCRIPT_ID=1
CHUNK_CHARS=700


def decode(proc: subprocess.CompletedProcess[str], method: str) -> Any:
    if proc.returncode != 0:
        raise RuntimeError(f'{method} curl failed: {proc.stderr.strip()!r}')
    try:
        value=json.loads(proc.stdout)
    except Exception as exc:
        raise RuntimeError(f'{method} invalid JSON: {proc.stdout[:300]!r}') from exc
    if isinstance(value,dict) and isinstance(value.get('code'),(int,float)) and value['code']<0:
        raise RuntimeError(f'{method} RPC error: {value!r}')
    return value


def post_rpc(method:str, params:dict[str,Any]|None=None, max_time:int=12) -> Any:
    body=json.dumps(params or {},separators=(',',':'))
    proc=subprocess.run([
        'curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),
        '-X','POST','-H','Content-Type: application/json','--data-binary',body,f'{BASE}/rpc/{method}'
    ],capture_output=True,text=True)
    return decode(proc,method)


def get_rpc(method:str, params:dict[str,Any]|None=None, attempts:int=5) -> Any:
    last=None
    for i in range(attempts):
        cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
        for k,v in (params or {}).items(): cmd += ['--data-urlencode',f'{k}={v}']
        proc=subprocess.run(cmd,capture_output=True,text=True)
        try:
            return decode(proc,method)
        except Exception as exc:
            last=exc
            if i+1<attempts: time.sleep(.4)
    raise RuntimeError(f'{method} read failed: {last!r}')


def read_source() -> str:
    parts=[]; off=0
    for _ in range(64):
        v=get_rpc('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024})
        data=v.get('data') if isinstance(v,dict) else None
        left=v.get('left') if isinstance(v,dict) else None
        if not isinstance(data,str) or not isinstance(left,(int,float)): raise RuntimeError(f'bad code chunk {v!r}')
        parts.append(data); off += len(data.encode())
        if left<=0:return ''.join(parts)
        if not data:raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def sha(text:str)->str:return hashlib.sha256(text.encode()).hexdigest()


def put_source(text:str) -> None:
    chunks=[text[i:i+CHUNK_CHARS] for i in range(0,len(text),CHUNK_CHARS)] or ['']
    for index,chunk in enumerate(chunks):
        post_rpc('Script.PutCode',{'id':SCRIPT_ID,'code':chunk,'append':index>0})


def diag():
    proc=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8',f'{BASE}/script/{SCRIPT_ID}/diag'],capture_output=True,text=True)
    if proc.returncode:return None
    try:d=json.loads(proc.stdout)
    except Exception:return None
    g=d.get('g'); p=d.get('p')
    if not isinstance(g,list) or len(g)<24:return None
    return {'fault':g[21],'mode':'manual' if g[17] else 'auto','safety':g[22],'temperatureC':g[1],'humidityPct':g[2],'relay':p[0] if isinstance(p,list) and p else None,'reason':g[6]}

backup_path=Path('/tmp/climate-old-source.js')
if not backup_path.exists():raise RuntimeError('missing /tmp/climate-old-source.js exact backup')
old=backup_path.read_text()
if len(old.encode())!=EXPECTED_OLD_BYTES or sha(old)!=EXPECTED_OLD_SHA:
    raise RuntimeError(f'backup fingerprint mismatch {len(old.encode())} {sha(old)}')

# Validate JSON POST transport with a read-only RPC before any mutation.
info_post=post_rpc('Shelly.GetDeviceInfo')
if info_post.get('id')!=EXPECTED_ID:raise RuntimeError(f'POST transport identity mismatch {info_post!r}')
info=get_rpc('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID:raise RuntimeError(f'identity mismatch {info!r}')
entries=get_rpc('Script.List').get('scripts')
entry=next((x for x in entries if x.get('id')==SCRIPT_ID),None) if isinstance(entries,list) else None
if not entry or entry.get('enable') is not True:raise RuntimeError(f'unexpected script list {entries!r}')
if entry.get('running') is not False:raise RuntimeError(f'expected stopped script before restore {entry!r}')
sw=get_rpc('Switch.GetStatus',{'id':0})
if sw.get('output') is not False:raise RuntimeError(f'relay must remain OFF before restore {sw!r}')
current=read_source(); current_sha=sha(current)
if current_sha!=EXPECTED_CORRUPT_SHA:raise RuntimeError(f'unexpected current source before restore {len(current.encode())} {current_sha}')

put_source(old)
restored=read_source()
if restored!=old:raise RuntimeError(f'byte-safe restore verify failed {len(restored.encode())} {sha(restored)}')
post_rpc('Script.SetConfig',{'id':SCRIPT_ID,'config':{'enable':True}})
start_response=None
try:
    start_response=post_rpc('Script.Start',{'id':SCRIPT_ID})
except Exception as exc:
    start_response={'exception':repr(exc)}

result={'identity':{'id':info.get('id'),'model':info.get('model'),'ver':info.get('ver')},'postTransportValidated':True,'corruptSha256':current_sha,'restoredBytes':len(restored.encode()),'restoredSha256':sha(restored),'startResponse':start_response,'timeline':[]}
for _ in range(24):
    time.sleep(5)
    status=get_rpc('Script.GetStatus',{'id':SCRIPT_ID})
    d=diag(); s=get_rpc('Switch.GetStatus',{'id':0})
    snap={'status':status,'diag':d,'switchOutput':s.get('output')}
    result['timeline'].append(snap)
    if status.get('running') is True and not status.get('error_msg') and not status.get('errors') and d and d['safety'] is False and d['fault'] is None and d['mode']=='auto' and d['temperatureC'] is not None and d['humidityPct'] is not None:
        result['accepted']=True; result['final']=snap; break
else:
    raise RuntimeError(f'exact old source restored but healthy AUTO did not recover: {result!r}')
print(json.dumps(result,indent=2,sort_keys=True))
