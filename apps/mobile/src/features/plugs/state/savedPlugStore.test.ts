import { beforeEach, describe, expect, it } from 'vitest';
import type { VerifiedPlugBleCandidate } from '../data/plugBleOnboarding.js';
import { resetSavedPlugStore, useSavedPlugStore } from './savedPlugStore.js';

const candidate = (patch: Partial<VerifiedPlugBleCandidate> = {}): VerifiedPlugBleCandidate => ({
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

describe('saved physical Plug store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSavedPlugStore();
  });

  it('merges Wi-Fi-first and BLE discovery into one physical record', () => {
    useSavedPlugStore.getState().saveWifiDevice({
      physicalId: 'SHELLYPLUGSG3-AABB',
      name: 'Growbox fan',
      wifiBaseUrl: 'http://192.168.1.44/',
      scriptIdInput: '2',
      model: 'S3PL-00112EU',
      generation: 3
    });
    useSavedPlugStore.getState().saveBleCandidate(candidate());

    expect(useSavedPlugStore.getState().plugs).toEqual([
      expect.objectContaining({
        physicalId: 'shellyplugsg3-aabb',
        name: 'Growbox fan',
        wifiBaseUrl: 'http://192.168.1.44',
        bleDeviceId: 'temporary-handle-a',
        scriptIdInput: '2'
      })
    ]);
  });

  it('merges BLE-first and verified Wi-Fi promotion without changing identity or name', () => {
    useSavedPlugStore.getState().saveBleCandidate(candidate());
    useSavedPlugStore.getState().renamePlug('shellyplugsg3-aabb', 'Custom name');
    useSavedPlugStore.getState().setWifiLocator('SHELLYPLUGSG3-AABB', 'http://192.168.0.17/');

    expect(useSavedPlugStore.getState().plugs).toEqual([
      expect.objectContaining({
        physicalId: 'shellyplugsg3-aabb',
        name: 'Custom name',
        bleDeviceId: 'temporary-handle-a',
        wifiBaseUrl: 'http://192.168.0.17'
      })
    ]);
  });

  it('updates locators and metadata independently of physical identity', () => {
    useSavedPlugStore.getState().saveBleCandidate(candidate());
    useSavedPlugStore.getState().replaceBleLocator('SHELLYPLUGSG3-AABB', 'temporary-handle-b');
    useSavedPlugStore
      .getState()
      .setDeviceMetadata('shellyplugsg3-aabb', { model: 'S3PL-00112EU', generation: 3 });
    useSavedPlugStore.getState().updateFirmware('shellyplugsg3-aabb', '2.0.1');

    expect(useSavedPlugStore.getState().plugs[0]).toMatchObject({
      physicalId: 'shellyplugsg3-aabb',
      bleDeviceId: 'temporary-handle-b',
      firmwareId: '2.0.1'
    });
  });

  it('removes the one canonical record by physical identity', () => {
    useSavedPlugStore.getState().saveBleCandidate(candidate());
    useSavedPlugStore.getState().removePlug('SHELLYPLUGSG3-AABB');
    expect(useSavedPlugStore.getState().plugs).toEqual([]);
  });
});
