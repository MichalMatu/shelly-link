import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import type { PulseOperationalStatus } from '../data/pulseOperationalStatus.js';
import { StandalonePulseDashboardStatus } from './StandalonePulseDashboardStatus.js';

const healthyStatus = (): PulseOperationalStatus => ({
  availability: 'available',
  phase: 'on',
  cyclesCompleted: 3,
  nextTransitionUptimeMs: 3_665_000,
  lastReason: 'po',
  requestedOutputOn: true,
  finalOutputOn: true,
  automationFault: null,
  hardSafety: false,
  hardSafetyReason: null,
  deviceUptimeMs: 3_600_000
});

const renderStatus = (status: PulseOperationalStatus) =>
  render(
    <I18nProvider>
      <StandalonePulseDashboardStatus status={status} />
    </I18nProvider>
  );

describe('StandalonePulseDashboardStatus', () => {
  beforeEach(() => setLocalePreference('pl'));
  afterEach(() => setLocalePreference('system'));

  it('keeps the healthy dashboard summary compact and status-first', () => {
    renderStatus(healthyStatus());
    const summary = screen.getByLabelText('Stan Pulse');

    expect(within(summary).getByText('ON')).toBeVisible();
    expect(within(summary).getByText('1m 5s')).toBeVisible();
    expect(within(summary).getByText('3 cykli')).toBeVisible();
    expect(within(summary).queryByText('Aktualny')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Wyjście automatyzacji')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Stan przekaźnika')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Powód automatyzacji')).not.toBeInTheDocument();
  });

  it('reveals requested/final output and diagnostics when the runtime needs attention', () => {
    renderStatus({
      ...healthyStatus(),
      finalOutputOn: false,
      automationFault: 'rc'
    });
    const summary = screen.getByLabelText('Stan Pulse');

    expect(within(summary).getByText('Wyjście automatyzacji')).toBeVisible();
    expect(within(summary).getByText('Stan przekaźnika')).toBeVisible();
    expect(within(summary).getByText('Powód automatyzacji')).toBeVisible();
    expect(within(summary).getByText('Błąd automatyki')).toBeVisible();
    expect(within(summary).getByText('Błąd sterowania przekaźnikiem')).toBeVisible();
  });
});
