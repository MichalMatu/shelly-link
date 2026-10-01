import { describe, expect, it } from 'vitest';
import {
  decodeShellyTimePulseScript,
  generateShellyTimePulseScript,
  timePulseAutomationConfigSchema,
  timePulseScheduleEvalCode
} from '../index.js';
import { renderPulseCycleExecution } from '../shelly/runtime/execution.js';

const config = {
  schedule: { relayId: 0, onTime: '22:00', offTime: '06:00' },
  pulse: {
    onMs: 1_000,
    offMs: 2_000,
    initialDelayMs: 0,
    startPhase: 'on' as const,
    execution: { mode: 'continuous' as const }
  }
};

type TimerEntry = { dueMs: number; callback: () => void };

const runGenerated = ({
  localTime = '23:30',
  unixTime = 1_800_000_000,
  switchErrors = [] as string[]
}: {
  localTime?: string;
  unixTime?: number;
  switchErrors?: string[];
} = {}) => {
  let nowMs = 100_000;
  let nextTimerId = 1;
  const sysStatus: { time?: string; unixtime?: number } = {
    time: localTime,
    unixtime: unixTime
  };
  const timers = new Map<number, TimerEntry>();
  const relayCalls: boolean[] = [];
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
      if (component === 'sys') return sysStatus;
      if (component === 'switch:0') return { errors: switchErrors };
      return null;
    },
    addEventHandler: (handler: (event: unknown) => void) => {
      eventHandler = handler;
    },
    call: (
      method: string,
      params: { id: number; on: boolean },
      callback?: (result: unknown, errorCode: number) => void
    ) => {
      expect(method).toBe('Switch.Set');
      expect(params.id).toBe(0);
      relayCalls.push(params.on);
      callback?.({}, 0);
    }
  };

  const script = generateShellyTimePulseScript(config);
  const api = new Function(
    'Shelly',
    'Timer',
    `${script};return {rq:rq};`
  )(Shelly, Timer) as { rq: (active: boolean) => number };

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
    advance,
    emit: (event: unknown) => eventHandler?.(event)
  };
};

describe('Time + Pulse generated runtime', () => {
  it('keeps the legacy daily schedule shape separate from Pulse composition', () => {
    expect(timePulseAutomationConfigSchema.parse(config)).toEqual(config);
    expect(() =>
      timePulseAutomationConfigSchema.parse({
        ...config,
        schedule: { relayId: 0, onTime: '10:00', offTime: '10:00' }
      })
    ).toThrow();
  });

  it('round-trips the explicit Time + Pulse config and stays under the hard ceiling', () => {
    const script = generateShellyTimePulseScript(config);
    expect(decodeShellyTimePulseScript(script)).toEqual(config);
    expect(new TextEncoder().encode(script).length).toBeLessThanOrEqual(12_000);
    expect(script).toContain('"w":[1320,360]');
  });

  it('reuses the shared Pulse cycle engine rather than a fork', () => {
    const script = generateShellyTimePulseScript(config);
    const compactSharedEngine = renderPulseCycleExecution().replace(/\n\s*/g, '');
    expect(script).toContain(compactSharedEngine);
  });

  it('exposes minimal native-schedule start and cancel eval commands', () => {
    expect(timePulseScheduleEvalCode(true)).toBe('rq(true)');
    expect(timePulseScheduleEvalCode(false)).toBe('rq(false)');
  });

  it('boots safe OFF, starts a fresh Pulse inside the overnight window, and alternates', () => {
    const runtime = runGenerated();
    expect(runtime.relayCalls).toEqual([false, true]);

    runtime.advance(1_000);
    expect(runtime.relayCalls).toEqual([false, true, false]);

    runtime.advance(2_000);
    expect(runtime.relayCalls).toEqual([false, true, false, true]);
  });

  it('stays OFF while the daily window is closed without owning a boundary timer', () => {
    const runtime = runGenerated({ localTime: '12:00' });
    expect(runtime.relayCalls).toEqual([false]);
    expect(runtime.timers.size).toBe(0);

    runtime.api.rq(true);
    expect(runtime.relayCalls.at(-1)).toBe(true);
  });

  it('fails safe OFF when the Shelly clock is not trustworthy', () => {
    const runtime = runGenerated({ localTime: '23:30', unixTime: 0 });
    expect(runtime.relayCalls).toEqual([false]);
    expect(runtime.timers.size).toBe(0);
    expect(runtime.api.rq(true)).toBe(-1);
  });

  it('native OFF schedule cancels an in-flight Pulse immediately', () => {
    const runtime = runGenerated();
    expect(runtime.relayCalls.at(-1)).toBe(true);

    runtime.api.rq(false);
    expect(runtime.relayCalls.at(-1)).toBe(false);

    runtime.advance(5_000);
    expect(runtime.relayCalls.at(-1)).toBe(false);
  });

  it('cancels Pulse and forces OFF when native Shelly protection reports an error', () => {
    const runtime = runGenerated();
    expect(runtime.relayCalls.at(-1)).toBe(true);

    runtime.emit({ component: 'switch:0', delta: { errors: ['overtemp'] } });
    expect(runtime.relayCalls.at(-1)).toBe(false);

    runtime.advance(5_000);
    expect(runtime.relayCalls.at(-1)).toBe(false);
  });

  it('does not start Pulse on boot when a native protection error is already present', () => {
    const runtime = runGenerated({ switchErrors: ['overtemp'] });
    expect(runtime.relayCalls).toEqual([false, false]);
    runtime.advance(5_000);
    expect(runtime.relayCalls.at(-1)).toBe(false);
  });
});
