import {
  climateRuntimeSetControlModeEvalCode,
  createDefaultShellyThermostatConfig,
  createShellyRuntimeConfig,
  decodeShellyThermostatScript,
  generateShellyRuntimeConfigUpdateEval,
  generateShellyThermostatScript,
  SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES
} from '../index.js';

const advertisement = (temperatureC: number, humidityPct: number): number[] => {
  const temperature = Math.round(temperatureC * 100);
  const humidity = Math.round(humidityPct * 100);
  return [
    10,
    0x16,
    0xd2,
    0xfc,
    0x40,
    0x02,
    temperature & 255,
    (temperature >> 8) & 255,
    0x03,
    humidity & 255,
    (humidity >> 8) & 255
  ];
};

const createRuntime = () => {
  const base = createDefaultShellyThermostatConfig(
    'xiaomi_lywsd03mmc_bthome_v2',
    'heating'
  );
  const config = {
    ...base,
    sensor: { ...base.sensor, runtimeAddress: 'AA:BB:CC:DD:EE:FF' },
    rule: {
      ...base.rule,
      consecutiveHits: 1,
      minChangeMs: 1,
      relayDebounce: {
        turnOnMs: 5_000,
        turnOffMs: 60_000
      }
    }
  };
  const script = generateShellyThermostatScript(config);
  let nowMs = 100_000;
  let physicalRelayOn = false;
  let scanner:
    | ((event: string, packet: { addr: string; advData: number[]; rssi: number }) => void)
    | undefined;
  const timers: Array<{
    dueMs: number;
    durationMs: number;
    repeat: boolean;
    callback: () => void;
  }> = [];

  const runDueTimers = () => {
    let iterations = 0;
    while (true) {
      let nextIndex = -1;
      let nextDueMs = Number.POSITIVE_INFINITY;
      timers.forEach((entry, index) => {
        if (entry.dueMs <= nowMs && entry.dueMs < nextDueMs) {
          nextIndex = index;
          nextDueMs = entry.dueMs;
        }
      });
      if (nextIndex < 0) return;
      const entry = timers.splice(nextIndex, 1)[0]!;
      entry.callback();
      if (entry.repeat) {
        timers.push({ ...entry, dueMs: entry.dueMs + entry.durationMs });
      }
      iterations += 1;
      if (iterations > 1_000)
        throw new Error('Generated runtime timer loop did not settle.');
    }
  };

  const shelly = {
    call: (
      method: string,
      params: unknown,
      callback?: (_result: unknown, error: number) => void
    ) => {
      if (method === 'Switch.Set') {
        physicalRelayOn = (params as { on?: boolean }).on === true;
      }
      callback?.({}, 0);
    },
    getComponentStatus: (component: string) =>
      component === 'switch:0'
        ? { output: physicalRelayOn, errors: [] }
        : component === 'sys'
          ? { uptime: Math.floor(nowMs / 1000) }
          : null,
    getUptimeMs: () => nowMs,
    addStatusHandler: () => 1
  };
  const ble = {
    Scanner: {
      SCAN_RESULT: 'scan-result',
      stop: () => undefined,
      subscribe: (callback: typeof scanner) => {
        scanner = callback;
      },
      start: () => true
    }
  };
  const timer = {
    set: (durationMs: number, repeat: boolean, callback: () => void) => {
      timers.push({
        dueMs: nowMs + durationMs,
        durationMs,
        repeat,
        callback
      });
      return timers.length;
    }
  };
  const enterManual = climateRuntimeSetControlModeEvalCode('manual');
  const runtime = new Function(
    'Shelly',
    'BLE',
    'Timer',
    `${script}\nreturn {enterManual:function(){return ${enterManual}},state:function(){return{db:R.db,di:R.di,rs:R.rs}}};`
  )(shelly, ble, timer) as {
    enterManual(): number;
    state(): { db: boolean | null; di: number; rs: string };
  };

  if (!scanner) throw new Error('Generated runtime did not subscribe to BLE.');

  return {
    config,
    script,
    runtime,
    physicalRelayOn: () => physicalRelayOn,
    advance: (milliseconds: number) => {
      nowMs += milliseconds;
      runDueTimers();
    },
    scan: (temperatureC: number) =>
      scanner?.('scan-result', {
        addr: 'AA:BB:CC:DD:EE:FF',
        advData: advertisement(temperatureC, 45),
        rssi: -35
      })
  };
};

const fourSensorConfig = () => {
  const base = createDefaultShellyThermostatConfig();
  return {
    ...base,
    sensorSet: {
      aggregation: 'avg' as const,
      additionalSensors: [
        {
          ...base.sensor,
          sensorId: 'sensor-2',
          runtimeAddress: '11:22:33:44:55:66',
          displayName: 'Sensor 2'
        },
        {
          ...base.sensor,
          sensorId: 'sensor-3',
          runtimeAddress: '22:33:44:55:66:77',
          displayName: 'Sensor 3'
        },
        {
          ...base.sensor,
          sensorId: 'sensor-4',
          runtimeAddress: '33:44:55:66:77:88',
          displayName: 'Sensor 4'
        }
      ]
    },
    rule: {
      ...base.rule,
      minimumOnMs: 60_000,
      relayDebounce: {
        turnOnMs: 5_000,
        turnOffMs: 5_000
      }
    }
  };
};

describe('generated relay debounce runtime', () => {
  it('round-trips compact debounce config without changing the zero-default shape', () => {
    const base = createDefaultShellyThermostatConfig();
    expect(createShellyRuntimeConfig(base, 'lcl-test')).not.toHaveProperty('y');
    expect(createShellyRuntimeConfig(base, 'lcl-test')).not.toHaveProperty('z');
    expect(generateShellyThermostatScript(base)).toContain('// g: 0.6.1');

    const configured = {
      ...base,
      rule: {
        ...base.rule,
        relayDebounce: { turnOnMs: 4_000, turnOffMs: 0 }
      }
    };
    const runtimeConfig = createShellyRuntimeConfig(configured, 'lcl-test');
    const generated = generateShellyThermostatScript(configured);
    const decoded = decodeShellyThermostatScript(generated);

    expect(runtimeConfig.y).toBe(4_000);
    expect(runtimeConfig.z).toBeUndefined();
    expect(generated).toContain('// g: 0.6.3');
    expect(generated).toContain('var D=1;');
    expect(decoded?.settings.relayDebounce).toEqual({
      turnOnMs: 4_000,
      turnOffMs: 0
    });
  });

  it('matures a stable AUTO ON request from its one-shot timer without another scan', () => {
    const runtime = createRuntime();

    runtime.scan(18);
    expect(runtime.physicalRelayOn()).toBe(false);
    expect(runtime.runtime.state()).toMatchObject({ db: true, rs: 'db' });

    runtime.advance(4_999);
    expect(runtime.physicalRelayOn()).toBe(false);

    runtime.advance(1);
    expect(runtime.physicalRelayOn()).toBe(true);
    expect(runtime.runtime.state().db).toBeNull();
  });

  it('cancels and restarts the timer when the requested target returns to actual state', () => {
    const runtime = createRuntime();

    runtime.scan(18);
    runtime.advance(1_000);
    runtime.scan(19.5);
    expect(runtime.runtime.state().db).toBeNull();

    runtime.advance(4_000);
    expect(runtime.physicalRelayOn()).toBe(false);

    runtime.scan(18);
    expect(runtime.runtime.state()).toMatchObject({ db: true, di: 105_000 });

    runtime.advance(4_999);
    expect(runtime.physicalRelayOn()).toBe(false);

    runtime.advance(1);
    expect(runtime.physicalRelayOn()).toBe(true);
  });

  it('lets MANUAL forced OFF bypass and invalidate a pending OFF timer', () => {
    const runtime = createRuntime();

    runtime.scan(18);
    runtime.advance(5_000);
    expect(runtime.physicalRelayOn()).toBe(true);

    runtime.advance(1_000);
    runtime.scan(21);
    expect(runtime.physicalRelayOn()).toBe(true);
    expect(runtime.runtime.state()).toMatchObject({ db: false, rs: 'db' });

    expect(runtime.runtime.enterManual()).toBe(1);
    expect(runtime.physicalRelayOn()).toBe(false);
    expect(runtime.runtime.state().db).toBeNull();

    runtime.advance(60_000);
    expect(runtime.physicalRelayOn()).toBe(false);
    expect(runtime.runtime.state().db).toBeNull();
  });

  it('rejects debounce config updates on legacy runtime bodies', () => {
    const base = createDefaultShellyThermostatConfig();
    const config = {
      ...base,
      rule: {
        ...base.rule,
        relayDebounce: { turnOnMs: 2_000, turnOffMs: 0 }
      }
    };
    const code = generateShellyRuntimeConfigUpdateEval(config);
    const runtime = { on: false, ds: 'old' };
    const evaluate = new Function(
      'C',
      'R',
      'vc',
      'Script',
      'nw',
      's',
      `return ${code};`
    ) as (
      currentConfig: Record<string, unknown>,
      runtimeState: Record<string, unknown>,
      validate: (value: unknown) => boolean,
      scriptApi: { storage: { setItem: (key: string, value: string) => void } },
      now: () => number,
      setRelay: (on: boolean) => void
    ) => string;

    expect(code).toContain('if(typeof D==="undefined")return"iv";');
    expect(
      evaluate(
        {},
        runtime,
        () => true,
        { storage: { setItem: () => undefined } },
        () => 0,
        () => undefined
      )
    ).toBe('iv');
    expect(runtime).toEqual({ on: false, ds: 'old' });
  });

  it('keeps the maximum four-sensor runtime inside the fixed byte budget', () => {
    const script = generateShellyThermostatScript(fourSensorConfig());
    const bytes = new TextEncoder().encode(script).length;

    expect(script).toContain('// g: 0.6.3');
    expect(bytes).toBeLessThanOrEqual(SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES);
    expect(() => new Function(script)).not.toThrow();
  });

  it('rejects a configured debounce policy with no enabled direction', () => {
    const base = createDefaultShellyThermostatConfig();

    expect(() =>
      generateShellyThermostatScript({
        ...base,
        rule: {
          ...base.rule,
          relayDebounce: { turnOnMs: 0, turnOffMs: 0 }
        }
      })
    ).toThrow('Relay debounce must enable at least one direction.');
  });
});
