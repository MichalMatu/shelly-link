import {
  IconBluetooth,
  IconClock,
  IconCode,
  IconSettings,
  IconTemperature
} from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import './PlugDetailTabs.css';

export type PlugDetailTab = 'automation' | 'ble' | 'device' | 'script' | 'info';
export type PlugDetailAutomationIcon = 'temperature' | 'clock';

type PlugDetailTabsProps = {
  activeTab: PlugDetailTab;
  onChange(tab: PlugDetailTab): void;
  availableTabs?: readonly PlugDetailTab[];
  disabledTabs?: readonly PlugDetailTab[];
  automationIcon?: PlugDetailAutomationIcon;
};

const tabs: readonly {
  id: PlugDetailTab;
  labelKey:
    | 'detail.automation'
    | 'common.bluetooth'
    | 'hardware.shelly.settings'
    | 'hardware.rule.script'
    | 'common.info';
  icon: typeof IconTemperature | null;
}[] = [
  { id: 'automation', labelKey: 'detail.automation', icon: IconTemperature },
  { id: 'ble', labelKey: 'common.bluetooth', icon: IconBluetooth },
  { id: 'device', labelKey: 'hardware.shelly.settings', icon: IconSettings },
  { id: 'script', labelKey: 'hardware.rule.script', icon: IconCode },
  { id: 'info', labelKey: 'common.info', icon: null }
];

export const PlugDetailTabs = ({
  activeTab,
  onChange,
  availableTabs,
  disabledTabs = [],
  automationIcon = 'temperature'
}: PlugDetailTabsProps) => {
  const { t } = useTranslation();
  const visibleTabs = availableTabs
    ? tabs.filter((tab) => availableTabs.includes(tab.id))
    : tabs;

  return (
    <nav
      className="plug-detail-tabs lcl-segmented-control"
      aria-label={t('hardware.shelly.actionsLabel')}
      data-tab-count={visibleTabs.length}
    >
      {visibleTabs.map((tab) => {
        const label = t(tab.labelKey);
        const Icon =
          tab.id === 'automation' && automationIcon === 'clock' ? IconClock : tab.icon;
        const disabled = disabledTabs.includes(tab.id);
        return (
          <button
            key={tab.id}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            aria-label={label}
            className="plug-detail-tabs__item lcl-segmented-control__item"
            data-automation-icon={tab.id === 'automation' ? automationIcon : undefined}
            disabled={disabled}
            title={label}
            type="button"
            onClick={() => onChange(tab.id)}
          >
            {Icon ? (
              <Icon className="plug-detail-tabs__icon" aria-hidden="true" />
            ) : (
              <span className="plug-detail-tabs__info-icon" aria-hidden="true">
                i
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
