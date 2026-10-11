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
SCRIPT_ID=1
CHUNK_BYTES=900


def rpc_once(method:str, params:dict[str,Any]|None=None, max_time:int=12):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
    for key,value in (params or {}).items():
        if isinstance(value,(dict,list)): encoded=json.dumps(value,separators=(',',':'))
        elif isinstance(value,bool): encoded='true' if value else 'false'
        else: encoded=str(value)
        cmd += ['--data-urlencode',f'{key}={encoded}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode!=0:return False,p.stderr.strip()
    try: out=json.loads(p.stdout)
    except Exception:return False,f'invalid JSON: {p.stdout[:300]}'
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0:return False,out
    return True,out


def read_rpc(method:str, params:dict[str,Any]|None=None):
    last=None
    for i in range(5):
        ok,out=rpc_once(method,params)
        if ok:return out
        last=out
        if i<4:time.sleep(.4)
    raise RuntimeError(f'{method} failed: {last!r}')


def mutate(method:str, params:dict[str,Any]|None=None):
    ok,out=rpc_once(method,params)
    if not ok:raise RuntimeError(f'{method} mutation failed: {out!r}')
    return out


def read_source():
    parts=[]; off=0
    for _ in range(64):
        v=read_rpc('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024})
        data=v.get('data') if isinstance(v,dict) else None; left=v.get('left') if isinstance(v,dict) else None
        if not isinstance(data,str) or not isinstance(left,(int,float)):raise RuntimeError(f'invalid GetCode {v!r}')
        parts.append(data); off+=len(data.encode())
        if left<=0:return ''.join(parts)
        if not data:raise RuntimeError('GetCode made no progress')
    raise RuntimeError('GetCode exceeded chunk limit')


def chunks(value:str):
    current=''; size=0
    for ch in value:
        n=len(ch.encode())
        if current and size+n>CHUNK_BYTES:
            yield current; current=''; size=0
        current+=ch; size+=n
    if current or not value:yield current


def put_code(value:str):
    for i,chunk in enumerate(chunks(value)):
        mutate('Script.PutCode',{'id':SCRIPT_ID,'code':chunk,'append':i>0})


def sha(value:str):return hashlib.sha256(value.encode()).hexdigest()

old=Path('/tmp/climate-old-source.js').read_text()
candidate=Path('/tmp/climate-new-source.js').read_text()
if sha(old)!=EXPECTED_OLD_SHA:raise RuntimeError(f'backup old source hash mismatch {sha(old)}')
info=read_rpc('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID:raise RuntimeError(f'identity mismatch {info!r}')
current=read_source()
if current==old:
    print(json.dumps({'rollback':'already-old','oldSha256':sha(old)},indent=2,sort_keys=True))
    raise SystemExit(0)
if current!=candidate:raise RuntimeError(f'refuse rollback from unknown source {sha(current)}')
entries=read_rpc('Script.List').get('scripts')
entry=next((x for x in entries if x.get('id')==SCRIPT_ID),None) if isinstance(entries,list) else None
if not entry:raise RuntimeError(f'managed script missing {entries!r}')
enable=entry.get('enable') is True
try: mutate('Script.Stop',{'id':SCRIPT_ID})
except Exception: pass
mutate('Switch.Set',{'id':0,'on':False})
sw=read_rpc('Switch.GetStatus',{'id':0})
if sw.get('output') is not False:raise RuntimeError(f'relay not OFF before rollback {sw!r}')
put_code(old)
mutate('Script.SetConfig',{'id':SCRIPT_ID,'config':{'enable':enable}})
if enable:mutate('Script.Start',{'id':SCRIPT_ID})
verified=read_source()
if verified!=old:raise RuntimeError(f'rollback source verify failed {sha(verified)}')
status=read_rpc('Script.GetStatus',{'id':SCRIPT_ID})
if enable and (status.get('running') is not True or status.get('error_msg') or status.get('errors')):raise RuntimeError(f'rollback script unhealthy {status!r}')
print(json.dumps({'rollback':'restored-old','oldSha256':sha(old),'status':status,'switch':read_rpc('Switch.GetStatus',{'id':0})},indent=2,sort_keys=True))
