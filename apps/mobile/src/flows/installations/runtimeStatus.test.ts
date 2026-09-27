import { createDefaultShellyThermostatConfig } from '@lcl/script-generator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as AutomationsFeatureModule from '../../features/automations/index.js';
import type * as RuntimeModeModule from './runtimeModeTransport.js';
import { createInstalledAutomation } from './model.js';

const mocks = vi.hoisted(() => ({
  readControlStatus: vi.fn(),
  readRuntimeMode: vi.fn()
}));

vi.mock('../../features/automations/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof AutomationsFeatureModule>();
  return { ...actual, readShellyControlStatus: mocks.readControlStatus };
});

vi.mock('./runtimeModeTransport.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeModeModule>();
  return { ...actual, readInstalledAutomationRuntimeMode: mocks.readRuntimeMode };
});

import { readInstalledAutomationControlStatus } from './runtimeStatus.js';

const installation = createInstalledAutomation({
  shelly: { id: 'shelly-a', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Salon',
  baseUrl: 'http://192.168.0.20/',
  scriptId: 7,
  scriptHash: 'hash',
  config: createDefaultShellyThermostatConfig(),
  nowMs: 1000
});

const baseStatus = (
  automationMode: 'auto' | 'manual' | 'missing',
  scriptId: number | null
) => ({
  relayOn: false,
  automationMode,
  automationScriptId: scriptId,
  firmwareId: '1.0.0',
  telemetry: {},
  clock: { timeSynced: false }
});

const runtimeState = (
  overrides: Partial<{
    mode: 'auto' | 'manual';
    manualRequestOn: boolean;
    automationFault: string | null;
    safetyLockout: boolean;
    safetyReason: string | null;
    supported: boolean;
  }> = {}
) => ({
  mode: overrides.mode ?? 'auto',
  manualRequestOn: overrides.manualRequestOn ?? false,
  automationFault: overrides.automationFault ?? null,
  safetyLockout: overrides.safetyLockout ?? false,
  safetyReason: overrides.safetyReason ?? null,
  supported: overrides.supported ?? true
});

describe('installed automation runtime status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads MANUAL and independent request/fault/safety axes from a running runtime', async () => {
    mocks.readControlStatus.mockResolvedValue(baseStatus('auto', 7));
    mocks.readRuntimeMode.mockResolvedValue(
      runtimeState({
        mode: 'manual',
        manualRequestOn: true,
        automationFault: 'st',
        safetyLockout: true,
        safetyReason: 'mx'
      })
    );

    const status = await readInstalledAutomationControlStatus(installation);

    expect(status).toMatchObject({
      automationMode: 'manual',
      runtimeModeSupported: true,
      manualRequestOn: true,
      automationFault: 'st',
      safetyLockout: true,
      safetyReason: 'mx'
    });
  });

  it('recognises an old running runtime as AUTO but upgradeable', async () => {
    mocks.readControlStatus.mockResolvedValue(baseStatus('auto', 7));
    mocks.readRuntimeMode.mockResolvedValue(runtimeState({ supported: false }));

    const status = await readInstalledAutomationControlStatus(installation);

    expect(status).toMatchObject({
      automationMode: 'auto',
      runtimeModeSupported: false,
      manualRequestOn: false,
      automationFault: null,
      safetyLockout: false,
      safetyReason: null
    });
  });

  it('separates an actually stopped script from intentional MANUAL', async () => {
    mocks.readControlStatus.mockResolvedValue(baseStatus('manual', 7));

    const status = await readInstalledAutomationControlStatus(installation);

    expect(status).toMatchObject({
      automationMode: 'stopped',
      runtimeModeSupported: false,
      manualRequestOn: false,
      automationFault: null,
      safetyLockout: false,
      safetyReason: null
    });
    expect(mocks.readRuntimeMode).not.toHaveBeenCalled();
  });
});
