import type { HistoryRecord } from '@lcl/automation-core';
import type { LineCustomSvgLayer } from '@nivo/line';
import type { HistoryChartSeries } from './climateHistoryChartMetrics.js';

const OUTPUT_TRACK_BOTTOM_OFFSET = 12;
const OUTPUT_TRACK_STATE_GAP = 44;

export const createClimateHistoryOutputTrack = (
  records: readonly HistoryRecord[],
  xValues: readonly number[],
  visible: boolean
): LineCustomSvgLayer<HistoryChartSeries> =>
  function ClimateHistoryOutputTrack({ xScale, innerHeight, innerWidth }) {
    if (!visible || records.length === 0) return null;

    const offY = innerHeight - OUTPUT_TRACK_BOTTOM_OFFSET;
    const onY = Math.max(8, offY - OUTPUT_TRACK_STATE_GAP);
    const yFor = (record: HistoryRecord) => (record.finalRelayOn ? onY : offY);
    const firstX = xScale(xValues[0]!);
    let path = `M ${firstX} ${yFor(records[0]!)}`;

    for (let index = 1; index < records.length; index += 1) {
      const x = xScale(xValues[index]!);
      path += ` H ${x} V ${yFor(records[index]!)}`;
    }

    return (
      <g aria-hidden="true">
        <line
          className="climate-history-chart__output-baseline"
          x1={0}
          x2={innerWidth}
          y1={offY}
          y2={offY}
        />
        {records.length === 1 ? (
          <circle
            className="climate-history-chart__output-track"
            cx={firstX}
            cy={yFor(records[0]!)}
            r={2.5}
          />
        ) : (
          <path className="climate-history-chart__output-track" d={path} fill="none" />
        )}
      </g>
    );
  };
