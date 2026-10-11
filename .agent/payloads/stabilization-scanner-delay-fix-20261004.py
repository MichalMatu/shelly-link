from pathlib import Path

root = Path('.')
gen_path = root / 'packages/script-generator/src/shelly/generate.ts'
test_path = root / 'packages/script-generator/src/__tests__/generator.test.ts'

gen = gen_path.read_text()
old = '''var bt=BLE.Scanner.stop||BLE.Scanner.Stop;\nfunction bs(){if(bt)bt.call(BLE.Scanner);R.sa=nw();var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bw(){if(R.sa&&nw()-(R.l||R.sa)>9e4)bs();}\nif(E){R.ds="cf";ft("cf")}else{Shelly.addStatusHandler(safe);sw(false,"b",true);safe();${executionBoot}BLE.Scanner.subscribe(function(e,x){ev(e,x)});Timer.set(1000,false,bs);Timer.set(30000,true,function(){safe();stale();bw()});Timer.set(1500,false,hi)}`;'''
new = '''var bt=BLE.Scanner.stop||BLE.Scanner.Stop;\nfunction br(){R.sa=nw();var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bs(){if(bt)bt.call(BLE.Scanner);Timer.set(1500,false,br)}\nfunction bw(){if(R.sa&&nw()-(R.l||R.sa)>9e4)bs();}\nif(E){R.ds="cf";ft("cf")}else{Shelly.addStatusHandler(safe);sw(false,"b",true);safe();${executionBoot}BLE.Scanner.subscribe(function(e,x){ev(e,x)});Timer.set(1000,false,br);Timer.set(30000,true,function(){safe();stale();bw()});Timer.set(1500,false,hi)}`;'''
if gen.count(old) != 1:
    raise SystemExit(f'expected one scanner lifecycle block, found {gen.count(old)}')
gen_path.write_text(gen.replace(old, new))

test = test_path.read_text()
old_test = '''      nowMs += 91_000;\n      watchdog?.callback();\n      expect(startCalls).toHaveLength(2);'''
new_test = '''      const initial1500msTimers = timers.filter((timer) => timer.durationMs === 1500).length;\n      nowMs += 91_000;\n      watchdog?.callback();\n      expect(startCalls).toHaveLength(1);\n\n      const restartTimers = timers.filter((timer) => timer.durationMs === 1500);\n      expect(restartTimers).toHaveLength(initial1500msTimers + 1);\n      restartTimers.at(-1)?.callback();\n      expect(startCalls).toHaveLength(2);'''
if test.count(old_test) != 1:
    raise SystemExit(f'expected one watchdog assertion block, found {test.count(old_test)}')
test_path.write_text(test.replace(old_test, new_test))
