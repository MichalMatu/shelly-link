import { describe, expect, it } from 'vitest';
import {
  decodePulseScriptOperationalState,
  normalizePulseOperationalStatus,
  pulseOperationalRemainingMs,
  readScriptPulseOperationalStatus,
  unavailablePulseOperationalStatus,
  type PulseOperationalStatusClient
} from './pulseOperationalStatus.js';

const baseInput = {
  phase: 'on' as const,
  cyclesCompleted: 2,
  nextTransitionUptimeMs: 15_000,
  lastReason: 'pn',
  requestedOutputOn: true,
  finalOutputOn: true,
  automationFault: null,
  hardSafety: false,
  hardSafetyReason: null,
  deviceUptimeMs: 10_000
};

describe('Pulse operational status', () => {
  it('normalizes Climate diagnostic values into the shared model', () => {
    const status = normalizePulseOperationalStatus(baseInput);
    expect(status).toMatchObject({
      availability: 'available',
      phase: 'on',
      cyclesCompleted: 2,
      requestedOutputOn: true,
      finalOutputOn: true
    });
    expect(pulseOperationalRemainingMs(status)).toBe(5_000);
  });

  it('decodes the shared Time and Standalone Script.Eval protocol', () => {
    expect(decodePulseScriptOperationalState('[3,4,22000,"pf",0,null,18000]')).toEqual({
      phase: 'off',
      cyclesCompleted: 4,
      nextTransitionUptimeMs: 22_000,
      lastReason: 'pf',
      requestedOutputOn: false,
      automationFault: null,
      deviceUptimeMs: 18_000
    });
  });

  it('marks an active snapshot stale after its transition deadline', () => {
    expect(
      normalizePulseOperationalStatus({
        ...baseInput,
        nextTransitionUptimeMs: 10_000,
        deviceUptimeMs: 12_001
      }).availability
    ).toBe('stale');
  });

  it('returns unavailable for an unsupported or malformed snapshot', () => {
    expect(normalizePulseOperationalStatus(null)).toEqual(
      unavailablePulseOperationalStatus()
    );
    expect(decodePulseScriptOperationalState('[]')).toBeNull();
  });

  it('surfaces Script.Eval read failures instead of fabricating runtime state', async () => {
    const client = {
      evaluateScript: async () => Promise.reject(new Error('read failed')),
      getStatus: async () => Promise.reject(new Error('read failed'))
    } as unknown as PulseOperationalStatusClient;

    await expect(
      readScriptPulseOperationalStatus(
        { baseUrl: 'http://192.0.2.1', scriptId: 4 },
        client
      )
    ).rejects.toThrow('read failed');
  });
});
