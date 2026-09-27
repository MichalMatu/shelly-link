import type {
  Result,
  ShellyClientError,
  ShellyRpcTransport,
  ShellyWifiScanEntry,
  ShellyWifiStatus
} from '@lcl/shelly-client';
import { describe, expect, it, vi } from 'vitest';
import {
  BlePlugWifiProvisioningUnsupportedError,
  provisionBlePlugWifi,
  scanBlePlugWifiNetworks,
  type BlePlugWifiProvisioningDependencies
} from './blePlugWifiProvisioning.js';

const success = <T>(value: T): Result<T> => ({ ok: true, value });
const failure = (technicalMessage: string, retryable = true): Result<never> => ({
  ok: false,
  error: {
    kind: 'shelly-offline',
    userMessageKey: 'errors.shellyOffline',
    technicalMessage,
    retryable
  } satisfies ShellyClientError
});

const plug = { physicalId: 'shellyplugsg3-demo', bleDeviceId: 'BLE-LOCATOR' };

const createHarness = () => {
  const disconnect = vi.fn(async () => undefined);
  const transport = {
    call: vi.fn(),
    disconnect
  } as unknown as ShellyRpcTransport & { disconnect(): Promise<void> };
  const getDeviceInfo = vi.fn(async () =>
    success({ id: plug.physicalId, model: 'S3PL-00112EU', gen: 3 })
  );
  const scan = vi.fn<() => Promise<Result<ShellyWifiScanEntry[]>>>(async () => success([]));
  const setStation = vi.fn(async () => success({ restart_required: false }));
  const getStatus = vi.fn<() => Promise<Result<ShellyWifiStatus>>>(async () =>
    success({ status: 'got ip', ssid: 'Home', sta_ip: '192.168.1.44' })
  );
  let now = 1_000;
  const dependencies: BlePlugWifiProvisioningDependencies = {
    createTransport: vi.fn(() => transport),
    createClient: vi.fn(() => ({ getDeviceInfo })),
    createWifiClient: vi.fn(() => ({ scan, setStation, getStatus })),
    listMethods: vi.fn(async () => ['WiFi.Scan', 'WiFi.SetConfig', 'WiFi.GetStatus']),
    sleep: vi.fn(async (ms) => {
      now += ms;
    }),
    nowMs: vi.fn(() => now)
  };
  return {
    dependencies,
    disconnect,
    getDeviceInfo,
    getStatus,
    scan,
    setStation
  };
};

describe('BLE Plug Wi-Fi provisioning', () => {
  it('verifies identity and returns visible networks deduplicated by strongest signal', async () => {
    const { dependencies, disconnect, scan } = createHarness();
    scan.mockResolvedValue(
      success([
        { ssid: 'Home', bssid: 'a', auth: 3, rssi: -72 },
        { ssid: 'Home', bssid: 'b', auth: 3, rssi: -40 },
        { ssid: 'Guest', bssid: 'c', auth: 0, rssi: -60 },
        { ssid: null, bssid: 'd', auth: 3, rssi: -20 }
      ])
    );

    await expect(scanBlePlugWifiNetworks(plug, dependencies)).resolves.toEqual([
      { ssid: 'Home', auth: 3, rssi: -40 },
      { ssid: 'Guest', auth: 0, rssi: -60 }
    ]);
    expect(scan).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('sends credentials once and uses read-only polling until the Plug gets an IP', async () => {
    const { dependencies, disconnect, getStatus, setStation } = createHarness();
    getStatus
      .mockResolvedValueOnce(success({ status: 'connecting', ssid: 'Home', sta_ip: null }))
      .mockResolvedValueOnce(success({ status: 'connected', ssid: 'Home', sta_ip: null }))
      .mockResolvedValueOnce(
        success({ status: 'got ip', ssid: 'Home', sta_ip: '192.168.1.44', rssi: -51 })
      );

    await expect(
      provisionBlePlugWifi(
        plug,
        { ssid: 'Home', password: 'secret' },
        { timeoutMs: 5_000, pollIntervalMs: 500 },
        dependencies
      )
    ).resolves.toEqual({
      status: { status: 'got ip', ssid: 'Home', sta_ip: '192.168.1.44', rssi: -51 }
    });

    expect(setStation).toHaveBeenCalledOnce();
    expect(setStation).toHaveBeenCalledWith({ ssid: 'Home', password: 'secret' });
    expect(getStatus).toHaveBeenCalledTimes(3);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('blocks Wi-Fi mutation when the canonical device identity does not match', async () => {
    const { dependencies, disconnect, setStation } = createHarness();
    vi.mocked(dependencies.createClient).mockReturnValue({
      getDeviceInfo: vi.fn(async () =>
        success({ id: 'shellyplugsg3-other', model: 'S3PL-00112EU', gen: 3 })
      )
    });

    await expect(
      provisionBlePlugWifi(plug, { ssid: 'Home', password: 'secret' }, {}, dependencies)
    ).rejects.toThrow('Shelly identity does not match the saved Plug.');
    expect(setStation).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('does not send credentials when the BLE channel does not advertise provisioning', async () => {
    const { dependencies, setStation } = createHarness();
    vi.mocked(dependencies.listMethods).mockResolvedValue(['WiFi.GetStatus']);

    await expect(
      provisionBlePlugWifi(plug, { ssid: 'Home', password: 'secret' }, {}, dependencies)
    ).rejects.toBeInstanceOf(BlePlugWifiProvisioningUnsupportedError);
    expect(setStation).not.toHaveBeenCalled();
  });

  it('never replays a failed Wi-Fi mutation', async () => {
    const { dependencies, getStatus, setStation } = createHarness();
    setStation.mockResolvedValue(failure('BLE link dropped after WiFi.SetConfig.'));

    await expect(
      provisionBlePlugWifi(plug, { ssid: 'Home', password: 'secret' }, {}, dependencies)
    ).rejects.toThrow('BLE link dropped after WiFi.SetConfig.');
    expect(setStation).toHaveBeenCalledOnce();
    expect(getStatus).not.toHaveBeenCalled();
  });
});
