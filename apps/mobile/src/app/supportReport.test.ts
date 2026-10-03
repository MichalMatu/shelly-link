import { describe, expect, it } from 'vitest';
import { createSupportReport } from './supportReport.js';

describe('support report', () => {
  it('includes build/schema evidence and redacts network/secrets', () => {
    const report = createSupportReport({
      platform: 'android',
      activeLocale: 'en',
      localePreference: 'system',
      themeMode: 'system',
      buildSha: 'abc123',
      installedAutomationSchemaVersion: 1,
      savedPlugSchemaVersion: 1,
      shellyDevices: [{ name: 'plug', detail: 'http://192.168.1.20 password=hunter2' }],
      sensorDevices: [],
      installedAutomations: [],
      selectedShelly: 'none',
      selectedSensor: 'none',
      lastDiagnostics: [],
      runtimeIssues: [],
      diagnosticEvents: [
        {
          id: '1',
          kind: 'rpc-read',
          severity: 'info',
          message: 'Shelly.GetStatus completed',
          atMs: 0
        }
      ]
    });
    expect(report).toContain('Build SHA: abc123');
    expect(report).toContain('InstalledAutomation schema: v1');
    expect(report).toContain('rpc-read');
    expect(report).not.toContain('192.168.1.20');
    expect(report).not.toContain('hunter2');
  });
});
