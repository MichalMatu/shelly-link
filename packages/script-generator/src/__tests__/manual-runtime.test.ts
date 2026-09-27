import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript
} from '../index.js';
import { describe, expect, it, vi } from 'vitest';

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
    `${script}
return {
  diag:function(){return JSON.parse(diag());},
  mode:function(){return R.m;},
  setMode:function(m){
    R.m=m;
    if(m===1||m===3||m===4){if(R.on)sw(false,"ts",true);}
    else if(m===2){if(!R.on)sw(true,"ts",true);}
  },
  stale:stale
};`
  )(shelly, ble, timer) as {
    diag: () => { g: unknown[] };
    mode: () => number;
    setMode: (mode: number) => void;
    stale: () => void;
  };

  if (!scanner) throw new Error('Generated runtime did not subscribe to BLE.');

  return {
    runtime,
    switchCalls,
    scan: (temperatureC: number, humidityPct: number) =>
      scanner?.('scan-result', {
        addr: 'AA:BB:CC:DD:EE:FF',
        advData: advertisement(temperatureC, humidityPct),
        rssi: -35
      }),
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
  it('does not claim unsupported Plug S Gen3 input events', () => {
    const script = generateShellyThermostatScript(createDefaultShellyThermostatConfig());
    expect(script).not.toContain('input:0');
    expect(script).not.toContain('Shelly.addEventHandler');
  });

  it('MANUAL_OFF blocks automation and explicit MANUAL_ON controls the relay', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(18, 50);
      expect(runtime.physicalRelayOn()).toBe(true);

      runtime.runtime.setMode(1);
      expect(runtime.runtime.mode()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(false);

      const calls = runtime.switchCalls.length;
      nowMs += 1_000;
      runtime.scan(18, 50);
      expect(runtime.switchCalls).toHaveLength(calls);
      expect(runtime.physicalRelayOn()).toBe(false);

      runtime.runtime.setMode(2);
      expect(runtime.runtime.mode()).toBe(2);
      expect(runtime.physicalRelayOn()).toBe(true);
      runtime.runtime.setMode(1);
      expect(runtime.runtime.mode()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('PAUSED remains OFF and blocks automation output', () => {
    const runtime = createHeatingRuntime();
    runtime.scan(18, 50);
    expect(runtime.physicalRelayOn()).toBe(true);

    runtime.runtime.setMode(3);
    expect(runtime.runtime.mode()).toBe(3);
    expect(runtime.physicalRelayOn()).toBe(false);
    const calls = runtime.switchCalls.length;
    runtime.scan(18, 50);
    expect(runtime.switchCalls).toHaveLength(calls);
    expect(runtime.physicalRelayOn()).toBe(false);
  });

  it('stale safety overrides MANUAL_ON and latches FAULT', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(23.5, 50);
      runtime.runtime.setMode(2);
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
