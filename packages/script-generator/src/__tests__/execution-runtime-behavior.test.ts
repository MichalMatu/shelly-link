import { describe, expect, it } from 'vitest';
import { renderClimateExecution } from '../shelly/runtime/execution.js';

type RelayCall = {
  on: boolean;
  reason: string;
  forced: boolean;
  atMs: number;
};

type TimerEntry = {
  dueMs: number;
  callback: () => void;
};

const createExecutionHarness = ({
  pulse,
  activeWindow,
  pulseConfig = [1_000, 2_000, 0, 0, 0],
  windowConfig = [22 * 60, 6 * 60]
}: {
  pulse: boolean;
  activeWindow: boolean;
  pulseConfig?: [number, number, number, 0 | 1, number];
  windowConfig?: [number, number];
}) => {
  let nowMs = 100_000;
  let nextTimerId = 1;
  let sysStatus: { time?: string; unixtime?: number } = {
    time: '23:30',
    unixtime: 1_800_000_000
  };
  const timers = new Map<number, TimerEntry>();
  const relayCalls: RelayCall[] = [];
  const runtime: Record<string, unknown> = {
    pa: false,
    m: 0,
    lk: false,
    af: null,
    a: false,
    ls: nowMs,
    ps: 0,
    pc: 0,
    pt: null,
    pn: null,
    pi: 0,
    wo: activeWindow ? -1 : undefined,
    wi: activeWindow ? 0 : undefined
  };
  const config = {
    e: pulseConfig,
    w: windowConfig,
    s: 90_000
  };
  const timer = {
    set: (delayMs: number, repeat: boolean, callback: () => void) => {
      expect(repeat).toBe(false);
      const id = nextTimerId++;
      timers.set(id, { dueMs: nowMs + delayMs, callback });
      return id;
    },
    clear: (id: number) => {
      timers.delete(id);
    }
  };
  const sw = (on: boolean, reason: string, forced: boolean) => {
    if (!forced) runtime.a = on;
    relayCalls.push({ on, reason, forced, atMs: nowMs });
  };
  const shelly = {
    getComponentStatus: (component: string) => (component === 'sys' ? sysStatus : null)
  };
  const code = renderClimateExecution(pulse, activeWindow);
  const api = new Function(
    'C',
    'R',
    'Timer',
    'nw',
    'sw',
    'Shelly',
    `${code};return {rq:rq,px:typeof px==="function"?px:null,wu:typeof wu==="function"?wu:null};`
  )(config, runtime, timer, () => nowMs, sw, shelly) as {
    rq: (active: boolean, reason: string) => void;
    px: (() => void) | null;
    wu: (() => void) | null;
  };

  const advance = (durationMs: number) => {
    const targetMs = nowMs + durationMs;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, entry]) => entry.dueMs <= targetMs)
        .sort((left, right) => left[1].dueMs - right[1].dueMs || left[0] - right[0])[0];
      if (!next) break;
      const [id, entry] = next;
      timers.delete(id);
      nowMs = entry.dueMs;
      entry.callback();
    }
    nowMs = targetMs;
  };

  return {
    api,
    runtime,
    relayCalls,
    timers,
    advance,
    setSysStatus: (status: { time?: string; unixtime?: number }) => {
      sysStatus = status;
    },
    setNowMs: (value: number) => {
      nowMs = value;
      runtime.ls = value;
    }
  };
};

describe('generated Climate execution runtime', () => {
  it('runs Continuous Pulse with initial delay and alternating phases', () => {
    const harness = createExecutionHarness({
      pulse: true,
      activeWindow: false,
      pulseConfig: [1_000, 2_000, 500, 0, 0]
    });

    harness.api.rq(true, 'bl');
    expect(harness.relayCalls.map(({ on, reason }) => [on, reason])).toEqual([
      [false, 'pd']
    ]);

    harness.advance(500);
    harness.advance(1_000);
    harness.advance(2_000);

    expect(harness.relayCalls.map(({ on, reason }) => [on, reason])).toEqual([
      [false, 'pd'],
      [true, 'po'],
      [false, 'pf'],
      [true, 'po']
    ]);
    expect(harness.runtime.ps).toBe(2);
    expect(harness.runtime.pc).toBe(1);
  });

  it('completes fixed cycles safe OFF for both start phases', () => {
    const startOn = createExecutionHarness({
      pulse: true,
      activeWindow: false,
      pulseConfig: [1_000, 2_000, 0, 0, 2]
    });
    startOn.api.rq(true, 'bl');
    startOn.advance(4_000);

    expect(startOn.relayCalls.map(({ on, reason }) => [on, reason])).toEqual([
      [true, 'po'],
      [false, 'pf'],
      [true, 'po'],
      [false, 'pc']
    ]);
    expect(startOn.runtime.ps).toBe(4);
    expect(startOn.runtime.pc).toBe(2);
    expect(startOn.timers.size).toBe(0);

    const startOff = createExecutionHarness({
      pulse: true,
      activeWindow: false,
      pulseConfig: [1_000, 2_000, 0, 1, 2]
    });
    startOff.api.rq(true, 'bl');
    startOff.advance(6_000);

    expect(startOff.relayCalls.map(({ on, reason }) => [on, reason])).toEqual([
      [false, 'pf'],
      [true, 'po'],
      [false, 'pf'],
      [true, 'po'],
      [false, 'pc']
    ]);
    expect(startOff.runtime.ps).toBe(4);
    expect(startOff.runtime.pc).toBe(2);
  });

  it('clips the final Duration phase and completes exactly at the duration boundary', () => {
    const harness = createExecutionHarness({
      pulse: true,
      activeWindow: false,
      pulseConfig: [1_000, 2_000, 0, 0, -2_500]
    });

    harness.api.rq(true, 'bl');
    harness.advance(2_499);
    expect(harness.runtime.ps).toBe(3);
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: false, reason: 'pf' });

    harness.advance(1);
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: false, reason: 'pc' });
    expect(harness.runtime.ps).toBe(4);
    expect(harness.timers.size).toBe(0);
  });

  it('cancels an active Pulse immediately when the parent request becomes inactive', () => {
    const harness = createExecutionHarness({ pulse: true, activeWindow: false });

    harness.api.rq(true, 'bl');
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: true, reason: 'po' });
    expect(harness.timers.size).toBe(1);

    harness.api.rq(false, 'ab');

    expect(harness.runtime.pa).toBe(false);
    expect(harness.runtime.ps).toBe(0);
    expect(harness.runtime.pi).toBe(0);
    expect(harness.timers.size).toBe(0);
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: false, reason: 'pp' });

    const callCount = harness.relayCalls.length;
    harness.advance(60_000);
    expect(harness.relayCalls).toHaveLength(callCount);
  });

  it('keeps parent intent but does not start Pulse while MANUAL, fault or safety owns precedence', () => {
    const harness = createExecutionHarness({ pulse: true, activeWindow: false });

    harness.runtime.m = 1;
    harness.api.rq(true, 'bl');
    expect(harness.runtime.pa).toBe(true);
    expect(harness.relayCalls).toEqual([]);

    harness.runtime.m = 0;
    harness.runtime.af = 'st';
    harness.api.rq(true, 'bl');
    expect(harness.relayCalls).toEqual([]);

    harness.runtime.af = null;
    harness.runtime.lk = true;
    harness.api.rq(true, 'bl');
    expect(harness.relayCalls).toEqual([]);

    harness.runtime.lk = false;
    harness.api.rq(true, 'bl');
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: true, reason: 'po' });
  });

  it('opens and closes an overnight active window at exact boundaries', () => {
    const harness = createExecutionHarness({ pulse: false, activeWindow: true });
    harness.runtime.pa = true;
    harness.setNowMs(200_000);
    harness.setSysStatus({ time: '23:30', unixtime: 1_800_000_000 });

    harness.api.wu?.();
    expect(harness.runtime.wo).toBe(1);
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: true, reason: 'wi' });

    harness.setSysStatus({ time: '06:00', unixtime: 1_800_023_400 });
    harness.api.wu?.();
    expect(harness.runtime.wo).toBe(0);
    expect(harness.runtime.a).toBe(false);
    expect(harness.relayCalls.at(-1)).toMatchObject({
      on: false,
      reason: 'pw',
      forced: true
    });
  });

  it('fails an active window safe OFF on invalid Shelly time and resumes only after valid time returns', () => {
    const harness = createExecutionHarness({ pulse: true, activeWindow: true });
    harness.runtime.pa = true;
    harness.runtime.wo = 1;
    harness.api.rq(true, 'bl');
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: true, reason: 'po' });

    harness.setSysStatus({ time: 'not-a-time', unixtime: 0 });
    harness.api.wu?.();
    expect(harness.runtime.wo).toBe(-1);
    expect(harness.runtime.af).toBe('tm');
    expect(harness.runtime.ps).toBe(0);
    expect(harness.relayCalls.at(-1)).toMatchObject({
      on: false,
      reason: 'tm',
      forced: true
    });

    harness.setSysStatus({ time: '23:45', unixtime: 1_800_000_900 });
    harness.api.wu?.();
    expect(harness.runtime.wo).toBe(1);
    expect(harness.runtime.af).toBeNull();
    expect(harness.relayCalls.at(-1)).toMatchObject({ on: true, reason: 'po' });
  });
});
