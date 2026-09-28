import { PlugDetailTabs, type PlugDetailTab } from './PlugDetailTabs.js';

type PlugDetailTopProps = {
  tabs: readonly [PlugDetailTab, (tab: PlugDetailTab) => void];
  disabledTabs?: readonly PlugDetailTab[] | undefined;
};

export const PlugDetailTop = ({ tabs, disabledTabs }: PlugDetailTopProps) => {
  const [activeTab, onChange] = tabs;

  return (
    <PlugDetailTabs
      activeTab={activeTab}
      onChange={onChange}
      {...(disabledTabs ? { disabledTabs } : {})}
    />
  );
};
