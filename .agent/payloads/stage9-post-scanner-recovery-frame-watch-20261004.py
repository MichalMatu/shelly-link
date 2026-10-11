import json,subprocess,time
BASE='http://192.168.0.10';IFACE='en0';SCRIPT_ID=1;EXPECTED='shellyplugsg3-e4b063d7f530'
def rpc(method,params=None,attempts=8):
 last=None
 for i in range(attempts):
  cmd=['curl','-sS','--interface',IFACE,'--connect-timeout','2','--max-time','8','-G',f'{BASE}/rpc/{method}']
  for k,v in (params or {}).items():cmd+=['--data-urlencode',f'{k}={v}']
  p=subprocess.run(cmd,capture_output=True,text=True)
  if p.returncode==0:
   try:
    o=json.loads(p.stdout)
    if not(isinstance(o,dict) and isinstance(o.get('code'),(int,float)) and o['code']<0):return o
    last=o
   except Exception as e:last=repr(e)
  else:last=p.stderr.strip()
  if i+1<attempts:time.sleep(1)
 raise RuntimeError(f'{method}: {last!r}')
def state():
 raw=rpc('Script.Eval',{'id':1,'code':'JSON.stringify({sa:R.sa,l:R.l,n:nw(),sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),af:R.af,a:R.a})'}).get('result')
 s=json.loads(raw); st=rpc('Script.GetStatus',{'id':1}); sw=rpc('Switch.GetStatus',{'id':0});return {'runtime':s,'script':{'running':st.get('running'),'error_msg':st.get('error_msg'),'errors':st.get('errors')},'switch':{'output':sw.get('output'),'apower':sw.get('apower'),'current':sw.get('current')}}
info=rpc('Shelly.GetDeviceInfo');
if info.get('id')!=EXPECTED:raise RuntimeError(info)
pre=state();base_l=pre['runtime']['l'];base_sa=pre['runtime']['sa']
if pre['runtime']['sc'] is not True or pre['script']['running'] is not True:raise RuntimeError(pre)
print('BASE '+json.dumps(pre,separators=(',',':'),sort_keys=True),flush=True)
recovered=None;timeline=[];deadline=time.monotonic()+210
while time.monotonic()<deadline:
 s=state();timeline.append(s);print('WATCH '+json.dumps(s,separators=(',',':'),sort_keys=True),flush=True)
 if s['runtime']['sc'] is not True:raise RuntimeError(f'scanner regressed {s!r}')
 if s['script']['running'] is not True or s['script']['error_msg'] or s['script']['errors']:raise RuntimeError(f'script unhealthy {s!r}')
 if isinstance(s['runtime']['l'],(int,float)) and isinstance(base_l,(int,float)) and s['runtime']['l']>base_l:
  recovered=s;break
 time.sleep(10)
if recovered is None:raise RuntimeError('no fresh target BLE frame within 210s after confirmed scanner recovery')
print('STAGE9_FRAME_RECOVERY '+json.dumps({'accepted':True,'identity':{'id':info.get('id'),'model':info.get('model'),'ver':info.get('ver')},'scannerStartMarker':base_sa,'startFrameMarker':base_l,'recovered':recovered,'samples':len(timeline)},indent=2,sort_keys=True),flush=True)
