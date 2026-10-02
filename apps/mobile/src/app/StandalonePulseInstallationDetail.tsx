import { FeedbackPanel } from '@lcl/ui';
import { useState } from 'react';
import { Pulse, type InstalledAutomation } from '../features/automations/index.js';
import {
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  usePlugInformationFlow,
  type PlugDetailTab
} from '../features/plugs/index.js';
import { useTranslation } from './i18n.js';

type StandalonePulseInstalledAutomation = Extract<InstalledAutomation, { kind: 'pulse' }>;

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
  const pulseQuery = Pulse.Operational.useStatus(installation);
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
              <Pulse.Operational.StatusSummary status={pulseQuery.data} />
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
