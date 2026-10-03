import type { Measurement } from '@lcl/ble-core';
import { IconBattery, IconClock, IconWifi } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import {
  formatBattery,
  formatSeenAt,
  formatSensorMetric,
  latestBatterySample,
  latestNumericSample,
  latestSample
} from '../presentation/savedSensorCardPresentation.js';

type SensorLiveReadingsProps = {
  samples: readonly Measurement[];
};

export const SensorLiveReadings = ({ samples }: SensorLiveReadingsProps) => {
  const { locale, t } = useTranslation();
  const temperatureSample = latestNumericSample(samples, 'temperatureC');
  const humiditySample = latestNumericSample(samples, 'humidityPct');
  const hasTemperatureData =
    typeof temperatureSample?.temperatureC === 'number' &&
    Number.isFinite(temperatureSample.temperatureC);
  const hasHumidityData =
    typeof humiditySample?.humidityPct === 'number' &&
    Number.isFinite(humiditySample.humidityPct);
  const latest = latestSample(samples);
  const batterySample = latestBatterySample(samples);
  const rssiSample = latestNumericSample(samples, 'rssi');

  return (
    <>
      <div className="sensor-metric-grid">
        <div
          className={
            hasTemperatureData
              ? 'sensor-data-metric-card'
              : 'sensor-data-metric-card sensor-data-metric-card--empty'
          }
        >
          <span className="sensor-data-metric-card__label">
            {t('hardware.metrics.temperature')}
          </span>
          <strong
            className={
              hasTemperatureData
                ? 'sensor-data-metric-card__value'
                : 'sensor-data-metric-card__value sensor-data-metric-card__value--empty'
            }
          >
            {formatSensorMetric(temperatureSample?.temperatureC, '°C', 1, '— °C')}
          </strong>
        </div>
        <div
          className={
            hasHumidityData
              ? 'sensor-data-metric-card'
              : 'sensor-data-metric-card sensor-data-metric-card--empty'
          }
        >
          <span className="sensor-data-metric-card__label">
            {t('hardware.metrics.humidity')}
          </span>
          <strong
            className={
              hasHumidityData
                ? 'sensor-data-metric-card__value'
                : 'sensor-data-metric-card__value sensor-data-metric-card__value--empty'
            }
          >
            {formatSensorMetric(humiditySample?.humidityPct, '%', 1, '— %')}
          </strong>
        </div>
      </div>

      <div className="sensor-status-strip">
        <span
          className="sensor-status-strip__item"
          aria-label={`${t('hardware.metrics.battery')}: ${formatBattery(
            batterySample,
            '—'
          )}`}
          title={t('hardware.metrics.battery')}
        >
          <IconBattery aria-hidden="true" />
          <strong>{formatBattery(batterySample, '—')}</strong>
        </span>
        <span
          className="sensor-status-strip__item"
          aria-label={`${t('common.rssi')}: ${formatSensorMetric(
            rssiSample?.rssi,
            ' dBm',
            0,
            '—'
          )}`}
          title={t('common.rssi')}
        >
          <IconWifi aria-hidden="true" />
          <strong>{formatSensorMetric(rssiSample?.rssi, ' dBm', 0, '—')}</strong>
        </span>
        <span
          className="sensor-status-strip__item"
          aria-label={`${t('hardware.metrics.lastMeasurement')}: ${formatSeenAt(
            latest,
            locale,
            '—'
          )}`}
          title={t('hardware.metrics.lastMeasurement')}
        >
          <IconClock aria-hidden="true" />
          <strong>{formatSeenAt(latest, locale, '—')}</strong>
        </span>
      </div>
    </>
  );
};
