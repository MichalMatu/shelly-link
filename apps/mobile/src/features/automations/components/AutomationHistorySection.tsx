import { IonicActionButton } from '../../../components/IonicActionButton.js';
import type { HistoryRecord } from '@lcl/automation-core';
import { FeedbackPanel } from '@lcl/ui';
import { useTranslation } from '../../../app/i18n.js';
import { climateHistoryCopy } from '../../../app/locales/climateHistory.js';
import { ClimateHistoryChart } from './ClimateHistoryChart.js';
import {
  CLIMATE_HISTORY_PANEL_METRICS,
  PULSE_HISTORY_PANEL_METRICS
} from './climateHistoryChartMetrics.js';
import './ClimateHistorySection.css';

export type AutomationHistoryProfile = 'climate' | 'pulse';

type AutomationHistorySectionProps = {
  profile: AutomationHistoryProfile;
  records: readonly HistoryRecord[];
  invalidRecordCount: number;
  loading: boolean;
  error: boolean;
  onRetry(): void;
};

export const AutomationHistorySection = ({
  profile,
  records,
  invalidRecordCount,
  loading,
  error,
  onRetry
}: AutomationHistorySectionProps) => {
  const { locale, t } = useTranslation();
  const copy = climateHistoryCopy[locale];
  const panelMetrics =
    profile === 'pulse' ? PULSE_HISTORY_PANEL_METRICS : CLIMATE_HISTORY_PANEL_METRICS;

  if (loading) {
    return (
      <section className="plug-detail-loading plug-detail-loading--section" role="status">
        <span className="plug-detail-loading__spinner" aria-hidden="true" />
        <span>{copy.loading}</span>
      </section>
    );
  }

  if (error) {
    return (
      <FeedbackPanel tone="danger" title={copy.failed}>
        <IonicActionButton className="secondary-action" type="button" onClick={onRetry}>
          {copy.retry}
        </IonicActionButton>
      </FeedbackPanel>
    );
  }

  return (
    <section className="climate-history" aria-label={copy.title}>
      {invalidRecordCount > 0 && (
        <p className="climate-history__notice" role="status">
          {copy.partial}
        </p>
      )}
      {records.length === 0 ? (
        <p className="climate-history__empty">{copy.empty}</p>
      ) : (
        <ClimateHistoryChart
          records={records}
          locale={locale}
          panelMetrics={panelMetrics}
          labels={{
            title: copy.title,
            uptime: copy.uptime,
            automatic: copy.automatic,
            manual: copy.manual,
            temperature: copy.temperature,
            humidity: copy.humidity,
            vpd: copy.vpd,
            output: copy.output,
            power: copy.power,
            current: copy.current,
            on: t('common.on'),
            off: t('common.off')
          }}
        />
      )}
    </section>
  );
};
