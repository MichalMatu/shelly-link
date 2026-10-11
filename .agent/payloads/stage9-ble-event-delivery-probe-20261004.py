import json,subprocess,time
BASE='http://192.168.0.10';IFACE='en0';SCRIPT_ID=1;EXPECTED='shellyplugsg3-e4b063d7f530'
def call(method,params=None,post=False,attempts=8):
 last=None
 for i in range(attempts):
  if post:
   body=json.dumps(params or {},separators=(',',':'));cmd=['curl','-sS','--interface',IFACE,'--connect-timeout','2','--max-time','8','-X','POST','-H','Content-Type: application/json','--data-binary',body,f'{BASE}/rpc/{method}']
  else:
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
  if post:break
  if i+1<attempts:time.sleep(1)
 raise RuntimeError(f'{method}: {last!r}')
def ev(code,post=False):
 o=call('Script.Eval',{'id':1,'code':code},post=post,attempts=1 if post else 8);return o.get('result')
info=call('Shelly.GetDeviceInfo');
if info.get('id')!=EXPECTED:raise RuntimeError(info)
base=ev('JSON.stringify({sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),a:C.a,l:R.l,sa:R.sa})')
print('BASE',base,flush=True)
code='globalThis.__slp={all:0,target:0,last:null};BLE.Scanner.subscribe(function(e,x){if(e==BLE.Scanner.SCAN_RESULT&&x){__slp.all++;__slp.last=x.addr;var z=String(x.addr).toUpperCase().replace(/[:-]/g,\"\");if(z==C.a)__slp.target++;}});JSON.stringify(__slp)'
print('SUB',ev(code,post=True),flush=True)
for i in range(7):
 time.sleep(5)
 s=ev('JSON.stringify({p:globalThis.__slp,sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),l:R.l,sa:R.sa,af:R.af})')
 print('PROBE',s,flush=True)
print('RESULT',ev('JSON.stringify({p:globalThis.__slp,sc:(BLE.Scanner.isRunning?BLE.Scanner.isRunning():(BLE.Scanner.IsRunning?BLE.Scanner.IsRunning():null)),l:R.l,sa:R.sa,af:R.af,a:C.a})'),flush=True)
