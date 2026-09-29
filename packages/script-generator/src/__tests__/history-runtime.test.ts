import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript
} from '../index.js';

const advertisement = (payload: number[]): number[] => [
  payload.length + 3,
  0x16,
  0xd2,
  0xfc,
  ...payload
];

const createRuntime = (kvsFails = false) => {
  const script = generateShellyThermostatScript(
    createDefaultShellyThermostatConfig('xiaomi_lywsd03mmc_bthome_v2', 'humidifying')
  );
  let scan:
    | ((event: string, result: { addr: string; advData: number[]; rssi: number }) => void)
    | undefined;
  let relayOn = false;
  const relayCalls: boolean[] = [];
  const kvs = new Map<string, string>();
  const timers: Array<{ durationMs: number; callback: () => void }> = [];
  const Shelly = {
    call: (
      method: string,
      params: Record<string, unknown>,
      callback?: (result: unknown, code: number) => void
    ) => {
      if (method === 'Switch.Set') {
        relayOn = Boolean(params.on);
        relayCalls.push(relayOn);
        callback?.({}, 0);
        return;
      }
      if (method === 'KVS.Get') {
        callback?.(
          kvs.has(String(params.key)) ? { value: kvs.get(String(params.key)) } : {},
          0
        );
        return;
      }
      if (method === 'KVS.Set') {
        if (!kvsFails) kvs.set(String(params.key), String(params.value));
        callback?.({}, kvsFails ? 1 : 0);
        return;
      }
      callback?.({}, 0);
    },
    getUptimeMs: () => 123_000,
    getComponentStatus: (component: string) =>
      component === 'sys'
        ? { unixtime: 1_790_000_000 }
        : component === 'switch:0'
          ? { output: relayOn, apower: relayOn ? 12.3 : 0, current: relayOn ? 0.055 : 0 }
          : null
  };
  const BLE = {
    Scanner: {
      SCAN_RESULT: 'scan-result',
      stop: () => undefined,
      subscribe: (callback: typeof scan) => {
        scan = callback;
      },
      start: () => true
    }
  };
  const Timer = {
    set: (durationMs: number, _repeat: boolean, callback: () => void) => {
      timers.push({ durationMs, callback });
    }
  };

  new Function('Shelly', 'BLE', 'Timer', script)(Shelly, BLE, Timer);
  if (!scan) throw new Error('Runtime did not subscribe to BLE.');
  return { scan, relayCalls, kvs, timers };
};

describe('History v2 generated runtime writer', () => {
  it('persists boot and relay-decision records in the v2 KVS ring', () => {
    const runtime = createRuntime();
    runtime.timers.find(({ durationMs }) => durationMs === 1500)?.callback();

    expect(runtime.kvs.get('shellylink.history.meta')).toBe('[2,24,1,1]');
    expect(JSON.parse(runtime.kvs.get('shellylink.history.00') ?? 'null')).toEqual([
      2,
      [[1_790_000_000, 123, null, null, null, 0, 'b', 'st', null, 0, 0]]
    ]);

    const lowHumidity = advertisement([0x40, 0x02, 0x2c, 0x0c, 0x03, 0xa0, 0x0f]);
    runtime.scan('scan-result', {
      addr: 'AA:BB:CC:DD:EE:FF',
      advData: lowHumidity,
      rssi: -35
    });
    runtime.scan('scan-result', {
      addr: 'AA:BB:CC:DD:EE:FF',
      advData: lowHumidity,
      rssi: -35
    });

    expect(runtime.relayCalls.at(-1)).toBe(true);
    const meta = JSON.parse(
      runtime.kvs.get('shellylink.history.meta') ?? 'null'
    ) as number[];
    expect(meta[0]).toBe(2);
    expect(meta[1]).toBe(24);
    expect(meta[2]).toBeGreaterThanOrEqual(2);
    const latestSlot = (meta[2]! + 23) % 24;
    const latest = JSON.parse(
      runtime.kvs.get(`shellylink.history.${String(latestSlot).padStart(2, '0')}`) ??
        'null'
    ) as [number, unknown[][]];
    expect(latest[0]).toBe(2);
    expect(latest[1][0]?.[5]).toBe(3);
    expect(latest[1][0]?.[6]).toBe('bl');
    expect(latest[1][0]?.[7]).toBeNull();
  });

  it('keeps Climate relay arbitration working when every History KVS write fails', () => {
    const runtime = createRuntime(true);
    runtime.timers.find(({ durationMs }) => durationMs === 1500)?.callback();
    const lowHumidity = advertisement([0x40, 0x02, 0x2c, 0x0c, 0x03, 0xa0, 0x0f]);

    runtime.scan('scan-result', {
      addr: 'AA:BB:CC:DD:EE:FF',
      advData: lowHumidity,
      rssi: -35
    });
    runtime.scan('scan-result', {
      addr: 'AA:BB:CC:DD:EE:FF',
      advData: lowHumidity,
      rssi: -35
    });

    expect(runtime.relayCalls.at(-1)).toBe(true);
    expect(runtime.kvs.size).toBe(0);
  });
});
