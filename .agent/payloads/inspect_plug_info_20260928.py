import os,re,subprocess,time,xml.etree.ElementTree as ET
sdk=os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_HOME') or os.path.expanduser('~/Library/Android/sdk')
adb=os.path.join(sdk,'platform-tools','adb')
serial=[l.split()[0] for l in subprocess.check_output([adb,'devices'],text=True).splitlines()[1:] if len(l.split())>=2 and l.split()[1]=='device'][0]
def run(*a,check=True): return subprocess.run([adb,'-s',serial,*a],check=check,text=True,capture_output=True)
def dump(label):
 run('shell','uiautomator','dump','/sdcard/shelly-ui.xml',check=False)
 xml=run('shell','cat','/sdcard/shelly-ui.xml',check=False).stdout.strip(); root=ET.fromstring(xml)
 items=[]; print('=== '+label+' ===')
 for n in root.iter('node'):
  t=n.attrib.get('text','').strip(); d=n.attrib.get('content-desc','').strip(); b=n.attrib.get('bounds','')
  if t or d: items.append((t,d,b)); print(f"text={t!r} desc={d!r} bounds={b}")
 return items
def tap(item,label):
 m=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',item[2]); x1,y1,x2,y2=map(int,m.groups()); x=(x1+x2)//2; y=(y1+y2)//2
 print(f'TAP {label}: {x},{y}'); run('shell','input','tap',str(x),str(y)); time.sleep(1.2)
def find(items,pred):
 for i in items:
  if pred(i): return i
 return None
items=dump('start')
p=find(items,lambda i:i[0].lower() in ('plugs','gniazdka','wtyczki'))
if p: tap(p,'plugs')
items=dump('plugs')
d=find(items,lambda i:i[1].startswith('Details:') or i[1].startswith('Szczegóły:'))
if not d: raise SystemExit('details action not found')
tap(d,'plug-details')
items=dump('plug-detail')
info=find(items,lambda i:i[0].strip().lower()=='info' or i[1].strip().lower()=='info')
if not info: raise SystemExit('Info tab not found')
tap(info,'info-tab')
dump('plug-info')
