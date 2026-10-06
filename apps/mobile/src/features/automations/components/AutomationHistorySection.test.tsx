import type { HistoryRecord } from '@lcl/automation-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { AutomationHistorySection } from './AutomationHistorySection.js';

vi.mock('@nivo/line', () => ({
  ResponsiveLine: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div role="img" aria-label={ariaLabel} data-testid="history-chart" />
  )
}));

const record = (uptimeSec: number, finalRelayOn: boolean): HistoryRecord => ({
  timestampUnixSec: 1_790_000_000 + uptimeSec,
  uptimeSec,
  temperatureC: 22.5,
  humidityPct: 58,
  vpdKpa: 1.12,
  requestedRelayOn: finalRelayOn,
  finalRelayOn,
  controlMode: 'auto',
  manualRequestOn: false,
  reasonCode: finalRelayOn ? 'bl' : 'ab',
  automationFault: null,
  safetyLockout: false,
  safetyReason: null,
  powerW: finalRelayOn ? 12.3 : 0,
  currentA: finalRelayOn ? 0.055 : 0
});

const renderSection = (
  props: Partial<React.ComponentProps<typeof AutomationHistorySection>> = {}
) =>
  render(
    <I18nProvider>
      <AutomationHistorySection
        profile="climate"
        records={[]}
        invalidRecordCount={0}
        loading={false}
        error={false}
        onRetry={vi.fn()}
        {...props}
      />
    </I18nProvider>
  );

describe('AutomationHistorySection', () => {
  beforeEach(() => setLocalePreference('en'));

  afterEach(() => {
    cleanup();
    setLocalePreference('system');
  });

  it('renders an empty state without inventing records', () => {
    renderSection();
    expect(
      screen.getByText('Shelly has not stored any history records yet.')
    ).toBeInTheDocument();
  });

  it('keeps the accepted Climate profile at five panels', () => {
    renderSection({
      records: [record(10, false), record(20, true)],
      invalidRecordCount: 1
    });

    expect(screen.getByRole('group', { name: 'History' })).toBeInTheDocument();
    expect(screen.getAllByTestId('history-chart')).toHaveLength(5);
    expect(screen.getByLabelText('Temperature: 22.5 °C')).toBeInTheDocument();
    expect(screen.getByLabelText('Humidity: 58 %')).toBeInTheDocument();
    expect(screen.getByLabelText('Output: ON')).toBeInTheDocument();
    expect(screen.getByLabelText('Power: 12.3 W')).toBeInTheDocument();
    expect(screen.getByLabelText('Current: 0.06 A')).toBeInTheDocument();
    expect(screen.queryByText('VPD')).not.toBeInTheDocument();
    expect(screen.queryByText('AUTO · ON')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Power/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('Some stored records are damaged and were skipped.')
    ).toBeInTheDocument();
  });

  it('renders only Output, Power and Current for standalone Pulse', () => {
    renderSection({ profile: 'pulse', records: [{ ...record(20, true), temperatureC: null, humidityPct: null, vpdKpa: null }] });
    expect(screen.getAllByTestId('history-chart')).toHaveLength(3);
    expect(screen.getByLabelText('Output: ON')).toBeInTheDocument();
    expect(screen.getByLabelText('Power: 12.3 W')).toBeInTheDocument();
    expect(screen.getByLabelText('Current: 0.06 A')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Temperature:/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Humidity:/)).not.toBeInTheDocument();
    expect(screen.queryByText('VPD')).not.toBeInTheDocument();
  });

  it('keeps Climate panel geometry stable when electrical metrics are unavailable', () => {
    const humidityOnly = {
      ...record(10, false),
      temperatureC: null,
      vpdKpa: null,
      powerW: null,
      currentA: null
    };
    renderSection({ records: [humidityOnly] });

    expect(screen.getAllByTestId('history-chart')).toHaveLength(5);
    expect(screen.getByLabelText('Temperature: —')).toBeInTheDocument();
    expect(screen.getByLabelText('Humidity: 58 %')).toBeInTheDocument();
    expect(screen.getByLabelText('Output: OFF')).toBeInTheDocument();
    expect(screen.getByLabelText('Power: —')).toBeInTheDocument();
    expect(screen.getByLabelText('Current: —')).toBeInTheDocument();
  });

  it('renders a retry action on read failure', () => {
    const onRetry = vi.fn();
    renderSection({ error: true, onRetry });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
