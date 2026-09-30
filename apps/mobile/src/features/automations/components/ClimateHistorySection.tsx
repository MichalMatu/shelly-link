import type { HistoryRecord } from '@lcl/automation-core';
import { FeedbackPanel } from '@lcl/ui';
import { useTranslation } from '../../../app/i18n.js';
import { climateHistoryCopy } from '../../../app/locales/climateHistory.js';
import './ClimateHistorySection.css';

type ClimateHistorySectionProps = {
  records: readonly HistoryRecord[];
  invalidRecordCount: number;
  loading: boolean;
  error: boolean;
  onRetry(): void;
};

const formatUptime = (uptimeSec: number): string => {
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${uptimeSec}s`;
};

export const ClimateHistorySection = ({
  records,
  invalidRecordCount,
  loading,
  error,
  onRetry
}: ClimateHistorySectionProps) => {
  const { locale, t } = useTranslation();
  const copy = climateHistoryCopy[locale];
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const dateTime = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const newestFirst = [...records].reverse();

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
        <button className="secondary-action" type="button" onClick={onRetry}>
          {copy.retry}
        </button>
      </FeedbackPanel>
    );
  }

  return (
    <section className="climate-history" aria-label={copy.title}>
      {invalidRecordCount > 0 && <FeedbackPanel tone="warning" title={copy.partial} />}
      {newestFirst.length === 0 ? (
        <p className="climate-history__empty">{copy.empty}</p>
      ) : (
        <ol className="climate-history__list">
          {newestFirst.map((record, index) => {
            const time =
              record.timestampUnixSec === null
                ? `${copy.uptime} ${formatUptime(record.uptimeSec)}`
                : dateTime.format(new Date(record.timestampUnixSec * 1000));
            const mode = record.controlMode === 'manual' ? copy.manual : copy.automatic;
            const output = record.finalRelayOn ? t('common.on') : t('common.off');

            return (
              <li
                className="climate-history__record"
                key={`${record.timestampUnixSec ?? 'uptime'}-${record.uptimeSec}-${index}`}
              >
                <div className="climate-history__record-header">
                  <strong>{time}</strong>
                  <span>{`${mode} · ${output}`}</span>
                </div>
                <dl className="climate-history__metrics">
                  {record.temperatureC !== null && (
                    <div>
                      <dt>{copy.temperature}</dt>
                      <dd>{number.format(record.temperatureC)} °C</dd>
                    </div>
                  )}
                  {record.humidityPct !== null && (
                    <div>
                      <dt>{copy.humidity}</dt>
                      <dd>{number.format(record.humidityPct)} %</dd>
                    </div>
                  )}
                  {record.vpdKpa !== null && (
                    <div>
                      <dt>{copy.vpd}</dt>
                      <dd>{number.format(record.vpdKpa)} kPa</dd>
                    </div>
                  )}
                  <div>
                    <dt>{copy.output}</dt>
                    <dd>{output}</dd>
                  </div>
                  {record.powerW !== null && (
                    <div>
                      <dt>{copy.power}</dt>
                      <dd>{number.format(record.powerW)} W</dd>
                    </div>
                  )}
                  {record.currentA !== null && (
                    <div>
                      <dt>{copy.current}</dt>
                      <dd>{number.format(record.currentA)} A</dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
