import {
  climateRuntimeControlStateEvalCode,
  climateRuntimeResetSafetyLockoutEvalCode,
  climateRuntimeSetControlModeEvalCode,
  climateRuntimeSetManualRelayEvalCode,
  createDefaultShellyThermostatConfig,
  decodeClimateRuntimeControlState,
  generateShellyThermostatScript,
  type ClimateRuntimeControlState
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
  const enterManualCode = climateRuntimeSetControlModeEvalCode('manual');
  const enterAutoCode = climateRuntimeSetControlModeEvalCode('auto');
  const manualOnCode = climateRuntimeSetManualRelayEvalCode(true);
  const manualOffCode = climateRuntimeSetManualRelayEvalCode(false);
  const resetSafetyCode = climateRuntimeResetSafetyLockoutEvalCode;
  const runtime = new Function(
    'Shelly',
    'BLE',
    'Timer',
    `${script}
return {
  diag:function(){return JSON.parse(diag());},
  controlState:function(){return ${climateRuntimeControlStateEvalCode};},
  enterManual:function(){return ${enterManualCode};},
  enterAuto:function(){return ${enterAutoCode};},
  manualOn:function(){return ${manualOnCode};},
  manualOff:function(){return ${manualOffCode};},
  resetSafety:function(){return ${resetSafetyCode};},
  hardLock:function(){ft("mx");},
  safe:safe,
  stale:stale
};`
  )(shelly, ble, timer) as {
    diag: () => { g: unknown[] };
    controlState: () => string;
    enterManual: () => number;
    enterAuto: () => number;
    manualOn: () => number;
    manualOff: () => number;
    resetSafety: () => string;
    hardLock: () => void;
    safe: () => void;
    stale: () => void;
  };

  if (!scanner) throw new Error('Generated runtime did not subscribe to BLE.');

  const controlState = (): ClimateRuntimeControlState => {
    const state = decodeClimateRuntimeControlState(runtime.controlState());
    if (!state)
      throw new Error('Generated runtime did not expose a valid control state.');
    return state;
  };

  return {
    runtime,
    controlState,
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

  it('MANUAL starts safe OFF and explicit manual request controls the relay', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(18, 50);
      expect(runtime.physicalRelayOn()).toBe(true);

      expect(runtime.runtime.enterManual()).toBe(1);
      expect(runtime.controlState()).toMatchObject({
        mode: 'manual',
        manualRequestOn: false,
        automationFault: null,
        safetyLockout: false
      });
      expect(runtime.physicalRelayOn()).toBe(false);

      const calls = runtime.switchCalls.length;
      nowMs += 1_000;
      runtime.scan(18, 50);
      expect(runtime.switchCalls).toHaveLength(calls);
      expect(runtime.physicalRelayOn()).toBe(false);

      expect(runtime.runtime.manualOn()).toBe(1);
      expect(runtime.controlState().manualRequestOn).toBe(true);
      expect(runtime.physicalRelayOn()).toBe(true);

      expect(runtime.runtime.manualOff()).toBe(0);
      expect(runtime.controlState().manualRequestOn).toBe(false);
      expect(runtime.physicalRelayOn()).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('returns from MANUAL to AUTO safe OFF without a third PAUSED mode', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(18, 50);
      expect(runtime.physicalRelayOn()).toBe(true);

      runtime.runtime.enterManual();
      runtime.runtime.manualOn();
      expect(runtime.physicalRelayOn()).toBe(true);

      expect(runtime.runtime.enterAuto()).toBe(0);
      expect(runtime.controlState()).toMatchObject({
        mode: 'auto',
        manualRequestOn: false,
        automationFault: 'st',
        safetyLockout: false
      });
      expect(runtime.physicalRelayOn()).toBe(false);

      nowMs += 1_000;
      runtime.scan(18, 50);
      expect(runtime.controlState().automationFault).toBeNull();
      expect(runtime.physicalRelayOn()).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('keeps sensor fault fail-safe in AUTO without taking control away from MANUAL', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const runtime = createHeatingRuntime();
      runtime.scan(23.5, 50);
      expect(runtime.controlState().automationFault).toBeNull();

      runtime.runtime.enterManual();
      expect(runtime.runtime.manualOn()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(true);

      const callsBeforeStale = runtime.switchCalls.length;
      nowMs += 700_000;
      runtime.runtime.stale();
      expect(runtime.switchCalls).toHaveLength(callsBeforeStale);
      expect(runtime.controlState()).toMatchObject({
        mode: 'manual',
        manualRequestOn: true,
        automationFault: 'st',
        safetyLockout: false
      });
      expect(runtime.physicalRelayOn()).toBe(true);

      expect(runtime.runtime.manualOff()).toBe(0);
      expect(runtime.physicalRelayOn()).toBe(false);
      expect(runtime.runtime.manualOn()).toBe(1);
      expect(runtime.physicalRelayOn()).toBe(true);

      expect(runtime.runtime.enterAuto()).toBe(0);
      expect(runtime.controlState()).toMatchObject({
        mode: 'auto',
        manualRequestOn: false,
        automationFault: 'st',
        safetyLockout: false
      });
      expect(runtime.physicalRelayOn()).toBe(false);

      nowMs += 1_000;
      runtime.scan(23.5, 50);
      expect(runtime.controlState().automationFault).toBeNull();
      expect(runtime.physicalRelayOn()).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('hard safety lockout stays OFF until explicit recovery', () => {
    const runtime = createHeatingRuntime();
    runtime.scan(23.5, 50);
    runtime.runtime.enterManual();
    runtime.runtime.manualOn();
    expect(runtime.physicalRelayOn()).toBe(true);

    runtime.runtime.hardLock();
    expect(runtime.controlState()).toMatchObject({
      mode: 'manual',
      manualRequestOn: true,
      safetyLockout: true,
      safetyReason: 'mx'
    });
    expect(runtime.physicalRelayOn()).toBe(false);
    expect(runtime.runtime.manualOn()).toBe(-2);

    runtime.scan(23.5, 50);
    expect(runtime.physicalRelayOn()).toBe(false);
    expect(runtime.controlState().safetyLockout).toBe(true);

    expect(decodeClimateRuntimeControlState(runtime.runtime.resetSafety())).toMatchObject(
      {
        mode: 'manual',
        manualRequestOn: false,
        safetyLockout: false,
        safetyReason: null
      }
    );
    expect(runtime.physicalRelayOn()).toBe(false);
    expect(runtime.runtime.manualOn()).toBe(1);
    expect(runtime.physicalRelayOn()).toBe(true);
  });

  it('hard safety runs before stale handling and preserves the lockout reason', () => {
    let nowMs = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    try {
      const base = createDefaultShellyThermostatConfig(
        'xiaomi_lywsd03mmc_bthome_v2',
        'heating'
      );
      const runtime = createRuntime(
        generateShellyThermostatScript({
          ...base,
          sensor: { ...base.sensor, runtimeAddress: 'AA:BB:CC:DD:EE:FF' },
          rule: { ...base.rule, consecutiveHits: 1, minChangeMs: 1, maxOnMs: 1_000 }
        })
      );
      runtime.scan(18, 50);
      expect(runtime.physicalRelayOn()).toBe(true);

      nowMs += 700_000;
      runtime.runtime.safe();
      runtime.runtime.stale();
      expect(runtime.controlState()).toMatchObject({
        mode: 'auto',
        automationFault: 'st',
        safetyLockout: true,
        safetyReason: 'mx'
      });
      expect(runtime.physicalRelayOn()).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('exposes independent mode, request, fault and safety axes in diagnostics', () => {
    const runtime = createRuntime(
      generateShellyThermostatScript(createDefaultShellyThermostatConfig())
    );
    const g = runtime.runtime.diag().g;
    expect(g[17]).toBe(0);
    expect(g[18]).toBe(false);
    expect(g[19]).toBeNull();
    expect(g[20]).toBe(false);
    expect(g[21]).toBe('st');
    expect(g[22]).toBe(false);
    expect(g[23]).toBeNull();
  });
});
