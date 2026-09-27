import { createDefaultShellyThermostatConfig } from '@lcl/script-generator';
import type * as ShellyClientModule from '@lcl/shelly-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as PlugFeatureModule from '../../features/plugs/index.js';
import type * as RuntimeStatusModule from './runtimeStatus.js';
import { createInstalledAutomation } from './model.js';

const mocks = vi.hoisted(() => ({
  getDeviceInfo: vi.fn(),
  installScript: vi.fn(),
  setRelayOff: vi.fn(),
  getStatus: vi.fn(),
  readInstalledStatus: vi.fn(),
  detachButton: vi.fn()
}));

vi.mock('@lcl/shelly-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ShellyClientModule>();
  return {
    ...actual,
    RpcShellyClient: vi.fn(() => ({
      getDeviceInfo: mocks.getDeviceInfo,
      installScript: mocks.installScript,
      setRelayOff: mocks.setRelayOff,
      getStatus: mocks.getStatus
    }))
  };
});

vi.mock('../../features/plugs/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof PlugFeatureModule>();
  return {
    ...actual,
    detachPlugButtonForManagedAutomation: mocks.detachButton
  };
});

vi.mock('./runtimeStatus.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeStatusModule>();
  return { ...actual, readInstalledAutomationControlStatus: mocks.readInstalledStatus };
});

import {
  convergeManagedButtonMode,
  ensureInstalledAutomationRuntimeCurrent,
  recoverInstalledAutomationRuntime
} from './runtimeUpgrade.js';

const installation = createInstalledAutomation({
  shelly: { id: 'shelly-a', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Salon',
  baseUrl: 'http://192.168.0.20/',
  scriptId: 7,
  scriptHash: 'stale-development-hash',
  config: createDefaultShellyThermostatConfig(),
  buttonInputModeBeforeInstall: 'momentary',
  nowMs: 1000
});

const legacyInstallation = createInstalledAutomation({
  shelly: { id: 'shelly-a', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Salon',
  baseUrl: 'http://192.168.0.20/',
  scriptId: 7,
  scriptHash: 'stale-development-hash',
  config: createDefaultShellyThermostatConfig(),
  nowMs: 1000
});

const runtimeStatus = (
  scriptId: number | null,
  mode: 'auto' | 'manual' | 'stopped' | 'missing',
  options: {
    relayOn?: boolean;
    manualRequestOn?: boolean;
    automationFault?: string | null;
    safetyLockout?: boolean;
    safetyReason?: string | null;
    runtimeModeSupported?: boolean;
  } = {}
) => ({
  relayOn: options.relayOn ?? false,
  automationMode: mode,
  automationScriptId: scriptId,
  firmwareId: '1.0.0',
  telemetry: {},
  clock: { timeSynced: false },
  runtimeModeSupported:
    options.runtimeModeSupported ?? (mode === 'auto' || mode === 'manual'),
  manualRequestOn: options.manualRequestOn ?? false,
  automationFault: options.automationFault ?? null,
  safetyLockout: options.safetyLockout ?? false,
  safetyReason: options.safetyReason ?? null
});

describe('installed automation runtime replacement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDeviceInfo.mockResolvedValue({
      ok: true,
      value: { id: 'shelly-a', model: 'S3PL-00112EU', gen: 3 }
    });
    mocks.setRelayOff.mockResolvedValue({ ok: true, value: null });
    mocks.getStatus.mockResolvedValue({ ok: true, value: { relayOn: false } });
    mocks.installScript.mockResolvedValue({
      ok: true,
      value: { scriptId: 11, scriptHash: 'fresh-code-hash', running: true }
    });
    mocks.detachButton.mockResolvedValue('momentary');
  });

  it('rejects runtime preparation before any mutation on a different physical Shelly', async () => {
    mocks.getDeviceInfo.mockResolvedValue({
      ok: true,
      value: { id: 'shelly-b', model: 'S3PL-00112EU', gen: 3 }
    });

    await expect(ensureInstalledAutomationRuntimeCurrent(installation)).rejects.toThrow(
      'Shelly identity does not match the installed automation.'
    );
    expect(mocks.detachButton).not.toHaveBeenCalled();
    expect(mocks.readInstalledStatus).not.toHaveBeenCalled();
    expect(mocks.setRelayOff).not.toHaveBeenCalled();
    expect(mocks.installScript).not.toHaveBeenCalled();
  });

  it('rejects explicit recovery before any mutation on a different physical Shelly', async () => {
    mocks.getDeviceInfo.mockResolvedValue({
      ok: true,
      value: { id: 'shelly-b', model: 'S3PL-00112EU', gen: 3 }
    });

    await expect(recoverInstalledAutomationRuntime(installation)).rejects.toThrow(
      'Shelly identity does not match the installed automation.'
    );
    expect(mocks.detachButton).not.toHaveBeenCalled();
    expect(mocks.setRelayOff).not.toHaveBeenCalled();
    expect(mocks.installScript).not.toHaveBeenCalled();
  });

  it('keeps a healthy AUTO runtime without replacing it', async () => {
    mocks.readInstalledStatus.mockResolvedValue(runtimeStatus(7, 'auto'));

    const result = await ensureInstalledAutomationRuntimeCurrent(installation);

    expect(result).toEqual({
      installation,
      status: runtimeStatus(7, 'auto'),
      upgraded: false
    });
    expect(mocks.detachButton).toHaveBeenCalledWith({
      deviceId: 'shelly-a',
      baseUrl: 'http://192.168.0.20/'
    });
    expect(mocks.installScript).not.toHaveBeenCalled();
  });

  it('keeps a valid MANUAL runtime and its pending request without replacing it', async () => {
    const manual = runtimeStatus(7, 'manual', {
      relayOn: true,
      manualRequestOn: true
    });
    mocks.readInstalledStatus.mockResolvedValue(manual);

    const result = await ensureInstalledAutomationRuntimeCurrent(installation);

    expect(result.status).toEqual(manual);
    expect(result.upgraded).toBe(false);
    expect(mocks.installScript).not.toHaveBeenCalled();
    expect(mocks.setRelayOff).not.toHaveBeenCalled();
  });

  it('does not silently reinstall a valid runtime that is hard safety locked', async () => {
    const locked = runtimeStatus(7, 'manual', {
      manualRequestOn: true,
      safetyLockout: true,
      safetyReason: 'mx'
    });
    mocks.readInstalledStatus.mockResolvedValue(locked);

    const result = await ensureInstalledAutomationRuntimeCurrent(installation);

    expect(result.status).toEqual(locked);
    expect(result.upgraded).toBe(false);
    expect(mocks.installScript).not.toHaveBeenCalled();
  });

  it('converges a legacy edit through the selected verified locator and captures the baseline', async () => {
    const result = await convergeManagedButtonMode(legacyInstallation, {
      deviceId: 'shelly-a',
      baseUrl: 'http://192.168.0.99/'
    });

    expect(mocks.detachButton).toHaveBeenCalledWith({
      deviceId: 'shelly-a',
      baseUrl: 'http://192.168.0.99/'
    });
    expect(result.buttonInputModeBeforeInstall).toBe('momentary');
    expect(result.updatedAtMs).toBeGreaterThan(legacyInstallation.updatedAtMs);
  });

  it('captures the pre-install button mode for a legacy managed runtime', async () => {
    mocks.readInstalledStatus.mockResolvedValue(runtimeStatus(7, 'auto'));

    const result = await ensureInstalledAutomationRuntimeCurrent(legacyInstallation);

    expect(result.installation.buttonInputModeBeforeInstall).toBe('momentary');
    expect(result.installation.updatedAtMs).toBeGreaterThan(
      legacyInstallation.updatedAtMs
    );
    expect(result.upgraded).toBe(true);
    expect(mocks.installScript).not.toHaveBeenCalled();
  });

  it('replaces stale script identity instead of refusing recovery', async () => {
    mocks.readInstalledStatus
      .mockResolvedValueOnce(runtimeStatus(99, 'auto'))
      .mockResolvedValueOnce(runtimeStatus(11, 'auto'));

    const result = await ensureInstalledAutomationRuntimeCurrent(installation);

    expect(mocks.installScript).toHaveBeenCalledWith(
      expect.objectContaining({
        replaceAllScripts: true,
        scriptName: 'Shelly Link Thermostat'
      })
    );
    expect(result.upgraded).toBe(true);
    expect(result.installation.script).toEqual({ id: 11, hash: 'fresh-code-hash' });
    expect(result.status.automationScriptId).toBe(11);
    expect(mocks.setRelayOff).toHaveBeenCalledTimes(2);
  });

  it('explicit recovery replaces a locked runtime and returns verified AUTO safe OFF', async () => {
    mocks.readInstalledStatus.mockResolvedValue(runtimeStatus(11, 'auto'));

    const result = await recoverInstalledAutomationRuntime({
      ...installation,
      script: { id: 999, hash: 'obsolete' }
    });

    expect(result.installation.script).toEqual({ id: 11, hash: 'fresh-code-hash' });
    expect(result.status).toEqual(runtimeStatus(11, 'auto'));
    expect(mocks.installScript).toHaveBeenCalledTimes(1);
    expect(mocks.setRelayOff).toHaveBeenCalledTimes(2);
  });
});
