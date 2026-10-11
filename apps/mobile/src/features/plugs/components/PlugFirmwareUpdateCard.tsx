import { IonButton } from '@ionic/react';
import { DiagnosticRow } from '@lcl/ui';
import { useTranslation } from '../../../app/i18n.js';
import { firmwareUpdateCopy } from '../../../app/locales/firmwareUpdate.js';
import type { PlugFirmwareUpdateTarget } from '../data/plugFirmwareUpdate.js';
import { usePlugFirmwareUpdateFlow } from '../flows/usePlugFirmwareUpdateFlow.js';
import './PlugSettingsSurface.css';

export type PlugFirmwareUpdateCardProps = {
  currentFirmware: string | undefined;
  target?: PlugFirmwareUpdateTarget | undefined;
};

export const PlugFirmwareUpdateCard = ({
  currentFirmware,
  target
}: PlugFirmwareUpdateCardProps) => {
  const { locale, t } = useTranslation();
  const copy = firmwareUpdateCopy[locale];
  const { query, updateMutation, updatePhase } = usePlugFirmwareUpdateFlow(
    target,
    currentFirmware
  );
  const result = query.data;
  const stable = result?.supported ? result.updates.stable : undefined;
  const canUpdate = Boolean(result?.supported && result.canUpdate && stable);
  const verifiedFirmware = updateMutation.data?.deviceInfo.firmwareId;

  const pendingCopy =
    updatePhase === 'reconnecting'
      ? copy.reconnecting
      : updatePhase === 'verifying'
        ? copy.verifying
        : copy.updating;

  return (
    <section className="plug-settings-section installation-detail-firmware-update">
      <div className="plug-settings-section__heading">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="plug-info-grid">
        <DiagnosticRow
          label={copy.current}
          value={verifiedFirmware ?? currentFirmware ?? t('common.missing')}
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
          {copy.checkFailed}
        </p>
      )}

      {canUpdate && updatePhase !== 'complete' && (
        <div className="plug-settings-actions">
          <IonButton
            className="plug-settings-ionic-action"
            type="button"
            disabled={updateMutation.isPending}
            aria-busy={updateMutation.isPending || undefined}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? pendingCopy : copy.update}
          </IonButton>
        </div>
      )}

      {updateMutation.isPending && updatePhase !== 'starting' && (
        <p role="status" className="plug-settings-feedback">
          {pendingCopy}
        </p>
      )}
      {updatePhase === 'complete' && (
        <p role="status" className="plug-settings-feedback">
          {copy.complete}
        </p>
      )}
      {updateMutation.isError && (
        <p
          role="status"
          className="plug-settings-feedback plug-settings-feedback--warning"
        >
          {copy.updateFailed}
        </p>
      )}
    </section>
  );
};
