import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript
} from '@lcl/script-generator';
import { hashScriptCode } from '@lcl/shelly-client';
import { describe, expect, it, vi } from 'vitest';
import {
  createInstalledAutomation,
  createTimeInstalledAutomation
} from '../data/installedAutomation.js';
import type { TimeAutomationRuntimeSnapshot } from '../data/timeAutomationRuntimeState.js';
import {
  updateClimateInstalledAutomation,
  type ClimateAutomationEditServices
} from './updateClimateInstalledAutomation.js';
import {
  updateTimeInstalledAutomation,
  type TimeAutomationEditServices
} from './updateTimeInstalledAutomation.js';

const originalConfig = createDefaultShellyThermostatConfig();
const editedConfig = {
  ...originalConfig,
  rule: {
    ...originalConfig.rule,
    control: {
      ...originalConfig.rule.control,
      onThreshold: 18,
      offThreshold: 20
    }
  }
};
const editedCode = generateShellyThermostatScript(editedConfig);
const editedHash = hashScriptCode(editedCode);
const climateInstallation = createInstalledAutomation({
  shelly: { id: 'shelly-fault', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Fault plug',
  baseUrl: 'http://192.168.50.20/',
  scriptId: 7,
  scriptHash: 'old-hash',
  config: originalConfig,
  nowMs: 1000
});

const verifiedClimateRuntime = () => ({
  script: { id: 11, name: 'Shelly Link', enable: true, running: true },
  code: editedCode,
  runtimeConfigStorageSupported: false,
  persistedRuntimeConfigJson: null,
  status: {} as never
});

const climateServices = (
  overrides: Partial<ClimateAutomationEditServices> = {}
): ClimateAutomationEditServices => ({
  readManagedRuntime: vi.fn(async () => verifiedClimateRuntime()),
  readDeviceId: vi.fn(async () => 'SHELLY-FAULT'),
  hasNativeScheduleConflict: vi.fn(async () => false),
  forceRelayOff: vi.fn(async () => undefined),
  replaceManagedScript: vi.fn(async () => ({
    scriptId: 11,
    scriptHash: editedHash,
    running: true
  })),
  nowMs: vi.fn(() => 2000),
  ...overrides
});

const timeConfig = { relayId: 0, onTime: '08:00', offTime: '09:00' } as const;
const timeInstallation = createTimeInstalledAutomation({
  shelly: { id: 'shelly-fault', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Fault plug',
  baseUrl: 'http://192.168.50.20/',
  onJobId: 21,
  offJobId: 22,
  config: timeConfig,
  nowMs: 1000
});
const timeSnapshot = {
  relayOn: false,
  telemetry: {},
  clock: { timeSynced: true },
  scheduleState: 'running',
  onJob: null,
  offJob: null
} satisfies TimeAutomationRuntimeSnapshot;

const timeServices = (
  overrides: Partial<TimeAutomationEditServices> = {}
): TimeAutomationEditServices => ({
  readDeviceId: vi.fn(async () => 'SHELLY-FAULT'),
  hasManagedClimateScript: vi.fn(async () => false),
  updateRuntime: vi.fn(async () => timeSnapshot),
  nowMs: vi.fn(() => 2000),
  ...overrides
});

describe('diagnostic fault injection matrix', () => {
  it('never retries a climate script mutation after an ambiguous upload failure', async () => {
    const mocked = climateServices({
      replaceManagedScript: vi.fn(async () => {
        throw new Error('timeout after upload');
      })
    });

    await expect(
      updateClimateInstalledAutomation({
        installation: climateInstallation,
        config: editedConfig,
        installations: [climateInstallation],
        services: mocked
      })
    ).rejects.toThrow('timeout after upload');

    expect(mocked.replaceManagedScript).toHaveBeenCalledTimes(1);
    expect(mocked.forceRelayOff).toHaveBeenCalledTimes(1);
    expect(mocked.readManagedRuntime).not.toHaveBeenCalled();
  });

  it('does not verify or retry when the post-mutation safe-OFF step fails', async () => {
    const forceRelayOff = vi
      .fn<ClimateAutomationEditServices['forceRelayOff']>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('relay verification timeout'));
    const mocked = climateServices({ forceRelayOff });

    await expect(
      updateClimateInstalledAutomation({
        installation: climateInstallation,
        config: editedConfig,
        installations: [climateInstallation],
        services: mocked
      })
    ).rejects.toThrow('relay verification timeout');

    expect(mocked.replaceManagedScript).toHaveBeenCalledTimes(1);
    expect(mocked.forceRelayOff).toHaveBeenCalledTimes(2);
    expect(mocked.readManagedRuntime).not.toHaveBeenCalled();
  });

  it('does not repeat a mutation when the final read-back is unavailable', async () => {
    const mocked = climateServices({
      readManagedRuntime: vi.fn(async () => {
        throw new Error('read-back unavailable');
      })
    });

    await expect(
      updateClimateInstalledAutomation({
        installation: climateInstallation,
        config: editedConfig,
        installations: [climateInstallation],
        services: mocked
      })
    ).rejects.toThrow('read-back unavailable');

    expect(mocked.replaceManagedScript).toHaveBeenCalledTimes(1);
    expect(mocked.forceRelayOff).toHaveBeenCalledTimes(2);
    expect(mocked.readManagedRuntime).toHaveBeenCalledTimes(1);
  });

  it('fails before any climate mutation when physical identity cannot be read', async () => {
    const mocked = climateServices({
      readDeviceId: vi.fn(async () => {
        throw new Error('identity timeout');
      })
    });

    await expect(
      updateClimateInstalledAutomation({
        installation: climateInstallation,
        config: editedConfig,
        installations: [climateInstallation],
        services: mocked
      })
    ).rejects.toThrow('identity timeout');

    expect(mocked.forceRelayOff).not.toHaveBeenCalled();
    expect(mocked.replaceManagedScript).not.toHaveBeenCalled();
  });

  it('never retries a Time runtime mutation after a transport failure', async () => {
    const mocked = timeServices({
      updateRuntime: vi.fn(async () => {
        throw new Error('schedule update timeout');
      })
    });

    await expect(
      updateTimeInstalledAutomation({
        installation: timeInstallation,
        config: timeConfig,
        installations: [timeInstallation],
        services: mocked
      })
    ).rejects.toThrow('schedule update timeout');

    expect(mocked.updateRuntime).toHaveBeenCalledTimes(1);
  });

  it('never reaches a Time mutation after identity drift', async () => {
    const mocked = timeServices({ readDeviceId: vi.fn(async () => 'foreign-device') });

    await expect(
      updateTimeInstalledAutomation({
        installation: timeInstallation,
        config: timeConfig,
        installations: [timeInstallation],
        services: mocked
      })
    ).rejects.toThrow('identity');

    expect(mocked.updateRuntime).not.toHaveBeenCalled();
  });
});
