import { useTranslation } from '../../../app/i18n.js';
import { AppPageBack } from '../../../components/AppPageBack.js';
import { PlugDetailIdentity } from './PlugDetailIdentity.js';
import { PlugDetailTabs, type PlugDetailTab } from './PlugDetailTabs.js';

type PlugDetailTopProps = {
  plug: {
    name: string;
    model?: string | undefined;
  };
  transport?: 'wifi' | 'bluetooth';
  tabs: readonly [PlugDetailTab, (tab: PlugDetailTab) => void];
  onBack(): void;
  disabledTabs?: readonly PlugDetailTab[] | undefined;
};

export const PlugDetailTop = ({
  plug,
  transport = 'wifi',
  tabs,
  onBack,
  disabledTabs
}: PlugDetailTopProps) => {
  const { t } = useTranslation();
  const [activeTab, onChange] = tabs;

  return (
    <>
      <AppPageBack label={t('dashboard.climateTab')} onBack={onBack} />
      <PlugDetailIdentity name={plug.name} transport={transport} model={plug.model} />
      <PlugDetailTabs
        activeTab={activeTab}
        onChange={onChange}
        {...(disabledTabs ? { disabledTabs } : {})}
      />
    </>
  );
};
