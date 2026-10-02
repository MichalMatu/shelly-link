import { createDefaultShellyThermostatConfig } from '@lcl/script-generator';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInstalledAutomation } from '../../features/automations/index.js';
import {
  HARDWARE_SETUP_DRAFT_STORAGE_KEY,
  resetHardwareSetupDraftStore,
  useHardwareSetupDraftStore
} from './setupDraftStore.js';
import { resetSavedPlugStore } from '../../features/plugs/index.js';

describe('Climate Pulse setup draft', () => {
  beforeEach(() => {
    resetHardwareSetupDraftStore();
    resetSavedPlugStore();
  });

  it('hydrates the shared Pulse editor from an installed Climate automation', () => {
    const base = createDefaultShellyThermostatConfig('tp357_custom_v1', 'heating');
    const installation = createInstalledAutomation({
      shelly: { id: 'shellyplugsg3-pulse', model: 'S3PL-00112EU', gen: 3 },
      shellyName: 'Grow plug',
      baseUrl: 'http://192.168.0.20/',
      scriptId: 1,
      scriptHash: 'pulse-edit',
      config: {
        ...base,
        execution: {
          pulse: {
            onMs: 2_500,
            offMs: 7_000,
            initialDelayMs: 1_250,
            startPhase: 'off',
            execution: { mode: 'duration', durationMs: 65_500 }
          }
        }
      },
      nowMs: 1_000
    });

    useHardwareSetupDraftStore.getState().loadClimateAutomationDraft(installation);

    expect(useHardwareSetupDraftStore.getState().pulseCycleDraft).toMatchObject({
      enabled: true,
      onSecondsInput: '2.5',
      offSecondsInput: '7',
      initialDelaySecondsInput: '1.25',
      startPhase: 'off',
      executionMode: 'duration',
      durationSecondsInput: '65.5'
    });
  });

  it('keeps the Pulse editor draft transient instead of extending hardware draft persistence', () => {
    useHardwareSetupDraftStore.getState().selectShellyDevice('shellyplugsg3-pulse');
    useHardwareSetupDraftStore.getState().setPulseCycleDraft({
      enabled: true,
      onSecondsInput: '5'
    });

    const stored = JSON.parse(
      String(window.localStorage.getItem(HARDWARE_SETUP_DRAFT_STORAGE_KEY))
    ) as Record<string, unknown>;
    expect(stored.selectedShellyId).toBe('shellyplugsg3-pulse');
    expect(stored).not.toHaveProperty('pulseCycleDraft');
  });
});
