import { beforeEach, describe, expect, it } from 'vitest';
import type { VerifiedPlugBleCandidate } from '../data/plugBleOnboarding.js';
import { resetSavedBlePlugStore, useSavedBlePlugStore } from './savedBlePlugStore.js';

const candidate = (
  patch: Partial<VerifiedPlugBleCandidate> = {}
): VerifiedPlugBleCandidate => ({
  bleDeviceId: 'temporary-handle-a',
  advertisementName: 'ShellyPlugSG3-AABB',
  rssi: -42,
  physicalId: 'shellyplugsg3-aabb',
  model: 'S3PL-00112EU',
  generation: 3,
  firmwareId: '1.7.5',
  matterEnabled: false,
  ...patch
});

describe('saved BLE plug store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSavedBlePlugStore();
  });

  it('upserts by physical identity rather than BLE locator', () => {
    useSavedBlePlugStore.getState().saveCandidate(candidate());
    useSavedBlePlugStore.getState().renamePlug('shellyplugsg3-aabb', 'Growbox fan');
    useSavedBlePlugStore
      .getState()
      .saveCandidate(
        candidate({ bleDeviceId: 'temporary-handle-b', firmwareId: '1.8.0' })
      );

    expect(useSavedBlePlugStore.getState().plugs).toHaveLength(1);
    expect(useSavedBlePlugStore.getState().plugs[0]).toMatchObject({
      physicalId: 'shellyplugsg3-aabb',
      name: 'Growbox fan',
      bleDeviceId: 'temporary-handle-b',
      firmwareId: '1.8.0'
    });
  });

  it('replaces only the reconnect locator and preserves custom Plug metadata', () => {
    useSavedBlePlugStore.getState().saveCandidate(candidate());
    useSavedBlePlugStore.getState().renamePlug('shellyplugsg3-aabb', 'Growbox fan');

    useSavedBlePlugStore
      .getState()
      .replaceLocator('SHELLYPLUGSG3-AABB', 'temporary-handle-recovered');

    expect(useSavedBlePlugStore.getState().plugs).toEqual([
      expect.objectContaining({
        physicalId: 'shellyplugsg3-aabb',
        name: 'Growbox fan',
        bleDeviceId: 'temporary-handle-recovered',
        advertisementName: 'ShellyPlugSG3-AABB',
        model: 'S3PL-00112EU',
        firmwareId: '1.7.5'
      })
    ]);
  });

  it('stores a Wi-Fi locator on the same physical Plug and preserves it across BLE rediscovery', () => {
    useSavedBlePlugStore.getState().saveCandidate(candidate());
    useSavedBlePlugStore
      .getState()
      .setWifiLocator('SHELLYPLUGSG3-AABB', 'http://192.168.1.44/');

    expect(useSavedBlePlugStore.getState().plugs[0]).toMatchObject({
      physicalId: 'shellyplugsg3-aabb',
      bleDeviceId: 'temporary-handle-a',
      wifiBaseUrl: 'http://192.168.1.44'
    });

    useSavedBlePlugStore
      .getState()
      .saveCandidate(candidate({ bleDeviceId: 'temporary-handle-new' }));

    expect(useSavedBlePlugStore.getState().plugs[0]).toMatchObject({
      physicalId: 'shellyplugsg3-aabb',
      bleDeviceId: 'temporary-handle-new',
      wifiBaseUrl: 'http://192.168.1.44'
    });
  });

  it('persists verified firmware metadata without changing locators or the custom name', () => {
    useSavedBlePlugStore.getState().saveCandidate(candidate());
    useSavedBlePlugStore.getState().renamePlug('shellyplugsg3-aabb', 'Growbox fan');
    useSavedBlePlugStore
      .getState()
      .setWifiLocator('shellyplugsg3-aabb', 'http://192.168.0.17');

    useSavedBlePlugStore
      .getState()
      .updateFirmware('SHELLYPLUGSG3-AABB', '20260923-075613/2.0.1-ge1a198b');

    expect(useSavedBlePlugStore.getState().plugs).toEqual([
      expect.objectContaining({
        physicalId: 'shellyplugsg3-aabb',
        name: 'Growbox fan',
        bleDeviceId: 'temporary-handle-a',
        wifiBaseUrl: 'http://192.168.0.17',
        firmwareId: '20260923-075613/2.0.1-ge1a198b'
      })
    ]);
  });

  it('removes a BLE-only plug by physical identity', () => {
    useSavedBlePlugStore.getState().saveCandidate(candidate());

    useSavedBlePlugStore.getState().removePlug('SHELLYPLUGSG3-AABB');

    expect(useSavedBlePlugStore.getState().plugs).toEqual([]);
  });
});
