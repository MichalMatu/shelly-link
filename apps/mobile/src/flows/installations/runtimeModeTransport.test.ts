import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultShellyThermostatConfig } from '@lcl/script-generator';
import { createInstalledAutomation } from './model.js';

const mocks = vi.hoisted(() => ({ call: vi.fn() }));

vi.mock('../../platform/shellyHttpTransport.js', () => {
  return {
    createShellyTransport: vi.fn(() => ({ call: mocks.call }))
  };
});

import {
  readInstalledAutomationRuntimeMode,
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

describe('runtime mode Script.Eval transport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tracks control-mode transition uptime without reusing relay-change timing', async () => {
    mocks.call.mockResolvedValue({ ok: true, value: { result: '1' } });

    await setInstalledAutomationRuntimeMode(installation, 'manual-off');

    const request = mocks.call.mock.calls.at(-1)?.[0] as
      { params?: { code?: string } } | undefined;
    const code = request?.params?.code ?? '';
    expect(code).toContain('R.mt');
    expect(code).not.toContain('R.lc=nw()');
  });

  it('sets MANUAL_OFF inside the running script and verifies the eval result', async () => {
    mocks.call.mockResolvedValue({ ok: true, value: { result: '1' } });

    await setInstalledAutomationRuntimeMode(installation, 'manual-off');

    expect(mocks.call).toHaveBeenCalledWith({
      method: 'Script.Eval',
      params: {
        id: 7,
        code: expect.stringContaining('R.m=1')
      }
    });
  });

  it('reads live MANUAL_OFF/AUTO state without using Script.Stop', async () => {
    mocks.call.mockResolvedValueOnce({ ok: true, value: { result: '1' } });
    await expect(readInstalledAutomationRuntimeMode(installation)).resolves.toEqual({
      mode: 'manual-off',
      supported: true
    });

    mocks.call.mockResolvedValueOnce({ ok: true, value: { result: '0' } });
    await expect(readInstalledAutomationRuntimeMode(installation)).resolves.toEqual({
      mode: 'auto',
      supported: true
    });
  });

  it('marks an older running runtime as unsupported instead of calling it MANUAL', async () => {
    mocks.call.mockResolvedValue({ ok: true, value: { result: '-1' } });

    await expect(readInstalledAutomationRuntimeMode(installation)).resolves.toEqual({
      mode: 'auto',
      supported: false
    });
  });
});
