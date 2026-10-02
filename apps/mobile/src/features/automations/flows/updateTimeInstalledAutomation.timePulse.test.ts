import { describe, expect, it, vi } from 'vitest';
import { createTimePulseInstalledAutomation } from '../data/installedAutomation.js';
import {
  updateTimeInstalledAutomation,
  type TimeAutomationEditServices
} from './updateTimeInstalledAutomation.js';

const installation = createTimePulseInstalledAutomation({
  shelly: { id: 'SHELLY-ABC', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Grow plug',
  baseUrl: 'http://192.168.0.20/',
  onJobId: 4,
  offJobId: 5,
  scriptId: 7,
  scriptHash: 'pulse-hash',
  config: { relayId: 0, onTime: '22:00', offTime: '06:00' },
  pulse: {
    onMs: 60_000,
    offMs: 120_000,
    initialDelayMs: 0,
    startPhase: 'on',
    execution: { mode: 'continuous' }
  },
  nowMs: 1000
});

describe('updateTimeInstalledAutomation Time + Pulse guard', () => {
  it('rejects Pulse before any Steady runtime service can mutate the device', async () => {
    const services: TimeAutomationEditServices = {
      readDeviceId: vi.fn(async () => 'SHELLY-ABC'),
      hasManagedClimateScript: vi.fn(async () => false),
      updateRuntime: vi.fn(async () => {
        throw new Error('must not run');
      }),
      nowMs: vi.fn(() => 2000)
    };

    await expect(
      updateTimeInstalledAutomation({
        installation,
        config: { relayId: 0, onTime: '23:00', offTime: '07:00' },
        installations: [installation],
        services
      })
    ).rejects.toThrow('dedicated Pulse runtime updater');

    expect(services.readDeviceId).not.toHaveBeenCalled();
    expect(services.hasManagedClimateScript).not.toHaveBeenCalled();
    expect(services.updateRuntime).not.toHaveBeenCalled();
  });
});
