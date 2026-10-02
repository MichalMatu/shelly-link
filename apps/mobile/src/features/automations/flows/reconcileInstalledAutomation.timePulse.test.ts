import { hashScriptCode } from '@lcl/shelly-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTimePulseInstalledAutomation } from '../data/installedAutomation.js';
import {
  resetInstalledAutomationStore,
  useInstalledAutomationStore
} from '../state/installedAutomationStore.js';
import {
  reconcileInstalledAutomationsForShelly,
  type InstalledAutomationReconciliationServices
} from './reconcileInstalledAutomation.js';

const code = 'time-pulse-code';

const installation = () =>
  createTimePulseInstalledAutomation({
    shelly: { id: 'SHELLY-ABC', model: 'S3PL-00112EU', gen: 3 },
    shellyName: 'Grow plug',
    baseUrl: 'http://192.168.0.10/',
    onJobId: 4,
    offJobId: 5,
    scriptId: 7,
    scriptHash: hashScriptCode(code),
    config: { relayId: 0, onTime: '22:00', offTime: '06:00' },
    pulse: {
      onMs: 60_000,
      offMs: 120_000,
      initialDelayMs: 0,
      startPhase: 'on',
      execution: { mode: 'continuous' }
    },
    nowMs: 1000
  });

const target = {
  deviceId: 'shelly-abc',
  name: 'Grow plug',
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

describe('Time + Pulse reconciliation', () => {
  beforeEach(() => resetInstalledAutomationStore());

  it('requires both exact native schedules and the exact running Pulse script', async () => {
    const stored = installation();
    useInstalledAutomationStore.getState().upsertInstallation(stored);
    const mockedServices = services();

    const result = await reconcileInstalledAutomationsForShelly(target, mockedServices);

    expect(result.status).toBe('verified');
    expect(mockedServices.readTimeScheduleState).toHaveBeenCalledOnce();
    expect(mockedServices.readClimateRuntime).toHaveBeenCalledWith(target.baseUrl);
  });

  it('reports changed when the Pulse script id, state or code hash differs', async () => {
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

  it('does not trust the script when the native Time boundary pair needs attention', async () => {
    useInstalledAutomationStore.getState().upsertInstallation(installation());
    const readClimateRuntime = vi.fn(async () => ({
      scriptId: 7,
      running: true,
      code,
      persistedRuntimeConfigJson: null
    }));

    const result = await reconcileInstalledAutomationsForShelly(
      target,
      services({
        readTimeScheduleState: vi.fn(async () => 'attention' as const),
        readClimateRuntime
      })
    );

    expect(result.status).toBe('changed');
    expect(readClimateRuntime).not.toHaveBeenCalled();
  });
});
