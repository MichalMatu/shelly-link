import type { HistoryRecord } from '@lcl/automation-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { ClimateHistorySection } from './ClimateHistorySection.js';

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
  props: Partial<React.ComponentProps<typeof ClimateHistorySection>> = {}
) =>
  render(
    <I18nProvider>
      <ClimateHistorySection
        records={[]}
        invalidRecordCount={0}
        loading={false}
        error={false}
        onRetry={vi.fn()}
        {...props}
      />
    </I18nProvider>
  );

describe('ClimateHistorySection', () => {
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

  it('renders a chart-first metric selector and reports skipped damaged records', () => {
    renderSection({
      records: [record(10, false), record(20, true)],
      invalidRecordCount: 1
    });

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('img', { name: 'History: Temperature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Temperature, 22.5 °C' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByText('Some stored records are damaged and were skipped.')
    ).toBeInTheDocument();

    const power = screen.getByRole('button', { name: 'Power, 12.3 W' });
    fireEvent.click(power);
    expect(power).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'History: Power' })).toBeInTheDocument();
  });

  it('falls back to the first available series when temperature is unavailable', () => {
    const humidityOnly = { ...record(10, false), temperatureC: null };
    renderSection({ records: [humidityOnly] });

    expect(screen.getByRole('img', { name: 'History: Humidity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Humidity, 58 %' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('renders a retry action on read failure', () => {
    const onRetry = vi.fn();
    renderSection({ error: true, onRetry });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
