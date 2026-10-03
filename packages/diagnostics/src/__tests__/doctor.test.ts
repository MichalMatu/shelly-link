import { describe, expect, it } from 'vitest';
import { evaluateShellyDoctorSnapshot, formatShellyDoctorReport } from '../doctor.js';

describe('Shelly doctor', () => {
  it('passes a matching managed runtime', () => {
    const report = evaluateShellyDoctorSnapshot({
      reachable: true,
      expectedDeviceId: 'shellyplugsg3-abc',
      observedDeviceId: 'SHELLYPLUGSG3-ABC',
      firmwareId: '1.7.5',
      relayOn: false,
      clock: { timeSynced: true },
      scripts: [
        { id: 4, name: 'Shelly Link', enable: true, running: true, hash: 'lcl-12345678' }
      ],
      schedules: [],
      expectedAutomation: {
        kind: 'climate',
        scriptId: 4,
        scriptHash: 'lcl-12345678',
        shouldRun: true
      }
    });
    expect(report.status).toBe('pass');
    expect(formatShellyDoctorReport(report)).toContain('PASS');
  });

  it('fails closed on identity or script drift', () => {
    const report = evaluateShellyDoctorSnapshot({
      reachable: true,
      expectedDeviceId: 'expected',
      observedDeviceId: 'foreign',
      firmwareId: '1.7.5',
      clock: { timeSynced: true },
      scripts: [
        { id: 3, name: 'Shelly Link', enable: true, running: true, hash: 'changed' }
      ],
      expectedAutomation: {
        kind: 'pulse',
        scriptId: 3,
        scriptHash: 'expected-hash',
        shouldRun: true
      }
    });
    expect(report.status).toBe('fail');
    expect(report.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(['device.identity', 'script.hash'])
    );
  });

  it('requires synchronized clock for Time automation', () => {
    const report = evaluateShellyDoctorSnapshot({
      reachable: true,
      firmwareId: '1.7.5',
      clock: { timeSynced: false },
      schedules: [{ id: 1, enable: true, timespec: '0 0 8 * * *' }],
      expectedAutomation: { kind: 'time', scheduleIds: [1, 2] }
    });
    expect(report.status).toBe('fail');
    expect(report.findings.find((item) => item.code === 'device.clock')?.status).toBe(
      'fail'
    );
    expect(
      report.findings.find((item) => item.code === 'schedule.expected')?.status
    ).toBe('fail');
  });
});
