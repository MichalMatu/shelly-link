import type { Result, ShellyClientError, ShellyRpcTransport } from '@lcl/shelly-client';
import { describe, expect, it, vi } from 'vitest';
import { syncBlePlugTime, type BlePlugTimeSyncDependencies } from './blePlugTimeSync.js';

const success = <T>(value: T): Result<T> => ({ ok: true, value });

const createDependencies = (remotePhysicalId = 'shellyplugsg3-demo') => {
  const disconnect = vi.fn(async () => undefined);
  const transport = {
    call: vi.fn(),
    disconnect
  } as unknown as ShellyRpcTransport & { disconnect(): Promise<void> };
  const getDeviceInfo = vi.fn(async () =>
    success({ id: remotePhysicalId, model: 'S3PL-00112EU', gen: 3 })
  );
  const setTime = vi.fn(async () => success<null>(null));
  const dependencies: BlePlugTimeSyncDependencies = {
    createTransport: vi.fn(() => transport),
    createClient: vi.fn(() => ({ getDeviceInfo })),
    setTime,
    nowMs: vi.fn(() => 1_800_000_000_987)
  };
  return { dependencies, disconnect, getDeviceInfo, setTime, transport };
};

const plug = {
  physicalId: 'shellyplugsg3-demo',
  bleDeviceId: 'BLE-LOCATOR'
};

describe('syncBlePlugTime', () => {
  it('verifies physical identity before sending phone time over the same BLE session', async () => {
    const { dependencies, disconnect, getDeviceInfo, setTime, transport } =
      createDependencies();

    await expect(syncBlePlugTime(plug, dependencies)).resolves.toEqual({
      unixTimeSec: 1_800_000_000.987
    });

    expect(dependencies.createTransport).toHaveBeenCalledOnce();
    expect(dependencies.createTransport).toHaveBeenCalledWith('BLE-LOCATOR');
    expect(getDeviceInfo).toHaveBeenCalledOnce();
    expect(setTime).toHaveBeenCalledOnce();
    expect(setTime).toHaveBeenCalledWith(transport, 1_800_000_000.987);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('rejects a mismatched physical identity before Sys.SetTime', async () => {
    const { dependencies, disconnect, setTime } = createDependencies(
      'shellyplugsg3-other-device'
    );

    await expect(syncBlePlugTime(plug, dependencies)).rejects.toThrow(
      'Shelly identity does not match the saved Plug.'
    );
    expect(setTime).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('does not replay a failed time mutation and still disconnects', async () => {
    const { dependencies, disconnect, setTime } = createDependencies();
    const error: ShellyClientError = {
      kind: 'shelly-offline',
      userMessageKey: 'errors.shellyOffline',
      technicalMessage: 'BLE link dropped during Sys.SetTime.',
      retryable: true
    };
    setTime.mockResolvedValue({ ok: false, error });

    await expect(syncBlePlugTime(plug, dependencies)).rejects.toThrow(
      'BLE link dropped during Sys.SetTime.'
    );
    expect(setTime).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
