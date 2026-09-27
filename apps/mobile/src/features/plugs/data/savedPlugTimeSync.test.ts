import type { Result, ShellyRpcTransport } from '@lcl/shelly-client';
import { describe, expect, it, vi } from 'vitest';
import { BlePlugTimeSyncUnsupportedError } from './blePlugTimeSync.js';
import type { SavedPlugWithBleLocator } from './savedPlug.js';
import {
  syncSavedPlugTime,
  type SavedPlugTimeSyncDependencies
} from './savedPlugTimeSync.js';

const success = <T>(value: T): Result<T> => ({ ok: true, value });

const plug: SavedPlugWithBleLocator = {
  physicalId: 'shellyplugsg3-demo',
  name: 'Grow Plug',
  bleDeviceId: 'BLE-LOCATOR',
  advertisementName: 'ShellyPlugSG3-demo',
  model: 'S3PL-00112EU',
  generation: 3,
  firmwareId: '1.2.3',
  matterEnabled: false,
  wifiBaseUrl: 'http://192.168.0.17'
};

const createDependencies = () => {
  const transport = { call: vi.fn() } as unknown as ShellyRpcTransport;
  const createWifiTransport = vi.fn(async () => transport);
  const supportsSetTime = vi.fn(async () => true);
  const setTime = vi.fn(async () => success<null>(null));
  const syncBle = vi.fn(async () => ({ unixTimeSec: 1 }));
  const dependencies: SavedPlugTimeSyncDependencies = {
    createWifiTransport,
    supportsSetTime,
    setTime,
    syncBle,
    nowMs: () => 1_800_000_000_987
  };
  return {
    dependencies,
    transport,
    createWifiTransport,
    supportsSetTime,
    setTime,
    syncBle
  };
};

describe('syncSavedPlugTime', () => {
  it('uses verified Wi-Fi and exactly one Sys.SetTime after provisioning', async () => {
    const { dependencies, transport, createWifiTransport, setTime, syncBle } =
      createDependencies();

    await expect(syncSavedPlugTime(plug, dependencies)).resolves.toEqual({
      unixTimeSec: 1_800_000_000.987
    });

    expect(createWifiTransport).toHaveBeenCalledWith({
      deviceId: plug.physicalId,
      baseUrl: plug.wifiBaseUrl
    });
    expect(setTime).toHaveBeenCalledOnce();
    expect(setTime).toHaveBeenCalledWith(transport, 1_800_000_000.987);
    expect(syncBle).not.toHaveBeenCalled();
  });

  it('does not send Sys.SetTime when the provisioned firmware does not advertise it', async () => {
    const { dependencies, setTime } = createDependencies();
    dependencies.supportsSetTime = vi.fn(async () => false);

    await expect(syncSavedPlugTime(plug, dependencies)).rejects.toBeInstanceOf(
      BlePlugTimeSyncUnsupportedError
    );
    expect(setTime).not.toHaveBeenCalled();
  });

  it('keeps BLE as the bootstrap path when no Wi-Fi locator exists', async () => {
    const { dependencies, createWifiTransport, syncBle } = createDependencies();
    const bleOnly = { ...plug };
    delete bleOnly.wifiBaseUrl;

    await expect(syncSavedPlugTime(bleOnly, dependencies)).resolves.toEqual({
      unixTimeSec: 1
    });
    expect(syncBle).toHaveBeenCalledOnce();
    expect(createWifiTransport).not.toHaveBeenCalled();
  });
});
