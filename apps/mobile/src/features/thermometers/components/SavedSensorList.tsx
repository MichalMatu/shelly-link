import type { Measurement } from '@lcl/ble-core';
import { IconTemperature } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import { SavedSensorCard } from './SavedSensorCard.js';
import type { SavedSensorCardDevice } from '../presentation/savedSensorCardPresentation.js';

type SavedSensorListProps = {
  devices: readonly SavedSensorCardDevice[];
  samplesById: Readonly<Record<string, readonly Measurement[] | undefined>>;
  editingSensorId: string | null;
  pvvxTimePending: boolean;
  embedded: boolean;
  onEditStart(sensorId: string): void;
  onEditEnd(): void;
  onNameChange(sensorId: string, value: string): void;
  onPvvxSetTime(device: SavedSensorCardDevice): void;
  onRemove(device: SavedSensorCardDevice): void;
  onOpenDetails?: (sensorId: string) => void;
};

export const SavedSensorList = ({
  devices,
  samplesById,
  editingSensorId,
  pvvxTimePending,
  embedded,
  onEditStart,
  onEditEnd,
  onNameChange,
  onPvvxSetTime,
  onRemove,
  onOpenDetails
}: SavedSensorListProps) => {
  const { t } = useTranslation();

  return (
    <div className="saved-list" aria-label={t('hardware.sensor.savedListLabel')}>
      {devices.length === 0 &&
        (embedded ? (
          <div className="dashboard-kind-empty">
            <IconTemperature className="dashboard-kind-empty__icon" aria-hidden="true" />
            <strong>{t('hardware.sensor.empty')}</strong>
          </div>
        ) : (
          <p>{t('hardware.sensor.empty')}</p>
        ))}
      {devices.map((device) => (
        <SavedSensorCard
          key={device.id}
          device={device}
          samples={samplesById[device.id.toUpperCase()] ?? []}
          isEditing={editingSensorId === device.id}
          pvvxTimePending={pvvxTimePending}
          onEditStart={() => onEditStart(device.id)}
          onEditEnd={onEditEnd}
          onNameChange={(value) => onNameChange(device.id, value)}
          onPvvxSetTime={() => onPvvxSetTime(device)}
          onRemove={() => onRemove(device)}
          {...(embedded && onOpenDetails
            ? { onOpenDetails: () => onOpenDetails(device.id) }
            : {})}
        />
      ))}
    </div>
  );
};
