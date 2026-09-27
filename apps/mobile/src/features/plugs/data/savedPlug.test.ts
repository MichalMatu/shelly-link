import { describe, expect, it } from 'vitest';
import { savedPlugFromBleCandidate, savedPlugFromWifiDevice, savedPlugToWifiDevice } from './savedPlug.js';

describe('saved physical Plug model', () => {
  it('normalizes canonical identity while keeping transport locators separate', () => {
    const wifi = savedPlugFromWifiDevice({
      physicalId: ' SHELLYPLUGSG3-AABB ',
      name: 'Growbox',
      wifiBaseUrl: 'http://192.168.0.20/',
      scriptIdInput: '1',
      model: 'S3PL-00112EU',
      generation: 3
    });
    const both = savedPlugFromBleCandidate({
      bleDeviceId: 'BLE:AA',
      advertisementName: 'ShellyPlugSG3-AABB',
      rssi: -40,
      physicalId: 'shellyplugsg3-aabb',
      model: 'S3PL-00112EU',
      generation: 3,
      firmwareId: '1.7.5',
      matterEnabled: false
    }, wifi);

    expect(both).toMatchObject({
      physicalId: 'shellyplugsg3-aabb',
      wifiBaseUrl: 'http://192.168.0.20',
      bleDeviceId: 'BLE:AA',
      name: 'Growbox'
    });
    expect(savedPlugToWifiDevice(both)).toMatchObject({
      id: 'shellyplugsg3-aabb',
      baseUrl: 'http://192.168.0.20'
    });
  });
});
