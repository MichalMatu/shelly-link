import { FeedbackPanel } from '@lcl/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { pulseCycleCopy } from '../../../app/locales/pulseCycle.js';
import { pulseManagementCopy } from '../../../app/locales/pulseManagement.js';
import { PulseCycleEditor } from './PulseCycleEditor.js';
import type { StandalonePulseInstalledAutomation } from '../data/installedAutomation.js';
import { parsePulseCycleForm, pulseCycleFormFromConfig } from '../data/pulseCycleForm.js';
import { replaceStandalonePulseAutomation } from '../data/standalonePulseAutomationRuntime.js';
import { useInstalledAutomationStore } from '../state/installedAutomationStore.js';

type StandalonePulseConfigurationSectionProps = {
  installation: StandalonePulseInstalledAutomation;
  onPendingChange(pending: boolean): void;
  onSaved(installation: StandalonePulseInstalledAutomation): void;
  onSaveError(): void;
};

const secondsLabel = (milliseconds: number): string => `${milliseconds / 1_000} s`;

export const StandalonePulseConfigurationSection = ({
  installation,
  onPendingChange,
  onSaved,
  onSaveError
}: StandalonePulseConfigurationSectionProps) => {
  const { locale, t } = useTranslation();
  const pulseLabels = pulseCycleCopy[locale];
  const managementLabels = pulseManagementCopy[locale];
  const upsertInstallation = useInstalledAutomationStore(
    (state) => state.upsertInstallation
  );
  const [editOpen, setEditOpen] = useState(false);
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
      setEditOpen(false);
      onSaved(updatedInstallation);
    },
    onError: onSaveError,
    onSettled: () => onPendingChange(false)
  });

  const execution = installation.config.pulse.execution;
  const executionLabel =
    execution.mode === 'continuous'
      ? pulseLabels.continuous
      : execution.mode === 'cycles'
        ? `${pulseLabels.cycles} · ${execution.count}`
        : `${pulseLabels.duration} · ${secondsLabel(execution.durationMs)}`;

  const cancelEdit = () => {
    setPulseDraft(pulseCycleFormFromConfig(installation.config.pulse));
    setEditOpen(false);
  };

  return (
    <section className="installation-detail-hierarchy__section">
      <h3 className="installation-detail-hierarchy__title">
        {t('detail.configuration')}
      </h3>
      {mutation.isError && (
        <FeedbackPanel tone="danger" title={t('common.operationFailed')}>
          {managementLabels.saveFailed}
        </FeedbackPanel>
      )}
      {editOpen ? (
        <>
          <PulseCycleEditor
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
              className="secondary-action"
              type="button"
              disabled={mutation.isPending}
              onClick={cancelEdit}
            >
              {t('common.cancel')}
            </button>
            <button
              className="primary-action"
              type="button"
              disabled={mutation.isPending || !validation.ok || !changed}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending
                ? managementLabels.saveBusy
                : managementLabels.saveAction}
            </button>
          </div>
        </>
      ) : (
        <>
          <dl className="automation-summary installation-detail-summary installation-detail-summary--flush">
            <div>
              <dt>{pulseLabels.onSeconds}</dt>
              <dd>{secondsLabel(installation.config.pulse.onMs)}</dd>
            </div>
            <div>
              <dt>{pulseLabels.offSeconds}</dt>
              <dd>{secondsLabel(installation.config.pulse.offMs)}</dd>
            </div>
            <div>
              <dt>{pulseLabels.initialDelaySeconds}</dt>
              <dd>{secondsLabel(installation.config.pulse.initialDelayMs)}</dd>
            </div>
            <div>
              <dt>{pulseLabels.startPhase}</dt>
              <dd>
                {installation.config.pulse.startPhase === 'on'
                  ? pulseLabels.startOn
                  : pulseLabels.startOff}
              </dd>
            </div>
            <div>
              <dt>{pulseLabels.execution}</dt>
              <dd>{executionLabel}</dd>
            </div>
          </dl>
          <div className="plug-settings-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => setEditOpen(true)}
            >
              {managementLabels.editAction}
            </button>
          </div>
        </>
      )}
    </section>
  );
};
