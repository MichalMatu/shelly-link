import {
  climateRuntimeResetSafetyLockoutEvalCode,
  climateRuntimeSetControlModeEvalCode,
  climateRuntimeSetManualRelayEvalCode,
  createDefaultShellyThermostatConfig,
  generateShellyStandalonePulseScript,
  generateShellyThermostatScript
} from '@lcl/script-generator';
import type { ShellyRpcRequest, ShellyRpcTransport } from '@lcl/shelly-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstalledAutomation } from './model.js';

const mocks = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('../../platform/shellyHttpTransport.js', () => ({
  createShellyTransport: vi.fn(() => ({ call: mocks.call }))
}));

import {
  captureManagedAutomationDiscoveryRestoreState,
  readInstalledAutomationRuntimeMode,
  resetInstalledAutomationSafetyLockout,
  restoreManagedAutomationDiscoveryState,
  setInstalledAutomationManualRelayRequest,
  setInstalledAutomationRuntimeMode
} from './runtimeModeTransport.js';

const installation = createInstalledAutomation({
  shelly: { id: 'shelly-a', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Salon',
  baseUrl: 'http://192.168.0.20/',
  scriptId: 7,
  scriptHash: 'hash',
  config: createDefaultShellyThermostatConfig(),
  nowMs: 1000
});

const transport = (): ShellyRpcTransport => ({ call: mocks.call });

const mockManagedScript = ({
  code,
  running,
  relayOn = false,
  evalResult = '[0,0,null,0,null]'
}: {
  code: string;
  running: boolean;
  relayOn?: boolean;
  evalResult?: string;
}) => {
  let output = relayOn;
  let runningState = running;
  mocks.call.mockImplementation(async (request: ShellyRpcRequest) => {
    if (request.method === 'Script.List') {
      return {
        ok: true,
        value: {
          scripts: [{ id: 7, name: 'Managed', enable: true, running: runningState }]
        }
      };
    }
    if (request.method === 'Script.GetCode') {
      const params = request.params as { offset?: number; len?: number };
      const offset = params.offset ?? 0;
      const length = params.len ?? 1024;
      const data = code.slice(offset, offset + length);
      return {
        ok: true,
        value: { data, left: Math.max(code.length - offset - data.length, 0) }
      };
    }
    if (request.method === 'Script.Eval') {
      return { ok: true, value: { result: evalResult } };
    }
    if (request.method === 'Script.Start') {
      runningState = true;
      return { ok: true, value: null };
    }
    if (request.method === 'Script.Stop') {
      runningState = false;
      return { ok: true, value: null };
    }
    if (request.method === 'Switch.Set') {
      output = Boolean((request.params as { on?: boolean }).on);
      return { ok: true, value: null };
    }
    if (request.method === 'Switch.GetStatus') {
      return { ok: true, value: { id: 0, output } };
    }
    throw new Error(`Unexpected RPC method: ${request.method}`);
  });
};

describe('runtime control Script.Eval transport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the centralized protocol helper for MANUAL mode', async () => {
    mocks.call.mockResolvedValue({ ok: true, value: { result: '1' } });

    await setInstalledAutomationRuntimeMode(installation, 'manual');

    expect(mocks.call).toHaveBeenCalledWith({
      method: 'Script.Eval',
      params: {
        id: 7,
        code: climateRuntimeSetControlModeEvalCode('manual')
      }
    });
  });

  it('reads control mode, manual request, automation fault and safety separately', async () => {
    mocks.call.mockResolvedValue({ ok: true, value: { result: '[1,1,"st",0,null]' } });

    await expect(readInstalledAutomationRuntimeMode(installation)).resolves.toEqual({
      mode: 'manual',
      manualRequestOn: true,
      automationFault: 'st',
      safetyLockout: false,
      safetyReason: null,
      supported: true
    });
  });

  it('marks an older runtime protocol as unsupported', async () => {
    mocks.call.mockResolvedValue({ ok: true, value: { result: '-1' } });

    await expect(readInstalledAutomationRuntimeMode(installation)).resolves.toEqual({
      mode: 'auto',
      manualRequestOn: false,
      automationFault: null,
      safetyLockout: false,
      safetyReason: null,
      supported: false
    });
  });

  it('uses the centralized helper for manual relay requests', async () => {
    mocks.call.mockResolvedValue({ ok: true, value: { result: '1' } });

    await setInstalledAutomationManualRelayRequest(installation, true);

    expect(mocks.call).toHaveBeenCalledWith({
      method: 'Script.Eval',
      params: {
        id: 7,
        code: climateRuntimeSetManualRelayEvalCode(true)
      }
    });
  });

  it('resets a lockout through the centralized protocol helper', async () => {
    mocks.call.mockResolvedValueOnce({
      ok: true,
      value: { result: '[1,0,null,0,null]' }
    });

    await expect(resetInstalledAutomationSafetyLockout(installation)).resolves.toEqual({
      mode: 'manual',
      manualRequestOn: false,
      automationFault: null,
      safetyLockout: false,
      safetyReason: null
    });
    expect(mocks.call).toHaveBeenCalledWith({
      method: 'Script.Eval',
      params: { id: 7, code: climateRuntimeResetSafetyLockoutEvalCode }
    });
  });

  it('reports hard safety lockout separately from automation sensor health', async () => {
    mocks.call.mockResolvedValueOnce({ ok: true, value: { result: '-2' } });
    await expect(
      setInstalledAutomationManualRelayRequest(installation, true)
    ).rejects.toThrow('safety lockout');

    expect(climateRuntimeSetManualRelayEvalCode(true)).not.toContain('if(R.af)');
  });
});

describe('temporary BLE discovery managed runtime preservation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('captures the existing Climate control protocol without changing semantics', async () => {
    const code = generateShellyThermostatScript(createDefaultShellyThermostatConfig());
    mockManagedScript({
      code,
      running: true,
      evalResult: '[1,1,"st",0,null]'
    });

    await expect(
      captureManagedAutomationDiscoveryRestoreState(transport())
    ).resolves.toMatchObject({
      kind: 'climate',
      scriptId: 7,
      wasRunning: true,
      relayId: 0,
      controlState: {
        mode: 'manual',
        manualRequestOn: true,
        automationFault: 'st',
        safetyLockout: false,
        safetyReason: null
      }
    });
  });

  it('captures a paused standalone Pulse as MANUAL including relay state', async () => {
    const code = generateShellyStandalonePulseScript({
      relayId: 0,
      pulse: {
        onMs: 1000,
        offMs: 2000,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    });
    mockManagedScript({ code, running: false, relayOn: true });

    await expect(
      captureManagedAutomationDiscoveryRestoreState(transport())
    ).resolves.toEqual({
      kind: 'standalone-pulse',
      scriptId: 7,
      wasRunning: false,
      relayId: 0,
      manualRelayOn: true
    });
  });

  it('restores a paused Climate runtime back to stopped if it is unexpectedly running', async () => {
    mockManagedScript({ code: '', running: true });

    await restoreManagedAutomationDiscoveryState(transport(), {
      kind: 'climate',
      scriptId: 7,
      wasRunning: false,
      relayId: 0,
      controlState: null
    });

    expect(mocks.call).toHaveBeenCalledWith({
      method: 'Script.Stop',
      params: { id: 7 }
    });
  });

  it('restores standalone Pulse AUTO by starting its stopped existing script', async () => {
    mockManagedScript({ code: '', running: false });

    await restoreManagedAutomationDiscoveryState(transport(), {
      kind: 'standalone-pulse',
      scriptId: 7,
      wasRunning: true,
      relayId: 0,
      manualRelayOn: null
    });

    expect(mocks.call).toHaveBeenCalledWith({
      method: 'Script.Start',
      params: { id: 7 }
    });
    expect(
      mocks.call.mock.calls.some(([request]) => request.method === 'Script.Eval')
    ).toBe(false);
  });

  it('restores standalone Pulse MANUAL relay state without starting the script', async () => {
    mockManagedScript({ code: '', running: false, relayOn: false });

    await restoreManagedAutomationDiscoveryState(transport(), {
      kind: 'standalone-pulse',
      scriptId: 7,
      wasRunning: false,
      relayId: 0,
      manualRelayOn: true
    });

    expect(mocks.call).toHaveBeenCalledWith({
      method: 'Switch.Set',
      params: { id: 0, on: true }
    });
    expect(
      mocks.call.mock.calls.some(([request]) => request.method === 'Script.Start')
    ).toBe(false);
  });

  it('fails closed on multiple active scripts before reading or mutating either one', async () => {
    mocks.call.mockImplementation(async (request: ShellyRpcRequest) => {
      if (request.method === 'Script.List') {
        return {
          ok: true,
          value: {
            scripts: [
              { id: 7, name: 'Managed A', enable: true, running: true },
              { id: 8, name: 'Managed B', enable: false, running: true }
            ]
          }
        };
      }
      throw new Error(`Unexpected RPC method: ${request.method}`);
    });

    await expect(
      captureManagedAutomationDiscoveryRestoreState(transport())
    ).rejects.toThrow('Multiple active Shelly scripts');

    expect(
      mocks.call.mock.calls.some(([request]) =>
        ['Script.GetCode', 'Script.Stop', 'Switch.Set'].includes(request.method)
      )
    ).toBe(false);
  });

  it('rejects an unknown running script before the BLE lifecycle can mutate it', async () => {
    mockManagedScript({ code: '// foreign runtime', running: true });

    await expect(
      captureManagedAutomationDiscoveryRestoreState(transport())
    ).rejects.toThrow('safe state preservation');

    expect(
      mocks.call.mock.calls.some(([request]) =>
        ['Script.Stop', 'Switch.Set'].includes(request.method)
      )
    ).toBe(false);
  });
});
