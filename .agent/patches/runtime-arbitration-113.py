from pathlib import Path

p = Path("packages/script-generator/src/shelly/generate.ts")
s = p.read_text()

start = s.index("const renderPersistentConfigLoader = (): string => `var E=0;")
end = s.index("\n\nconst renderThresholdHelper", start)
loader = '''const renderPersistentConfigLoader = (): string => `var E=0;
function N(x){return typeof x=="number";}
function S(x){return typeof x=="string";}
function vs(c){var a=c.ss;if(a===undefined)return c.ag===undefined;if(!Array.isArray(a)||a.length<2||a.length>4||!N(c.ag)||c.ag<0||c.ag>3)return false;for(var i=0,s;i<a.length;i++){s=a[i];if(!Array.isArray(s)||s.length!==3||!S(s[0])||!S(s[1])||(s[2]!==0&&s[2]!==1))return false;}return true;}
function vc(c){return c&&c.v===1&&(c.p===0||c.p===1)&&S(c.a)&&S(c.fa)&&S(c.n)&&S(c.k)&&N(c.i)&&c.i>=0&&N(c.r)&&c.r>=-100&&c.r<=-20&&N(c.on)&&N(c.off)&&(c.d===0||c.d===1)&&(c.m===0||c.m===1)&&N(c.h)&&c.h>=1&&c.h<=10&&N(c.c)&&c.c>0&&N(c.s)&&c.s>0&&N(c.x)&&c.x>0&&N(c.vp)&&c.vp>=0&&c.vp<=5&&(c.d?c.on>c.off:c.on<c.off)&&vs(c);}
function lc(d){if(typeof Script=="undefined"||!Script.storage||!Script.storage.getItem)return d;try{var x=Script.storage.getItem(${JSON.stringify(SHELLY_RUNTIME_CONFIG_STORAGE_KEY)});if(!x)return d;var c=JSON.parse(x);if(vc(c))return c;}catch(e){}E=1;return d;}
C=lc(C);`;'''
s = s[:start] + loader + s[end:]

old_state = "const renderRuntimeState = (): string =>\n  'var R={ls:null,l:0,t:null,h:null,tt:null,ht:null,b:null,r:null,on:false,rs:\\"boot\\",ds:\\"boot\\",lc:0,os:null,nh:0,fh:0,cv:null,vp:null,eo:null,ef:null,m:0,sa:0,u:[],fc:0};';"
new_state = "const renderRuntimeState = (): string =>\n  'var R={ls:null,l:0,t:null,h:null,tt:null,ht:null,b:null,r:null,on:false,rs:\\"boot\\",ds:\\"boot\\",lc:0,os:null,nh:0,fh:0,cv:null,vp:null,eo:null,ef:null,m:0,a:false,sa:0,u:[],fc:0};';"
if old_state not in s:
    raise SystemExit("runtime state block not found")
s = s.replace(old_state, new_state, 1)

old_helpers = '''function na(a){if(a===undefined||a===null)return"";var s=String(a).toUpperCase(),o="";for(var i=0;i<s.length;i++){var c=s.charAt(i);if(c!==":"&&c!=="-")o+=c;}return o;}
function fv(o,k){return o&&o[k]!==undefined?o[k]:null;}'''
new_helpers = '''function na(a){if(a==null)return"";var s=String(a).toUpperCase(),o="";for(var i=0;i<s.length;i++){var c=s.charAt(i);if(c!=":"&&c!="-")o+=c;}return o;}
function fv(o,k){return o&&o[k]!=null?o[k]:null;}'''
if old_helpers not in s:
    raise SystemExit("helper block not found")
s = s.replace(old_helpers, new_helpers, 1)

old_ctrl = '''function s(o,c){Shelly.call("Switch.Set",{id:C.i,on:o},c)}
function sw(o,q,f){if(R.m)return;var n=nw(),c=R.on!=o;if(o&&!f&&c&&n-R.lc<C.c){R.rs="mc";return;}s(o,function(r,e){if(R.m)return s(false);if(e){R.rs="se";s(false);R.on=false;return;}R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null;});}
function stale(){var n=nw();if(R.ls===null||n-R.ls>C.s){R.ds="st";R.nh=0;R.fh=0;sw(false,"st",true);return;}if(R.on&&R.os!==null&&n-R.os>=C.x){R.nh=0;R.fh=0;sw(false,"mx",true);}}'''
new_ctrl = '''function s(o,c){Shelly.call("Switch.Set",{id:C.i,on:o},c)}
function ft(q){R.m=4;R.rs=q;R.lc=nw();R.on=false;R.os=null;s(false)}
function sw(o,q,f){if(!f){R.a=o;if(R.m)return}var n=nw(),c=R.on!=o,m=R.m;if(o&&!f&&c&&n-R.lc<C.c)return R.rs="mc";s(o,function(r,e){if(R.m!==m)return s(R.m===2);if(e)return ft("se");R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null})}
function pe(e){if(!e||e.component!=="input:0"||!e.info||e.info.event!=="single_push"||R.m>2)return;var n=nw(),m=R.m===1?2:1,o=m===2;if(o&&(R.ls===null||n-R.ls>C.s))return ft("st");R.m=m;R.rs="pb";R.lc=n;if(R.on!==o)sw(o,"pb",true)}
function stale(){var n=nw();if(R.ls===null||n-R.ls>C.s){R.ds="st";R.nh=0;R.fh=0;ft("st");return}if(R.on&&R.os!==null&&n-R.os>=C.x){R.nh=0;R.fh=0;ft("mx")}}'''
if old_ctrl not in s:
    raise SystemExit("control block not found")
s = s.replace(old_ctrl, new_ctrl, 1)

old_boot = 'if(E){R.ds="cf";sw(false,"cf",true);}else{sw(false,"b",true);BLE.Scanner.subscribe(function(e,x){ev(e,x);});Timer.set(1000,false,bs);Timer.set(30000,true,function(){stale();bw();});}`;'
new_boot = 'if(Shelly.addEventHandler)Shelly.addEventHandler(pe);if(E){R.ds="cf";ft("cf")}else{sw(false,"b",true);BLE.Scanner.subscribe(function(e,x){ev(e,x)});Timer.set(1000,false,bs);Timer.set(30000,true,function(){stale();bw()})}`;'
if old_boot not in s:
    raise SystemExit("boot block not found")
s = s.replace(old_boot, new_boot, 1)

old_diag = 'R.eo,R.ef,R.l,R.ds],d:pd()'
new_diag = 'R.eo,R.ef,R.l,R.ds,R.m,R.a],d:pd()'
if old_diag not in s:
    raise SystemExit("diag block not found")
s = s.replace(old_diag, new_diag, 1)
p.write_text(s)

p = Path("packages/script-generator/src/shelly/runtimeConfigUpdate.ts")
s = p.read_text()
old = 'return `(function(){var N=${configJson};if(typeof vc!=="function"||!vc(N))return"iv";if(typeof Script==="undefined"||!Script.storage||!Script.storage.setItem)return"ns";Script.storage.setItem(${storageKey},${storageValue});C=N;R.ls=null;R.l=0;R.t=null;R.h=null;R.tt=null;R.ht=null;R.b=null;R.r=null;R.on=false;R.rs="cu";R.ds="boot";R.lc=nw();R.os=null;R.nh=0;R.fh=0;R.cv=null;R.vp=null;R.eo=null;R.ef=null;R.m=0;R.sa=0;R.u=[];R.fc=0;return C.k;})()`;'
new = 'return `(function(){var N=${configJson},M=R.m,O=R.on;if(typeof vc!=="function"||!vc(N))return"iv";if(typeof Script==="undefined"||!Script.storage||!Script.storage.setItem)return"ns";Script.storage.setItem(${storageKey},${storageValue});C=N;R.ls=null;R.l=0;R.t=null;R.h=null;R.tt=null;R.ht=null;R.b=null;R.r=null;R.on=O;R.rs="cu";R.ds="boot";R.lc=nw();R.os=O?R.lc:null;R.nh=0;R.fh=0;R.cv=null;R.vp=null;R.eo=null;R.ef=null;R.m=M;R.a=false;R.sa=0;R.u=[];R.fc=0;return C.k;})()`;'
if old not in s:
    raise SystemExit("runtime config update return not found")
p.write_text(s.replace(old, new, 1))

manual = '''import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript
} from '../index.js';
import { describe, expect, it, vi } from 'vitest';

type RuntimeEvent = { component: string; info?: { event?: string } };

const advertisement = (temperatureC: number, humidityPct: number): number[] => {
  const temp = Math.round(temperatureC * 100);
  const humidity = Math.round(humidityPct * 100);
  return [
    10,
    0x16,
    0xd2,
    0xfc,
    0x40,
    0x02,
    temp & 255,
    (temp >> 8) & 255,
    0x03,
    humidity & 255,
    (humidity >> 8) & 255
  ];
};

const createRuntime = (script: string) => {
  let physicalRelayOn = false;
  let scanner:
    | ((event: string, packet: { addr: string; advData: number[]; rssi: number }) => void)
    | undefined;
  let eventHandler: ((event: RuntimeEvent) => void) | undefined;
  const switchCalls: boolean[] = [];
  const shelly = {
    call: (
      method: string,
      params: unknown,
      callback?: (_r: unknown, e: number) => void
    ) => {
      if (method === 'Switch.Set') {
        const on = (params as { on?: boolean }).on === true;
        physicalRelayOn = on;
        switchCalls.push(on);
      }
      callback?.({}, 0);
    },
    addEventHandler: (callback: (event: RuntimeEvent) => void) => {
      eventHandler = callback;
      return 1;
    },
    getComponentStatus: (component: string) =>
      component === 'switch:0'
        ? { output: physicalRelayOn }
        : component === 'sys'
          ? { uptime: 1 }
          : null,
    getUptimeMs: () => Date.now()
  };
  const ble = {
    Scanner: {
      SCAN_RESULT: 'scan-result',
      INFINITE_SCAN: -1,
      stop: () => undefined,
      subscribe: (callback: typeof scanner) => {
        scanner = callback;
      },
      start: () => true
    }
  };
  const timer = { set: () => undefined };
  const runtime = new Function(
    'Shelly',
    'BLE',
    'Timer',
    `${script}\nreturn {\n  diag:function(){return JSON.parse(diag());},\n  mode:function(){return R.m;},\n  setMode:function(m){\n    R.m=m;\n    if(m===1||m===3||m===4){if(R.on)sw(false,"ts",true);}\n    else if(m===2){if(!R.on)sw(true,"ts",true);}\n  },\n  stale:stale\n};`
  )(shelly, ble, timer) as {
    diag: () => { g: unknown[] };
    mode: () => number;
    setMode: (mode: number) => void;
    stale: () => void;
  };

  if (!scanner) throw new Error('Generated runtime did not subscribe to BLE.');
  if (!eventHandler) throw new Error('Generated runtime did not subscribe to input events.');

  return {
    runtime,
    switchCalls,
    scan: (temperatureC: number, humidityPct: number) =>
      scanner?.('scan-result', {
        addr: 'AA:BB:CC:DD:EE:FF',
        advData: advertisement(temperatureC, humidityPct),
        rssi: -35
      }),
    pressButton: () =>
      eventHandler?.({ component: 'input:0', info: { event: 'single_push' } }),
    physicalRelayOn: () => physicalRelayOn
  };
};

const createHeatingRuntime = () => {
  const base = createDefaultShellyThermostatConfig(
    'xiaomi_lywsd03mmc_bthome_v2',
    'heating'
  );
  return createRuntime(
    generateShellyThermostatScript({
      ...base,
      sensor: { ...base.sensor, runtimeAddress: 'AA:BB:CC:DD:EE:FF' },
      rule: { ...base.rule, consecutiveHits: 1, minChangeMs: 1 }
    })
  );
};

describe('generated runtime control arbitration', () => {
  it('first physical press from AUTO+ON enters MANUAL_OFF and blocks automation', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(18, 50);
      expect(runtime.physicalRelayOn()).toBe(true);

      runtime.pressButton();
      expect(runtime.runtime.mode()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(false);

      const calls = runtime.switchCalls.length;
      nowMs += 1_000;
      runtime.scan(18, 50);
      expect(runtime.switchCalls).toHaveLength(calls);
      expect(runtime.physicalRelayOn()).toBe(false);

      runtime.pressButton();
      expect(runtime.runtime.mode()).toBe(2);
      expect(runtime.physicalRelayOn()).toBe(true);
      runtime.pressButton();
      expect(runtime.runtime.mode()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('first physical press from AUTO+OFF changes mode without an extra relay write', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(23.5, 50);
      expect(runtime.physicalRelayOn()).toBe(false);
      const calls = runtime.switchCalls.length;

      runtime.pressButton();
      expect(runtime.runtime.mode()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(false);
      expect(runtime.switchCalls).toHaveLength(calls);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('PAUSED and FAULT remain OFF and ignore physical toggles', () => {
    const runtime = createHeatingRuntime();

    runtime.runtime.setMode(3);
    expect(runtime.runtime.mode()).toBe(3);
    expect(runtime.physicalRelayOn()).toBe(false);
    runtime.pressButton();
    expect(runtime.runtime.mode()).toBe(3);

    runtime.runtime.setMode(4);
    runtime.pressButton();
    expect(runtime.runtime.mode()).toBe(4);
    expect(runtime.physicalRelayOn()).toBe(false);
  });

  it('stale safety overrides MANUAL_ON and latches FAULT', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(23.5, 50);
      runtime.pressButton();
      runtime.pressButton();
      expect(runtime.runtime.mode()).toBe(2);
      expect(runtime.physicalRelayOn()).toBe(true);

      nowMs += 700_000;
      runtime.runtime.stale();
      expect(runtime.runtime.mode()).toBe(4);
      expect(runtime.physicalRelayOn()).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('exposes mode and automation-requested output in diagnostics', () => {
    const runtime = createRuntime(
      generateShellyThermostatScript(createDefaultShellyThermostatConfig())
    );
    const g = runtime.runtime.diag().g;
    expect(g[17]).toBe(0);
    expect(g[18]).toBe(false);
  });
});
'''
Path("packages/script-generator/src/__tests__/manual-runtime.test.ts").write_text(manual)

p = Path("packages/script-generator/src/__tests__/persistent-runtime-config.test.ts")
s = p.read_text()
s = s.replace(
    "generates an in-place config update that persists the same compact config and resets runtime state",
    "generates an in-place config update that preserves runtime control mode and output"
)
s = s.replace(
    "      m: 1,\n      sa: 13,",
    "      m: 1,\n      a: true,\n      sa: 13,",
    1
)
s = s.replace(
    "      on: false,\n      rs: 'cu',\n      ds: 'boot',\n      lc: 1234,\n      os: null,",
    "      on: true,\n      rs: 'cu',\n      ds: 'boot',\n      lc: 1234,\n      os: 1234,",
    1
)
s = s.replace(
    "      m: 0,\n      sa: 0,",
    "      m: 1,\n      a: false,\n      sa: 0,",
    1
)
p.write_text(s)
