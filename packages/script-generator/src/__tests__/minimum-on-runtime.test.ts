import {
  climateRuntimeSetControlModeEvalCode,
  createDefaultShellyThermostatConfig,
  createShellyRuntimeConfig,
  decodeShellyThermostatScript,
  generateShellyThermostatScript
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
      minimumOnMs: 60_000
    }
  };
  const script = generateShellyThermostatScript(config);
  let nowMs = 100_000;
  let physicalRelayOn = false;
  let scanner:
    | ((event: string, packet: { addr: string; advData: number[]; rssi: number }) => void)
    | undefined;

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
  const timer = { set: () => undefined };
  const enterManual = climateRuntimeSetControlModeEvalCode('manual');
  const runtime = new Function(
    'Shelly',
    'BLE',
    'Timer',
    `${script}\nreturn {enterManual:function(){return ${enterManual}}};`
  )(shelly, ble, timer) as { enterManual(): number };

  if (!scanner) throw new Error('Generated runtime did not subscribe to BLE.');

  return {
    config,
    script,
    runtime,
    physicalRelayOn: () => physicalRelayOn,
    advance: (milliseconds: number) => {
      nowMs += milliseconds;
    },
    scan: (temperatureC: number) =>
      scanner?.('scan-result', {
        addr: 'AA:BB:CC:DD:EE:FF',
        advData: advertisement(temperatureC, 45),
        rssi: -35
      })
  };
};

describe('generated minimum ON timing', () => {
  it('round-trips optional runtime timing without bloating zero-default config', () => {
    const base = createDefaultShellyThermostatConfig();
    const defaultRuntime = createShellyRuntimeConfig(base, 'lcl-test');
    expect(defaultRuntime.u).toBeUndefined();

    const configured = {
      ...base,
      rule: { ...base.rule, minimumOnMs: 45_000 }
    };
    const generated = generateShellyThermostatScript(configured);
    const decoded = decodeShellyThermostatScript(generated);

    expect(createShellyRuntimeConfig(configured, 'lcl-test').u).toBe(45_000);
    expect(decoded?.settings.minimumOnMs).toBe(45_000);
  });

  it('blocks AUTO OFF until minimum ON elapses but MANUAL still forces safe OFF', () => {
    const runtime = createRuntime();

    runtime.scan(18);
    expect(runtime.physicalRelayOn()).toBe(true);

    runtime.advance(1_000);
    runtime.scan(21);
    expect(runtime.physicalRelayOn()).toBe(true);

    expect(runtime.runtime.enterManual()).toBe(1);
    expect(runtime.physicalRelayOn()).toBe(false);
  });

  it('allows AUTO OFF once minimum ON has elapsed', () => {
    const runtime = createRuntime();

    runtime.scan(18);
    expect(runtime.physicalRelayOn()).toBe(true);

    runtime.advance(60_000);
    runtime.scan(21);
    expect(runtime.physicalRelayOn()).toBe(false);
  });
});
