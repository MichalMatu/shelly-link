#!/usr/bin/env bash
set -euo pipefail

git fetch origin main fix/scanner-resubscribe-after-stop-20261004
git checkout -B fix/scanner-resubscribe-after-stop-20261004 origin/fix/scanner-resubscribe-after-stop-20261004
test "$(git rev-parse HEAD)" = "7690ca50218bb018dc1bb8df06c7bd3a1798e471"

python3 - <<'PY'
from pathlib import Path

p = Path('packages/script-generator/src/shelly/generate.ts')
s = p.read_text()
old = '''function bs(){R.sa=nw();if(br()===true)return;var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}
function bw(){if(br()===false)bs();}
if(E){R.ds="cf";ft("cf")}else{Shelly.addStatusHandler(safe);sw(false,"b",true);safe();${executionBoot}BLE.Scanner.subscribe(function(e,x){ev(e,x)});Timer.set(1000,false,bs);Timer.set(30000,true,function(){safe();stale();bw()});Timer.set(1500,false,hi)}`;'''
new = '''function bs(){R.sa=nw();if(br()===true)return;var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}
function bw(){if(br()===false){BLE.Scanner.subscribe(function(e,x){ev(e,x)});bs()}}
if(E){R.ds="cf";ft("cf")}else{Shelly.addStatusHandler(safe);sw(false,"b",true);safe();${executionBoot}BLE.Scanner.subscribe(function(e,x){ev(e,x)});Timer.set(1000,false,bs);Timer.set(30000,true,function(){safe();stale();bw()});Timer.set(1500,false,hi)}`;'''
if old not in s:
    raise SystemExit('generator watchdog block not found')
p.write_text(s.replace(old, new, 1))

p = Path('packages/script-generator/src/__tests__/scanner-watchdog-runtime.test.ts')
s = p.read_text()
s = s.replace(
    '  let scanCallback: ((event: string, result: ScanResult) => void) | undefined;',
    '  let scanCallback: ((event: string, result: ScanResult) => void) | undefined;\n  let scannerSubscriptions = 0;'
)
s = s.replace(
    '''      subscribe: (callback: (event: string, result: ScanResult) => void) => {
        scanCallback = callback;
      },''',
    '''      subscribe: (callback: (event: string, result: ScanResult) => void) => {
        scannerSubscriptions += 1;
        scanCallback = callback;
      },'''
)
s = s.replace(
    '''      stop: () => {
        scannerStops += 1;
        scannerRunning = false;
      }''',
    '''      stop: () => {
        scannerStops += 1;
        scannerRunning = false;
        scanCallback = undefined;
      }'''
)
s = s.replace(
    '    scan: scanCallback,',
    '''    scan: (event: string, result: ScanResult) => {
      if (!scanCallback) throw new Error('BLE scanner has no active subscription.');
      scanCallback(event, result);
    },'''
)
s = s.replace(
    '''    setScannerRunning: (value: boolean) => {
      scannerRunning = value;
    },
    scannerStarts: () => scannerStarts,
    scannerStops: () => scannerStops''',
    '''    setScannerRunning: (value: boolean) => {
      scannerRunning = value;
    },
    stopScanner: () => BLE.Scanner.stop(),
    scannerStarts: () => scannerStarts,
    scannerStops: () => scannerStops,
    scannerSubscriptions: () => scannerSubscriptions'''
)
healthy = '''    expect(runtime.scannerStarts()).toBe(1);
    expect(runtime.scannerStops()).toBe(0);
  });'''
healthy_repl = '''    expect(runtime.scannerStarts()).toBe(1);
    expect(runtime.scannerStops()).toBe(0);
    expect(runtime.scannerSubscriptions()).toBe(1);
  });'''
if healthy not in s:
    raise SystemExit('healthy-scanner assertion point not found')
s = s.replace(healthy, healthy_repl, 1)
needle = '''    runtime.bootScanner.callback();
    runtime.setScannerRunning(false);
    runtime.setNowMs(60_000);
    runtime.watchdog.callback();

    expect(runtime.scannerStarts()).toBe(2);
    expect(runtime.scannerStops()).toBe(0);
  });'''
repl = '''    runtime.bootScanner.callback();
    expect(runtime.scannerSubscriptions()).toBe(1);

    runtime.stopScanner();
    expect(runtime.scannerStops()).toBe(1);

    runtime.setNowMs(60_000);
    runtime.watchdog.callback();

    expect(runtime.scannerStarts()).toBe(2);
    expect(runtime.scannerStops()).toBe(1);
    expect(runtime.scannerSubscriptions()).toBe(2);

    runtime.setNowMs(61_000);
    runtime.scan('scan-result', {
      addr: runtime.address,
      advData: manufacturerAdvertisement([0xc2, 0xdc, 0x00, 0x32, 0x02, 0x2c]),
      rssi: -50
    });
    expect(runtime.diag().g[1]).toBe(22);
    expect(runtime.diag().g[2]).toBe(50);
  });'''
if needle not in s:
    raise SystemExit('test insertion point not found')
p.write_text(s.replace(needle, repl, 1))
PY

pnpm --dir packages/script-generator exec vitest run src/__tests__/scanner-watchdog-runtime.test.ts src/__tests__/generator.test.ts --update
pnpm --filter @lcl/script-generator typecheck
pnpm quality:repo
git diff --check
pnpm check

git status --short
git diff -- packages/script-generator/src/shelly/generate.ts packages/script-generator/src/__tests__/scanner-watchdog-runtime.test.ts packages/script-generator/src/__tests__/generator.test.ts packages/script-generator/src/__tests__/__snapshots__/generator.test.ts.snap

git add packages/script-generator/src/shelly/generate.ts packages/script-generator/src/__tests__/scanner-watchdog-runtime.test.ts packages/script-generator/src/__tests__/generator.test.ts packages/script-generator/src/__tests__/__snapshots__/generator.test.ts.snap
git commit -m 'Fix BLE scanner re-subscription after restart'
git push origin HEAD:fix/scanner-resubscribe-after-stop-20261004
git rev-parse HEAD
