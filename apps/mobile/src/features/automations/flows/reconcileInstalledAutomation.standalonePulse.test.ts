import { hashScriptCode } from '@lcl/shelly-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStandalonePulseInstalledAutomation } from '../data/installedAutomation.js';
import {
  resetInstalledAutomationStore,
  useInstalledAutomationStore
} from '../state/installedAutomationStore.js';
import {
  reconcileInstalledAutomationsForShelly,
  type InstalledAutomationReconciliationServices
} from './reconcileInstalledAutomation.js';

const code = 'standalone-pulse-code';

const installation = () =>
  createStandalonePulseInstalledAutomation({
    shelly: { id: 'SHELLY-ABC', model: 'S3PL-00112EU', gen: 3 },
    shellyName: 'Pump plug',
    baseUrl: 'http://192.168.0.10/',
    scriptId: 7,
    scriptHash: hashScriptCode(code),
    config: {
      relayId: 0,
      pulse: {
        onMs: 1_000,
        offMs: 2_000,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    },
    nowMs: 1_000
  });

const target = {
  deviceId: 'shelly-abc',
  name: 'Pump plug',
  baseUrl: 'http://192.168.0.77/',
  model: 'S3PL-00112EU',
  gen: 3
};

const services = (
  overrides: Partial<InstalledAutomationReconciliationServices> = {}
): InstalledAutomationReconciliationServices => ({
  readClimateRuntime: vi.fn(async () => ({
    scriptId: 7,
    running: true,
    code,
    persistedRuntimeConfigJson: null
  })),
  readTimeScheduleState: vi.fn(async () => 'running' as const),
  ...overrides
});

describe('Standalone Pulse reconciliation', () => {
  beforeEach(() => resetInstalledAutomationStore());

  it('requires the exact running script id and hash without consulting Time schedules', async () => {
    useInstalledAutomationStore.getState().upsertInstallation(installation());
    const mockedServices = services();

    const result = await reconcileInstalledAutomationsForShelly(target, mockedServices);

    expect(result.status).toBe('verified');
    expect(mockedServices.readClimateRuntime).toHaveBeenCalledWith(target.baseUrl);
    expect(mockedServices.readTimeScheduleState).not.toHaveBeenCalled();
  });

  it('reports changed when script identity, running state or code hash differs', async () => {
    for (const runtime of [
      { scriptId: 8, running: true, code },
      { scriptId: 7, running: false, code },
      { scriptId: 7, running: true, code: 'changed-code' }
    ]) {
      resetInstalledAutomationStore();
      useInstalledAutomationStore.getState().upsertInstallation(installation());

      const result = await reconcileInstalledAutomationsForShelly(
        target,
        services({
          readClimateRuntime: vi.fn(async () => ({
            ...runtime,
            persistedRuntimeConfigJson: null
          }))
        })
      );

      expect(result.status).toBe('changed');
    }
  });
});
