import hashlib
import json
import subprocess
import time
from pathlib import Path

BASE='http://192.168.0.10'
INTERFACE='en0'
SCRIPT_ID=1
EXPECTED_ID='shellyplugsg3-e4b063d7f530'


def rpc(method, params=None):
    last=None
    for i in range(5):
        cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
        for k,v in (params or {}).items(): cmd += ['--data-urlencode',f'{k}={v}']
        p=subprocess.run(cmd,capture_output=True,text=True)
        if p.returncode==0:
            try:
                out=json.loads(p.stdout)
                if not (isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0): return out
            except Exception: pass
        last=p.stderr.strip() or p.stdout[:200]
        if i<4: time.sleep(.4)
    raise RuntimeError(f'{method} failed: {last!r}')


def source():
    parts=[]; off=0
    for _ in range(64):
        v=rpc('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024})
        data=v.get('data'); left=v.get('left')
        if not isinstance(data,str) or not isinstance(left,(int,float)): raise RuntimeError(v)
        parts.append(data); off += len(data.encode())
        if left<=0:return ''.join(parts)
        if not data:raise RuntimeError('no progress')
    raise RuntimeError('too many chunks')


def sha(s): return hashlib.sha256(s.encode()).hexdigest()

def compare(a,b):
    diffs=[]
    for i,(x,y) in enumerate(zip(a,b)):
        if x!=y:
            diffs.append({'index':i,'current':repr(x),'backup':repr(y),'currentOrd':ord(x),'backupOrd':ord(y),'currentContext':a[max(0,i-30):i+31],'backupContext':b[max(0,i-30):i+31]})
            if len(diffs)>=20: break
    return {'sameLength':len(a)==len(b),'currentLength':len(a),'backupLength':len(b),'firstDiffs':diffs,'suffixCurrent':repr(a[-80:]),'suffixBackup':repr(b[-80:])}

info=rpc('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID: raise RuntimeError(info)
cur=source()
out={'identity':{'id':info.get('id'),'model':info.get('model'),'ver':info.get('ver')},'current':{'bytes':len(cur.encode()),'sha256':sha(cur)},'scriptList':rpc('Script.List'),'scriptStatus':rpc('Script.GetStatus',{'id':SCRIPT_ID})}
for name,path in [('old','/tmp/climate-old-source.js'),('new','/tmp/climate-new-source.js')]:
    p=Path(path)
    if p.exists():
        text=p.read_text()
        out[name]={'bytes':len(text.encode()),'sha256':sha(text),'compare':compare(cur,text)}
    else:
        out[name]={'missing':True}
print(json.dumps(out,indent=2,sort_keys=True))
