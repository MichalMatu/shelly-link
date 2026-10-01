import type { HistoryRecord } from '@lcl/automation-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { ClimateHistorySection } from './ClimateHistorySection.js';

vi.mock('@nivo/line', () => ({
  ResponsiveLine: ({
    ariaLabel,
    onClick,
    onTouchEnd
  }: {
    ariaLabel?: string;
    onClick?: (datum: { points: readonly { data: { recordIndex: number } }[] }) => void;
    onTouchEnd?: (datum: {
      points: readonly { data: { recordIndex: number } }[];
    }) => void;
  }) => {
    const datum = { points: [{ data: { recordIndex: 1 } }] } as const;
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        data-testid="history-chart"
        onClick={() => onClick?.(datum)}
        onTouchEnd={() => onTouchEnd?.(datum)}
      />
    );
  }
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

  it('shows all available metrics by default and toggles them independently', () => {
    renderSection({
      records: [record(10, false), record(20, true)],
      invalidRecordCount: 1
    });

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('img', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Temperature, 22.5 °C' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Humidity, 58 %' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Output, ON' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByText('Some stored records are damaged and were skipped.')
    ).toBeInTheDocument();

    const power = screen.getByRole('button', { name: 'Power, 12.3 W' });
    fireEvent.click(power);
    expect(power).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Temperature, 22.5 °C' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('img', { name: 'History' })).toBeInTheDocument();

    fireEvent.click(power);
    expect(power).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the shared tooltip only after a chart touch and toggles it closed', () => {
    renderSection({ records: [record(10, false), record(20, true)] });

    const chart = screen.getByRole('img', { name: 'History' });
    expect(screen.queryByText('AUTO · ON')).not.toBeInTheDocument();

    fireEvent.touchEnd(chart);
    expect(screen.getByText('AUTO · ON')).toBeInTheDocument();
    expect(screen.getAllByText('12.3 W')).toHaveLength(2);
    expect(screen.getAllByText('0.06 A')).toHaveLength(2);

    fireEvent.touchEnd(chart);
    expect(screen.queryByText('AUTO · ON')).not.toBeInTheDocument();
  });

  it('omits unavailable metrics without changing the shared chart', () => {
    const humidityOnly = {
      ...record(10, false),
      temperatureC: null,
      vpdKpa: null,
      powerW: null,
      currentA: null
    };
    renderSection({ records: [humidityOnly] });

    expect(screen.getByRole('img', { name: 'History' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Temperature/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Humidity, 58 %' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Output, OFF' })).toHaveAttribute(
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
