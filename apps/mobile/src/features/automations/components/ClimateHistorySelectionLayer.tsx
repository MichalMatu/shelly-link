import type { LineCustomSvgLayer } from '@nivo/line';
import { useRef, type Dispatch, type SetStateAction } from 'react';
import type { HistoryChartSeries } from './climateHistoryChartMetrics.js';

type HistoryInteractionSlice = {
  points: readonly { data: { recordIndex: number } }[];
};

const TOUCH_CLICK_DEDUPE_MS = 500;

export const historyRecordIndexFromInteraction = (datum: unknown): number | null => {
  if (typeof datum !== 'object' || datum === null || !('points' in datum)) return null;
  const points = (datum as Partial<HistoryInteractionSlice>).points;
  const recordIndex = points?.[0]?.data.recordIndex;
  return typeof recordIndex === 'number' ? recordIndex : null;
};

export const useHistorySelectionInteraction = (
  setSelectedRecordIndex: Dispatch<SetStateAction<number | null>>
) => {
  const lastTouchSelectionAtMs = useRef(0);
  const toggleSelectedDatum = (datum: unknown) => {
    const recordIndex = historyRecordIndexFromInteraction(datum);
    if (recordIndex === null) return;
    setSelectedRecordIndex((current) => (current === recordIndex ? null : recordIndex));
  };

  return {
    onTouchEnd: (datum: unknown) => {
      lastTouchSelectionAtMs.current = Date.now();
      toggleSelectedDatum(datum);
    },
    onClick: (datum: unknown) => {
      if (Date.now() - lastTouchSelectionAtMs.current < TOUCH_CLICK_DEDUPE_MS) return;
      toggleSelectedDatum(datum);
    }
  };
};

export const historySelectionSide = (
  xValues: readonly number[],
  selectedRecordIndex: number | null,
  xStart: number,
  xSpan: number
): 'left' | 'right' => {
  if (selectedRecordIndex === null || xSpan <= 0) return 'right';
  const selectedX = xValues[selectedRecordIndex];
  if (selectedX === undefined) return 'right';
  const ratio = Math.min(1, Math.max(0, (selectedX - xStart) / xSpan));
  return ratio < 0.5 ? 'right' : 'left';
};

export const createClimateHistorySelectionCrosshair = (
  xValues: readonly number[],
  selectedRecordIndex: number | null
): LineCustomSvgLayer<HistoryChartSeries> =>
  function ClimateHistorySelectionCrosshair({ xScale, innerHeight }) {
    if (selectedRecordIndex === null) return null;
    const selectedX = xValues[selectedRecordIndex];
    if (selectedX === undefined) return null;
    const x = xScale(selectedX);

    return (
      <line
        className="climate-history-chart__selection-crosshair"
        x1={x}
        x2={x}
        y1={0}
        y2={innerHeight}
        aria-hidden="true"
      />
    );
  };
