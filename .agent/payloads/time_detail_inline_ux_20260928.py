from pathlib import Path

repo = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    target = repo / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, got {count}')
    target.write_text(text.replace(old, new, 1))

# Shared Plug detail tabs: keep Climate default icon, let Time select a clock.
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
    "import {\n  IconBluetooth,\n  IconCode,\n  IconSettings,\n  IconTemperature\n} from '@tabler/icons-react';\n",
    "import {\n  IconBluetooth,\n  IconClock,\n  IconCode,\n  IconSettings,\n  IconTemperature\n} from '@tabler/icons-react';\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
    "export type PlugDetailTab = 'automation' | 'ble' | 'device' | 'script' | 'info';\n\ntype PlugDetailTabsProps = {\n",
    "export type PlugDetailTab = 'automation' | 'ble' | 'device' | 'script' | 'info';\nexport type PlugDetailAutomationIcon = 'temperature' | 'clock';\n\ntype PlugDetailTabsProps = {\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
    "  disabledTabs?: readonly PlugDetailTab[];\n};\n",
    "  disabledTabs?: readonly PlugDetailTab[];\n  automationIcon?: PlugDetailAutomationIcon;\n};\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
    "  onChange,\n  availableTabs,\n  disabledTabs = []\n}: PlugDetailTabsProps) => {\n",
    "  onChange,\n  availableTabs,\n  disabledTabs = [],\n  automationIcon = 'temperature'\n}: PlugDetailTabsProps) => {\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
    "        const label = t(tab.labelKey);\n        const Icon = tab.icon;\n        const disabled = disabledTabs.includes(tab.id);\n",
    "        const label = t(tab.labelKey);\n        const Icon =\n          tab.id === 'automation' && automationIcon === 'clock' ? IconClock : tab.icon;\n        const disabled = disabledTabs.includes(tab.id);\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
    "            className=\"plug-detail-tabs__item lcl-segmented-control__item\"\n            disabled={disabled}\n",
    "            className=\"plug-detail-tabs__item lcl-segmented-control__item\"\n            data-automation-icon={tab.id === 'automation' ? automationIcon : undefined}\n            disabled={disabled}\n",
)

replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTop.tsx',
    "import { PlugDetailTabs, type PlugDetailTab } from './PlugDetailTabs.js';\n",
    "import {\n  PlugDetailTabs,\n  type PlugDetailAutomationIcon,\n  type PlugDetailTab\n} from './PlugDetailTabs.js';\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTop.tsx',
    "  disabledTabs?: readonly PlugDetailTab[] | undefined;\n};\n",
    "  disabledTabs?: readonly PlugDetailTab[] | undefined;\n  automationIcon?: PlugDetailAutomationIcon | undefined;\n};\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTop.tsx',
    "  tabs,\n  availableTabs,\n  disabledTabs\n}: PlugDetailTopProps) => {\n",
    "  tabs,\n  availableTabs,\n  disabledTabs,\n  automationIcon\n}: PlugDetailTopProps) => {\n",
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDetailTop.tsx',
    "      {...(disabledTabs ? { disabledTabs } : {})}\n",
    "      {...(disabledTabs ? { disabledTabs } : {})}\n      {...(automationIcon ? { automationIcon } : {})}\n",
)

# Reuse the existing Time schedule editor inline, matching the Climate detail pattern.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx',
    "  editInstallationId?: string;\n  onInstalled?(): void;\n};\n",
    "  editInstallationId?: string;\n  onInstalled?(): void;\n  inline?: boolean;\n};\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx',
    "  flow,\n  editInstallationId,\n  onInstalled\n}: TimeScheduleSetupPageProps) => {\n",
    "  flow,\n  editInstallationId,\n  onInstalled,\n  inline = false\n}: TimeScheduleSetupPageProps) => {\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx',
    "      className=\"time-schedule-panel\"\n    >\n      <header className=\"time-schedule-heading\">\n        <p className=\"time-schedule-eyebrow\">{t('time.eyebrow')}</p>\n        <h1>\n          {timeFlow.isEditingTimeAutomation\n            ? t('time.detail.editTitle')\n            : t('time.title')}\n        </h1>\n        <p className=\"time-schedule-description\">{t('time.description')}</p>\n      </header>\n\n      <div className=\"time-schedule-device\">\n        <span>{t('time.device')}</span>\n        <strong>{flow.selectedShelly?.name ?? t('time.noDevice')}</strong>\n      </div>\n",
    "      className={`time-schedule-panel${inline ? ' time-schedule-panel--inline' : ''}`}\n    >\n      {!inline && (\n        <header className=\"time-schedule-heading\">\n          <p className=\"time-schedule-eyebrow\">{t('time.eyebrow')}</p>\n          <h1>\n            {timeFlow.isEditingTimeAutomation\n              ? t('time.detail.editTitle')\n              : t('time.title')}\n          </h1>\n          <p className=\"time-schedule-description\">{t('time.description')}</p>\n        </header>\n      )}\n\n      {!inline && (\n        <div className=\"time-schedule-device\">\n          <span>{t('time.device')}</span>\n          <strong>{flow.selectedShelly?.name ?? t('time.noDevice')}</strong>\n        </div>\n      )}\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx',
    "      <div className=\"time-schedule-guidance\">\n        <p className=\"time-schedule-note\">{t('time.localClockHint')}</p>\n        <p className=\"time-schedule-note\">{t('time.ownershipHint')}</p>\n      </div>\n",
    "      {!inline && (\n        <div className=\"time-schedule-guidance\">\n          <p className=\"time-schedule-note\">{t('time.localClockHint')}</p>\n          <p className=\"time-schedule-note\">{t('time.ownershipHint')}</p>\n        </div>\n      )}\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.css',
    ".time-schedule-heading {\n",
    ".time-schedule-panel--inline {\n  background: transparent;\n  border: 0;\n  border-radius: 0;\n  padding: 0;\n}\n\n.time-schedule-heading {\n",
)

# Time detail: semantic clock icon, no duplicate dashboard controls, inline schedule edit + Save.
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "  PlugAutomationModeControl,\n  PlugBleDetailSurface,\n",
    "  PlugBleDetailSurface,\n",
)
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "  PlugInfoPanel,\n  PlugRelayControls,\n  isSameShellyDevice,\n",
    "  PlugInfoPanel,\n  isSameShellyDevice,\n",
)
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "import {\n  timeAutomationRuntimeQueryKey,\n  useTimeAutomationActions,\n  useTimeAutomationRuntime,\n  type TimeAutomationAction\n} from '../flows/time-automation/useTimeAutomationRuntime.js';\n",
    "import {\n  timeAutomationRuntimeQueryKey,\n  useTimeAutomationRuntime\n} from '../flows/time-automation/useTimeAutomationRuntime.js';\nimport { TimeScheduleSetupPage } from './hardware-setup/pages/TimeScheduleSetupPage.js';\n",
)
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "  installation,\n  onBack,\n  onEdit,\n  onOpenBleDiscovery\n}: TimeInstallationDetailProps) => {\n",
    "  installation,\n  onBack,\n  onOpenBleDiscovery\n}: TimeInstallationDetailProps) => {\n",
)
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "  const runtimeQuery = useTimeAutomationRuntime(installation);\n  const runtimeAction = useTimeAutomationActions(installation);\n",
    "  const runtimeQuery = useTimeAutomationRuntime(installation);\n",
)
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "  const automationRunning = runtimeState === 'running';\n  const manualControl = runtimeState === 'paused';\n  const runtimeControllable = automationRunning || manualControl;\n  const actionBusy = runtimeAction.isPending;\n  const runRuntimeAction = (action: TimeAutomationAction) => {\n    runtimeAction.mutate(action, {\n      onError: () => pushToast('warning', t('time.detail.actionFailed'))\n    });\n  };\n\n",
    "",
)
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "      <PlugDetailTop tabs={[activeTab, setActiveTab]} availableTabs={TIME_DETAIL_TABS} />\n",
    "      <PlugDetailTop\n        tabs={[activeTab, setActiveTab]}\n        availableTabs={TIME_DETAIL_TABS}\n        automationIcon=\"clock\"\n      />\n",
)
old_body = """            <section className=\"installation-automation-live-state plug-detail-section\">\n              <dl className=\"automation-summary installation-detail-summary installation-detail-summary--flush\">\n                <div>\n                  <dt>{t('time.onTime')}</dt>\n                  <dd>{installation.config.onTime}</dd>\n                </div>\n                <div>\n                  <dt>{t('time.offTime')}</dt>\n                  <dd>{installation.config.offTime}</dd>\n                </div>\n                <div>\n                  <dt>{t('dashboard.output')}</dt>\n                  <dd>\n                    {runtimeQuery.data ? (runtimeQuery.data.relayOn ? 'ON' : 'OFF') : '—'}\n                  </dd>\n                </div>\n                <div>\n                  <dt>{t('time.clock')}</dt>\n                  <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>\n                </div>\n              </dl>\n\n              <PlugAutomationModeControl\n                autoActive={automationRunning}\n                manualActive={manualControl}\n                disabled={actionBusy || !runtimeControllable}\n                onAuto={() => {\n                  if (!automationRunning) runRuntimeAction('auto');\n                }}\n                onManual={() => {\n                  if (!manualControl) runRuntimeAction('manual');\n                }}\n              />\n\n              <PlugRelayControls\n                relayState={runtimeQuery.data?.relayOn}\n                busy={actionBusy}\n                disabled={!manualControl}\n                onTurnOn={() => runRuntimeAction('on')}\n                onTurnOff={() => runRuntimeAction('off')}\n              />\n            </section>\n\n            {onEdit && (\n              <div className=\"installation-detail-actions\">\n                <button className=\"primary-action\" type=\"button\" onClick={onEdit}>\n                  {t('detail.edit')}\n                </button>\n              </div>\n            )}\n"""
new_body = """            <section className=\"installation-automation-live-state plug-detail-section\">\n              <dl className=\"automation-summary installation-detail-summary installation-detail-summary--flush\">\n                <div>\n                  <dt>{t('dashboard.output')}</dt>\n                  <dd>\n                    {runtimeQuery.data ? (runtimeQuery.data.relayOn ? 'ON' : 'OFF') : '—'}\n                  </dd>\n                </div>\n                <div>\n                  <dt>{t('time.clock')}</dt>\n                  <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>\n                </div>\n              </dl>\n            </section>\n\n            <TimeScheduleSetupPage\n              flow={{\n                selectedShelly: {\n                  id: installation.shelly.deviceId,\n                  name: installation.shelly.name,\n                  baseUrl: installation.shelly.baseUrl,\n                  scriptIdInput: '1',\n                  model: installation.shelly.model,\n                  gen: installation.shelly.gen\n                }\n              }}\n              editInstallationId={installation.id}\n              inline\n              onInstalled={() => {\n                void runtimeQuery.refetch();\n              }}\n            />\n"""
replace_once('apps/mobile/src/screens/TimeInstallationDetail.tsx', old_body, new_body)
