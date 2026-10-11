import hashlib
import json
import subprocess
import time
from typing import Any

BASE='http://192.168.0.10'
INTERFACE='en0'
SCRIPT_ID=1
EXPECTED_ID='shellyplugsg3-e4b063d7f530'
EXPECTED_SHA='46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef'
MISSING_ADDR='000000000000'
POLL_SEC=5


def curl_get(method:str, params:dict[str,Any]|None=None, max_time:int=8):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
    for k,v in (params or {}).items(): cmd += ['--data-urlencode',f'{k}={v}']
    return subprocess.run(cmd,capture_output=True,text=True)


def curl_post(method:str, params:dict[str,Any]|None=None, max_time:int=10):
    body=json.dumps(params or {},separators=(',',':'))
    return subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-X','POST','-H','Content-Type: application/json','--data-binary',body,f'{BASE}/rpc/{method}'],capture_output=True,text=True)


def decode(p, method):
    if p.returncode!=0: raise RuntimeError(f'{method} transport: {p.stderr.strip()}')
    try: out=json.loads(p.stdout)
    except Exception as exc: raise RuntimeError(f'{method} invalid JSON: {p.stdout[:200]!r}') from exc
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0: raise RuntimeError(f'{method} RPC: {out!r}')
    return out


def read(method:str, params:dict[str,Any]|None=None, attempts:int=12):
    last=None
    for i in range(attempts):
        try:return decode(curl_get(method,params),method)
        except Exception as exc:
            last=exc
            if i+1<attempts: time.sleep(1)
    raise RuntimeError(f'{method} unavailable after {attempts} attempts: {last!r}')


def post_idempotent(method:str, params:dict[str,Any], attempts:int=8):
    last=None
    for i in range(attempts):
        try:return decode(curl_post(method,params),method)
        except Exception as exc:
            last=exc
            if i+1<attempts: time.sleep(1)
    raise RuntimeError(f'{method} idempotent mutation unavailable after {attempts} attempts: {last!r}')


def read_path(path:str, attempts:int=12):
    last=None
    for i in range(attempts):
        p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8',BASE+path],capture_output=True,text=True)
        if p.returncode==0:
            try:
                out=json.loads(p.stdout)
                if not (isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0): return out
                last=out
            except Exception as exc:last=repr(exc)
        else:last=p.stderr.strip()
        if i+1<attempts:time.sleep(1)
    raise RuntimeError(f'{path} unavailable: {last!r}')


def source():
    parts=[]; off=0
    for _ in range(64):
        v=read('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024}); d=v.get('data'); left=v.get('left')
        if not isinstance(d,str) or not isinstance(left,(int,float)):raise RuntimeError(f'invalid code chunk {v!r}')
        parts.append(d); off += len(d.encode())
        if left<=0:return ''.join(parts)
        if not d:raise RuntimeError('no source progress')
    raise RuntimeError('too many source chunks')


def diag():
    d=read_path(f'/script/{SCRIPT_ID}/diag'); g=d.get('g'); q=d.get('q'); p=d.get('p'); y=d.get('y')
    if not isinstance(g,list) or len(g)<24 or not isinstance(q,list) or len(q)<6:raise RuntimeError(f'invalid diag {d!r}')
    return {'uptimeSec':y[2] if isinstance(y,list) and len(y)>2 else None,'temperatureC':g[1],'humidityPct':g[2],'runtimeRelayOn':g[5],'reason':g[6],'mode':'manual' if g[17] else 'auto','automationRequestOn':g[18],'automationFault':g[21],'safetyLockout':g[22],'safetyReason':g[23],'staleTimeoutSec':q[4],'finalRelayOn':p[0] if isinstance(p,list) and p else None}


def sw():
    s=read('Switch.GetStatus',{'id':0}); return {k:s.get(k) for k in ('output','apower','current','voltage')}


def runtime():
    code='JSON.stringify({a:C.a,sa:R.sa,l:R.l,n:nw(),sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null))})'
    v=read('Script.Eval',{'id':SCRIPT_ID,'code':code}); raw=v.get('result') if isinstance(v,dict) else None
    if not isinstance(raw,str):raise RuntimeError(f'invalid runtime eval {v!r}')
    return json.loads(raw)


def set_addr(value:str):
    code=f'C.a={json.dumps(value)};C.a'
    v=post_idempotent('Script.Eval',{'id':SCRIPT_ID,'code':code}); result=v.get('result') if isinstance(v,dict) else None
    if result!=value:
        r=runtime()
        if r.get('a')!=value:raise RuntimeError(f'address set not confirmed expected={value!r} response={v!r} runtime={r!r}')
    return value


def status():
    s=read('Script.GetStatus',{'id':SCRIPT_ID})
    if s.get('running') is not True or s.get('error_msg') or s.get('errors'):raise RuntimeError(f'unhealthy script {s!r}')
    return s


def sample(phase,start):
    st=status(); d=diag(); r=runtime(); s=sw()
    snap={'phase':phase,'elapsedSec':round(time.monotonic()-start,1),'diag':d,'runtime':r,'switch':s,'script':{'running':st.get('running'),'error_msg':st.get('error_msg'),'errors':st.get('errors'),'mem_free':st.get('mem_free'),'mem_used':st.get('mem_used')}}
    print('PR89_SAMPLE '+json.dumps(snap,separators=(',',':'),sort_keys=True),flush=True)
    return snap


start=time.monotonic(); result={'accepted':False,'candidateSha256':EXPECTED_SHA,'faultInjection':'target BLE address isolation on physical Shelly; scanner and RF remain live','timeline':[]}; original=None; isolated=False
info=read('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID:raise RuntimeError(f'identity mismatch {info!r}')
src=source(); digest=hashlib.sha256(src.encode()).hexdigest()
if digest!=EXPECTED_SHA:raise RuntimeError(f'not exact candidate {len(src.encode())} {digest}')
result['identity']={'id':info.get('id'),'model':info.get('model'),'ver':info.get('ver'),'mac':info.get('mac')}
result['sourceBytes']=len(src.encode())

try:
    baseline=None
    deadline=time.monotonic()+90
    while time.monotonic()<deadline:
        snap=sample('baseline',start); result['timeline'].append(snap); d=snap['diag']; r=snap['runtime']; s=snap['switch']
        age=r.get('n')-r.get('l') if isinstance(r.get('n'),(int,float)) and isinstance(r.get('l'),(int,float)) and r.get('l') else None
        if r.get('sc') is not True:raise RuntimeError(f'scanner not running at baseline {r!r}')
        if d['safetyLockout'] is not False:raise RuntimeError(f'safety lockout baseline {d!r}')
        if d['mode']=='auto' and d['automationFault'] is None and d['temperatureC'] is not None and d['humidityPct'] is not None and age is not None and 0<=age<30000 and s.get('output')==d['finalRelayOn']:
            baseline=snap; baseline['sensorAgeMs']=age; break
        time.sleep(POLL_SEC)
    if baseline is None:raise RuntimeError('fresh AUTO baseline not observed')
    result['baseline']=baseline
    base_sa=baseline['runtime'].get('sa'); base_l=baseline['runtime'].get('l'); base_uptime=baseline['diag'].get('uptimeSec'); original=baseline['runtime'].get('a')
    if not isinstance(base_sa,(int,float)) or base_sa<=0 or not isinstance(base_l,(int,float)) or base_l<=0 or not isinstance(original,str) or not original:raise RuntimeError(f'invalid baseline markers {baseline!r}')
    stale_sec=baseline['diag'].get('staleTimeoutSec')
    if not isinstance(stale_sec,(int,float)) or not (30<=stale_sec<=600):raise RuntimeError(f'unexpected stale timeout {stale_sec!r}')

    set_addr(MISSING_ADDR); isolated=True
    first=sample('sensor-isolated',start); result['timeline'].append(first); loss_l=first['runtime'].get('l')
    if first['runtime'].get('sc') is not True or first['runtime'].get('sa')!=base_sa:raise RuntimeError(f'scanner changed at isolation {first!r}')
    window=max(float(stale_sec)+25,115.0); until=time.monotonic()+window; stale=None; samples=0; last_elapsed=None; max_gap=0.0
    while time.monotonic()<until:
        snap=sample('sensor-missing',start); result['timeline'].append(snap); samples+=1; d=snap['diag']; r=snap['runtime']; s=snap['switch']
        if last_elapsed is not None:max_gap=max(max_gap,snap['elapsedSec']-last_elapsed)
        last_elapsed=snap['elapsedSec']
        if r.get('a')!=MISSING_ADDR:raise RuntimeError(f'isolation lost {r!r}')
        if r.get('sc') is not True:raise RuntimeError(f'scanner stopped during silence {r!r}')
        if r.get('sa')!=base_sa:raise RuntimeError(f'scanner restart marker changed {base_sa!r}->{r.get("sa")!r}')
        if r.get('l')!=loss_l:raise RuntimeError(f'target frame marker advanced during isolation {loss_l!r}->{r.get("l")!r}')
        if d['safetyLockout'] is not False:raise RuntimeError(f'safety lockout during silence {d!r}')
        if isinstance(base_uptime,(int,float)) and isinstance(d.get('uptimeSec'),(int,float)) and d['uptimeSec']+2<base_uptime:raise RuntimeError(f'device reboot evidence {base_uptime!r}->{d["uptimeSec"]!r}')
        if d['automationFault']=='st' and d['finalRelayOn'] is False and s.get('output') is False:stale=snap
        time.sleep(POLL_SEC)
    if stale is None:raise RuntimeError('stale/OFF not observed')
    if samples<15 or max_gap>25:raise RuntimeError(f'insufficient continuous silence coverage samples={samples} maxGap={max_gap}')
    result['staleFailOff']=stale
    result['silenceEvidence']={'durationSec':window,'samples':samples,'maxObservedSampleGapSec':max_gap,'scannerRunningThroughout':True,'scannerStartMarkerBefore':base_sa,'scannerStartMarkerAfter':result['timeline'][-1]['runtime'].get('sa'),'sensorFrameMarkerAtIsolation':loss_l,'sensorFrameMarkerAfterSilence':result['timeline'][-1]['runtime'].get('l'),'crossedLegacy90sThreshold':window>90,'noScannerRestartFromSensorSilence':True}

    set_addr(original); isolated=False
    recovery=None; deadline=time.monotonic()+120
    while time.monotonic()<deadline:
        snap=sample('sensor-restored',start); result['timeline'].append(snap); d=snap['diag']; r=snap['runtime']; s=snap['switch']
        if r.get('a')!=original:raise RuntimeError(f'address restore lost {r!r}')
        if r.get('sc') is not True or r.get('sa')!=base_sa:raise RuntimeError(f'scanner changed during recovery {r!r}')
        if d['safetyLockout'] is not False:raise RuntimeError(f'safety lockout recovery {d!r}')
        age=r.get('n')-r.get('l') if isinstance(r.get('n'),(int,float)) and isinstance(r.get('l'),(int,float)) and r.get('l') else None
        fresh=isinstance(r.get('l'),(int,float)) and isinstance(loss_l,(int,float)) and r.get('l')>loss_l
        if fresh and age is not None and 0<=age<30000 and d['mode']=='auto' and d['automationFault'] is None and d['temperatureC'] is not None and d['humidityPct'] is not None and s.get('output')==d['finalRelayOn']:
            recovery=snap; recovery['sensorAgeMs']=age; break
        time.sleep(POLL_SEC)
    if recovery is None:raise RuntimeError('fresh BLE/AUTO recovery not observed')
    result['recovery']=recovery
    post=sample('postflight',start); result['timeline'].append(post)
    if hashlib.sha256(source().encode()).hexdigest()!=EXPECTED_SHA:raise RuntimeError('candidate source changed during gate')
    result['postflight']=post; result['accepted']=True
    print('PR89_GATE_RESULT '+json.dumps(result,indent=2,sort_keys=True),flush=True)
finally:
    if isolated and original:
        try:
            set_addr(original)
            print('PR89_CLEANUP address_restored',flush=True)
        except Exception as exc:
            print('PR89_CLEANUP address_restore_failed '+repr(exc),flush=True)
            try:post_idempotent('Switch.Set',{'id':0,'on':False})
            except Exception as off_exc:print('PR89_CLEANUP relay_off_failed '+repr(off_exc),flush=True)
