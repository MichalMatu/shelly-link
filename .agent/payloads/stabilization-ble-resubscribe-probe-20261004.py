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
SCRIPT_ID=1


def once(method: str, params: dict[str, Any] | None = None, max_time: int = 10):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
    for k,v in (params or {}).items():
        if isinstance(v,(dict,list)):
            s=json.dumps(v,separators=(',',':'))
        elif isinstance(v,bool):
            s='true' if v else 'false'
        else:
            s=str(v)
        cmd += ['--data-urlencode',f'{k}={s}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode != 0:
        return False,p.stderr.strip()
    try:
        value=json.loads(p.stdout)
    except Exception:
        return False,f'invalid JSON: {p.stdout[:240]}'
    if isinstance(value,dict) and isinstance(value.get('code'),(int,float)) and value.get('code')<0:
        return False,value
    return True,value


def read(method: str, params: dict[str, Any] | None = None, attempts: int = 5):
    last=None
    for i in range(attempts):
        ok,value=once(method,params,6)
        if ok:
            return value
        last=value
        if i+1<attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{method} read failed: {last!r}')


def path(pathname: str, attempts: int = 5):
    last=None
    for i in range(attempts):
        p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','6',BASE+pathname],capture_output=True,text=True)
        if p.returncode==0:
            try:
                v=json.loads(p.stdout)
                if not (isinstance(v,dict) and isinstance(v.get('code'),(int,float)) and v.get('code')<0):
                    return v
                last=v
            except Exception:
                last=f'invalid JSON: {p.stdout[:240]}'
        else:
            last=p.stderr.strip()
        if i+1<attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{pathname} read failed: {last!r}')


def source():
    parts=[]; offset=0
    for _ in range(64):
        v=read('Script.GetCode',{'id':SCRIPT_ID,'offset':offset,'len':1024})
        d=v.get('data'); left=v.get('left')
        if not isinstance(d,str) or not isinstance(left,(int,float)):
            raise RuntimeError(f'invalid Script.GetCode: {v!r}')
        parts.append(d); offset += len(d.encode('utf-8'))
        if left<=0: return ''.join(parts)
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def diag():
    v=path(f'/script/{SCRIPT_ID}/diag')
    g=v.get('g') if isinstance(v,dict) else None
    p=v.get('p') if isinstance(v,dict) else None
    if not isinstance(g,list) or len(g)<24:
        raise RuntimeError(f'invalid diag.g: {g!r}')
    return {
        'mode':'manual' if g[17] else 'auto',
        'automationRequestOn':g[18],
        'automationFault':g[21],
        'safetyLockout':g[22],
        'safetyReason':g[23],
        'runtimeRelayOn':g[5],
        'reason':g[6],
        'temperatureC':g[1],
        'humidityPct':g[2],
        'finalRelayOn':p[0] if isinstance(p,list) and p else None,
    }


def eval_once(code: str):
    ok,v=once('Script.Eval',{'id':SCRIPT_ID,'code':code})
    if not ok:
        raise RuntimeError(f'Script.Eval failed without retry for {code!r}: {v!r}')
    return v


def wait_fresh(seconds: int):
    deadline=time.monotonic()+seconds
    timeline=[]
    while time.monotonic()<deadline:
        d=diag(); sw=read('Switch.GetStatus',{'id':0})
        item={'diag':d,'switch':{'output':sw.get('output'),'apower':sw.get('apower'),'current':sw.get('current'),'voltage':sw.get('voltage')}}
        timeline.append(item)
        if d['safetyLockout'] is not False:
            raise RuntimeError(f'hard safety appeared: {d!r}')
        if d['mode']=='auto' and d['automationFault'] is None and sw.get('output')==d['finalRelayOn']:
            return item,timeline
        time.sleep(3)
    return None,timeline

info=read('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID:
    raise RuntimeError(f'identity mismatch: {info!r}')
ble=read('BLE.GetConfig')
if ble != {'enable':True,'rpc':{'enable':True}}:
    raise RuntimeError(f'BLE config not canonical: {ble!r}')
scripts=read('Script.List'); entries=scripts.get('scripts') if isinstance(scripts,dict) else None
if not isinstance(entries,list) or len(entries)!=1 or entries[0].get('id')!=SCRIPT_ID or entries[0].get('running') is not True:
    raise RuntimeError(f'managed script not healthy: {entries!r}')
src=source(); sha=hashlib.sha256(src.encode('utf-8')).hexdigest()
if len(src.encode('utf-8'))!=EXPECTED_SOURCE_BYTES or sha!=EXPECTED_SOURCE_SHA256:
    raise RuntimeError(f'source fingerprint changed: {len(src.encode("utf-8"))} B {sha}')
pre=diag(); sw=read('Switch.GetStatus',{'id':0})
if pre['mode']!='auto' or pre['automationFault'] is not None or pre['safetyLockout'] is not False or sw.get('output') is not False:
    raise RuntimeError(f'probe requires healthy AUTO with relay OFF: diag={pre!r} switch={sw!r}')

result={'identity':{'id':info.get('id'),'fw_id':info.get('fw_id'),'ver':info.get('ver')},'preflight':pre,'bleBackup':ble}
ble_restored=False
fallback_used=False
try:
    ok_disable,disable_response=once('BLE.SetConfig',{'config':{'enable':False}})
    result['disableResponse']=disable_response
    disabled=read('BLE.GetConfig'); result['bleAfterDisable']=disabled
    if disabled.get('enable') is not False:
        raise RuntimeError(f'BLE disable not observed: {disabled!r}')
    if isinstance(disable_response,dict) and disable_response.get('restart_required') is True:
        raise RuntimeError('BLE disable unexpectedly requires restart')
    time.sleep(2)

    ok_restore,restore_response=once('BLE.SetConfig',{'config':ble})
    result['restoreResponse']=restore_response
    restored=read('BLE.GetConfig'); result['bleAfterRestore']=restored
    if restored!=ble:
        raise RuntimeError(f'BLE restore readback mismatch: {restored!r}')
    ble_restored=True
    if isinstance(restore_response,dict) and restore_response.get('restart_required') is True:
        raise RuntimeError('BLE restore unexpectedly requires restart')

    result['runningImmediatelyAfterToggle']=eval_once('BLE.Scanner.isRunning()')
    result['plainBs']=eval_once('bs();BLE.Scanner.isRunning()')
    time.sleep(2)
    result['diagAfterPlainBs']=diag()

    result['resubscribeBs']=eval_once('BLE.Scanner.subscribe(function(e,x){ev(e,x)});bs();BLE.Scanner.isRunning()')
    repaired,timeline=wait_fresh(60)
    result['resubscribeTimelineTail']=timeline[-8:]
    result['resubscribeRecovered']=repaired is not None
    if repaired is not None:
        result['recovery']=repaired
    else:
        fallback_used=True
        ok_stop,stop_response=once('Script.Stop',{'id':SCRIPT_ID})
        if not ok_stop:
            raise RuntimeError(f'fallback Script.Stop failed without retry: {stop_response!r}')
        result['fallbackStopResponse']=stop_response
        if read('Switch.GetStatus',{'id':0}).get('output') is not False:
            raise RuntimeError('relay was not OFF before fallback Script.Start')
        ok_start,start_response=once('Script.Start',{'id':SCRIPT_ID})
        if not ok_start:
            raise RuntimeError(f'fallback Script.Start failed without retry: {start_response!r}')
        result['fallbackStartResponse']=start_response
        repaired2,timeline2=wait_fresh(90)
        result['fallbackTimelineTail']=timeline2[-8:]
        if repaired2 is None:
            raise RuntimeError('fallback script restart did not restore fresh BLE')
        result['recovery']=repaired2

    post_src=source(); post_sha=hashlib.sha256(post_src.encode('utf-8')).hexdigest()
    if len(post_src.encode('utf-8'))!=EXPECTED_SOURCE_BYTES or post_sha!=EXPECTED_SOURCE_SHA256:
        raise RuntimeError('source changed during probe')
    if read('BLE.GetConfig')!=ble:
        raise RuntimeError('BLE config changed during probe')
    sched=read('Schedule.List')
    if sched.get('jobs') not in ([],None):
        raise RuntimeError(f'schedules changed: {sched!r}')
    result['fallbackUsed']=fallback_used
    result['sourceBytes']=EXPECTED_SOURCE_BYTES
    result['sourceSha256']=post_sha
    result['scheduleCount']=len(sched.get('jobs') or [])
    result['accepted']=True
finally:
    if not ble_restored:
        cleanup_ok,cleanup_response=once('BLE.SetConfig',{'config':ble})
        result['cleanupRestoreResponse']=cleanup_response
        try:
            result['cleanupBleReadback']=read('BLE.GetConfig')
        except Exception as exc:
            result['cleanupReadbackError']=repr(exc)

print(json.dumps(result,indent=2,sort_keys=True))
