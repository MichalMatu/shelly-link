from pathlib import Path

repo = Path('.')
feature_root = repo / 'apps/mobile/src/features/thermometers'
components = feature_root / 'components'
list_path = components / 'SavedSensorList.tsx'
if list_path.exists():
    raise SystemExit('SavedSensorList.tsx already exists')

list_path.write_text("""import type { Measurement } from '@lcl/ble-core';
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
""")

index_path = feature_root / 'index.ts'
index = index_path.read_text()
anchor = "export { SavedSensorCard } from './components/SavedSensorCard.js';\n"
if index.count(anchor) != 1:
    raise SystemExit(f'expected one SavedSensorCard export anchor, got {index.count(anchor)}')
index_path.write_text(index.replace(anchor, anchor + "export { SavedSensorList } from './components/SavedSensorList.js';\n", 1))

page_path = repo / 'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx'
page = page_path.read_text()
page = page.replace(
    "import { IconPlus, IconTemperature } from '@tabler/icons-react';",
    "import { IconPlus } from '@tabler/icons-react';",
    1,
)
old_import = """import {
  formatSensorMetric,
  SavedSensorCard,
  sensorProfileDisplayLabels
} from '../../../features/thermometers/index.js';
"""
new_import = """import {
  formatSensorMetric,
  SavedSensorList,
  sensorProfileDisplayLabels
} from '../../../features/thermometers/index.js';
"""
if page.count(old_import) != 1:
    raise SystemExit(f'expected one Thermometers import block, got {page.count(old_import)}')
page = page.replace(old_import, new_import, 1)

readings_helper = """  const readingsForSensor = (device: SensorDraftDevice) =>
    flow.sensorSamplesById[device.id.toUpperCase()] ?? [];

"""
if page.count(readings_helper) != 1:
    raise SystemExit(f'expected one readingsForSensor helper, got {page.count(readings_helper)}')
page = page.replace(readings_helper, '', 1)

list_start = page.find('      <div className="saved-list" aria-label={t(\'hardware.sensor.savedListLabel\')}>')
if list_start < 0:
    raise SystemExit('saved list start not found')
list_end_marker = '      </div>\n    </section>\n  );\n};'
list_end = page.find(list_end_marker, list_start)
if list_end < 0:
    raise SystemExit('saved list end not found')
replacement = """      <SavedSensorList
        devices={flow.sensorDevices}
        samplesById={flow.sensorSamplesById}
        editingSensorId={editingSensorId}
        pvvxTimePending={flow.setPvvxTimeMutation.isPending}
        embedded={embedded}
        onEditStart={setEditingSensorId}
        onEditEnd={() => setEditingSensorId(null)}
        onNameChange={flow.setSensorDeviceName}
        onPvvxSetTime={(device) => flow.setPvvxTimeMutation.mutate(device)}
        onRemove={(device) => setDialog({ kind: 'remove', device })}
        {...(onOpenSensorSettings ? { onOpenDetails: onOpenSensorSettings } : {})}
      />
"""
page = page[:list_start] + replacement + page[list_end + len('      </div>\n'):]
page_path.write_text(page)

print('Extracted saved Thermometer list from legacy SensorSetupPage')
