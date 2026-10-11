import hashlib
import json
import subprocess
import time
from typing import Any

BASE = 'http://192.168.0.10'
INTERFACE = 'en0'
EXPECTED_ID = 'shellyplugsg3-e4b063d7f530'
EXPECTED_SOURCE_SHA256 = 'eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
EXPECTED_SOURCE_BYTES = 8847
SCRIPT_ID = 1
POLL_SEC = 5
MISSING_ADDR = '000000000000'


def curl_rpc_once(method: str, params: dict[str, Any] | None = None, max_time: int = 8) -> tuple[bool, Any]:
    cmd = ['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
    for key, value in (params or {}).items():
        if isinstance(value, (dict, list)):
            encoded = json.dumps(value, separators=(',', ':'))
        elif isinstance(value, bool):
            encoded = 'true' if value else 'false'
        else:
            encoded = str(value)
        cmd += ['--data-urlencode', f'{key}={encoded}']
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        return False, p.stderr.strip()
    try:
        value = json.loads(p.stdout)
    except Exception:
        return False, f'invalid JSON: {p.stdout[:300]}'
    if isinstance(value, dict) and isinstance(value.get('code'), (int, float)) and value.get('code') < 0:
        return False, value
    return True, value


def read_rpc(method: str, params: dict[str, Any] | None = None, attempts: int = 5) -> Any:
    last = None
    for i in range(attempts):
        ok, value = curl_rpc_once(method, params)
        if ok:
            return value
        last = value
        if i + 1 < attempts:
            time.sleep(0.4)
    raise RuntimeError(f'{method} failed after read-only retries: {last!r}')


def mutate_once(method: str, params: dict[str, Any]) -> Any:
    ok, value = curl_rpc_once(method, params, max_time=10)
    if not ok:
        raise RuntimeError(f'{method} mutation failed without retry: {value!r}')
    return value


def read_path(path: str) -> Any:
    last = None
    for i in range(5):
        p = subprocess.run(['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time','8',BASE + path], capture_output=True, text=True)
        if p.returncode == 0:
            try:
                value = json.loads(p.stdout)
                if not (isinstance(value, dict) and isinstance(value.get('code'), (int,float)) and value.get('code') < 0):
                    return value
                last = value
            except Exception:
                last = p.stdout[:300]
        else:
            last = p.stderr.strip()
        if i < 4:
            time.sleep(0.4)
    raise RuntimeError(f'{path} failed: {last!r}')


def script_source() -> str:
    parts=[]; offset=0
    for _ in range(64):
        v=read_rpc('Script.GetCode', {'id':SCRIPT_ID,'offset':offset,'len':1024})
        data=v.get('data') if isinstance(v,dict) else None; left=v.get('left') if isinstance(v,dict) else None
        if not isinstance(data,str) or not isinstance(left,(int,float)):
            raise RuntimeError(f'invalid Script.GetCode: {v!r}')
        parts.append(data); offset += len(data.encode())
        if left <= 0: return ''.join(parts)
        if not data: raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def diag_state() -> dict[str, Any]:
    d=read_path(f'/script/{SCRIPT_ID}/diag'); g=d.get('g'); q=d.get('q'); p=d.get('p'); y=d.get('y')
    if not isinstance(g,list) or len(g)<24 or not isinstance(q,list) or len(q)<6:
        raise RuntimeError(f'invalid diag: {d!r}')
    return {
        'uptimeSec': y[2] if isinstance(y,list) and len(y)>2 else None,
        'runtimeRelayOn': g[5], 'reason': g[6], 'mode': 'manual' if g[17] else 'auto',
        'automationRequestOn': g[18], 'automationFault': g[21], 'safetyLockout': g[22], 'safetyReason': g[23],
        'temperatureC': g[1], 'humidityPct': g[2], 'staleTimeoutSec': q[4], 'finalRelayOn': p[0] if isinstance(p,list) and p else None,
    }


def switch_state() -> dict[str, Any]:
    s=read_rpc('Switch.GetStatus', {'id':0})
    return {k:s.get(k) for k in ('output','apower','current','voltage')} if isinstance(s,dict) else {'raw':s}


def eval_once(code: str) -> Any:
    v=mutate_once('Script.Eval', {'id':SCRIPT_ID,'code':code})
    if not isinstance(v,dict): raise RuntimeError(f'invalid Script.Eval response: {v!r}')
    return v.get('result')


started=time.monotonic(); result:dict[str,Any]={'timeline':[]}; address_changed=False
info=read_rpc('Shelly.GetDeviceInfo')
if info.get('id') != EXPECTED_ID: raise RuntimeError(f'identity mismatch: {info!r}')
source=script_source(); source_sha=hashlib.sha256(source.encode()).hexdigest(); source_bytes=len(source.encode())
if source_sha != EXPECTED_SOURCE_SHA256 or source_bytes != EXPECTED_SOURCE_BYTES:
    raise RuntimeError(f'source fingerprint changed: {source_bytes} {source_sha}')
scripts=read_rpc('Script.List'); entries=scripts.get('scripts') if isinstance(scripts,dict) else None
if not isinstance(entries,list) or len(entries)!=1 or entries[0].get('id')!=SCRIPT_ID or entries[0].get('running') is not True:
    raise RuntimeError(f'managed script not healthy: {entries!r}')
pre=diag_state(); pre_switch=switch_state()
if pre['mode']!='auto' or pre['automationFault'] is not None or pre['safetyLockout'] is not False:
    raise RuntimeError(f'preflight not healthy AUTO: {pre!r}')
if not isinstance(pre['staleTimeoutSec'],(int,float)) or not (30 <= pre['staleTimeoutSec'] <= 600):
    raise RuntimeError(f'unexpected stale timeout: {pre!r}')

config_json=eval_once('JSON.stringify({a:C.a,ss:C.ss})')
if not isinstance(config_json,str): raise RuntimeError(f'cannot read runtime sensor config: {config_json!r}')
config=json.loads(config_json); original_addr=config.get('a'); sensors=config.get('ss')
if sensors is not None: raise RuntimeError(f'probe currently supports single-sensor runtime only: {config!r}')
if not isinstance(original_addr,str) or not original_addr or original_addr==MISSING_ADDR:
    raise RuntimeError(f'invalid original sensor address: {original_addr!r}')

result.update({'identity':info,'sourceBytes':source_bytes,'sourceSha256':source_sha,'preflight':pre,'preflightSwitch':pre_switch,'originalSensorAddress':original_addr})

try:
    changed=eval_once(f'C.a={json.dumps(MISSING_ADDR)};C.a')
    if changed != MISSING_ADDR: raise RuntimeError(f'sensor-address isolation not confirmed: {changed!r}')
    address_changed=True
    stale_deadline=time.monotonic()+float(pre['staleTimeoutSec'])+75
    stale=None
    while time.monotonic()<stale_deadline:
        d=diag_state(); s=switch_state(); snap={'phase':'sensor-missing','elapsedSec':round(time.monotonic()-started,1),'diag':d,'switch':s}; result['timeline'].append(snap)
        if d['safetyLockout'] is not False: raise RuntimeError(f'hard safety appeared: {d!r}')
        if d['automationFault']=='st' and d['finalRelayOn'] is False and s.get('output') is False:
            stale=snap; break
        time.sleep(POLL_SEC)
    if stale is None: raise RuntimeError(f'stale fail-OFF not observed: {result["timeline"][-6:]!r}')
    result['staleFailOff']=stale

    restored=eval_once(f'C.a={json.dumps(original_addr)};C.a')
    if restored != original_addr: raise RuntimeError(f'sensor address restore not confirmed: {restored!r}')
    address_changed=False

    recovery_deadline=time.monotonic()+90
    recovery=None
    while time.monotonic()<recovery_deadline:
        d=diag_state(); s=switch_state(); snap={'phase':'sensor-restored','elapsedSec':round(time.monotonic()-started,1),'diag':d,'switch':s}; result['timeline'].append(snap)
        if d['safetyLockout'] is not False: raise RuntimeError(f'hard safety appeared during recovery: {d!r}')
        if d['automationFault'] is None and d['mode']=='auto' and d['temperatureC'] is not None and d['humidityPct'] is not None and s.get('output')==d['finalRelayOn']:
            recovery=snap; break
        time.sleep(POLL_SEC)
    if recovery is None: raise RuntimeError(f'fresh sensor AUTO recovery not observed: {result["timeline"][-8:]!r}')
    result['recovery']=recovery

    post_source=script_source(); post_sha=hashlib.sha256(post_source.encode()).hexdigest()
    if post_sha!=EXPECTED_SOURCE_SHA256 or len(post_source.encode())!=EXPECTED_SOURCE_BYTES:
        raise RuntimeError('script source changed during probe')
    post_info=read_rpc('Shelly.GetDeviceInfo')
    if post_info.get('id')!=EXPECTED_ID: raise RuntimeError(f'post identity mismatch: {post_info!r}')
    post_scripts=read_rpc('Script.List'); post_entries=post_scripts.get('scripts') if isinstance(post_scripts,dict) else None
    if not isinstance(post_entries,list) or len(post_entries)!=1 or post_entries[0].get('running') is not True:
        raise RuntimeError(f'script not running postflight: {post_entries!r}')
    result['postflight']=diag_state(); result['postflightSwitch']=switch_state(); result['accepted']=True
finally:
    if address_changed:
        try:
            eval_once(f'C.a={json.dumps(original_addr)};C.a')
            address_changed=False
        except Exception as exc:
            result['addressRestoreError']=repr(exc)
    if address_changed:
        try:
            mutate_once('Switch.Set', {'id':0,'on':False})
        except Exception as exc:
            result['cleanupRelayOffError']=repr(exc)
        try:
            mutate_once('Script.Stop', {'id':SCRIPT_ID})
        except Exception as exc:
            result['cleanupStopError']=repr(exc)
        try:
            mutate_once('Script.Start', {'id':SCRIPT_ID})
        except Exception as exc:
            result['cleanupStartError']=repr(exc)

print(json.dumps(result,indent=2,sort_keys=True))
