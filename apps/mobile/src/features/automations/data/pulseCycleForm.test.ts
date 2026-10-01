import type { PulseCycleConfig } from '@lcl/automation-core';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PULSE_CYCLE_FORM,
  parsePulseCycleForm,
  pulseCycleFormFromConfig
} from './pulseCycleForm.js';

describe('Pulse cycle form model', () => {
  it('keeps optional Pulse disabled by default', () => {
    expect(parsePulseCycleForm(DEFAULT_PULSE_CYCLE_FORM)).toEqual({
      ok: true,
      config: null
    });
  });

  it('parses continuous Pulse inputs expressed in seconds', () => {
    expect(
      parsePulseCycleForm({
        ...DEFAULT_PULSE_CYCLE_FORM,
        enabled: true,
        onSecondsInput: '1.5',
        offSecondsInput: '2.25',
        initialDelaySecondsInput: '0.5'
      })
    ).toEqual({
      ok: true,
      config: {
        onMs: 1_500,
        offMs: 2_250,
        initialDelayMs: 500,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    });
  });

  it('parses cycles and duration modes without losing the shared config contract', () => {
    expect(
      parsePulseCycleForm({
        ...DEFAULT_PULSE_CYCLE_FORM,
        enabled: true,
        startPhase: 'off',
        executionMode: 'cycles',
        cyclesInput: '4'
      })
    ).toMatchObject({
      ok: true,
      config: { startPhase: 'off', execution: { mode: 'cycles', count: 4 } }
    });
    expect(
      parsePulseCycleForm({
        ...DEFAULT_PULSE_CYCLE_FORM,
        enabled: true,
        executionMode: 'duration',
        durationSecondsInput: '90.5'
      })
    ).toMatchObject({
      ok: true,
      config: { execution: { mode: 'duration', durationMs: 90_500 } }
    });
  });

  it('rejects values outside the shared runtime bounds', () => {
    const result = parsePulseCycleForm({
      ...DEFAULT_PULSE_CYCLE_FORM,
      enabled: true,
      onSecondsInput: '0.999',
      offSecondsInput: '86400.001',
      initialDelaySecondsInput: '-1',
      executionMode: 'cycles',
      cyclesInput: '100001'
    });
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        onSecondsInput: 'range',
        offSecondsInput: 'range',
        initialDelaySecondsInput: 'range',
        cyclesInput: 'range'
      }
    });
  });

  it('rejects non-millisecond precision and invalid duration bounds', () => {
    expect(
      parsePulseCycleForm({
        ...DEFAULT_PULSE_CYCLE_FORM,
        enabled: true,
        onSecondsInput: '1.0001',
        executionMode: 'duration',
        durationSecondsInput: '0.5'
      })
    ).toEqual({
      ok: false,
      fieldErrors: {
        onSecondsInput: 'range',
        durationSecondsInput: 'range'
      }
    });
  });

  it('round-trips an installed config into editable seconds fields', () => {
    const config: PulseCycleConfig = {
      onMs: 2_500,
      offMs: 7_000,
      initialDelayMs: 1_250,
      startPhase: 'off',
      execution: { mode: 'duration', durationMs: 65_500 }
    };
    const draft = pulseCycleFormFromConfig(config);
    expect(draft).toMatchObject({
      enabled: true,
      onSecondsInput: '2.5',
      offSecondsInput: '7',
      initialDelaySecondsInput: '1.25',
      startPhase: 'off',
      executionMode: 'duration',
      durationSecondsInput: '65.5'
    });
    expect(parsePulseCycleForm(draft)).toEqual({ ok: true, config });
  });
});
