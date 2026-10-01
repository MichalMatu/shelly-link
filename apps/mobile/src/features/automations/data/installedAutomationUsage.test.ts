import { describe, expect, it } from 'vitest';
import { createDefaultShellyThermostatConfig } from '@lcl/script-generator';
import {
  installedAutomationsUsingSensor,
  installedAutomationsUsingShelly
} from './installedAutomationUsage.js';
import type { InstalledAutomation } from './installedAutomation.js';

const climateInstallation = (): InstalledAutomation => {
  const config = createDefaultShellyThermostatConfig(
    'xiaomi_lywsd03mmc_bthome_v2',
    'heating'
  );
  return {
    version: 1,
    id: 'climate:shellyplugsg3-aabb:0',
    kind: 'climate',
    shelly: {
      deviceId: 'shellyplugsg3-aabb',
      name: 'Growbox',
      baseUrl: 'http://192.168.1.20',
      model: 'S3PL-00112EU',
      gen: 3
    },
    script: { id: 1, hash: 'hash' },
    config: {
      ...config,
      sensor: {
        ...config.sensor,
        sensorId: 'sensor-aabbccddeeff',
        runtimeAddress: 'AA:BB:CC:DD:EE:FF',
        displayName: 'Canopy'
      }
    },
    installedAtMs: 1,
    updatedAtMs: 1
  };
};

describe('installed automation device usage', () => {
  it('matches Shelly ownership by canonical physical identity', () => {
    const installation = climateInstallation();
    expect(installedAutomationsUsingShelly([installation], 'SHELLYPLUGSG3-AABB')).toEqual(
      [{ id: installation.id, kind: 'climate', name: 'Growbox' }]
    );
  });

  it('matches Climate sensor ownership by runtime address', () => {
    const installation = climateInstallation();
    expect(installedAutomationsUsingSensor([installation], 'aa:bb:cc:dd:ee:ff')).toEqual([
      { id: installation.id, kind: 'climate', name: 'Growbox' }
    ]);
    expect(installedAutomationsUsingSensor([installation], '11:22:33:44:55:66')).toEqual(
      []
    );
  });
});
