import json, subprocess, time
from typing import Any
BASE='http://192.168.0.10'; INTERFACE='en0'; EXPECTED_ID='shellyplugsg3-e4b063d7f530'; SCRIPT_ID=1

def call(method:str, params:dict[str,Any]|None=None, mutate=False):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','10','-G',f'{BASE}/rpc/{method}']
    for k,v in (params or {}).items():
        cmd += ['--data-urlencode', f'{k}={json.dumps(v,separators=(",",":")) if isinstance(v,(dict,list)) else v}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode: raise RuntimeError(p.stderr.strip())
    out=json.loads(p.stdout)
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0: raise RuntimeError(repr(out))
    return out

def diag():
    p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8',f'{BASE}/script/{SCRIPT_ID}/diag'],capture_output=True,text=True)
    if p.returncode: raise RuntimeError(p.stderr.strip())
    d=json.loads(p.stdout); g=d['g']; pwr=d['p']; return {'fault':g[21],'mode':'manual' if g[17] else 'auto','safety':g[22],'reason':g[6],'temperatureC':g[1],'humidityPct':g[2],'relay':pwr[0]}

info=call('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID: raise RuntimeError(f'identity mismatch {info!r}')
pre=diag()
if pre['mode']!='auto' or pre['safety'] is not False or pre['fault'] not in ('st','bf'):
    raise RuntimeError(f'probe requires safe scanner-fault state: {pre!r}')
if pre['relay'] is not False: raise RuntimeError(f'relay must be OFF before probe: {pre!r}')
code='if(bt)bt.call(BLE.Scanner);Timer.set(1500,false,function(){var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")});"scheduled"'
res=call('Script.Eval',{'id':SCRIPT_ID,'code':code},mutate=True)
result={'identity':info,'preflight':pre,'eval':res,'timeline':[],'fallbackUsed':False}
recovered=False
for _ in range(12):
    time.sleep(5); d=diag(); result['timeline'].append(d)
    if d['safety'] is not False: raise RuntimeError(f'safety lockout during probe: {d!r}')
    if d['fault'] is None and d['temperatureC'] is not None and d['humidityPct'] is not None:
        recovered=True; break
if not recovered:
    result['fallbackUsed']=True
    call('Switch.Set',{'id':0,'on':False},mutate=True)
    try: call('Script.Stop',{'id':SCRIPT_ID},mutate=True)
    except Exception: pass
    call('Script.Start',{'id':SCRIPT_ID},mutate=True)
    for _ in range(12):
        time.sleep(5); d=diag(); result.setdefault('fallbackTimeline',[]).append(d)
        if d['fault'] is None and d['temperatureC'] is not None and d['humidityPct'] is not None: break
    else: raise RuntimeError(f'fallback script restart did not recover BLE: {result!r}')
result['delayedRestartRecovered']=recovered
result['final']=diag()
print(json.dumps(result,indent=2,sort_keys=True))
