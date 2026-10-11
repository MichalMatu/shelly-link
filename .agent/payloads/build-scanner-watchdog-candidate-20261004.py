from pathlib import Path
import hashlib
import json

OLD = '''var bt=BLE.Scanner.stop||BLE.Scanner.Stop;\nfunction bs(){if(bt)bt.call(BLE.Scanner);R.sa=nw();var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bw(){if(R.sa&&nw()-(R.l||R.sa)>9e4)bs();}'''
NEW = '''function br(){if(BLE.Scanner.isRunning)return BLE.Scanner.isRunning();if(BLE.Scanner.IsRunning)return BLE.Scanner.IsRunning();return null}\nfunction bs(){R.sa=nw();if(br()===true)return;var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bw(){if(br()===false)bs();}'''

old_path = Path('/tmp/climate-old-source.js')
new_path = Path('/tmp/climate-new-source.js')
source = old_path.read_text()
if source.count(OLD) != 1:
    raise RuntimeError(f'expected exactly one old watchdog block, found {source.count(OLD)}')
if 'BLE.Scanner.isRunning' in source:
    raise RuntimeError('installed source already contains scanner-liveness watchdog')
candidate = source.replace(OLD, NEW)
if candidate.count(NEW) != 1:
    raise RuntimeError('candidate does not contain exactly one new watchdog block')
if 'nw()-(R.l||R.sa)>9e4' in candidate:
    raise RuntimeError('candidate still contains target-silence scanner restart logic')
if candidate.replace(NEW, OLD) != source:
    raise RuntimeError('candidate differs from installed source outside watchdog substitution')
new_path.write_text(candidate)
sha = lambda value: hashlib.sha256(value.encode()).hexdigest()
print(json.dumps({
    'oldBytes': len(source.encode()),
    'oldSha256': sha(source),
    'newBytes': len(candidate.encode()),
    'newSha256': sha(candidate),
    'deltaBytes': len(candidate.encode()) - len(source.encode()),
    'replacementCount': 1,
    'onlyWatchdogBlockChanged': True,
    'newHasScannerLiveness': 'BLE.Scanner.isRunning' in candidate,
    'newHasSensorSilenceRestart': 'nw()-(R.l||R.sa)>9e4' in candidate,
}, indent=2, sort_keys=True))
