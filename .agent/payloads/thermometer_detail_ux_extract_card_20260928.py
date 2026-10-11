from pathlib import Path

presentation_path = Path('apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx')
text = presentation_path.read_text()

helper_start = text.find('const formatBattery = (')
form_start = text.find('type SensorAddFormProps = {')
card_start = text.find('type SavedSensorCardProps = {')
if min(helper_start, form_start, card_start) < 0 or not (helper_start < form_start < card_start):
    raise SystemExit('could not resolve SensorSetupPresentation extraction boundaries')

helper_block = text[helper_start:form_start].rstrip() + '\n\n'
card_block = text[card_start:].rstrip() + '\n'
prefix = text[:helper_start] + text[form_start:card_start]

icon_import = """import {
  IconBattery,
  IconClock,
  IconDeviceMobile,
  IconDotsVertical,
  IconPencil,
  IconPlug,
  IconTemperature,
  IconTrash,
  IconWifi
} from '@tabler/icons-react';
"""
if prefix.count(icon_import) != 1:
    raise SystemExit(f'expected one card icon import block, got {prefix.count(icon_import)}')
prefix = prefix.replace(icon_import, '', 1)
react_import = "import { useEffect, useId, useRef, useState } from 'react';"
if prefix.count(react_import) != 1:
    raise SystemExit(f'expected one mixed React import, got {prefix.count(react_import)}')
prefix = prefix.replace(react_import, "import { useId } from 'react';", 1)
sample_import = "import type { SensorReadingSample } from '../../../flows/hardware-setup/sensorReadingsStore.js';\n"
if prefix.count(sample_import) != 1:
    raise SystemExit(f'expected one SensorReadingSample import, got {prefix.count(sample_import)}')
prefix = prefix.replace(sample_import, '', 1)
presentation_path.write_text(prefix.rstrip() + '\n')

card_path = Path('apps/mobile/src/screens/hardware-setup/pages/SavedSensorCard.tsx')
if card_path.exists():
    raise SystemExit('SavedSensorCard.tsx already exists')
card_path.write_text(
    """import {
  IconBattery,
  IconClock,
  IconDeviceMobile,
  IconDotsVertical,
  IconPencil,
  IconPlug,
  IconTemperature,
  IconTrash,
  IconWifi
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import type { SensorReadingSample } from '../../../flows/hardware-setup/sensorReadingsStore.js';
import type { SensorSetupFlow } from '../pageContracts.js';
import {
  formatSensorMetric,
  sensorProfileDisplayLabels
} from './SensorSetupPresentation.js';

"""
    + helper_block
    + card_block
)

page_path = Path('apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx')
page = page_path.read_text()
old = """import {
  formatSensorMetric,
  SavedSensorCard,
  SensorAddForm,
  sensorProfileDisplayLabels
} from './SensorSetupPresentation.js';
"""
new = """import { SavedSensorCard } from './SavedSensorCard.js';
import {
  formatSensorMetric,
  SensorAddForm,
  sensorProfileDisplayLabels
} from './SensorSetupPresentation.js';
"""
if page.count(old) != 1:
    raise SystemExit(f'expected one SensorSetupPage presentation import block, got {page.count(old)}')
page_path.write_text(page.replace(old, new, 1))

for path_string in [
    'apps/mobile/src/screens/ThermometerDetailScreen.tsx',
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.test.tsx'
]:
    path = Path(path_string)
    source = path.read_text()
    old = (
        "import { SavedSensorCard } from './hardware-setup/pages/SensorSetupPresentation.js';"
        if path.name == 'ThermometerDetailScreen.tsx'
        else "import { SavedSensorCard } from './SensorSetupPresentation.js';"
    )
    new = (
        "import { SavedSensorCard } from './hardware-setup/pages/SavedSensorCard.js';"
        if path.name == 'ThermometerDetailScreen.tsx'
        else "import { SavedSensorCard } from './SavedSensorCard.js';"
    )
    if source.count(old) != 1:
        raise SystemExit(f'{path_string}: expected one SavedSensorCard import, got {source.count(old)}')
    path.write_text(source.replace(old, new, 1))

print('Extracted SavedSensorCard into a cohesive presentation boundary')
