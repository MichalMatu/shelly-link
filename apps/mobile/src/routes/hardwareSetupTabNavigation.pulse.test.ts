import { describe, expect, it } from 'vitest';
import { availableTabsForIntent } from './hardwareSetupTabNavigation.js';

describe('standalone Pulse setup navigation', () => {
  it('uses Shelly then Pulse when no Plug is fixed', () => {
    expect(availableTabsForIntent('pulse').map((tab) => tab.id)).toEqual([
      'shelly',
      'pulse'
    ]);
  });

  it('opens directly on Pulse when the Plug is already fixed', () => {
    expect(
      availableTabsForIntent('pulse', 'shellyplugsg3-test').map((tab) => tab.id)
    ).toEqual(['pulse']);
  });
});
