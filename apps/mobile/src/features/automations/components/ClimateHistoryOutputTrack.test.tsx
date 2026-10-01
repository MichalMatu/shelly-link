import type { HistoryRecord } from '@lcl/automation-core';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createClimateHistoryOutputTrack } from './ClimateHistoryOutputTrack.js';

const record = (finalRelayOn: boolean): HistoryRecord => ({
  timestampUnixSec: 1_790_000_000,
  uptimeSec: 10,
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

describe('createClimateHistoryOutputTrack', () => {
  it('renders relay transitions as an unfilled orthogonal path across its own panel', () => {
    const layer = createClimateHistoryOutputTrack(
      [record(true), record(false), record(true)],
      [10, 20, 30],
      true
    );
    const props = {
      xScale: (value: number) => value,
      yScale: (value: number) => (value === 1 ? 10 : 90),
      innerWidth: 100
    } as Parameters<typeof layer>[0];

    const node = layer(props);
    const { container } = render(<svg>{node as React.ReactNode}</svg>);
    const path = container.querySelector('path.climate-history-chart__output-track');

    expect(path).toHaveAttribute('fill', 'none');
    expect(path).toHaveAttribute('d', 'M 10 10 H 20 V 90 H 30 V 10');
  });
});
