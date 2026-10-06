import { FeedbackPanel, Modal } from '@lcl/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { pulseCycleCopy } from '../../../app/locales/pulseCycle.js';
import { PulseCycleEditor } from './PulseCycleEditor.js';
import {
  useStandalonePulseSetupFlow,
  type StandalonePulseShelly
} from '../flows/useStandalonePulseSetupFlow.js';

type StandalonePulseSetupPageProps = {
  selectedShelly: StandalonePulseShelly | null | undefined;
  onInstalled?(): void;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const StandalonePulseSetupPage = ({
  selectedShelly,
  onInstalled
}: StandalonePulseSetupPageProps) => {
  const { locale, t } = useTranslation();
  const copy = pulseCycleCopy[locale];
  const pulseFlow = useStandalonePulseSetupFlow(selectedShelly);
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
    <section className="demo-panel">
      <div className="time-schedule-device">
        <span>{copy.device}</span>
        <strong>{selectedShelly?.name ?? copy.noDevice}</strong>
      </div>

      <PulseCycleEditor
        context="standalone"
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
            !selectedShelly ||
            !pulseFlow.pulseCycleValidation.ok ||
            pulseFlow.installMutation.isPending
          }
          onClick={() => void install()}
        >
          {pulseFlow.installMutation.isPending ? copy.installing : copy.install}
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
            {errorMessage(pulseFlow.installMutation.error)}
          </FeedbackPanel>
        )}
      </Modal>
    </section>
  );
};
