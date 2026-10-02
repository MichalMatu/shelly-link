import { FeedbackPanel, Modal } from '@lcl/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { Pulse } from '../../../features/automations/index.js';
import { useStandalonePulseSetupFlow } from '../../../flows/pulse-automation/useStandalonePulseSetupFlow.js';
import { mutationError, type HardwarePageProps } from '../helpers.js';
import type { StandalonePulseSetupFlow } from '../pageContracts.js';

type StandalonePulseSetupPageProps = HardwarePageProps<StandalonePulseSetupFlow> & {
  onInstalled?(): void;
};

export const StandalonePulseSetupPage = ({
  flow,
  onInstalled
}: StandalonePulseSetupPageProps) => {
  const { t } = useTranslation();
  const pulseFlow = useStandalonePulseSetupFlow(flow.selectedShelly);
  const [isInstallErrorOpen, setIsInstallErrorOpen] = useState(false);

  useEffect(() => {
    if (pulseFlow.installMutation.isError) {
      setIsInstallErrorOpen(true);
    }
  }, [pulseFlow.installMutation.isError]);

  const install = async () => {
    try {
      await pulseFlow.installMutation.mutateAsync();
      onInstalled?.();
    } catch {
      // Mutation state renders the actionable error below.
    }
  };

  return (
    <section className="demo-panel" aria-label="Pulse">
      <div className="time-schedule-device">
        <span>{t('time.device')}</span>
        <strong>{flow.selectedShelly?.name ?? t('time.noDevice')}</strong>
      </div>

      <Pulse.Cycle.Editor
        draft={pulseFlow.pulseCycleDraft}
        optional={false}
        validation={pulseFlow.pulseCycleValidation}
        onChange={pulseFlow.setPulseCycleDraft}
      />

      <div className="time-schedule-actions">
        <button
          className="primary-action"
          type="button"
          disabled={
            !flow.selectedShelly ||
            !pulseFlow.pulseCycleValidation.ok ||
            pulseFlow.installMutation.isPending
          }
          onClick={() => void install()}
        >
          {pulseFlow.installMutation.isPending ? t('time.installing') : t('time.install')}
        </button>
      </div>

      <Modal
        closeLabel={t('common.close')}
        open={isInstallErrorOpen && pulseFlow.installMutation.isError}
        title={t('common.operationFailed')}
        onClose={() => {
          setIsInstallErrorOpen(false);
          pulseFlow.installMutation.reset();
        }}
      >
        {pulseFlow.installMutation.isError && (
          <FeedbackPanel tone="danger" title={t('common.operationFailed')}>
            {mutationError(pulseFlow.installMutation.error)}
          </FeedbackPanel>
        )}
      </Modal>
    </section>
  );
};
