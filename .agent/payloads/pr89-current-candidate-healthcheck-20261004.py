import hashlib
import json
import subprocess
import time

BASE='http://192.168.0.10'
INTERFACE='en0'
SCRIPT_ID=1
EXPECTED_ID='shellyplugsg3-e4b063d7f530'
OLD_SHA='eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
NEW_SHA='46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef'

def get(method, params=None, attempts=10):
    last=None
    for i in range(attempts):
        cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
        for k,v in (params or {}).items(): cmd += ['--data-urlencode',f'{k}={v}']
        p=subprocess.run(cmd,capture_output=True,text=True)
        if p.returncode==0:
            try:
                out=json.loads(p.stdout)
                if not (isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0): return out
                last=out
            except Exception as exc: last=repr(exc)
        else: last=p.stderr.strip()
        if i+1<attempts: time.sleep(1)
    raise RuntimeError(f'{method} failed: {last!r}')

def source():
    parts=[]; off=0
    for _ in range(64):
        v=get('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024}); d=v.get('data'); left=v.get('left')
        if not isinstance(d,str) or not isinstance(left,(int,float)): raise RuntimeError(v)
        parts.append(d); off += len(d.encode())
        if left<=0:return ''.join(parts)
        if not d: raise RuntimeError('no source progress')
    raise RuntimeError('too many chunks')

def path(path):
    last=None
    for i in range(10):
        p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8',BASE+path],capture_output=True,text=True)
        if p.returncode==0:
            try:return json.loads(p.stdout)
            except Exception as exc:last=repr(exc)
        else:last=p.stderr.strip()
        if i<9:time.sleep(1)
    raise RuntimeError(last)

info=get('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID: raise RuntimeError(info)
s=source(); digest=hashlib.sha256(s.encode()).hexdigest()
if digest not in {OLD_SHA,NEW_SHA}: raise RuntimeError(f'unknown source {len(s.encode())} {digest}')
status=get('Script.GetStatus',{'id':SCRIPT_ID})
entry=get('Script.List')['scripts'][0]
sw=get('Switch.GetStatus',{'id':0})
diag=path(f'/script/{SCRIPT_ID}/diag') if status.get('running') is True else None
eval_result=None
if status.get('running') is True:
    eval_result=get('Script.Eval',{'id':SCRIPT_ID,'code':'JSON.stringify({a:C.a,sa:R.sa,l:R.l,n:nw(),sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null))})'})
print(json.dumps({'identity':{'id':info.get('id'),'model':info.get('model'),'ver':info.get('ver')},'sourceBytes':len(s.encode()),'sourceSha256':digest,'sourceKind':'candidate' if digest==NEW_SHA else 'old','scriptEntry':entry,'scriptStatus':status,'switchOutput':sw.get('output'),'diag':diag,'runtimeEval':eval_result},indent=2,sort_keys=True))
