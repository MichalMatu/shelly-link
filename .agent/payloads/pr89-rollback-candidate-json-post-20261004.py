import hashlib
import json
import subprocess
import time
from pathlib import Path

BASE='http://192.168.0.10'
INTERFACE='en0'
SCRIPT_ID=1
EXPECTED_ID='shellyplugsg3-e4b063d7f530'
OLD_SHA='eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
NEW_SHA='46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef'

def sha(s): return hashlib.sha256(s.encode()).hexdigest()

def post(method, params=None):
    body=json.dumps(params or {},separators=(',',':'))
    p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','12','-X','POST','-H','Content-Type: application/json','--data-binary',body,f'{BASE}/rpc/{method}'],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(p.stderr.strip())
    out=json.loads(p.stdout)
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0: raise RuntimeError(repr(out))
    return out

def get(method, params=None):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
    for k,v in (params or {}).items(): cmd += ['--data-urlencode',f'{k}={v}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode: raise RuntimeError(p.stderr.strip())
    out=json.loads(p.stdout)
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0: raise RuntimeError(repr(out))
    return out

def source():
    parts=[]; off=0
    for _ in range(64):
        v=get('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024}); d=v.get('data'); left=v.get('left')
        if not isinstance(d,str) or not isinstance(left,(int,float)): raise RuntimeError(v)
        parts.append(d); off += len(d.encode())
        if left<=0:return ''.join(parts)
    raise RuntimeError('too many chunks')

def put(text):
    for i in range(0,len(text),700): post('Script.PutCode',{'id':SCRIPT_ID,'code':text[i:i+700],'append':i>0})

info=post('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID: raise RuntimeError(info)
old=Path('/tmp/climate-old-source.js').read_text()
if sha(old)!=OLD_SHA: raise RuntimeError(f'old backup mismatch {sha(old)}')
cur=source(); cur_sha=sha(cur)
if cur_sha not in {OLD_SHA,NEW_SHA}: raise RuntimeError(f'unknown current source {cur_sha}')
if cur_sha==OLD_SHA:
    entry=get('Script.List')['scripts'][0]
    if entry.get('running') is True:
        print(json.dumps({'accepted':True,'rollback':'already-old-running','sourceSha256':OLD_SHA},indent=2)); raise SystemExit(0)
post('Script.Stop',{'id':SCRIPT_ID})
post('Switch.Set',{'id':0,'on':False})
put(old)
if sha(source())!=OLD_SHA: raise RuntimeError(f'old verify failed {sha(source())}')
post('Script.SetConfig',{'id':SCRIPT_ID,'config':{'enable':True}})
start=post('Script.Start',{'id':SCRIPT_ID})
time.sleep(1)
status=get('Script.GetStatus',{'id':SCRIPT_ID})
if status.get('running') is not True or status.get('error_msg') or status.get('errors'): raise RuntimeError(status)
print(json.dumps({'accepted':True,'rollback':'restored-old','sourceSha256':OLD_SHA,'start':start,'status':status,'switch':get('Switch.GetStatus',{'id':0})},indent=2,sort_keys=True))
