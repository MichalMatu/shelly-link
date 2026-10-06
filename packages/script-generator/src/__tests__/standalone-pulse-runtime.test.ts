import {
  decodeHistoryKvsItems,
  type StandalonePulseAutomationConfig
} from '@lcl/automation-core';
import { describe, expect, it } from 'vitest';
import {
  decodeShellyStandalonePulseScript,
  generateShellyStandalonePulseScript,
  SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES,
  standalonePulseAutomationConfigSchema,
  standalonePulseControlEvalCode
} from '../index.js';
import { renderPulseCycleExecution } from '../shelly/runtime/execution.js';

const config: StandalonePulseAutomationConfig = {
  relayId: 0,
  pulse: {
    onMs: 1_000,
    offMs: 2_000,
    initialDelayMs: 0,
    startPhase: 'on',
    execution: { mode: 'continuous' }
  }
};

type TimerEntry = { dueMs: number; callback: () => void };

const runGenerated = ({
  input = config,
  switchErrors = [] as string[],
  relayOnError = false,
  kvsError = false
}: {
  input?: StandalonePulseAutomationConfig;
  switchErrors?: string[];
  relayOnError?: boolean;
  kvsError?: boolean;
} = {}) => {
  let nowMs = 100_000;
  let nextTimerId = 1;
  const timers = new Map<number, TimerEntry>();
  const relayCalls: boolean[] = [];
  const kvs = new Map<string, string>();
  let relayOn = false;
  let eventHandler: ((event: unknown) => void) | null = null;

  const Timer = {
    set: (delayMs: number, repeat: boolean, callback: () => void) => {
      expect(repeat).toBe(false);
      const id = nextTimerId++;
      timers.set(id, { dueMs: nowMs + delayMs, callback });
      return id;
    },
    clear: (id: number) => timers.delete(id)
  };
  const Shelly = {
    getUptimeMs: () => nowMs,
    getComponentStatus: (component: string) => {
      if (component === 'sys') return { unixtime: 1_790_000_000 };
      if (component === `switch:${input.relayId}`) {
        return { errors: switchErrors, apower: relayOn ? 18.4 : 0, current: relayOn ? 0.08 : 0 };
      }
      return null;
    },
    addEventHandler: (handler: (event: unknown) => void) => {
      eventHandler = handler;
    },
    call: (
      method: string,
      params: { id?: number; on?: boolean; key?: string; value?: string },
      callback?: (result: unknown, errorCode: number) => void
    ) => {
      if (method === 'KVS.Get') {
        if (kvsError || !params.key || !kvs.has(params.key)) { callback?.({}, 1); return; }
        callback?.({ value: kvs.get(params.key) }, 0); return;
      }
      if (method === 'KVS.Set') {
        if (kvsError || !params.key || typeof params.value !== 'string') { callback?.({}, 1); return; }
        kvs.set(params.key, params.value); callback?.({ etag: 'test', rev: kvs.size }, 0); return;
      }
      expect(method).toBe('Switch.Set');
      expect(params.id).toBe(input.relayId);
      const on = params.on === true;
      relayCalls.push(on);
      if (on && relayOnError && callback) { Timer.set(0, false, () => callback({}, 1)); return; }
      relayOn = on;
      callback?.({}, 0);
    }
  };

  const script = generateShellyStandalonePulseScript(input);
  const api = new Function('Shelly', 'Timer', `${script};return {rq:rq};`)(
    Shelly,
    Timer
  ) as { rq: (active: boolean) => number };

  const advance = (durationMs: number) => {
    const target = nowMs + durationMs;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, entry]) => entry.dueMs <= target)
        .sort((left, right) => left[1].dueMs - right[1].dueMs || left[0] - right[0])[0];
      if (!next) break;
      const [id, entry] = next;
      timers.delete(id);
      nowMs = entry.dueMs;
      entry.callback();
    }
    nowMs = target;
  };

  return {
    api,
    script,
    timers,
    relayCalls,
    kvs,
    advance,
    emit: (event: unknown) => eventHandler?.(event)
  };
};

describe('Standalone Pulse generated runtime', () => {
  it('validates the bounded Pulse contract and relay id', () => {
    expect(standalonePulseAutomationConfigSchema.parse(config)).toEqual(config);
    expect(() =>
      standalonePulseAutomationConfigSchema.parse({ ...config, relayId: -1 })
    ).toThrow();
    expect(() =>
      standalonePulseAutomationConfigSchema.parse({
        ...config,
        pulse: { ...config.pulse, onMs: 999 }
      })
    ).toThrow();
  });

  it('round-trips source config and enforces the accepted 12 KB ceiling', () => {
    const script = generateShellyStandalonePulseScript(config);
    expect(decodeShellyStandalonePulseScript(script)).toEqual(config);
    expect(SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES).toBe(12_000);
    expect(new TextEncoder().encode(script).length).toBeLessThanOrEqual(12_000);
  });

  it('encodes Continuous, Cycles, Duration, initial delay and OFF start phase', () => {
    expect(generateShellyStandalonePulseScript(config)).toContain(
      '"e":[1000,2000,0,0,0]'
    );
    expect(
      generateShellyStandalonePulseScript({
        ...config,
        pulse: {
          ...config.pulse,
          initialDelayMs: 500,
          startPhase: 'off',
          execution: { mode: 'cycles', count: 3 }
        }
      })
    ).toContain('"e":[1000,2000,500,1,3]');
    expect(
      generateShellyStandalonePulseScript({
        ...config,
        pulse: {
          ...config.pulse,
          execution: { mode: 'duration', durationMs: 5_000 }
        }
      })
    ).toContain('"e":[1000,2000,0,0,-5000]');
  });

  it('rejects absent, malformed and schema-invalid embedded configs', () => {
    expect(decodeShellyStandalonePulseScript('// g: 0.7.1\n')).toBeNull();
    expect(decodeShellyStandalonePulseScript('// c: {not-json}\n')).toBeNull();
    expect(decodeShellyStandalonePulseScript('// c: {"bad":true}\n')).toBeNull();
  });

  it('embeds the exact shared Pulse cycle engine rather than a fork', () => {
    const script = generateShellyStandalonePulseScript(config);
    const compactSharedEngine = renderPulseCycleExecution().replace(/\n\s*/g, '');
    expect(script).toContain(compactSharedEngine);
  });

  it('exposes only lifecycle start/cancel control around the parentless Pulse', () => {
    expect(standalonePulseControlEvalCode(true)).toBe('rq(true)');
    expect(standalonePulseControlEvalCode(false)).toBe('rq(false)');
  });

  it('writes standalone Pulse decisions into the shared History v2 ring', () => {
    const runtime = runGenerated();
    runtime.advance(1_000);
    const decoded = decodeHistoryKvsItems([...runtime.kvs.entries()].map(([key, value]) => ({ key, value })));
    expect(decoded.meta).toEqual({ version: 2, slots: 24, nextSlot: 3, validSlots: 3 });
    expect(decoded.records).toHaveLength(3);
    expect(decoded.records[0]).toMatchObject({ temperatureC: null, humidityPct: null, vpdKpa: null, requestedRelayOn: false, finalRelayOn: false, controlMode: 'auto', manualRequestOn: false, safetyLockout: false, powerW: 0, currentA: 0 });
    expect(decoded.records[1]).toMatchObject({ temperatureC: null, humidityPct: null, vpdKpa: null, requestedRelayOn: true, finalRelayOn: true, reasonCode: 'po', powerW: 18.4, currentA: 0.08 });
    expect(decoded.records[2]).toMatchObject({ requestedRelayOn: false, finalRelayOn: false, reasonCode: 'pf', powerW: 0, currentA: 0 });
  });

  it('keeps Pulse relay behavior unchanged when History KVS is unavailable', () => {
    const healthy = runGenerated();
    const failing = runGenerated({ kvsError: true });
    expect(failing.relayCalls).toEqual(healthy.relayCalls);
    failing.advance(3_000);
    healthy.advance(3_000);
    expect(failing.relayCalls).toEqual(healthy.relayCalls);
    expect(failing.kvs.size).toBe(0);
  });

  it('boots by forcing OFF and then starts a fresh cycle from phase zero', () => {
    const runtime = runGenerated();
    expect(runtime.relayCalls).toEqual([false, true]);
    runtime.advance(1_000);
    expect(runtime.relayCalls).toEqual([false, true, false]);
    runtime.advance(2_000);
    expect(runtime.relayCalls).toEqual([false, true, false, true]);
  });

  it('keeps the relay OFF throughout initial delay before starting the configured phase', () => {
    const runtime = runGenerated({
      input: {
        ...config,
        pulse: { ...config.pulse, initialDelayMs: 500 }
      }
    });
    expect(runtime.relayCalls).toEqual([false]);
    runtime.advance(499);
    expect(runtime.relayCalls).toEqual([false]);
    runtime.advance(1);
    expect(runtime.relayCalls).toEqual([false, true]);
  });

  it('honors OFF start phase before the first ON phase', () => {
    const runtime = runGenerated({
      input: {
        ...config,
        pulse: { ...config.pulse, startPhase: 'off' }
      }
    });
    expect(runtime.relayCalls).toEqual([false]);
    runtime.advance(1_999);
    expect(runtime.relayCalls).toEqual([false]);
    runtime.advance(1);
    expect(runtime.relayCalls).toEqual([false, true]);
  });

  it('completes fixed Cycles safe OFF and leaves no active phase timer', () => {
    const runtime = runGenerated({
      input: {
        ...config,
        pulse: { ...config.pulse, execution: { mode: 'cycles', count: 2 } }
      }
    });
    runtime.advance(4_000);
    expect(runtime.relayCalls.at(-1)).toBe(false);
    expect(runtime.timers.size).toBe(0);
  });

  it('truncates Duration at the exact bound and completes safe OFF', () => {
    const runtime = runGenerated({
      input: {
        ...config,
        pulse: { ...config.pulse, execution: { mode: 'duration', durationMs: 1_500 } }
      }
    });
    runtime.advance(1_499);
    expect(runtime.relayCalls.at(-1)).toBe(false);
    runtime.advance(1);
    expect(runtime.relayCalls.at(-1)).toBe(false);
    expect(runtime.timers.size).toBe(0);
  });

  it('lifecycle cancellation immediately forces OFF and cancels the phase timer', () => {
    const runtime = runGenerated();
    expect(runtime.relayCalls.at(-1)).toBe(true);
    runtime.api.rq(false);
    expect(runtime.relayCalls.at(-1)).toBe(false);
    expect(runtime.timers.size).toBe(0);
    runtime.advance(5_000);
    expect(runtime.relayCalls.at(-1)).toBe(false);
  });

  it('relay-control faults cancel Pulse, latch the fault and force OFF', () => {
    const runtime = runGenerated({ relayOnError: true });
    expect(runtime.relayCalls).toEqual([false, true]);

    runtime.advance(0);

    expect(runtime.relayCalls).toEqual([false, true, false]);
    expect(runtime.timers.size).toBe(0);
    expect(runtime.api.rq(true)).toBe(-1);
    runtime.advance(5_000);
    expect(runtime.relayCalls.at(-1)).toBe(false);
  });

  it('native protection errors cancel Pulse and force OFF with precedence', () => {
    const runtime = runGenerated();
    expect(runtime.relayCalls.at(-1)).toBe(true);
    runtime.emit({ component: 'switch:0', delta: { errors: ['overtemp'] } });
    expect(runtime.relayCalls.at(-1)).toBe(false);
    expect(runtime.timers.size).toBe(0);
    expect(runtime.api.rq(true)).toBe(-1);
  });

  it('does not start a cycle when a native protection error already exists at boot', () => {
    const runtime = runGenerated({ switchErrors: ['overtemp'] });
    expect(runtime.relayCalls).toEqual([false, false]);
    expect(runtime.timers.size).toBe(0);
  });
});
