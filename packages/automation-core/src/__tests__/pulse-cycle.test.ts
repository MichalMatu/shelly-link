import { describe, expect, it } from 'vitest';
import {
  evaluatePulseCycle,
  validatePulseCycleConfig,
  type PulseCycleConfig
} from '../actions/pulseCycle.js';

const continuous = (
  overrides: Partial<PulseCycleConfig> = {}
): PulseCycleConfig => ({
  onMs: 10_000,
  offMs: 20_000,
  initialDelayMs: 0,
  startPhase: 'on',
  execution: { mode: 'continuous' },
  ...overrides
});

describe('Pulse cycle', () => {
  it('runs continuous ON/OFF phases from the configured start phase', () => {
    const config = continuous();

    expect(evaluatePulseCycle(config, 1_000, 1_000)).toMatchObject({
      status: 'running',
      phase: 'on',
      relayOn: true,
      cyclesCompleted: 0,
      phaseRemainingMs: 10_000,
      nextTransitionAtMs: 11_000
    });
    expect(evaluatePulseCycle(config, 1_000, 10_999)).toMatchObject({
      status: 'running',
      phase: 'on',
      phaseRemainingMs: 1
    });
    expect(evaluatePulseCycle(config, 1_000, 11_000)).toMatchObject({
      status: 'running',
      phase: 'off',
      relayOn: false,
      cyclesCompleted: 1,
      phaseRemainingMs: 20_000
    });
    expect(evaluatePulseCycle(config, 1_000, 31_000)).toMatchObject({
      status: 'running',
      phase: 'on',
      relayOn: true,
      cyclesCompleted: 1
    });
  });

  it('keeps output OFF during the initial delay and starts a fresh cycle afterwards', () => {
    const config = continuous({ initialDelayMs: 5_000 });

    expect(evaluatePulseCycle(config, 1_000, 3_000)).toEqual({
      status: 'delay',
      relayOn: false,
      elapsedMs: 2_000,
      cyclesCompleted: 0,
      remainingDelayMs: 3_000,
      nextTransitionAtMs: 6_000
    });
    expect(evaluatePulseCycle(config, 1_000, 6_000)).toMatchObject({
      status: 'running',
      phase: 'on',
      phaseElapsedMs: 0,
      cyclesCompleted: 0
    });
  });

  it('supports OFF as the first phase without counting it as a completed pulse', () => {
    const config = continuous({ startPhase: 'off' });

    expect(evaluatePulseCycle(config, 0, 0)).toMatchObject({
      status: 'running',
      phase: 'off',
      cyclesCompleted: 0,
      phaseRemainingMs: 20_000
    });
    expect(evaluatePulseCycle(config, 0, 20_000)).toMatchObject({
      status: 'running',
      phase: 'on',
      cyclesCompleted: 0,
      phaseRemainingMs: 10_000
    });
    expect(evaluatePulseCycle(config, 0, 30_000)).toMatchObject({
      status: 'running',
      phase: 'off',
      cyclesCompleted: 1
    });
  });

  it('ends fixed-cycle execution OFF immediately after the final ON pulse', () => {
    const config = continuous({ execution: { mode: 'cycles', count: 2 } });

    expect(evaluatePulseCycle(config, 0, 30_000)).toMatchObject({
      status: 'running',
      phase: 'on',
      cyclesCompleted: 1
    });
    expect(evaluatePulseCycle(config, 0, 39_999)).toMatchObject({
      status: 'running',
      phase: 'on',
      cyclesCompleted: 1,
      phaseRemainingMs: 1
    });
    expect(evaluatePulseCycle(config, 0, 40_000)).toEqual({
      status: 'completed',
      relayOn: false,
      elapsedMs: 40_000,
      activeElapsedMs: 40_000,
      cyclesCompleted: 2,
      completionReason: 'cycles',
      nextTransitionAtMs: null
    });
  });

  it('counts fixed pulses correctly when execution starts with OFF', () => {
    const config = continuous({
      startPhase: 'off',
      execution: { mode: 'cycles', count: 2 }
    });

    expect(evaluatePulseCycle(config, 0, 59_999)).toMatchObject({
      status: 'running',
      phase: 'on',
      cyclesCompleted: 1,
      phaseRemainingMs: 1
    });
    expect(evaluatePulseCycle(config, 0, 60_000)).toMatchObject({
      status: 'completed',
      relayOn: false,
      cyclesCompleted: 2,
      completionReason: 'cycles'
    });
  });

  it('bounds total execution duration and cuts an ON phase short at the deadline', () => {
    const config = continuous({ execution: { mode: 'duration', durationMs: 35_000 } });

    expect(evaluatePulseCycle(config, 0, 30_000)).toMatchObject({
      status: 'running',
      phase: 'on',
      phaseRemainingMs: 5_000,
      nextTransitionAtMs: 35_000
    });
    expect(evaluatePulseCycle(config, 0, 35_000)).toEqual({
      status: 'completed',
      relayOn: false,
      elapsedMs: 35_000,
      activeElapsedMs: 35_000,
      cyclesCompleted: 1,
      completionReason: 'duration',
      nextTransitionAtMs: null
    });
  });

  it('treats duration as active Pulse time after initial delay', () => {
    const config = continuous({
      initialDelayMs: 5_000,
      execution: { mode: 'duration', durationMs: 10_000 }
    });

    expect(evaluatePulseCycle(config, 100, 5_099)).toMatchObject({ status: 'delay' });
    expect(evaluatePulseCycle(config, 100, 5_100)).toMatchObject({
      status: 'running',
      phase: 'on',
      activeElapsedMs: 0
    });
    expect(evaluatePulseCycle(config, 100, 15_100)).toMatchObject({
      status: 'completed',
      completionReason: 'duration'
    });
  });

  it('rejects invalid timing, count and clock inputs', () => {
    expect(() => validatePulseCycleConfig(continuous({ onMs: 0 }))).toThrow(RangeError);
    expect(() => validatePulseCycleConfig(continuous({ offMs: Number.NaN }))).toThrow(
      RangeError
    );
    expect(() => validatePulseCycleConfig(continuous({ initialDelayMs: -1 }))).toThrow(
      RangeError
    );
    expect(() =>
      validatePulseCycleConfig(continuous({ execution: { mode: 'cycles', count: 1.5 } }))
    ).toThrow(RangeError);
    expect(() =>
      validatePulseCycleConfig(
        continuous({ execution: { mode: 'duration', durationMs: Number.POSITIVE_INFINITY } })
      )
    ).toThrow(RangeError);
    expect(() => evaluatePulseCycle(continuous(), 10, 9)).toThrow(RangeError);
  });
});
