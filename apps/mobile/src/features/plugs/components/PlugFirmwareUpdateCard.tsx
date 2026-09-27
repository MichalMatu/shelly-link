import { DiagnosticRow } from '@lcl/ui';
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { firmwareUpdateCopy } from '../../../app/locales/firmwareUpdate.js';
import type { PlugFirmwareUpdateTarget } from '../data/plugFirmwareUpdate.js';
import { usePlugFirmwareUpdateFlow } from '../flows/usePlugFirmwareUpdateFlow.js';
import './PlugSettingsSurface.css';

export type PlugFirmwareUpdateCardProps = {
  currentFirmware: string | undefined;
  target?: PlugFirmwareUpdateTarget | undefined;
};

const detailError = (fallback: string, error: unknown): string => {
  const detail = error instanceof Error ? error.message.trim() : '';
  return detail ? `${fallback} ${detail}` : fallback;
};

export const PlugFirmwareUpdateCard = ({
  currentFirmware,
  target
}: PlugFirmwareUpdateCardProps) => {
  const { locale, t } = useTranslation();
  const copy = firmwareUpdateCopy[locale];
  const { query, updateMutation } = usePlugFirmwareUpdateFlow(target);
  const [feedback, setFeedback] = useState<string | null>(null);
  const result = query.data;
  const stable = result?.supported ? result.updates.stable : undefined;
  const canUpdate = Boolean(result?.supported && result.canUpdate && stable);

  const startUpdate = () => {
    setFeedback(null);
    updateMutation.mutate(undefined, {
      onSuccess: () => setFeedback(copy.started),
      onError: (error) => setFeedback(detailError(copy.updateFailed, error))
    });
  };

  return (
    <section className="plug-settings-section installation-detail-firmware-update">
      <div className="plug-settings-section__heading">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="plug-info-grid">
        <DiagnosticRow
          label={copy.current}
          value={currentFirmware ?? t('common.missing')}
        />
        {target && query.isPending && (
          <DiagnosticRow label={copy.title} value={copy.checking} />
        )}
        {target && result?.supported && (
          <DiagnosticRow
            label={copy.title}
            value={stable ? `${copy.available}: ${stable.version}` : copy.upToDate}
          />
        )}
      </div>

      {!target && <p className="plug-settings-feedback">{copy.needsWifi}</p>}
      {target && result && !result.supported && (
        <p className="plug-settings-feedback plug-settings-feedback--warning">
          {copy.unsupported}
        </p>
      )}
      {target && query.isError && (
        <p className="plug-settings-feedback plug-settings-feedback--warning">
          {detailError(copy.checkFailed, query.error)}
        </p>
      )}

      {canUpdate && (
        <div className="plug-settings-actions">
          <button
            className="primary-action"
            type="button"
            disabled={updateMutation.isPending}
            aria-busy={updateMutation.isPending || undefined}
            onClick={startUpdate}
          >
            {updateMutation.isPending ? copy.updating : copy.update}
          </button>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={`plug-settings-feedback${
            updateMutation.isError ? ' plug-settings-feedback--warning' : ''
          }`}
        >
          {feedback}
        </p>
      )}
    </section>
  );
};
