import json, subprocess, time
BASE='http://192.168.0.10'; IFACE='en0'; SCRIPT_ID=1; EXPECTED_ID='shellyplugsg3-e4b063d7f530'

def rpc(method, params=None, post=False, attempts=8):
    last=None
    for i in range(attempts):
        if post:
            body=json.dumps(params or {},separators=(',',':'))
            cmd=['curl','-sS','--interface',IFACE,'--connect-timeout','2','--max-time','8','-X','POST','-H','Content-Type: application/json','--data-binary',body,f'{BASE}/rpc/{method}']
        else:
            cmd=['curl','-sS','--interface',IFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
            for k,v in (params or {}).items(): cmd += ['--data-urlencode',f'{k}={v}']
        p=subprocess.run(cmd,capture_output=True,text=True)
        if p.returncode==0:
            try:
                out=json.loads(p.stdout)
                if not (isinstance(out,dict) and isinstance(out.get('code'),(int,float)) and out['code']<0): return out
                last=out
            except Exception as exc:last=repr(exc)
        else:last=p.stderr.strip()
        if post: break
        if i+1<attempts: time.sleep(1)
    raise RuntimeError(f'{method} failed: {last!r}')

def eval_read(code):
    out=rpc('Script.Eval',{'id':SCRIPT_ID,'code':code}); return out.get('result')

def eval_post(code):
    out=rpc('Script.Eval',{'id':SCRIPT_ID,'code':code},post=True,attempts=1); return out.get('result')

def state():
    raw=eval_read('JSON.stringify({sa:R.sa,l:R.l,n:nw(),sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),af:R.af,a:R.a})')
    if not isinstance(raw,str): raise RuntimeError(raw)
    s=json.loads(raw); st=rpc('Script.GetStatus',{'id':SCRIPT_ID}); sw=rpc('Switch.GetStatus',{'id':0})
    return {'runtime':s,'script':{'running':st.get('running'),'error_msg':st.get('error_msg'),'errors':st.get('errors')},'switch':{'output':sw.get('output'),'apower':sw.get('apower'),'current':sw.get('current')}}

info=rpc('Shelly.GetDeviceInfo')
if info.get('id')!=EXPECTED_ID: raise RuntimeError(info)
pre=state()
if pre['runtime']['sc'] is not True or pre['script']['running'] is not True: raise RuntimeError(f'preflight unhealthy {pre!r}')
pre_sa=pre['runtime']['sa']; pre_l=pre['runtime']['l']
stop=eval_post('(BLE.Scanner.stop||BLE.Scanner.Stop).call(BLE.Scanner);JSON.stringify({sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),sa:R.sa,l:R.l})')
print('STOP_RESULT',stop,flush=True)
# Readback resolves ambiguous mutation outcome.
time.sleep(1)
after_stop=state()
if after_stop['runtime']['sc'] is not False: raise RuntimeError(f'scanner did not stop {after_stop!r}')
recovered=None; timeline=[]
deadline=time.monotonic()+75
while time.monotonic()<deadline:
    s=state(); timeline.append(s); print('SAMPLE '+json.dumps(s,separators=(',',':'),sort_keys=True),flush=True)
    r=s['runtime']
    if s['script']['running'] is not True or s['script']['error_msg'] or s['script']['errors']: raise RuntimeError(f'script unhealthy {s!r}')
    if r['sc'] is True and isinstance(r['sa'],(int,float)) and r['sa']>pre_sa:
        # Require fresh sensor frame after scanner restart.
        if isinstance(r['l'],(int,float)) and r['l']>pre_l:
            recovered=s; break
    time.sleep(3)
if recovered is None: raise RuntimeError('scanner/fresh-frame recovery not observed within 75 s')
result={'accepted':True,'identity':{'id':info.get('id'),'model':info.get('model'),'ver':info.get('ver')},'pre':pre,'afterStop':after_stop,'recovered':recovered,'samples':len(timeline),'scannerRestarted':True,'freshFrameRecovered':True}
print('STAGE9_SCANNER_RECOVERY '+json.dumps(result,indent=2,sort_keys=True),flush=True)
