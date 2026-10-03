import type { Measurement } from '@lcl/ble-core';
import {
  IconClock,
  IconDeviceMobile,
  IconDotsVertical,
  IconPencil,
  IconPlug,
  IconTemperature,
  IconTrash
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import {
  SENSOR_SAMPLE_PULSE_MS,
  latestSample,
  sensorProfileDisplayLabels,
  type SavedSensorCardDevice
} from '../presentation/savedSensorCardPresentation.js';
import { SensorLiveReadings } from './SensorLiveReadings.js';

type SavedSensorCardProps = {
  device: SavedSensorCardDevice;
  samples: readonly Measurement[];
  isEditing: boolean;
  pvvxTimePending: boolean;
  onEditStart(): void;
  onEditEnd(): void;
  onNameChange(value: string): void;
  onPvvxSetTime(): void;
  onRemove(): void;
  onOpenDetails?: () => void;
};

export const SavedSensorCard = ({
  device,
  samples,
  isEditing,
  pvvxTimePending,
  onEditStart,
  onEditEnd,
  onNameChange,
  onPvvxSetTime,
  onRemove,
  onOpenDetails
}: SavedSensorCardProps) => {
  const { t } = useTranslation();
  const latest = latestSample(samples);
  const latestSeenAtMs = latest?.seenAtMs ?? null;
  const previousSeenAtMsRef = useRef<number | null>(latestSeenAtMs);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSamplePulseActive, setIsSamplePulseActive] = useState(false);
  const [samplePulseSequence, setSamplePulseSequence] = useState(0);

  useEffect(() => {
    if (latestSeenAtMs === null) return;

    const previousSeenAtMs = previousSeenAtMsRef.current;
    if (previousSeenAtMs !== null && latestSeenAtMs <= previousSeenAtMs) return;

    previousSeenAtMsRef.current = latestSeenAtMs;
    setSamplePulseSequence((current) => current + 1);
    setIsSamplePulseActive(true);
    if (pulseTimeoutRef.current !== null) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => {
      setIsSamplePulseActive(false);
      pulseTimeoutRef.current = null;
    }, SENSOR_SAMPLE_PULSE_MS);
  }, [latestSeenAtMs]);

  useEffect(
    () => () => {
      if (pulseTimeoutRef.current !== null) clearTimeout(pulseTimeoutRef.current);
    },
    []
  );

  return (
    <article className="saved-list__item sensor-saved-card">
      <div className="sensor-card-header">
        <span
          className={`sensor-card-leading-icon${
            isSamplePulseActive ? ' sensor-card-leading-icon--fresh' : ''
          }`}
          aria-hidden="true"
        >
          <IconTemperature
            key={samplePulseSequence}
            className="sensor-card-leading-icon__icon"
          />
        </span>
        {isEditing ? (
          <input
            autoFocus
            className="sensor-card-name-input"
            aria-label={t('hardware.sensor.nameLabel')}
            type="text"
            value={device.name}
            onBlur={onEditEnd}
            onChange={(event) => onNameChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.currentTarget.blur();
              }
            }}
          />
        ) : (
          <div className="sensor-card-title-row">
            <h3 className="sensor-card-title">{device.name}</h3>
            {latest?.source === 'phone-scan' && (
              <span
                className="sensor-card-source"
                title={t('hardware.sensor.scanPhoneTitle')}
              >
                <IconDeviceMobile className="icon-action__svg" aria-hidden="true" />
              </span>
            )}
            {latest?.source === 'shelly-scan' && (
              <span className="sensor-card-source" title={t('hardware.nav.shellyTitle')}>
                <IconPlug className="icon-action__svg" aria-hidden="true" />
              </span>
            )}
            {!onOpenDetails && (
              <button
                className="icon-action rule-summary-icon-action"
                type="button"
                aria-label={t('hardware.sensor.nameLabel')}
                title={t('hardware.sensor.nameLabel')}
                onClick={onEditStart}
              >
                <IconPencil className="icon-action__svg" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="sensor-card-actions">
          {onOpenDetails ? (
            <button
              className="icon-action"
              type="button"
              aria-label={t('hardware.sensor.settingsAria', { name: device.name })}
              title={t('hardware.sensor.settings')}
              onClick={onOpenDetails}
            >
              <IconDotsVertical className="icon-action__svg" aria-hidden="true" />
            </button>
          ) : (
            <>
              {device.profileId === 'xiaomi_lywsd03mmc_bthome_v2' && (
                <button
                  className="icon-action"
                  type="button"
                  disabled={pvvxTimePending}
                  aria-label={t('hardware.sensor.pvvxSetTimeTitle')}
                  title={t('hardware.sensor.pvvxSetTimeTitle')}
                  onClick={onPvvxSetTime}
                >
                  <IconClock className="icon-action__svg" aria-hidden="true" />
                </button>
              )}
              <button
                className="icon-action icon-action--danger"
                type="button"
                aria-label={t('hardware.sensor.deleteTitle')}
                title={t('hardware.sensor.deleteTitle')}
                onClick={onRemove}
              >
                <IconTrash className="icon-action__svg" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      <SensorLiveReadings samples={samples} />

      {!onOpenDetails && (
        <div
          className="sensor-card-device-meta"
          aria-label={t('hardware.sensor.details')}
        >
          <span>{sensorProfileDisplayLabels[device.profileId]}</span>
          <span>{device.runtimeAddress}</span>
        </div>
      )}
    </article>
  );
};
