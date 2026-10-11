from pathlib import Path

root=Path('.')
gen=root/'packages/script-generator/src/shelly/generate.ts'
s=gen.read_text()
old='''var bt=BLE.Scanner.stop||BLE.Scanner.Stop;\nfunction bs(){if(bt)bt.call(BLE.Scanner);R.sa=nw();var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bw(){if(R.sa&&nw()-(R.l||R.sa)>9e4)bs();}'''
new='''function br(){if(BLE.Scanner.isRunning)return BLE.Scanner.isRunning();if(BLE.Scanner.IsRunning)return BLE.Scanner.IsRunning();return null}\nfunction bs(){R.sa=nw();if(br()===true)return;var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}\nfunction bw(){if(br()===false)bs();}'''
if s.count(old)!=1: raise SystemExit(f'generator scanner block count={s.count(old)}')
gen.write_text(s.replace(old,new))

test=root/'packages/script-generator/src/__tests__/generator.test.ts'
t=test.read_text()
old_assert="    expect(script).toContain('nw()-(R.l||R.sa)>9e4');"
new_assert="""    expect(script).toContain('BLE.Scanner.isRunning');\n    expect(script).not.toContain('nw()-(R.l||R.sa)>9e4');"""
if t.count(old_assert)!=1: raise SystemExit(f'generator assertion count={t.count(old_assert)}')
test.write_text(t.replace(old_assert,new_assert))
