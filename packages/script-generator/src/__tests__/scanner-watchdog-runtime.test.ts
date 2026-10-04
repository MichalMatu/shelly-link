import { describe, expect, it } from 'vitest';
import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript
} from '../index.js';

type TimerEntry = {
  durationMs: number;
  repeat: boolean;
  callback: () => void;
};

type ScanResult = {
  addr: string;
  advData: number[];
  rssi: number;
};

const manufacturerAdvertisement = (payload: number[]): number[] => [
  payload.length + 1,
  0xff,
  ...payload
];

const createWatchdogRuntime = () => {
  let nowMs = 0;
  let scannerRunning = false;
  let scannerStarts = 0;
  let scannerStops = 0;
  let relayOn = false;
  let scanCallback: ((event: string, result: ScanResult) => void) | undefined;
  const timers: TimerEntry[] = [];
  const address = 'AA:BB:CC:DD:EE:01';

  const Shelly = {
    call: (
      method: string,
      params: { on?: boolean },
      callback?: (_result: unknown, code: number) => void
    ) => {
      if (method === 'Switch.Set') relayOn = params.on === true;
      callback?.({}, 0);
    },
    addEventHandler: () => 1,
    addStatusHandler: () => 1,
    getComponentStatus: (component: string) =>
      component === 'switch:0'
        ? { output: relayOn }
        : component === 'sys'
          ? { time: '12:00', unixtime: 1_791_100_000, uptime: nowMs / 1_000 }
          : null,
    getUptimeMs: () => nowMs
  };
  const BLE = {
    Scanner: {
      SCAN_RESULT: 'scan-result',
      subscribe: (callback: (event: string, result: ScanResult) => void) => {
        scanCallback = callback;
      },
      isRunning: () => scannerRunning,
      start: () => {
        scannerStarts += 1;
        scannerRunning = true;
        return true;
      },
      stop: () => {
        scannerStops += 1;
        scannerRunning = false;
      }
    }
  };
  const Timer = {
    set: (durationMs: number, repeat: boolean, callback: () => void) => {
      timers.push({ durationMs, repeat, callback });
      return timers.length;
    }
  };

  const base = createDefaultShellyThermostatConfig(
    'tp357_custom_v1',
    'humidifying'
  );
  const script = generateShellyThermostatScript({
    ...base,
    sensor: {
      ...base.sensor,
      runtimeAddress: address
    },
    rule: {
      ...base.rule,
      consecutiveHits: 1
    }
  });
  const generatedRuntime = new Function(
    'Shelly',
    'BLE',
    'Timer',
    `${script}\nreturn {diag:function(){return JSON.parse(diag());}};`
  )(Shelly, BLE, Timer) as { diag: () => { g: unknown[] } };

  const bootScanner = timers.find(
    (timer) => timer.durationMs === 1_000 && timer.repeat === false
  );
  const watchdog = timers.find(
    (timer) => timer.durationMs === 30_000 && timer.repeat === true
  );
  if (!bootScanner || !watchdog) {
    throw new Error('Generated scanner timers are missing.');
  }
  if (!scanCallback) {
    throw new Error('Generated runtime did not subscribe to BLE scanner.');
  }

  return {
    address,
    bootScanner,
    watchdog,
    diag: generatedRuntime.diag,
    scan: scanCallback,
    setNowMs: (value: number) => {
      nowMs = value;
    },
    setScannerRunning: (value: boolean) => {
      scannerRunning = value;
    },
    scannerStarts: () => scannerStarts,
    scannerStops: () => scannerStops
  };
};

describe('Climate BLE scanner watchdog', () => {
  it('does not restart a healthy scanner merely because the sensor is silent', () => {
    const runtime = createWatchdogRuntime();

    runtime.bootScanner.callback();
    expect(runtime.scannerStarts()).toBe(1);

    runtime.setNowMs(180_000);
    runtime.watchdog.callback();
    runtime.setNowMs(240_000);
    runtime.watchdog.callback();

    expect(runtime.scannerStarts()).toBe(1);
    expect(runtime.scannerStops()).toBe(0);
  });

  it('starts the scanner again when scanner liveness reports it stopped', () => {
    const runtime = createWatchdogRuntime();

    runtime.bootScanner.callback();
    runtime.setScannerRunning(false);
    runtime.setNowMs(60_000);
    runtime.watchdog.callback();

    expect(runtime.scannerStarts()).toBe(2);
    expect(runtime.scannerStops()).toBe(0);
  });

  it('keeps the scanner alive across stale sensor loss and clears the fault on fresh TP357 data', () => {
    const runtime = createWatchdogRuntime();

    runtime.bootScanner.callback();
    runtime.setNowMs(1_000);
    runtime.scan('scan-result', {
      addr: runtime.address,
      advData: manufacturerAdvertisement([
        0xc2, 0xdc, 0x00, 0x32, 0x02, 0x2c
      ]),
      rssi: -50
    });

    expect(runtime.diag().g[1]).toBe(22);
    expect(runtime.diag().g[2]).toBe(50);
    expect(runtime.diag().g[21]).toBeNull();

    runtime.setNowMs(122_000);
    runtime.watchdog.callback();

    expect(runtime.diag().g[21]).toBe('st');
    expect(runtime.scannerStarts()).toBe(1);
    expect(runtime.scannerStops()).toBe(0);

    runtime.setNowMs(123_000);
    runtime.scan('scan-result', {
      addr: runtime.address,
      advData: manufacturerAdvertisement([
        0xc2, 0xdf, 0x00, 0x4a, 0x22, 0x0b, 0x01
      ]),
      rssi: -60
    });

    expect(runtime.diag().g[1]).toBe(22.3);
    expect(runtime.diag().g[2]).toBe(74);
    expect(runtime.diag().g[21]).toBeNull();
    expect(runtime.scannerStarts()).toBe(1);
    expect(runtime.scannerStops()).toBe(0);
  });
});
