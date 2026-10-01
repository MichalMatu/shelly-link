import { describe, expect, it } from 'vitest';
import {
  createStandalonePulseInstalledAutomation,
  createTimeInstalledAutomation,
  findRelayOwnerConflict,
  installedAutomationRelayId,
  installedAutomationSchema,
  isStandalonePulseInstalledAutomation
} from './installedAutomation.js';

const pulse = () =>
  createStandalonePulseInstalledAutomation({
    shelly: { id: 'SHELLY-ABC', model: 'S3PL-00112EU', gen: 3 },
    shellyName: 'Pump plug',
    baseUrl: 'http://192.168.0.10/',
    scriptId: 7,
    scriptHash: 'pulse-hash',
    config: {
      relayId: 0,
      pulse: {
        onMs: 1_000,
        offMs: 2_000,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    },
    nowMs: 1_000
  });

describe('Standalone Pulse installed automation', () => {
  it('uses the durable InstalledAutomation identity and schema', () => {
    const installation = pulse();
    expect(installation.id).toBe('pulse:shelly-abc:0');
    expect(installation.kind).toBe('pulse');
    expect(installedAutomationRelayId(installation)).toBe(0);
    expect(isStandalonePulseInstalledAutomation(installation)).toBe(true);
    expect(installedAutomationSchema.parse(installation)).toEqual(installation);
  });

  it('participates in the existing one-owner-per-relay conflict check', () => {
    const time = createTimeInstalledAutomation({
      shelly: { id: 'shelly-abc', model: 'S3PL-00112EU', gen: 3 },
      shellyName: 'Pump plug',
      baseUrl: 'http://192.168.0.10/',
      onJobId: 1,
      offJobId: 2,
      config: { relayId: 0, onTime: '08:00', offTime: '09:00' },
      nowMs: 2_000
    });

    expect(
      findRelayOwnerConflict({
        installations: [time],
        deviceId: 'SHELLY-ABC',
        relayId: 0,
        requestedKind: 'pulse'
      })
    ).toEqual(time);
  });
});
