import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, setLocalePreference, translate } from '../../../app/i18n.js';
import { pulseOperationalStatusCopy } from '../../../app/locales/pulseOperationalStatus.js';
import type { PulseOperationalStatus } from '../data/pulseOperationalStatus.js';
import { StandalonePulseDashboardStatus } from './StandalonePulseDashboardStatus.js';

const copy = pulseOperationalStatusCopy.pl;
const relayRuleLabel = translate('pl', 'hardware.metrics.relayRule');
const shellyRelayLabel = translate('pl', 'hardware.metrics.shellyRelay');
const reasonLabel = translate('pl', 'hardware.metrics.reason');

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
    const summary = screen.getByLabelText(copy.status);

    expect(within(summary).getByText('ON')).toBeVisible();
    expect(within(summary).getByText('1m 5s')).toBeVisible();
    expect(within(summary).getByText(`3 ${copy.cycleSuffix}`)).toBeVisible();
    expect(within(summary).queryByText(copy.available)).not.toBeInTheDocument();
    expect(within(summary).queryByText(relayRuleLabel)).not.toBeInTheDocument();
    expect(within(summary).queryByText(shellyRelayLabel)).not.toBeInTheDocument();
    expect(within(summary).queryByText(reasonLabel)).not.toBeInTheDocument();
  });

  it('reveals requested/final output and diagnostics when the runtime needs attention', () => {
    renderStatus({
      ...healthyStatus(),
      finalOutputOn: false,
      automationFault: 'rc'
    });
    const summary = screen.getByLabelText('Stan Pulse');

    expect(within(summary).getByText(relayRuleLabel)).toBeVisible();
    expect(within(summary).getByText(shellyRelayLabel)).toBeVisible();
    expect(within(summary).getByText(reasonLabel)).toBeVisible();
    expect(within(summary).getByText(copy.automationFault)).toBeVisible();
    expect(within(summary).getByText(copy.reasons.rc)).toBeVisible();
  });
});
