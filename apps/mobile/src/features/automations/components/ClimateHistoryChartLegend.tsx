import type { HistoryMetricId } from './climateHistoryChartMetrics.js';

type ClimateHistoryChartLegendItem = {
  id: HistoryMetricId;
  label: string;
  value: string;
  visible: boolean;
};

type ClimateHistoryChartLegendProps = {
  title: string;
  items: readonly ClimateHistoryChartLegendItem[];
  onToggle(metricId: HistoryMetricId): void;
};

export const ClimateHistoryChartLegend = ({
  title,
  items,
  onToggle
}: ClimateHistoryChartLegendProps) => (
  <div className="climate-history-chart__metrics" role="group" aria-label={title}>
    {items.map((item) => (
      <button
        className="climate-history-chart__metric"
        data-metric={item.id}
        type="button"
        aria-label={`${item.label}, ${item.value}`}
        aria-pressed={item.visible}
        key={item.id}
        onClick={() => onToggle(item.id)}
      >
        <span className="climate-history-chart__metric-dot" aria-hidden="true" />
        <span className="climate-history-chart__metric-label">{item.label}</span>
        <strong>{item.value}</strong>
      </button>
    ))}
  </div>
);
