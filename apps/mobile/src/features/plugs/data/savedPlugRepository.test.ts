import { describe, expect, it, vi } from 'vitest';
import {
  createSavedPlugRepository,
  SAVED_PLUGS_STORAGE_KEY,
  type SavedPlugStorageAdapter
} from './savedPlugRepository.js';

const storage = (values: Record<string, string>): SavedPlugStorageAdapter => ({
  getItem: vi.fn((key: string) => values[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    values[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete values[key];
  })
});

describe('saved physical Plug repository', () => {
  it('migrates Wi-Fi and BLE legacy registries into one canonical record', () => {
    const values: Record<string, string> = {
      'lcl.hardwareSetupDraft.v9': JSON.stringify({
        shellyDevices: [{
          id: 'SHELLYPLUGSG3-AABB',
          name: 'Growbox',
          baseUrl: 'http://192.168.0.20/',
          scriptIdInput: '3',
          model: 'S3PL-00112EU',
          gen: 3
        }]
      }),
      'lcl.savedBlePlugs.v1': JSON.stringify({
        version: 1,
        plugs: [{
          physicalId: 'shellyplugsg3-aabb',
          name: 'BLE default',
          bleDeviceId: 'BLE:AA',
          advertisementName: 'ShellyPlugSG3-AABB',
          model: 'S3PL-00112EU',
          generation: 3,
          firmwareId: '1.7.5',
          matterEnabled: false
        }]
      }),
      'lcl.hardwareSetupDraft.v10': JSON.stringify({ selectedShellyId: null })
    };
    const adapter = storage(values);
    const plugs = createSavedPlugRepository(adapter).load();

    expect(plugs).toHaveLength(1);
    expect(plugs[0]).toMatchObject({
      physicalId: 'shellyplugsg3-aabb',
      name: 'Growbox',
      wifiBaseUrl: 'http://192.168.0.20',
      bleDeviceId: 'BLE:AA',
      scriptIdInput: '3'
    });
    expect(values[SAVED_PLUGS_STORAGE_KEY]).toBeTruthy();
    expect(values['lcl.savedBlePlugs.v1']).toBeUndefined();
    expect(values['lcl.hardwareSetupDraft.v9']).toBeUndefined();
  });

  it('never promotes an endpoint-shaped legacy id into physical identity', () => {
    const values: Record<string, string> = {
      'lcl.hardwareSetupDraft.v9': JSON.stringify({
        shellyDevices: [{
          id: 'http://192.168.0.20/',
          name: 'Legacy endpoint',
          baseUrl: 'http://192.168.0.20/',
          scriptIdInput: '1'
        }]
      })
    };
    expect(createSavedPlugRepository(storage(values)).load()).toEqual([]);
  });
});
