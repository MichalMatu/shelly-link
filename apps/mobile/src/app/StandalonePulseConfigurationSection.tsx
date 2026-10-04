import { FeedbackPanel } from '@lcl/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Pulse,
  useInstalledAutomationStore,
  type InstalledAutomation
} from '../features/automations/index.js';
import { pulseCycleCopy } from './locales/pulseCycle.js';
import { pulseManagementCopy } from './locales/pulseManagement.js';
import { useTranslation } from './i18n.js';

type StandalonePulseInstalledAutomation = Extract<InstalledAutomation, { kind: 'pulse' }>;

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
    Pulse.Cycle.fromConfig(installation.config.pulse)
  );

  const validation = Pulse.Cycle.parseForm({ ...pulseDraft, enabled: true });
  const nextPulseConfig = validation.ok ? validation.config : null;
  const changed =
    nextPulseConfig !== null &&
    JSON.stringify(nextPulseConfig) !== JSON.stringify(installation.config.pulse);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!validation.ok || !validation.config) {
        throw new Error('Pulse configuration is invalid.');
      }
      return Pulse.Standalone.replace({
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
      setPulseDraft(Pulse.Cycle.fromConfig(updatedInstallation.config.pulse));
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
    setPulseDraft(Pulse.Cycle.fromConfig(installation.config.pulse));
    setEditOpen(false);
  };

  return (
    <section className="installation-detail-hierarchy__section">
      <h3 className="installation-detail-hierarchy__title">{t('detail.configuration')}</h3>
      {mutation.isError && (
        <FeedbackPanel tone="danger" title={t('common.operationFailed')}>
          {managementLabels.saveFailed}
        </FeedbackPanel>
      )}
      {editOpen ? (
        <>
          <Pulse.Cycle.Editor
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
              {mutation.isPending ? managementLabels.saveBusy : managementLabels.saveAction}
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
