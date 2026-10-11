from pathlib import Path

component = Path('apps/mobile/src/features/plugs/components/PlugBleSettingsSurface.tsx')
component.write_text("""import { DiagnosticRow } from '@lcl/ui';
import { IconBluetooth } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import type { PlugInformation } from '../data/plugInformation.js';

export type PlugBleSettingsSurfaceProps = {
  bluetoothState?: PlugInformation['status']['bluetooth'];
  loading: boolean;
  error: boolean;
  onScan(): void;
};

export const PlugBleSettingsSurface = ({
  bluetoothState,
  loading,
  error,
  onScan
}: PlugBleSettingsSurfaceProps) => {
  const { t } = useTranslation();

  return (
    <section className="plug-detail-framed-section">
      <h3 className="plug-detail-framed-section__title">{t('common.bluetooth')}</h3>
      {loading && (
        <div className="plug-detail-loading" role="status">
          <span className="plug-detail-loading__spinner" aria-hidden="true" />
          <span>{t('common.refreshing')}</span>
        </div>
      )}
      {error && (
        <p className="plug-settings-feedback plug-settings-feedback--warning">
          {t('dashboard.readFailed')}
        </p>
      )}
      {bluetoothState && (
        <div className="plug-info-grid">
          <DiagnosticRow
            label={t('common.bluetooth')}
            value={
              bluetoothState === 'enabled'
                ? t('common.enabled')
                : bluetoothState === 'disabled'
                  ? t('common.disabled')
                  : t('common.missing')
            }
          />
        </div>
      )}
      <div className="plug-settings-actions">
        <button
          className="secondary-action"
          type="button"
          title={t('hardware.shelly.scanBleViaShellyTitle')}
          onClick={onScan}
        >
          <IconBluetooth className="icon-action__svg" aria-hidden="true" />
          <span>{t('hardware.shelly.scanBleViaShellyTitle')}</span>
        </button>
      </div>
    </section>
  );
};
""")

wifi = Path('apps/mobile/src/features/plugs/screens/WifiPlugDetailScreen.tsx')
s = wifi.read_text()
s = s.replace("import { DiagnosticRow } from '@lcl/ui';\n", "")
s = s.replace("import { IconBluetooth, IconTrash } from '@tabler/icons-react';", "import { IconTrash } from '@tabler/icons-react';")
needle = "import { PlugDeleteConfirmModal } from '../components/PlugDeleteConfirmModal.js';\n"
assert needle in s
s = s.replace(needle, "import { PlugBleSettingsSurface } from '../components/PlugBleSettingsSurface.js';\n" + needle, 1)
old = """        {activeTab === 'ble' && (\n          <section className=\"plug-detail-framed-section\">\n            <h3 className=\"plug-detail-framed-section__title\">{t('common.bluetooth')}</h3>\n            {informationQuery.isPending && (\n              <div className=\"plug-detail-loading\" role=\"status\">\n                <span className=\"plug-detail-loading__spinner\" aria-hidden=\"true\" />\n                <span>{t('common.refreshing')}</span>\n              </div>\n            )}\n            {informationQuery.isError && (\n              <p className=\"plug-settings-feedback plug-settings-feedback--warning\">\n                {t('dashboard.readFailed')}\n              </p>\n            )}\n            {informationQuery.data && (\n              <div className=\"plug-info-grid\">\n                <DiagnosticRow\n                  label={t('common.bluetooth')}\n                  value={\n                    bluetoothState === 'enabled'\n                      ? t('common.enabled')\n                      : bluetoothState === 'disabled'\n                        ? t('common.disabled')\n                        : t('common.missing')\n                  }\n                />\n              </div>\n            )}\n            <div className=\"plug-settings-actions\">\n              <button\n                className=\"secondary-action\"\n                type=\"button\"\n                title={t('hardware.shelly.scanBleViaShellyTitle')}\n                onClick={() => onOpenBleDiscovery(device.deviceId)}\n              >\n                <IconBluetooth className=\"icon-action__svg\" aria-hidden=\"true\" />\n                <span>{t('hardware.shelly.scanBleViaShellyTitle')}</span>\n              </button>\n            </div>\n          </section>\n        )}\n"""
new = """        {activeTab === 'ble' && (\n          <PlugBleSettingsSurface\n            bluetoothState={informationQuery.data?.status.bluetooth}\n            loading={informationQuery.isPending}\n            error={informationQuery.isError}\n            onScan={() => onOpenBleDiscovery(device.deviceId)}\n          />\n        )}\n"""
assert old in s
s = s.replace(old, new, 1)
s = s.replace("  const bluetoothState = informationQuery.data?.status.bluetooth;\n", "")
wifi.write_text(s)

index = Path('apps/mobile/src/features/plugs/index.ts')
s = index.read_text()
anchor = "export { PlugInfoPanel } from './components/PlugInfoPanel.js';\n"
assert anchor in s
addition = anchor + "export {\n  PlugBleSettingsSurface,\n  type PlugBleSettingsSurfaceProps\n} from './components/PlugBleSettingsSurface.js';\n"
index.write_text(s.replace(anchor, addition, 1))
