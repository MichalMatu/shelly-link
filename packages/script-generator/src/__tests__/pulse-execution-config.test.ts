import { describe, expect, it } from 'vitest';
import {
  createDefaultShellyThermostatConfig,
  normalizeConfig,
  pulseCycleConfigSchema,
  shellyThermostatConfigSchema
} from '../index.js';

describe('Pulse execution config', () => {
  it('keeps the existing Climate config shape unchanged while execution is unused', () => {
    const config = createDefaultShellyThermostatConfig();

    expect(config).not.toHaveProperty('execution');
    expect(shellyThermostatConfigSchema.parse(config)).not.toHaveProperty('execution');
  });

  it('normalizes Pulse defaults only when Pulse is configured', () => {
    const base = createDefaultShellyThermostatConfig();
    const config = normalizeConfig({
      ...base,
      execution: {
        pulse: {
          onMs: 10_000,
          offMs: 20_000,
          execution: { mode: 'continuous' }
        }
      }
    });

    expect(config.execution).toEqual({
      pulse: {
        onMs: 10_000,
        offMs: 20_000,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    });
  });

  it('accepts an overnight active window and composes it with Pulse', () => {
    const base = createDefaultShellyThermostatConfig();
    const parsed = normalizeConfig({
      ...base,
      execution: {
        activeWindow: { startTime: '22:00', endTime: '06:00' },
        pulse: {
          onMs: 5_000,
          offMs: 15_000,
          initialDelayMs: 1_000,
          startPhase: 'off',
          execution: { mode: 'cycles', count: 12 }
        }
      }
    });

    expect(parsed.execution?.activeWindow).toEqual({ startTime: '22:00', endTime: '06:00' });
    expect(parsed.execution?.pulse?.execution).toEqual({ mode: 'cycles', count: 12 });
  });

  it('rejects empty execution, equal window endpoints and out-of-range Pulse timing', () => {
    const base = createDefaultShellyThermostatConfig();

    expect(() => normalizeConfig({ ...base, execution: {} })).toThrow();
    expect(() =>
      normalizeConfig({
        ...base,
        execution: { activeWindow: { startTime: '08:00', endTime: '08:00' } }
      })
    ).toThrow();
    expect(() =>
      pulseCycleConfigSchema.parse({
        onMs: 999,
        offMs: 1_000,
        execution: { mode: 'continuous' }
      })
    ).toThrow();
    expect(() =>
      pulseCycleConfigSchema.parse({
        onMs: 1_000,
        offMs: 1_000,
        execution: { mode: 'cycles', count: 100_001 }
      })
    ).toThrow();
  });
});
