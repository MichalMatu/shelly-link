import { FeedbackPanel } from '@lcl/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { pulseManagementCopy } from '../../../app/locales/pulseManagement.js';
import type { StandalonePulseInstalledAutomation } from '../data/installedAutomation.js';
import { parsePulseCycleForm, pulseCycleFormFromConfig } from '../data/pulseCycleForm.js';
import { replaceStandalonePulseAutomation } from '../data/standalonePulseAutomationRuntime.js';
import { useInstalledAutomationStore } from '../state/installedAutomationStore.js';
import { AutomationDetailSection } from './AutomationDetailLayout.js';
import { PulseCycleEditor } from './PulseCycleEditor.js';

type StandalonePulseConfigurationSectionProps = {
  installation: StandalonePulseInstalledAutomation;
  onPendingChange(pending: boolean): void;
  onSaved(installation: StandalonePulseInstalledAutomation): void;
  onSaveError(): void;
};

export const StandalonePulseConfigurationSection = ({
  installation,
  onPendingChange,
  onSaved,
  onSaveError
}: StandalonePulseConfigurationSectionProps) => {
  const { locale, t } = useTranslation();
  const managementLabels = pulseManagementCopy[locale];
  const upsertInstallation = useInstalledAutomationStore(
    (state) => state.upsertInstallation
  );
  const [pulseDraft, setPulseDraft] = useState(() =>
    pulseCycleFormFromConfig(installation.config.pulse)
  );

  const validation = parsePulseCycleForm({ ...pulseDraft, enabled: true });
  const nextPulseConfig = validation.ok ? validation.config : null;
  const changed =
    nextPulseConfig !== null &&
    JSON.stringify(nextPulseConfig) !== JSON.stringify(installation.config.pulse);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!validation.ok || !validation.config) {
        throw new Error('Pulse configuration is invalid.');
      }
      return replaceStandalonePulseAutomation({
        installation,
        config: {
          relayId: installation.config.relayId,
          pulse: validation.config
        }
      });
    },
    onMutate: () => onPendingChange(true),
    onSuccess: (updatedInstallation) => {
      upsertInstallation(updatedInstallation);
      setPulseDraft(pulseCycleFormFromConfig(updatedInstallation.config.pulse));
      onSaved(updatedInstallation);
    },
    onError: onSaveError,
    onSettled: () => onPendingChange(false)
  });

  return (
    <AutomationDetailSection title={t('detail.configuration')}>
      {mutation.isError && (
        <FeedbackPanel tone="danger" title={t('common.operationFailed')}>
          {managementLabels.saveFailed}
        </FeedbackPanel>
      )}

      <PulseCycleEditor
        context="standalone"
        draft={pulseDraft}
        validation={validation}
        optional={false}
        onChange={(patch) =>
          setPulseDraft((current) => ({
            ...current,
            ...patch,
            enabled: true
          }))
        }
      />

      <div className="plug-settings-actions">
        <button
          className="primary-action"
          type="button"
          disabled={mutation.isPending || !validation.ok || !changed}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? managementLabels.saveBusy : managementLabels.saveAction}
        </button>
      </div>
    </AutomationDetailSection>
  );
};
