import json
import subprocess
import time

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
        time.sleep(.4)
    raise RuntimeError(f'{method} failed: {last!r}')


def source():
    parts=[]; off=0
    for _ in range(64):
        v=rpc('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024})
        data=v.get('data'); left=v.get('left')
        if not isinstance(data,str) or not isinstance(left,(int,float)): raise RuntimeError(v)
        parts.append(data); off+=len(data.encode())
        if left<=0:return ''.join(parts)
    raise RuntimeError('too many chunks')

info=rpc('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID: raise RuntimeError(info)
s=source()
needles=['BLE.Scanner.stop','BLE.Scanner.start','function bs','function bw','R.sa','nw()-(R.l||R.sa)>9e4']
out={}
for needle in needles:
    idx=s.find(needle)
    out[needle]={'index':idx,'snippet':s[max(0,idx-220):min(len(s),idx+420)] if idx>=0 else None}
print(json.dumps(out,indent=2,sort_keys=True))
