import { describe, expect, it } from 'vitest';
import type { InstalledAutomation } from '../data/installedAutomation.js';
import { automationDetailCapabilities } from './automationDetailCapabilities.js';

const base = {
  version: 1,
  id: 'automation',
  shelly: {
    deviceId: 'shelly-test',
    name: 'Test plug',
    baseUrl: 'http://192.0.2.1/',
    model: 'S3PL-00112EU',
    gen: 3
  },
  installedAtMs: 1,
  updatedAtMs: 1
} as const;

const installation = (
  kind: 'climate' | 'time' | 'pulse',
  variant: 'steady' | 'pulse' = 'steady'
): InstalledAutomation => {
  if (kind === 'climate') {
    return {
      ...base,
      kind: 'climate',
      script: { id: 1, hash: 'climate' },
      config: {
        execution: variant === 'pulse' ? { pulse: {} } : undefined
      }
    } as unknown as InstalledAutomation;
  }
  if (kind === 'time') {
    return {
      ...base,
      kind: 'time',
      schedule: { onJobId: 1, offJobId: 2 },
      config: { relayId: 0, onTime: '08:00', offTime: '20:00' },
      ...(variant === 'pulse'
        ? {
            pulseRuntime: {
              script: { id: 3, hash: 'time-pulse' },
              pulse: {}
            }
          }
        : {})
    } as unknown as InstalledAutomation;
  }
  return {
    ...base,
    kind: 'pulse',
    script: { id: 4, hash: 'pulse' },
    config: { relayId: 0, pulse: {} }
  } as unknown as InstalledAutomation;
};

describe('automationDetailCapabilities', () => {
  it.each([
    {
      name: 'Climate steady',
      installation: installation('climate'),
      expected: {
        variant: 'climate',
        automationIcon: 'temperature',
        hasHistory: true,
        hasScript: true,
        historyProfile: 'climate'
      }
    },
    {
      name: 'Climate + Pulse',
      installation: installation('climate', 'pulse'),
      expected: {
        variant: 'climate-pulse',
        automationIcon: 'temperature',
        hasHistory: true,
        hasScript: true,
        historyProfile: 'climate'
      }
    },
    {
      name: 'Time native',
      installation: installation('time'),
      expected: {
        variant: 'time',
        automationIcon: 'clock',
        hasHistory: false,
        hasScript: false
      }
    },
    {
      name: 'Time + Pulse',
      installation: installation('time', 'pulse'),
      expected: {
        variant: 'time-pulse',
        automationIcon: 'clock',
        hasHistory: false,
        hasScript: true
      }
    },
    {
      name: 'Standalone Pulse',
      installation: installation('pulse'),
      expected: {
        variant: 'pulse',
        automationIcon: 'pulse',
        hasHistory: true,
        hasScript: true,
        historyProfile: 'pulse'
      }
    }
  ])('defines one Detail capability contract for $name', ({ installation, expected }) => {
    expect(automationDetailCapabilities(installation)).toEqual(expected);
  });
});
