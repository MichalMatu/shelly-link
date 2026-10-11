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


def once(method: str, params: dict[str, Any] | None = None, connect_timeout: int = 8, max_time: int = 20):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout',str(connect_timeout),'--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
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
        ok,value=once(method,params,3,8)
        if ok:
            return value
        last=value
        if i+1<attempts:
            time.sleep(0.5)
    raise RuntimeError(f'{method} read failed: {last!r}')


def path(pathname: str, attempts: int = 5):
    last=None
    for i in range(attempts):
        p=subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','3','--max-time','8',BASE+pathname],capture_output=True,text=True)
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
            time.sleep(0.5)
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


def snap(label: str):
    d=diag(); sw=read('Switch.GetStatus',{'id':0})
    return {'label':label,'diag':d,'switch':{'output':sw.get('output'),'apower':sw.get('apower'),'current':sw.get('current'),'voltage':sw.get('voltage')}}


def poll_fresh(seconds: int, label: str):
    deadline=time.monotonic()+seconds
    tl=[]
    while time.monotonic()<deadline:
        s=snap(label); tl.append(s); d=s['diag']
        if d['safetyLockout'] is not False:
            raise RuntimeError(f'hard safety appeared: {d!r}')
        if d['mode']=='auto' and d['automationFault'] is None and s['switch']['output']==d['finalRelayOn']:
            return s,tl
        time.sleep(3)
    return None,tl

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
pre=snap('preflight')
if pre['diag']['mode']!='auto' or pre['diag']['automationFault'] is not None or pre['diag']['safetyLockout'] is not False:
    raise RuntimeError(f'preflight not healthy AUTO: {pre!r}')

result={'identity':{'id':info.get('id'),'fw_id':info.get('fw_id'),'ver':info.get('ver')},'bleBackup':ble,'preflight':pre,'disabledTimeline':[]}
ble_restored=False
try:
    ok_disable,disable_resp=once('BLE.SetConfig',{'config':{'enable':False}})
    result['disableResponse']=disable_resp
    disabled=read('BLE.GetConfig'); result['bleAfterDisable']=disabled
    if disabled.get('enable') is not False:
        raise RuntimeError(f'BLE disable not observed: {disabled!r}')
    if isinstance(disable_resp,dict) and disable_resp.get('restart_required') is True:
        raise RuntimeError('BLE disable unexpectedly requires restart')

    end=time.monotonic()+135
    stale_seen=None
    while time.monotonic()<end:
        s=snap('ble-disabled'); result['disabledTimeline'].append(s)
        if s['diag']['safetyLockout'] is not False:
            raise RuntimeError(f'hard safety appeared during long BLE loss: {s!r}')
        if s['diag']['automationFault'] in ('st','bf') and s['switch']['output'] is False:
            stale_seen=s
        time.sleep(10)
    if stale_seen is None:
        raise RuntimeError(f'long BLE loss never reached safe fault/OFF: tail={result["disabledTimeline"][-6:]!r}')
    result['safeLossState']=stale_seen

    ok_restore,restore_resp=once('BLE.SetConfig',{'config':ble})
    result['restoreResponse']=restore_resp
    restored=read('BLE.GetConfig'); result['bleAfterRestore']=restored
    if restored!=ble:
        raise RuntimeError(f'BLE restore readback mismatch: {restored!r}')
    ble_restored=True
    if isinstance(restore_resp,dict) and restore_resp.get('restart_required') is True:
        raise RuntimeError('BLE restore unexpectedly requires restart')
    time.sleep(5)

    ok_running,running_resp=once('Script.Eval',{'id':SCRIPT_ID,'code':'BLE.Scanner.isRunning()'})
    result['isRunningAfterRestore']={'ok':ok_running,'response':running_resp}

    ok_plain,plain_resp=once('Script.Eval',{'id':SCRIPT_ID,'code':'bs();BLE.Scanner.isRunning()'},10,25)
    result['plainBsEval']={'ok':ok_plain,'response':plain_resp}
    plain_recovery,plain_tl=poll_fresh(30,'after-plain-bs')
    result['plainBsTimelineTail']=plain_tl[-8:]
    result['plainBsRecovered']=plain_recovery is not None

    resub_recovery=None
    if plain_recovery is None:
        ok_resub,resub_resp=once('Script.Eval',{'id':SCRIPT_ID,'code':'BLE.Scanner.subscribe(function(e,x){ev(e,x)});bs();BLE.Scanner.isRunning()'},10,25)
        result['resubscribeBsEval']={'ok':ok_resub,'response':resub_resp}
        resub_recovery,resub_tl=poll_fresh(45,'after-resubscribe-bs')
        result['resubscribeTimelineTail']=resub_tl[-8:]
        result['resubscribeRecovered']=resub_recovery is not None

    recovered=plain_recovery or resub_recovery
    if recovered is None:
        sw_now=read('Switch.GetStatus',{'id':0})
        if sw_now.get('output') is not False:
            raise RuntimeError(f'fallback requires safe OFF after scanner failure: {sw_now!r}')
        ok_stop,stop_resp=once('Script.Stop',{'id':SCRIPT_ID})
        if not ok_stop: raise RuntimeError(f'fallback Script.Stop failed: {stop_resp!r}')
        ok_start,start_resp=once('Script.Start',{'id':SCRIPT_ID})
        if not ok_start: raise RuntimeError(f'fallback Script.Start failed: {start_resp!r}')
        result['fallbackStopResponse']=stop_resp; result['fallbackStartResponse']=start_resp
        recovered,fb_tl=poll_fresh(90,'fallback-script-restart')
        result['fallbackTimelineTail']=fb_tl[-8:]
        result['fallbackUsed']=True
        if recovered is None:
            raise RuntimeError('fallback script restart failed to restore fresh BLE')
    else:
        result['fallbackUsed']=False
    result['recovery']=recovered

    post_src=source(); post_sha=hashlib.sha256(post_src.encode('utf-8')).hexdigest()
    if len(post_src.encode('utf-8'))!=EXPECTED_SOURCE_BYTES or post_sha!=EXPECTED_SOURCE_SHA256:
        raise RuntimeError('source changed during long-loss probe')
    if read('BLE.GetConfig')!=ble:
        raise RuntimeError('BLE config drifted during probe')
    sched=read('Schedule.List')
    if sched.get('jobs') not in ([],None):
        raise RuntimeError(f'schedules changed: {sched!r}')
    result['sourceBytes']=EXPECTED_SOURCE_BYTES; result['sourceSha256']=post_sha
    result['scheduleCount']=len(sched.get('jobs') or [])
    result['accepted']=True
finally:
    if not ble_restored:
        ok_cleanup,cleanup_resp=once('BLE.SetConfig',{'config':ble})
        result['cleanupRestoreResponse']=cleanup_resp
        try: result['cleanupBleReadback']=read('BLE.GetConfig')
        except Exception as exc: result['cleanupReadbackError']=repr(exc)

print(json.dumps(result,indent=2,sort_keys=True))
