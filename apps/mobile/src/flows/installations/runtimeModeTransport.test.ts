import {
  climateRuntimeResetSafetyLockoutEvalCode,
  climateRuntimeSetControlModeEvalCode,
  climateRuntimeSetManualRelayEvalCode,
  createDefaultShellyThermostatConfig
} from '@lcl/script-generator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstalledAutomation } from './model.js';

const mocks = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock('../../platform/shellyHttpTransport.js', () => ({
  createShellyTransport: vi.fn(() => ({ call: mocks.call }))
}));

import {
  readInstalledAutomationRuntimeMode,
  resetInstalledAutomationSafetyLockout,
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
    mocks.call.mockResolvedValue({ ok: true, value: { result: '[1,0,null,0,null]' } });

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
