import { describe, expect, it } from 'vitest';
import {
  createDefaultShellyThermostatConfig,
  decodeShellyThermostatScript,
  generateShellyRuntimeConfigUpdateEval,
  generateShellyThermostatScript,
  type ShellyThermostatConfig
} from '../index.js';
import {
  climateExecutionFromRuntimeConfig,
  createShellyRuntimeConfig,
  shellyRuntimeConfigSchema,
  type ShellyRuntimeConfig
} from '../shelly/runtimeConfig.js';
import { renderRuntimeDiagnostics } from '../shelly/runtime/diagnostics.js';
import {
  renderClimateExecution,
  renderClimateExecutionBoot
} from '../shelly/runtime/execution.js';
import { renderRelayArbiter } from '../shelly/runtime/relayArbiter.js';
import { renderSensorHealth } from '../shelly/runtime/sensorHealth.js';

const compactBase = (): ShellyRuntimeConfig =>
  createShellyRuntimeConfig(createDefaultShellyThermostatConfig(), 'coverage-hash');

const pulseConfig = (
  mode: 'continuous' | 'cycles' | 'duration',
  startPhase: 'on' | 'off' = 'on'
): NonNullable<ShellyThermostatConfig['execution']>['pulse'] => ({
  onMs: 1_000,
  offMs: 2_000,
  initialDelayMs: 3_000,
  startPhase,
  execution:
    mode === 'continuous'
      ? { mode: 'continuous' }
      : mode === 'cycles'
        ? { mode: 'cycles', count: 4 }
        : { mode: 'duration', durationMs: 10_000 }
});

describe('Pulse execution compact runtime contracts', () => {
  it('validates every compact execution limit family and rejects invalid limits/windows', () => {
    const base = compactBase();

    expect(
      shellyRuntimeConfigSchema.safeParse({ ...base, e: [1_000, 2_000, 0, 0, 0] }).success
    ).toBe(true);
    expect(
      shellyRuntimeConfigSchema.safeParse({ ...base, e: [1_000, 2_000, 0, 0, 3] }).success
    ).toBe(true);
    expect(
      shellyRuntimeConfigSchema.safeParse({ ...base, e: [1_000, 2_000, 0, 1, -10_000] })
        .success
    ).toBe(true);
    expect(
      shellyRuntimeConfigSchema.safeParse({ ...base, e: [1_000, 2_000, 0, 0, -500] })
        .success
    ).toBe(false);

    expect(shellyRuntimeConfigSchema.safeParse({ ...base, w: [60, 120] }).success).toBe(
      true
    );
    expect(shellyRuntimeConfigSchema.safeParse({ ...base, w: [60, 60] }).success).toBe(
      false
    );
  });

  it('decodes Continuous, Cycles, Duration and daily-window compact forms', () => {
    const base = compactBase();

    expect(climateExecutionFromRuntimeConfig(base)).toBeUndefined();
    expect(
      climateExecutionFromRuntimeConfig({ ...base, e: [1_000, 2_000, 3_000, 0, 0] })
    ).toEqual({
      pulse: {
        onMs: 1_000,
        offMs: 2_000,
        initialDelayMs: 3_000,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    });
    expect(
      climateExecutionFromRuntimeConfig({ ...base, e: [1_000, 2_000, 3_000, 1, 4] })
    ).toEqual({
      pulse: {
        onMs: 1_000,
        offMs: 2_000,
        initialDelayMs: 3_000,
        startPhase: 'off',
        execution: { mode: 'cycles', count: 4 }
      }
    });
    expect(
      climateExecutionFromRuntimeConfig({ ...base, e: [1_000, 2_000, 3_000, 0, -10_000] })
    ).toEqual({
      pulse: {
        onMs: 1_000,
        offMs: 2_000,
        initialDelayMs: 3_000,
        startPhase: 'on',
        execution: { mode: 'duration', durationMs: 10_000 }
      }
    });
    expect(climateExecutionFromRuntimeConfig({ ...base, w: [23 * 60 + 59, 1] })).toEqual({
      activeWindow: { startTime: '23:59', endTime: '00:01' }
    });
    expect(
      climateExecutionFromRuntimeConfig({
        ...base,
        e: [1_000, 2_000, 0, 0, 0],
        w: [60, 120]
      })
    ).toEqual({
      pulse: {
        onMs: 1_000,
        offMs: 2_000,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      },
      activeWindow: { startTime: '01:00', endTime: '02:00' }
    });
  });

  it('encodes all Pulse execution modes and start phases into compact runtime config', () => {
    const base = createDefaultShellyThermostatConfig();
    const runtimeFor = (
      pulse: NonNullable<ShellyThermostatConfig['execution']>['pulse']
    ) => createShellyRuntimeConfig({ ...base, execution: { pulse } }, 'hash');

    expect(runtimeFor(pulseConfig('continuous', 'on')).e).toEqual([
      1_000, 2_000, 3_000, 0, 0
    ]);
    expect(runtimeFor(pulseConfig('cycles', 'off')).e).toEqual([
      1_000, 2_000, 3_000, 1, 4
    ]);
    expect(runtimeFor(pulseConfig('duration', 'on')).e).toEqual([
      1_000, 2_000, 3_000, 0, -10_000
    ]);
    expect(
      createShellyRuntimeConfig(
        {
          ...base,
          execution: { activeWindow: { startTime: '22:30', endTime: '06:15' } }
        },
        'hash'
      ).w
    ).toEqual([22 * 60 + 30, 6 * 60 + 15]);
  });

  it('round-trips execution through generated script decoding', () => {
    const base = createDefaultShellyThermostatConfig();
    const execution = {
      pulse: pulseConfig('cycles', 'off'),
      activeWindow: { startTime: '22:30', endTime: '06:15' }
    } as const;
    const config: ShellyThermostatConfig = { ...base, execution };

    const decoded = decodeShellyThermostatScript(generateShellyThermostatScript(config));
    const steadyDecoded = decodeShellyThermostatScript(
      generateShellyThermostatScript(base)
    );

    expect(decoded?.settings.execution).toEqual(execution);
    expect(steadyDecoded?.settings).not.toHaveProperty('execution');
  });

  it('emits capability guards only for runtime features requested by the update', () => {
    const base = createDefaultShellyThermostatConfig();
    const rich: ShellyThermostatConfig = {
      ...base,
      rule: {
        ...base.rule,
        minimumOnMs: 5_000,
        relayDebounce: { turnOnMs: 250, turnOffMs: 500 }
      },
      execution: {
        pulse: pulseConfig('continuous'),
        activeWindow: { startTime: '08:00', endTime: '20:00' }
      }
    };

    const plainCode = generateShellyRuntimeConfigUpdateEval(base);
    const richCode = generateShellyRuntimeConfigUpdateEval(rich);

    expect(plainCode).not.toContain('typeof U===');
    expect(plainCode).not.toContain('typeof D===');
    expect(plainCode).not.toContain('typeof px!==');
    expect(plainCode).not.toContain('typeof wu!==');
    expect(richCode).toContain('typeof U==="undefined"');
    expect(richCode).toContain('typeof D==="undefined"');
    expect(richCode).toContain('typeof px!=="function"');
    expect(richCode).toContain('typeof wu!=="function"');
    expect(richCode).toContain('if(typeof wu==="function")wu();');
  });
});

describe('conditional execution runtime renderers', () => {
  it('renders diagnostics for every execution capability combination', () => {
    expect(renderRuntimeDiagnostics(false, false, false)).not.toContain(',e:[');
    expect(renderRuntimeDiagnostics(true, false, false)).toContain(
      'e:[R.pa,null,null,null,null,null]'
    );
    expect(renderRuntimeDiagnostics(true, true, false)).toContain(
      'e:[R.pa,null,R.ps,R.pc,R.pn,R.rs]'
    );
    expect(renderRuntimeDiagnostics(true, false, true)).toContain(
      'e:[R.pa,R.wo,null,null,null,null]'
    );
  });

  it('renders Pulse/window gates and boot hooks independently and together', () => {
    const none = renderClimateExecution(false, false);
    const pulse = renderClimateExecution(true, false);
    const window = renderClimateExecution(false, true);
    const both = renderClimateExecution(true, true);

    expect(none).not.toContain('function px()');
    expect(none).not.toContain('function wu()');
    expect(pulse).toContain('function px()');
    expect(pulse).not.toContain('function wu()');
    expect(window).not.toContain('function px()');
    expect(window).toContain('function wu()');
    expect(both).toContain('function px()');
    expect(both).toContain('function wu()');
    expect(renderClimateExecutionBoot(false)).toBe('');
    expect(renderClimateExecutionBoot(true)).toBe('wu();');
  });

  it('specializes arbiter and sensor-health cancellation only when Pulse exists', () => {
    const windowArbiter = renderRelayArbiter(false, false, true, false);
    const pulseArbiter = renderRelayArbiter(false, false, true, true);
    const windowHealth = renderSensorHealth(true, false);
    const pulseHealth = renderSensorHealth(true, true);

    expect(windowArbiter).not.toContain('cx(q);');
    expect(pulseArbiter).toContain('cx(q);');
    expect(windowHealth).not.toContain('cx(q);');
    expect(pulseHealth).toContain('cx(q);');
    expect(renderSensorHealth(false, false)).not.toContain('R.pa=false');
  });
});
