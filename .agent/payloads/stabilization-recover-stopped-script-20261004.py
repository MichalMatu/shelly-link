import hashlib
import json
import subprocess
import time

BASE='http://192.168.0.10'
INTERFACE='en0'
EXPECTED_ID='shellyplugsg3-e4b063d7f530'
EXPECTED_SHA='eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
EXPECTED_BYTES=8847
SCRIPT_ID=1


def curl(method, params=None, max_time=8):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
    for key,value in (params or {}).items():
        cmd += ['--data-urlencode', f'{key}={value}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode:
        return False,p.stderr.strip()
    try: out=json.loads(p.stdout)
    except Exception: return False,p.stdout[:300]
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0:
        return False,out
    return True,out


def read(method, params=None):
    last=None
    for i in range(5):
        ok,out=curl(method,params)
        if ok:return out
        last=out
        if i<4:time.sleep(.4)
    raise RuntimeError(f'{method} read failed: {last!r}')


def source():
    parts=[]; off=0
    for _ in range(64):
        v=read('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024})
        data=v.get('data'); left=v.get('left')
        if not isinstance(data,str) or not isinstance(left,(int,float)):raise RuntimeError(f'bad code chunk {v!r}')
        parts.append(data); off+=len(data.encode())
        if left<=0:return ''.join(parts)
        if not data:raise RuntimeError('no code progress')
    raise RuntimeError('too many code chunks')


def diag():
    p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8',f'{BASE}/script/{SCRIPT_ID}/diag'],capture_output=True,text=True)
    if p.returncode:return None
    try:d=json.loads(p.stdout)
    except Exception:return None
    g=d.get('g'); pwr=d.get('p')
    if not isinstance(g,list) or len(g)<24:return None
    return {'fault':g[21],'mode':'manual' if g[17] else 'auto','safety':g[22],'temperatureC':g[1],'humidityPct':g[2],'relay':pwr[0] if isinstance(pwr,list) and pwr else None,'reason':g[6]}

info=read('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID:raise RuntimeError(f'identity mismatch {info!r}')
scripts=read('Script.List'); entries=scripts.get('scripts') if isinstance(scripts,dict) else None
if not isinstance(entries,list) or len(entries)!=1 or entries[0].get('id')!=SCRIPT_ID or entries[0].get('enable') is not True:
    raise RuntimeError(f'unexpected script list {entries!r}')
if entries[0].get('running') is not False:raise RuntimeError(f'expected stopped script before recovery {entries!r}')
sw=read('Switch.GetStatus',{'id':0})
if sw.get('output') is not False:raise RuntimeError(f'relay must be OFF before recovery {sw!r}')
src=source(); sha=hashlib.sha256(src.encode()).hexdigest(); size=len(src.encode())
if sha!=EXPECTED_SHA or size!=EXPECTED_BYTES:raise RuntimeError(f'source changed {size} {sha}')

ok,start=curl('Script.Start',{'id':SCRIPT_ID},10)
result={'identity':info,'sourceBytes':size,'sourceSha256':sha,'startResponse':start,'startRpcOk':ok,'timeline':[]}
# Do not retry the mutating RPC. Its outcome may be ambiguous; verify by readback.
for _ in range(18):
    time.sleep(5)
    status=read('Script.GetStatus',{'id':SCRIPT_ID})
    d=diag(); s=read('Switch.GetStatus',{'id':0})
    result['timeline'].append({'status':status,'diag':d,'switchOutput':s.get('output')})
    if status.get('running') is True and d and d['safety'] is False and d['fault'] is None and d['temperatureC'] is not None and d['humidityPct'] is not None:
        result['accepted']=True; result['final']=result['timeline'][-1]; break
else:
    raise RuntimeError(f'script did not recover fresh BLE after start: {result!r}')
print(json.dumps(result,indent=2,sort_keys=True))
