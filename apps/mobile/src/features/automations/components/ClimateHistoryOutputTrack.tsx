import type { HistoryRecord } from '@lcl/automation-core';
import type { LineCustomSvgLayer } from '@nivo/line';
import type { HistoryChartSeries } from './climateHistoryChartMetrics.js';

export const createClimateHistoryOutputTrack = (
  records: readonly HistoryRecord[],
  xValues: readonly number[],
  visible: boolean
): LineCustomSvgLayer<HistoryChartSeries> =>
  function ClimateHistoryOutputTrack({ xScale, yScale, innerWidth }) {
    if (!visible || records.length === 0) return null;

    const offY = yScale(0);
    const onY = yScale(1);
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
