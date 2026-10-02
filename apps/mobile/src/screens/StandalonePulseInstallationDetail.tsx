import { FeedbackPanel } from '@lcl/ui';
import { useState } from 'react';
import { useTranslation } from '../app/i18n.js';
import {
  PulseOperationalStatusSummary,
  usePulseOperationalStatus,
  type StandalonePulseInstalledAutomation
} from '../features/automations/index.js';
import {
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  usePlugInformationFlow,
  type PlugDetailTab
} from '../features/plugs/index.js';

const STANDALONE_PULSE_DETAIL_TABS = [
  'automation',
  'device',
  'info'
] as const satisfies readonly PlugDetailTab[];

type StandalonePulseInstallationDetailProps = {
  installation: StandalonePulseInstalledAutomation;
};

export const StandalonePulseInstallationDetail = ({
  installation
}: StandalonePulseInstallationDetailProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const pulseQuery = usePulseOperationalStatus(installation);
  const informationQuery = usePlugInformationFlow(installation.shelly, {
    enabled: activeTab === 'info'
  });

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        tabs={[activeTab, setActiveTab]}
        availableTabs={STANDALONE_PULSE_DETAIL_TABS}
      />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'automation' && (
          <>
            {pulseQuery.isError && (
              <FeedbackPanel tone="warning" title={t('dashboard.health.attention')}>
                {t('time.detail.needsAttention')}
              </FeedbackPanel>
            )}
            <section className="installation-automation-live-state plug-detail-section">
              <PulseOperationalStatusSummary status={pulseQuery.data} />
            </section>
          </>
        )}

        {activeTab === 'device' && (
          <PlugDeviceSettingsSurface target={installation.shelly} />
        )}

        {activeTab === 'info' && (
          <PlugInfoPanel
            connection={{
              transport: 'wifi',
              baseUrl: installation.shelly.baseUrl
            }}
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
          />
        )}
      </section>
    </main>
  );
};
