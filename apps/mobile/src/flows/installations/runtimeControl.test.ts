import { createDefaultShellyThermostatConfig } from '@lcl/script-generator';
import type * as ShellyClientModule from '@lcl/shelly-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as RuntimeModeModule from './runtimeModeTransport.js';
import type * as RuntimeStatusModule from './runtimeStatus.js';
import type * as RuntimeUpgradeModule from './runtimeUpgrade.js';
import { createInstalledAutomation } from './model.js';

const mocks = vi.hoisted(() => ({
  setRelayOn: vi.fn(),
  setRelayOff: vi.fn(),
  getDeviceInfo: vi.fn(),
  getStatus: vi.fn(),
  readStatus: vi.fn(),
  setRuntimeMode: vi.fn(),
  setManualRelay: vi.fn(),
  ensureCurrent: vi.fn(),
  recoverRuntime: vi.fn()
}));

vi.mock('@lcl/shelly-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ShellyClientModule>();
  return {
    ...actual,
    RpcShellyClient: vi.fn(() => ({
      setRelayOn: mocks.setRelayOn,
      setRelayOff: mocks.setRelayOff,
      getDeviceInfo: mocks.getDeviceInfo,
      getStatus: mocks.getStatus
    }))
  };
});
vi.mock('./runtimeModeTransport.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeModeModule>();
  return {
    ...actual,
    setInstalledAutomationRuntimeMode: mocks.setRuntimeMode,
    setInstalledAutomationManualRelayRequest: mocks.setManualRelay
  };
});
vi.mock('./runtimeStatus.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeStatusModule>();
  return { ...actual, readInstalledAutomationControlStatus: mocks.readStatus };
});
vi.mock('./runtimeUpgrade.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeUpgradeModule>();
  return {
    ...actual,
    ensureInstalledAutomationRuntimeCurrent: mocks.ensureCurrent,
    recoverInstalledAutomationRuntime: mocks.recoverRuntime
  };
});

import {
  installedAutomationScriptMatch,
  enterInstalledAutomationManualMode,
  enterInstalledAutomationAutoMode,
  setInstalledAutomationRelayState
} from './runtimeControl.js';

const installation = createInstalledAutomation({
  shelly: { id: 'shelly-a', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Salon',
  baseUrl: 'http://192.168.0.20/',
  scriptId: 7,
  scriptHash: 'hash',
  config: createDefaultShellyThermostatConfig(),
  nowMs: 1000
});

const status = (
  mode: 'auto' | 'manual' | 'stopped' | 'missing',
  relayOn = false,
  scriptId: number | null = mode === 'missing' ? null : 7,
  options: {
    manualRequestOn?: boolean;
    automationFault?: string | null;
    safetyLockout?: boolean;
    safetyReason?: string | null;
  } = {}
) => ({
  relayOn,
  automationMode: mode,
  automationScriptId: scriptId,
  firmwareId: '1.0.0',
  telemetry: {},
  clock: { timeSynced: false },
  runtimeModeSupported: mode === 'auto' || mode === 'manual',
  manualRequestOn: options.manualRequestOn ?? false,
  automationFault: options.automationFault ?? null,
  safetyLockout: options.safetyLockout ?? false,
  safetyReason: options.safetyReason ?? null
});

describe('installed automation runtime control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setRelayOn.mockResolvedValue({ ok: true, value: null });
    mocks.setRelayOff.mockResolvedValue({ ok: true, value: null });
    mocks.getDeviceInfo.mockResolvedValue({
      ok: true,
      value: { id: 'shelly-a', model: 'S3PL-00112EU', gen: 3 }
    });
    mocks.getStatus.mockResolvedValue({ ok: true, value: { relayOn: false } });
  });

  it('uses stored script id matching only as diagnostic state', () => {
    expect(installedAutomationScriptMatch(installation, status('auto'))).toBe('matched');
    expect(installedAutomationScriptMatch(installation, status('missing'))).toBe(
      'missing'
    );
    expect(installedAutomationScriptMatch(installation, status('auto', false, 99))).toBe(
      'mismatch'
    );
  });

  it('enters MANUAL safe OFF through the live runtime', async () => {
    mocks.ensureCurrent.mockResolvedValue({
      installation,
      status: status('auto'),
      upgraded: false
    });
    mocks.readStatus.mockResolvedValue(status('manual'));
    const result = await enterInstalledAutomationManualMode(installation);
    expect(mocks.setRuntimeMode).toHaveBeenCalledWith(installation, 'manual');
    expect(result.status.automationMode).toBe('manual');
    expect(result.status.relayOn).toBe(false);
    expect(result.status.manualRequestOn).toBe(false);
  });

  it('returns MANUAL to AUTO safe OFF', async () => {
    mocks.ensureCurrent.mockResolvedValue({
      installation,
      status: status('manual'),
      upgraded: false
    });
    mocks.readStatus.mockResolvedValue(status('auto'));
    const result = await enterInstalledAutomationAutoMode(installation);
    expect(mocks.setRuntimeMode).toHaveBeenCalledWith(installation, 'auto');
    expect(result.status.automationMode).toBe('auto');
    expect(result.status.relayOn).toBe(false);
  });

  it('routes MANUAL relay request through the replacement runtime', async () => {
    const replaced = { ...installation, script: { id: 11, hash: 'new-code-hash' } };
    mocks.ensureCurrent.mockResolvedValue({
      installation: replaced,
      status: status('manual', false, 11),
      upgraded: true
    });
    mocks.readStatus.mockResolvedValue(
      status('manual', true, 11, { manualRequestOn: true })
    );
    const result = await setInstalledAutomationRelayState(installation, true);
    expect(mocks.setManualRelay).toHaveBeenCalledWith(replaced, true);
    expect(mocks.setRuntimeMode).not.toHaveBeenCalled();
    expect(mocks.setRelayOn).not.toHaveBeenCalled();
    expect(result.status.relayOn).toBe(true);
    expect(result.status.manualRequestOn).toBe(true);
    expect(result.status.automationFault).toBeNull();
  });

  it('does not mutate relay when runtime convergence rejects physical identity', async () => {
    mocks.ensureCurrent.mockRejectedValue(
      new Error('Shelly identity does not match the installed automation.')
    );
    await expect(setInstalledAutomationRelayState(installation, true)).rejects.toThrow(
      'Shelly identity does not match'
    );
    expect(mocks.setManualRelay).not.toHaveBeenCalled();
    expect(mocks.setRelayOn).not.toHaveBeenCalled();
  });

  it('rejects manual relay request unless runtime is MANUAL', async () => {
    mocks.ensureCurrent.mockResolvedValue({
      installation,
      status: status('auto'),
      upgraded: false
    });
    await expect(setInstalledAutomationRelayState(installation, true)).rejects.toThrow(
      'live MANUAL automation runtime'
    );
    expect(mocks.setManualRelay).not.toHaveBeenCalled();
  });

  it('hard safety lockout overrides both mode changes and manual relay requests', async () => {
    const locked = status('manual', false, 7, {
      manualRequestOn: true,
      safetyLockout: true,
      safetyReason: 'mx'
    });
    mocks.ensureCurrent.mockResolvedValue({
      installation,
      status: locked,
      upgraded: false
    });
    await expect(enterInstalledAutomationManualMode(installation)).rejects.toThrow(
      'safety lockout'
    );
    await expect(setInstalledAutomationRelayState(installation, true)).rejects.toThrow(
      'safety lockout'
    );
    expect(mocks.setRuntimeMode).not.toHaveBeenCalled();
    expect(mocks.setManualRelay).not.toHaveBeenCalled();
  });
});
