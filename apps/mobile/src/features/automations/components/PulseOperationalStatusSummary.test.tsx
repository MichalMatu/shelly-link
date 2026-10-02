import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import {
  normalizePulseOperationalStatus,
  unavailablePulseOperationalStatus
} from '../data/pulseOperationalStatus.js';
import { PulseOperationalStatusSummary } from './PulseOperationalStatusSummary.js';

const renderSummary = (status: ReturnType<typeof normalizePulseOperationalStatus>) => {
  render(
    <I18nProvider>
      <PulseOperationalStatusSummary status={status} />
    </I18nProvider>
  );
  return screen.getByLabelText('Pulse status');
};

const sharedInput = {
  phase: 'on' as const,
  cyclesCompleted: 2,
  nextTransitionUptimeMs: 15_000,
  lastReason: 'po',
  requestedOutputOn: true,
  finalOutputOn: true,
  automationFault: null,
  hardSafety: null,
  hardSafetyReason: null,
  deviceUptimeMs: 10_000
};

describe('PulseOperationalStatusSummary', () => {
  beforeEach(() => setLocalePreference('en'));
  afterEach(() => setLocalePreference('system'));

  it('presents Climate + Pulse requested/final output, reason, fault and hard safety', () => {
    const summary = renderSummary(
      normalizePulseOperationalStatus({
        ...sharedInput,
        finalOutputOn: false,
        automationFault: 'rc',
        hardSafety: true,
        hardSafetyReason: 'sf'
      })
    );

    expect(within(summary).getByText('Current')).toBeInTheDocument();
    expect(summary).toHaveTextContent('ON');
    expect(summary).toHaveTextContent('OFF');
    expect(summary).toHaveTextContent('ON phase');
    expect(summary).toHaveTextContent('Relay control fault');
    expect(summary).toHaveTextContent('Safety fault');
  });

  it('presents Time + Pulse phase, progress and remaining time from the shared adapter', () => {
    const summary = renderSummary(
      normalizePulseOperationalStatus({
        ...sharedInput,
        phase: 'off',
        cyclesCompleted: 4,
        lastReason: 'pf',
        requestedOutputOn: false
      })
    );

    expect(summary).toHaveTextContent('OFF phase');
    expect(summary).toHaveTextContent('4 cycles');
    expect(summary).toHaveTextContent('5 s');
  });

  it('presents Standalone Pulse unavailable and stale reads without inventing output state', () => {
    const { rerender } = render(
      <I18nProvider>
        <PulseOperationalStatusSummary status={unavailablePulseOperationalStatus()} />
      </I18nProvider>
    );
    expect(screen.getByLabelText('Pulse status')).toHaveTextContent('Unavailable');

    rerender(
      <I18nProvider>
        <PulseOperationalStatusSummary
          status={normalizePulseOperationalStatus({
            ...sharedInput,
            nextTransitionUptimeMs: 5_000,
            deviceUptimeMs: 8_001
          })}
        />
      </I18nProvider>
    );
    expect(screen.getByLabelText('Pulse status')).toHaveTextContent('Stale');
  });
});
