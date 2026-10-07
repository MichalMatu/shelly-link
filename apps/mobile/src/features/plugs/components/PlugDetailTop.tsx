import {
  PlugDetailTabs,
  type PlugDetailAutomationIcon,
  type PlugDetailTab
} from './PlugDetailTabs.js';

type PlugDetailTopProps = {
  tabs: readonly [PlugDetailTab, (tab: PlugDetailTab) => void];
  availableTabs?: readonly PlugDetailTab[] | undefined;
  disabledTabs?: readonly PlugDetailTab[] | undefined;
  automationIcon?: PlugDetailAutomationIcon | undefined;
};

export const PlugDetailTop = ({
  tabs,
  availableTabs,
  disabledTabs,
  automationIcon
}: PlugDetailTopProps) => {
  const [activeTab, onChange] = tabs;

  return (
    <PlugDetailTabs
      activeTab={activeTab}
      onChange={onChange}
      {...(availableTabs ? { availableTabs } : {})}
      {...(disabledTabs ? { disabledTabs } : {})}
      {...(automationIcon ? { automationIcon } : {})}
    />
  );
};
