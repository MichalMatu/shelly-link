import { PlugDetailIdentity } from './PlugDetailIdentity.js';
import { PlugDetailTabs, type PlugDetailTab } from './PlugDetailTabs.js';

type PlugDetailTopProps = {
  plug: {
    name: string;
    model?: string | undefined;
  };
  transport?: 'wifi' | 'bluetooth';
  tabs: readonly [PlugDetailTab, (tab: PlugDetailTab) => void];
  disabledTabs?: readonly PlugDetailTab[] | undefined;
};

export const PlugDetailTop = ({
  plug,
  transport = 'wifi',
  tabs,
  disabledTabs
}: PlugDetailTopProps) => {
  const [activeTab, onChange] = tabs;

  return (
    <>
      <PlugDetailTabs
        activeTab={activeTab}
        onChange={onChange}
        {...(disabledTabs ? { disabledTabs } : {})}
      />
      <PlugDetailIdentity name={plug.name} transport={transport} model={plug.model} />
    </>
  );
};
