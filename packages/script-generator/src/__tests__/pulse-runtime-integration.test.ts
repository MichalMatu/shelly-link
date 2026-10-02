import {
  climateRuntimeSetControlModeEvalCode,
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript,
  type ShellyThermostatConfig
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

type RuntimeState = {
  on: boolean;
  a: boolean;
  rs: string;
  m: number;
  af: string | null;
  lk: boolean;
  pa: boolean;
  ps: number;
  pc: number;
  db?: boolean | null;
  di?: number;
};

const createPulseRuntime = ({
  mode = 'heating',
  minimumOnMs,
  relayDebounce,
  onMs = 2_000,
  offMs = 2_000
}: {
  mode?: 'heating' | 'humidifying';
  minimumOnMs?: number;
  relayDebounce?: { turnOnMs: number; turnOffMs: number };
  onMs?: number;
  offMs?: number;
} = {}) => {
  const base = createDefaultShellyThermostatConfig('xiaomi_lywsd03mmc_bthome_v2', mode);
  const config: ShellyThermostatConfig = {
    ...base,
    sensor: { ...base.sensor, runtimeAddress: 'AA:BB:CC:DD:EE:FF' },
    rule: {
      ...base.rule,
      consecutiveHits: 1,
      minChangeMs: 1,
      ...(minimumOnMs !== undefined ? { minimumOnMs } : {}),
      ...(relayDebounce ? { relayDebounce } : {})
    },
    execution: {
      pulse: {
        onMs,
        offMs,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    }
  };
  const script = generateShellyThermostatScript(config);
  let nowMs = 100_000;
  let physicalRelayOn = false;
  let nextTimerId = 1;
  let scanner:
    | ((event: string, packet: { addr: string; advData: number[]; rssi: number }) => void)
    | undefined;
  const timers = new Map<
    number,
    { dueMs: number; durationMs: number; repeat: boolean; callback: () => void }
  >();

  const runTo = (targetMs: number) => {
    let iterations = 0;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, entry]) => entry.dueMs <= targetMs)
        .sort((left, right) => left[1].dueMs - right[1].dueMs || left[0] - right[0])[0];
      if (!next) break;
      const [id, entry] = next;
      timers.delete(id);
      nowMs = entry.dueMs;
      entry.callback();
      if (entry.repeat) {
        timers.set(id, { ...entry, dueMs: entry.dueMs + entry.durationMs });
      }
      iterations += 1;
      if (iterations > 1_000)
        throw new Error('Generated runtime timer loop did not settle.');
    }
    nowMs = targetMs;
  };

  const shelly = {
    call: (
      method: string,
      params: unknown,
      callback?: (_result: unknown, error: number) => void
    ) => {
      if (method === 'Switch.Set') {
        physicalRelayOn = (params as { on?: boolean }).on === true;
        callback?.({}, 0);
        return;
      }
      if (method === 'KVS.Get') {
        callback?.({}, 1);
        return;
      }
      callback?.({}, 0);
    },
    getComponentStatus: (component: string) =>
      component === 'switch:0'
        ? { output: physicalRelayOn, errors: [] }
        : component === 'sys'
          ? {
              uptime: Math.floor(nowMs / 1000),
              time: '12:00',
              unixtime: 1_800_000_000 + Math.floor((nowMs - 100_000) / 1000)
            }
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
      const id = nextTimerId++;
      timers.set(id, {
        dueMs: nowMs + durationMs,
        durationMs,
        repeat,
        callback
      });
      return id;
    },
    clear: (id: number) => {
      timers.delete(id);
    }
  };
  const enterManual = climateRuntimeSetControlModeEvalCode('manual');
  const enterAuto = climateRuntimeSetControlModeEvalCode('auto');
  const runtime = new Function(
    'Shelly',
    'BLE',
    'Timer',
    `${script}\nreturn {enterManual:function(){return ${enterManual}},enterAuto:function(){return ${enterAuto}},fault:function(q){sf(q)},lock:function(q){ft(q)},state:function(){return {on:R.on,a:R.a,rs:R.rs,m:R.m,af:R.af,lk:R.lk,pa:R.pa,ps:R.ps,pc:R.pc,db:R.db,di:R.di}}};`
  )(shelly, ble, timer) as {
    enterManual(): number;
    enterAuto(): number;
    fault(reason: string): void;
    lock(reason: string): void;
    state(): RuntimeState;
  };

  if (!scanner) throw new Error('Generated runtime did not subscribe to BLE.');

  const scan = (temperatureC: number, humidityPct: number) =>
    scanner?.('scan-result', {
      addr: 'AA:BB:CC:DD:EE:FF',
      advData: advertisement(temperatureC, humidityPct),
      rssi: -35
    });

  return {
    config,
    script,
    runtime,
    physicalRelayOn: () => physicalRelayOn,
    advance: (milliseconds: number) => runTo(nowMs + milliseconds),
    scan,
    scanActive: () => (mode === 'humidifying' ? scan(25, 10) : scan(0, 45)),
    scanInactive: () => (mode === 'humidifying' ? scan(25, 95) : scan(40, 45))
  };
};

describe('generated Pulse runtime relay composition', () => {
  it.each(['heating', 'humidifying'] as const)(
    'runs %s + Pulse through relay debounce without bypassing the arbiter',
    (mode) => {
      const harness = createPulseRuntime({
        mode,
        relayDebounce: { turnOnMs: 500, turnOffMs: 500 }
      });

      expect(harness.physicalRelayOn()).toBe(false);
      expect(harness.runtime.state().ps).toBe(0);

      harness.scanActive();
      expect(harness.runtime.state()).toMatchObject({ ps: 2, db: true });
      expect(harness.physicalRelayOn()).toBe(false);

      harness.advance(499);
      expect(harness.physicalRelayOn()).toBe(false);
      harness.advance(1);
      expect(harness.physicalRelayOn()).toBe(true);

      harness.advance(1_500);
      expect(harness.runtime.state()).toMatchObject({ ps: 3, db: false });
      expect(harness.physicalRelayOn()).toBe(true);

      harness.advance(500);
      expect(harness.physicalRelayOn()).toBe(false);
    }
  );

  it('cancels a pending debounced Pulse ON when the Climate parent becomes inactive', () => {
    const harness = createPulseRuntime({
      relayDebounce: { turnOnMs: 1_000, turnOffMs: 1_000 }
    });

    harness.scanActive();
    expect(harness.runtime.state()).toMatchObject({ ps: 2, db: true });
    expect(harness.physicalRelayOn()).toBe(false);

    harness.advance(500);
    harness.scanInactive();
    expect(harness.runtime.state()).toMatchObject({ ps: 0, pa: false, db: null });
    expect(harness.physicalRelayOn()).toBe(false);

    harness.advance(2_000);
    expect(harness.physicalRelayOn()).toBe(false);
  });

  it('lets MANUAL forced OFF cancel Pulse and bypass minimum ON immediately', () => {
    const harness = createPulseRuntime({ minimumOnMs: 5_000, onMs: 1_000, offMs: 2_000 });

    harness.scanActive();
    expect(harness.physicalRelayOn()).toBe(true);

    harness.advance(1_000);
    expect(harness.runtime.state()).toMatchObject({ ps: 3, a: false, rs: 'mc' });
    expect(harness.physicalRelayOn()).toBe(true);

    expect(harness.runtime.enterManual()).toBe(1);
    expect(harness.runtime.state()).toMatchObject({ m: 1, ps: 0 });
    expect(harness.physicalRelayOn()).toBe(false);

    harness.advance(10_000);
    expect(harness.physicalRelayOn()).toBe(false);
  });

  it('starts a fresh Pulse only after AUTO has fresh parent data again', () => {
    const harness = createPulseRuntime();

    harness.scanActive();
    expect(harness.physicalRelayOn()).toBe(true);
    expect(harness.runtime.state().ps).toBe(2);

    expect(harness.runtime.enterManual()).toBe(1);
    expect(harness.physicalRelayOn()).toBe(false);
    expect(harness.runtime.state().ps).toBe(0);

    expect(harness.runtime.enterAuto()).toBe(0);
    expect(harness.runtime.state()).toMatchObject({ m: 0, af: 'st', ps: 0 });
    expect(harness.physicalRelayOn()).toBe(false);

    harness.scanActive();
    expect(harness.runtime.state()).toMatchObject({ af: null, ps: 2, rs: 'mc' });
    expect(harness.physicalRelayOn()).toBe(false);

    harness.advance(1);
    expect(harness.physicalRelayOn()).toBe(true);
  });

  it('automation fault and hard safety both cancel Pulse and cannot be resurrected by old timers', () => {
    const faulted = createPulseRuntime({ onMs: 1_000, offMs: 1_000 });
    faulted.scanActive();
    expect(faulted.physicalRelayOn()).toBe(true);

    faulted.runtime.fault('st');
    expect(faulted.runtime.state()).toMatchObject({ af: 'st', pa: false, ps: 0 });
    expect(faulted.physicalRelayOn()).toBe(false);
    faulted.advance(5_000);
    expect(faulted.physicalRelayOn()).toBe(false);

    const locked = createPulseRuntime({ onMs: 1_000, offMs: 1_000 });
    locked.scanActive();
    expect(locked.physicalRelayOn()).toBe(true);

    locked.runtime.lock('mx');
    expect(locked.runtime.state()).toMatchObject({ lk: true, ps: 0, rs: 'mx' });
    expect(locked.physicalRelayOn()).toBe(false);
    locked.advance(5_000);
    expect(locked.physicalRelayOn()).toBe(false);
  });

  it('boots safe OFF and never resumes an unknown Pulse before a fresh sensor request', () => {
    const harness = createPulseRuntime();

    expect(harness.physicalRelayOn()).toBe(false);
    expect(harness.runtime.state()).toMatchObject({ on: false, ps: 0, af: 'st' });

    harness.advance(5_000);
    expect(harness.physicalRelayOn()).toBe(false);
    expect(harness.runtime.state().ps).toBe(0);

    harness.scanActive();
    expect(harness.physicalRelayOn()).toBe(true);
    expect(harness.runtime.state().ps).toBe(2);
  });
});
