import { describe, expect, it } from 'vitest';
import { ClimateSetup, Pulse } from '../../features/automations/index.js';

const sensor = {
  id: 'A4:C1:38:4F:24:CD',
  name: 'Salon',
  runtimeAddress: 'A4:C1:38:4F:24:CD',
  profileId: 'xiaomi_lywsd03mmc_bthome_v2' as const
};

const baseInput = {
  selectedSensor: sensor,
  rulePreset: 'heating' as const,
  onThresholdInput: '19',
  offThresholdInput: '20',
  vpdAssistEnabled: false,
  vpdTargetInput: '1.2',
  rssiMinInput: '-85',
  staleTimeoutMinInput: '2',
  minChangeMinInput: '2',
  maxOnHoursInput: '4'
};

const deriveClimateRuleState = ClimateSetup.deriveRuleState;

describe('Climate shared Pulse form derivation', () => {
  it('preserves the exact Steady config shape when Pulse is disabled', () => {
    const result = deriveClimateRuleState({
      ...baseInput,
      pulseCycleDraft: Pulse.Cycle.defaultForm
    });

    expect(result.configState.ok).toBe(true);
    if (result.configState.ok) {
      expect(result.configState.config.execution).toBeUndefined();
    }
  });

  it('adds only the shared Pulse execution config when enabled', () => {
    const result = deriveClimateRuleState({
      ...baseInput,
      pulseCycleDraft: {
        ...Pulse.Cycle.defaultForm,
        enabled: true,
        onSecondsInput: '2.5',
        offSecondsInput: '7',
        initialDelaySecondsInput: '1.25',
        startPhase: 'off',
        executionMode: 'cycles',
        cyclesInput: '4'
      }
    });

    expect(result.configState.ok).toBe(true);
    if (result.configState.ok) {
      expect(result.configState.config.execution).toEqual({
        pulse: {
          onMs: 2_500,
          offMs: 7_000,
          initialDelayMs: 1_250,
          startPhase: 'off',
          execution: { mode: 'cycles', count: 4 }
        }
      });
    }
  });

  it('blocks generated Climate config when an enabled Pulse value is invalid', () => {
    const result = deriveClimateRuleState({
      ...baseInput,
      pulseCycleDraft: {
        ...Pulse.Cycle.defaultForm,
        enabled: true,
        onSecondsInput: '0.5'
      }
    });

    expect(result.pulseCycleValidation.ok).toBe(false);
    expect(result.configState.ok).toBe(false);
  });
});
