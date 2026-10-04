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

const createWatchdogRuntime = () => {
  let nowMs = 0;
  let scannerRunning = false;
  let scannerStarts = 0;
  let scannerStops = 0;
  let relayOn = false;
  const timers: TimerEntry[] = [];

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
      subscribe: () => undefined,
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

  const script = generateShellyThermostatScript(createDefaultShellyThermostatConfig());
  new Function('Shelly', 'BLE', 'Timer', script)(Shelly, BLE, Timer);

  const bootScanner = timers.find(
    (timer) => timer.durationMs === 1_000 && timer.repeat === false
  );
  const watchdog = timers.find(
    (timer) => timer.durationMs === 30_000 && timer.repeat === true
  );
  if (!bootScanner || !watchdog) throw new Error('Generated scanner timers are missing.');

  return {
    bootScanner,
    watchdog,
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
});
