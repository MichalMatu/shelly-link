import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

BASE='http://192.168.0.10'
INTERFACE='en0'
EXPECTED_ID='shellyplugsg3-e4b063d7f530'
EXPECTED_OLD_SHA='eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6'
SCRIPT_ID=1
CHUNK_BYTES=900


def rpc_once(method:str, params:dict[str,Any]|None=None, max_time:int=10):
    cmd=['curl','-sS','--interface',INTERFACE,'--connect-timeout','2','--max-time',str(max_time),'-G',f'{BASE}/rpc/{method}']
    for key,value in (params or {}).items():
        if isinstance(value,(dict,list)):
            encoded=json.dumps(value,separators=(',',':'))
        elif isinstance(value,bool):
            encoded='true' if value else 'false'
        else:
            encoded=str(value)
        cmd += ['--data-urlencode',f'{key}={encoded}']
    p=subprocess.run(cmd,capture_output=True,text=True)
    if p.returncode!=0:
        return False,p.stderr.strip()
    try: out=json.loads(p.stdout)
    except Exception: return False,f'invalid JSON: {p.stdout[:300]}'
    if isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0:
        return False,out
    return True,out


def read_rpc(method:str, params:dict[str,Any]|None=None, attempts:int=5):
    last=None
    for i in range(attempts):
        ok,out=rpc_once(method,params)
        if ok:return out
        last=out
        if i+1<attempts:time.sleep(.4)
    raise RuntimeError(f'{method} read failed: {last!r}')


def mutate_once(method:str, params:dict[str,Any]|None=None):
    ok,out=rpc_once(method,params,12)
    if not ok:raise RuntimeError(f'{method} mutation failed without retry: {out!r}')
    return out


def read_source():
    parts=[]; off=0
    for _ in range(64):
        v=read_rpc('Script.GetCode',{'id':SCRIPT_ID,'offset':off,'len':1024})
        data=v.get('data') if isinstance(v,dict) else None
        left=v.get('left') if isinstance(v,dict) else None
        if not isinstance(data,str) or not isinstance(left,(int,float)):
            raise RuntimeError(f'invalid Script.GetCode: {v!r}')
        parts.append(data); off+=len(data.encode())
        if left<=0:return ''.join(parts)
        if not data:raise RuntimeError('Script.GetCode made no progress')
    raise RuntimeError('Script.GetCode exceeded chunk limit')


def chunks(value:str):
    current=''; size=0
    for char in value:
        encoded=len(char.encode())
        if current and size+encoded>CHUNK_BYTES:
            yield current; current=''; size=0
        current+=char; size+=encoded
    if current or not value:yield current


def put_code(value:str):
    for index,chunk in enumerate(chunks(value)):
        mutate_once('Script.PutCode',{'id':SCRIPT_ID,'code':chunk,'append':index>0})


def source_sha(value:str):return hashlib.sha256(value.encode()).hexdigest()


def verify_source(expected:str):
    actual=read_source()
    if actual!=expected:raise RuntimeError(f'source verification failed: {source_sha(actual)} != {source_sha(expected)}')


def prepare():
    info=read_rpc('Shelly.GetDeviceInfo')
    if info.get('id')!=EXPECTED_ID:raise RuntimeError(f'identity mismatch {info!r}')
    scripts=read_rpc('Script.List'); entries=scripts.get('scripts') if isinstance(scripts,dict) else None
    if not isinstance(entries,list) or len(entries)!=1 or entries[0].get('id')!=SCRIPT_ID or entries[0].get('running') is not True:
        raise RuntimeError(f'expected one running managed script: {entries!r}')
    old=read_source(); sha=source_sha(old)
    if sha!=EXPECTED_OLD_SHA:raise RuntimeError(f'unexpected installed source hash {sha}')
    eval_result=read_rpc('Script.Eval',{'id':SCRIPT_ID,'code':'typeof Script!="undefined"&&Script.storage&&Script.storage.getItem?Script.storage.getItem("c"):null'})
    persisted=eval_result.get('result') if isinstance(eval_result,dict) else None
    if persisted is not None and not isinstance(persisted,str):raise RuntimeError(f'invalid persisted config value {persisted!r}')
    Path('/tmp/climate-old-source.js').write_text(old)
    Path('/tmp/climate-persisted-config.txt').write_text(persisted or '')
    print(json.dumps({'identity':info,'script':entries[0],'oldBytes':len(old.encode()),'oldSha256':sha,'persistedConfig':persisted is not None},indent=2,sort_keys=True))


def deploy():
    old=Path('/tmp/climate-old-source.js').read_text()
    new=Path('/tmp/climate-new-source.js').read_text()
    if source_sha(old)!=EXPECTED_OLD_SHA:raise RuntimeError('backup source hash changed before deploy')
    if new==old:raise RuntimeError('generated fixed source is identical to old source')
    if 'BLE.Scanner.isRunning' not in new:raise RuntimeError('new source lacks scanner liveness watchdog')
    info=read_rpc('Shelly.GetDeviceInfo')
    if info.get('id')!=EXPECTED_ID:raise RuntimeError(f'identity mismatch {info!r}')
    entries=read_rpc('Script.List').get('scripts')
    if not isinstance(entries,list) or len(entries)!=1 or entries[0].get('id')!=SCRIPT_ID:
        raise RuntimeError(f'unexpected scripts {entries!r}')
    target=entries[0]; running=target.get('running') is True; enable=target.get('enable') is True
    current=read_source()
    if current!=old:raise RuntimeError(f'CAS source mismatch before deploy: {source_sha(current)}')
    mutation_started=False
    try:
        if running:
            mutate_once('Script.Stop',{'id':SCRIPT_ID}); mutation_started=True
        mutate_once('Switch.Set',{'id':0,'on':False}); mutation_started=True
        sw=read_rpc('Switch.GetStatus',{'id':0})
        if sw.get('output') is not False:raise RuntimeError(f'relay did not confirm OFF: {sw!r}')
        put_code(new)
        mutate_once('Script.SetConfig',{'id':SCRIPT_ID,'config':{'enable':enable}})
        if running:mutate_once('Script.Start',{'id':SCRIPT_ID})
        verify_source(new)
        post_entries=read_rpc('Script.List').get('scripts')
        post=next((x for x in post_entries if x.get('id')==SCRIPT_ID),None) if isinstance(post_entries,list) else None
        status=read_rpc('Script.GetStatus',{'id':SCRIPT_ID})
        if not post or post.get('enable')!=enable or post.get('running')!=running:
            raise RuntimeError(f'post script state mismatch {post!r}')
        if running and (status.get('running') is not True or status.get('error_msg') or status.get('errors')):
            raise RuntimeError(f'post Script.GetStatus unhealthy {status!r}')
        print(json.dumps({'accepted':True,'identity':info,'oldSha256':source_sha(old),'newSha256':source_sha(new),'newBytes':len(new.encode()),'script':post,'status':status,'switch':read_rpc('Switch.GetStatus',{'id':0})},indent=2,sort_keys=True))
    except Exception as error:
        rollback_error=None
        if mutation_started:
            try:
                try:mutate_once('Script.Stop',{'id':SCRIPT_ID})
                except Exception:pass
                put_code(old)
                mutate_once('Script.SetConfig',{'id':SCRIPT_ID,'config':{'enable':enable}})
                if running:mutate_once('Script.Start',{'id':SCRIPT_ID})
                verify_source(old)
            except Exception as rollback:
                rollback_error=repr(rollback)
        if rollback_error:raise RuntimeError(f'{error!r}; rollback failed: {rollback_error}')
        raise


if len(sys.argv)!=2 or sys.argv[1] not in {'prepare','deploy'}:
    raise SystemExit('usage: deploy-fixed-climate-source-20261004.py prepare|deploy')
prepare() if sys.argv[1]=='prepare' else deploy()
