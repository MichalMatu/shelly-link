from pathlib import Path

repo = Path('.')
feature_root = repo / 'apps/mobile/src/features/thermometers'
card_path = feature_root / 'components/SavedSensorCard.tsx'
card = card_path.read_text()

# Give reusable metric/profile formatting its own presentation owner.
helper_start = card.find('export const sensorProfileDisplayLabels = {')
helper_end = card.find('const formatBattery = (')
if helper_start < 0 or helper_end < 0 or helper_start >= helper_end:
    raise SystemExit('could not locate Thermometer presentation helpers')
helpers = card[helper_start:helper_end].rstrip() + '\n'
presentation_dir = feature_root / 'presentation'
presentation_dir.mkdir(parents=True, exist_ok=True)
presentation_path = presentation_dir / 'sensorPresentation.ts'
if presentation_path.exists():
    raise SystemExit('sensorPresentation.ts already exists')
presentation_path.write_text(helpers)
card = card[:helper_start] + card[helper_end:]
translation_import = "import { useTranslation } from '../../../app/i18n.js';\n"
if card.count(translation_import) != 1:
    raise SystemExit('SavedSensorCard translation import anchor not found')
card = card.replace(
    translation_import,
    translation_import
    + "import { formatSensorMetric, sensorProfileDisplayLabels } from '../presentation/sensorPresentation.js';\n",
    1,
)
card_path.write_text(card)

# Extract saved-list composition from the legacy page into the Thermometers feature.
list_path = feature_root / 'components/SavedSensorList.tsx'
if list_path.exists():
    raise SystemExit('SavedSensorList.tsx already exists')
list_path.write_text("""import type { Measurement } from '@lcl/ble-core';
import { IconTemperature } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import {
  SavedSensorCard,
  type SavedSensorCardDevice
} from './SavedSensorCard.js';

type SavedSensorListProps = {
  devices: readonly SavedSensorCardDevice[];
  samplesById: Readonly<Record<string, readonly Measurement[] | undefined>>;
  editingSensorId: string | null;
  pvvxTimePending: boolean;
  embedded: boolean;
  settingsOnly: boolean;
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
  settingsOnly,
  onEditStart,
  onEditEnd,
  onNameChange,
  onPvvxSetTime,
  onRemove,
  onOpenDetails
}: SavedSensorListProps) => {
  const { t } = useTranslation();
  const compactEmpty = embedded || settingsOnly;

  return (
    <div className="saved-list" aria-label={t('hardware.sensor.savedListLabel')}>
      {devices.length === 0 &&
        (compactEmpty ? (
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

# Keep the public feature API narrow and explicit.
index_path = feature_root / 'index.ts'
index = index_path.read_text()
old_index = """export {
  SavedSensorCard,
  formatSensorMetric,
  sensorProfileDisplayLabels,
  type SavedSensorCardDevice
} from './components/SavedSensorCard.js';
"""
new_index = """export {
  SavedSensorCard,
  type SavedSensorCardDevice
} from './components/SavedSensorCard.js';
export { SavedSensorList } from './components/SavedSensorList.js';
export {
  formatSensorMetric,
  sensorProfileDisplayLabels
} from './presentation/sensorPresentation.js';
"""
if index.count(old_index) != 1:
    raise SystemExit(f'expected one Thermometers index block, got {index.count(old_index)}')
index_path.write_text(index.replace(old_index, new_index, 1))

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
    raise SystemExit(f'expected one Thermometers page import block, got {page.count(old_import)}')
page = page.replace(old_import, new_import, 1)
readings_helper = """  const readingsForSensor = (device: SensorDraftDevice) =>
    flow.sensorSamplesById[device.id.toUpperCase()] ?? [];

"""
if page.count(readings_helper) != 1:
    raise SystemExit(f'expected one readings helper, got {page.count(readings_helper)}')
page = page.replace(readings_helper, '', 1)
list_start = page.find('      <div className="saved-list" aria-label={t(\'hardware.sensor.savedListLabel\')}>')
if list_start < 0:
    raise SystemExit('saved-list start not found')
list_end_marker = '      </div>\n    </section>\n  );\n};'
list_end = page.find(list_end_marker, list_start)
if list_end < 0:
    raise SystemExit('saved-list end not found')
replacement = """      <SavedSensorList
        devices={visibleSensorDevices}
        samplesById={flow.sensorSamplesById}
        editingSensorId={editingSensorId}
        pvvxTimePending={flow.setPvvxTimeMutation.isPending}
        embedded={embedded}
        settingsOnly={settingsOnlySensorId !== undefined}
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

print('Extracted Thermometer presentation helpers and saved list to satisfy line budgets')
