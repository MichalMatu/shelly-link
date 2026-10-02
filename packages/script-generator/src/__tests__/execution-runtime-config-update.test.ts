import {
  configHash,
  createDefaultShellyThermostatConfig,
  generateShellyRuntimeConfigUpdateEval
} from '../index.js';

describe('execution runtime config update', () => {
  it('cancels stale Pulse and active-window timers when execution is removed', () => {
    const config = createDefaultShellyThermostatConfig();
    const code = generateShellyRuntimeConfigUpdateEval(config);
    const pulseCancels: string[] = [];
    const clearedTimers: number[] = [];
    const relayCalls: boolean[] = [];
    const runtime: Record<string, unknown> = {
      m: 0,
      mn: false,
      lk: false,
      rs: 'po',
      mt: 10,
      pa: true,
      wi: 77,
      wo: 1,
      on: true
    };
    const evaluate = new Function(
      'C',
      'R',
      'vc',
      'Script',
      'nw',
      's',
      'cx',
      'Timer',
      `return ${code};`
    ) as (
      currentConfig: Record<string, unknown>,
      runtimeState: Record<string, unknown>,
      validate: (value: unknown) => boolean,
      scriptApi: { storage: { setItem: (key: string, value: string) => void } },
      now: () => number,
      setRelay: (on: boolean) => void,
      cancelPulse: (reason: string) => void,
      timer: { clear: (id: number) => void }
    ) => string;

    const result = evaluate(
      {},
      runtime,
      () => true,
      { storage: { setItem: () => undefined } },
      () => 1234,
      (on) => relayCalls.push(on),
      (reason) => pulseCancels.push(reason),
      { clear: (id) => clearedTimers.push(id) }
    );

    expect(result).toBe(configHash(config));
    expect(pulseCancels).toEqual(['cu']);
    expect(clearedTimers).toEqual([77]);
    expect(relayCalls).toEqual([false]);
    expect(runtime).toMatchObject({
      pa: false,
      wi: 0,
      wo: -1,
      on: false,
      a: false,
      af: 'st'
    });
  });
});
