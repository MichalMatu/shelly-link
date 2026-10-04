import type { ShellyRpcRequest } from '@lcl/shelly-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as RuntimeModeModule from '../installations/runtimeModeTransport.js';

const mocks = vi.hoisted(() => ({
  call: vi.fn(),
  capture: vi.fn(),
  restore: vi.fn(),
  events: [] as string[]
}));

vi.mock('../../platform/shellyHttpTransport.js', () => ({
  createShellyFetch: vi.fn(),
  createShellyTransport: vi.fn(() => ({ call: mocks.call }))
}));

vi.mock('../installations/runtimeModeTransport.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeModeModule>();
  return {
    ...actual,
    captureManagedAutomationDiscoveryRestoreState: mocks.capture,
    restoreManagedAutomationDiscoveryState: mocks.restore
  };
});

import {
  prepareShellyBleDiscovery,
  stopShellyBleDiscovery
} from './shellyRequests.js';

const pulseAutoState = {
  kind: 'standalone-pulse' as const,
  scriptId: 4,
  wasRunning: true,
  relayId: 0,
  manualRelayOn: null
};

const pulseManualState = {
  kind: 'standalone-pulse' as const,
  scriptId: 4,
  wasRunning: false,
  relayId: 0,
  manualRelayOn: true
};

const installRpcMock = () => {
  mocks.call.mockImplementation(async (request: ShellyRpcRequest) => {
    mocks.events.push(request.method);
    if (request.method === 'Script.List') {
      return { ok: true, value: { scripts: [] } };
    }
    if (request.method === 'Switch.GetStatus') {
      return { ok: true, value: { id: 0, output: false } };
    }
    if (
      request.method === 'Switch.Set' ||
      request.method === 'Script.Stop' ||
      request.method === 'Script.Delete'
    ) {
      return { ok: true, value: null };
    }
    throw new Error(`Unexpected RPC method: ${request.method}`);
  });
};

describe('Shelly BLE discovery managed runtime orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
    installRpcMock();
    mocks.capture.mockImplementation(async () => {
      mocks.events.push('capture');
      return pulseAutoState;
    });
    mocks.restore.mockImplementation(async () => {
      mocks.events.push('restore');
    });
  });

  it('captures state before forcing OFF and stops a running automation before discovery', async () => {
    await expect(prepareShellyBleDiscovery('http://192.168.0.20/')).resolves.toEqual({
      automationRestoreState: pulseAutoState
    });

    expect(mocks.events).toEqual([
      'Script.List',
      'capture',
      'Switch.Set',
      'Switch.GetStatus',
      'Script.Stop',
      'Switch.Set',
      'Switch.GetStatus'
    ]);
  });

  it('deletes the discovery script before restoring a paused Pulse MANUAL state', async () => {
    await stopShellyBleDiscovery('http://192.168.0.20/', {
      discoveryScriptId: 7,
      automationRestoreState: pulseManualState
    });

    expect(mocks.events).toEqual(['Script.Stop', 'Script.Delete', 'restore']);
    expect(mocks.restore).toHaveBeenCalledWith(expect.any(Object), pulseManualState);
  });

  it('fails safe OFF and stops the managed script when restoration fails', async () => {
    mocks.restore.mockImplementationOnce(async () => {
      mocks.events.push('restore');
      throw new Error('restore failed');
    });

    await expect(
      stopShellyBleDiscovery('http://192.168.0.20/', {
        discoveryScriptId: 7,
        automationRestoreState: pulseManualState
      })
    ).rejects.toThrow('restore failed');

    expect(mocks.events).toEqual([
      'Script.Stop',
      'Script.Delete',
      'restore',
      'Switch.Set',
      'Script.Stop'
    ]);
  });
});
