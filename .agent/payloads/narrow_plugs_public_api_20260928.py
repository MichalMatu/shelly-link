from pathlib import Path

path = Path('apps/mobile/src/features/plugs/index.ts')
source = path.read_text()
replacements = {
"""export {
  PlugDeviceSettingsSurface,
  type PlugDeviceSettingsSurfaceProps
} from './components/PlugDeviceSettingsSurface.js';
""": "export { PlugDeviceSettingsSurface } from './components/PlugDeviceSettingsSurface.js';\n",
"""export {
  PlugButtonModeSettingsCard,
  type PlugButtonModeSettingsCardProps
} from './components/PlugButtonModeSettingsCard.js';
""": "export { PlugButtonModeSettingsCard } from './components/PlugButtonModeSettingsCard.js';\n",
"""export {
  PlugCloudSettingsCard,
  type PlugCloudSettingsCardProps
} from './components/PlugCloudSettingsCard.js';
""": "export { PlugCloudSettingsCard } from './components/PlugCloudSettingsCard.js';\n",
"""export {
  PlugLedSettingsCard,
  type PlugLedSettingsCardProps
} from './components/PlugLedSettingsCard.js';
""": "export { PlugLedSettingsCard } from './components/PlugLedSettingsCard.js';\n",
}
for old, new in replacements.items():
    if old not in source:
        raise SystemExit(f'missing expected export block: {old.splitlines()[1].strip()}')
    source = source.replace(old, new, 1)
path.write_text(source)
