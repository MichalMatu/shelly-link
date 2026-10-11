from pathlib import Path

component = Path('apps/mobile/src/features/plugs/components/PlugDeviceSettingsSurface.tsx')
component.write_text("""import type { PlugLedSettingsTarget } from '../data/plugLedSettings.js';
import { PlugButtonModeSettingsCard } from './PlugButtonModeSettingsCard.js';
import { PlugCloudSettingsCard } from './PlugCloudSettingsCard.js';
import { PlugLedSettingsCard } from './PlugLedSettingsCard.js';

export type PlugDeviceSettingsSurfaceProps = {
  target: PlugLedSettingsTarget;
  buttonModeLocked?: boolean;
};

export const PlugDeviceSettingsSurface = ({
  target,
  buttonModeLocked = false
}: PlugDeviceSettingsSurfaceProps) => (
  <div className="plug-settings-surface">
    <PlugLedSettingsCard target={target} />
    <PlugButtonModeSettingsCard target={target} locked={buttonModeLocked} />
    <PlugCloudSettingsCard target={target} />
  </div>
);
""")

wifi = Path('apps/mobile/src/features/plugs/screens/WifiPlugDetailScreen.tsx')
s = wifi.read_text()
s = s.replace("import { PlugButtonModeSettingsCard } from '../components/PlugButtonModeSettingsCard.js';\n", "")
s = s.replace("import { PlugCloudSettingsCard } from '../components/PlugCloudSettingsCard.js';\n", "")
s = s.replace("import { PlugLedSettingsCard } from '../components/PlugLedSettingsCard.js';\n", "")
needle = "import { PlugDeleteConfirmModal } from '../components/PlugDeleteConfirmModal.js';\n"
assert needle in s
s = s.replace(needle, needle + "import { PlugDeviceSettingsSurface } from '../components/PlugDeviceSettingsSurface.js';\n", 1)
old = """        {activeTab === 'device' && (\n          <div className=\"plug-settings-surface\">\n            <PlugLedSettingsCard target={target} />\n            <PlugButtonModeSettingsCard target={target} locked={buttonModeLocked} />\n            <PlugCloudSettingsCard target={target} />\n          </div>\n        )}\n"""
new = """        {activeTab === 'device' && (\n          <PlugDeviceSettingsSurface\n            target={target}\n            buttonModeLocked={buttonModeLocked}\n          />\n        )}\n"""
assert old in s
wifi.write_text(s.replace(old, new, 1))

climate = Path('apps/mobile/src/screens/InstallationDetailScreen.tsx')
s = climate.read_text()
for name in ('PlugButtonModeSettingsCard,\n', 'PlugCloudSettingsCard,\n', 'PlugLedSettingsCard,\n'):
    assert f'  {name}' in s
    s = s.replace(f'  {name}', '', 1)
needle = "  PlugDeleteConfirmModal,\n"
assert needle in s
s = s.replace(needle, needle + "  PlugDeviceSettingsSurface,\n", 1)
old = """        {activeTab === 'device' && (\n          <div className=\"plug-settings-surface\">\n            <PlugLedSettingsCard target={installation.shelly} />\n            <PlugButtonModeSettingsCard target={installation.shelly} locked />\n            <PlugCloudSettingsCard target={installation.shelly} />\n          </div>\n        )}\n"""
new = """        {activeTab === 'device' && (\n          <PlugDeviceSettingsSurface target={installation.shelly} buttonModeLocked />\n        )}\n"""
assert old in s
climate.write_text(s.replace(old, new, 1))

index = Path('apps/mobile/src/features/plugs/index.ts')
s = index.read_text()
needle = "export {\n  PlugDeleteConfirmModal,\n  type PlugDeleteConfirmModalProps\n} from './components/PlugDeleteConfirmModal.js';\n"
assert needle in s
addition = needle + "export {\n  PlugDeviceSettingsSurface,\n  type PlugDeviceSettingsSurfaceProps\n} from './components/PlugDeviceSettingsSurface.js';\n"
index.write_text(s.replace(needle, addition, 1))
