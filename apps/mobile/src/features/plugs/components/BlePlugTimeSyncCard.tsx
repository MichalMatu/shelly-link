import type { ShellyClockStatus } from '@lcl/shelly-client';
import { DiagnosticRow } from '@lcl/ui';
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { deviceTimeCopy } from '../../../app/locales/deviceTime.js';
import { BlePlugTimeSyncUnsupportedError } from '../data/blePlugTimeSync.js';
import type { SavedBlePlug } from '../data/savedBlePlug.js';
import { useBlePlugTimeSyncFlow } from '../flows/useBlePlugTimeSyncFlow.js';
import './PlugSettingsSurface.css';

export type BlePlugTimeSyncCardProps = {
  plug: SavedBlePlug;
  clock: ShellyClockStatus;
};

export const BlePlugTimeSyncCard = ({ plug, clock }: BlePlugTimeSyncCardProps) => {
  const { locale } = useTranslation();
  const copy = deviceTimeCopy[locale];
  const syncMutation = useBlePlugTimeSyncFlow(plug);
  const [feedback, setFeedback] = useState<string | null>(null);
  const currentTime = clock.localTime ?? copy.unavailable;

  const sync = () => {
    setFeedback(null);
    syncMutation.mutate(undefined, {
      onSuccess: () => setFeedback(copy.synced),
      onError: (error) => {
        if (error instanceof BlePlugTimeSyncUnsupportedError) {
          setFeedback(copy.unsupported);
          return;
        }
        const detail = error instanceof Error ? error.message.trim() : '';
        setFeedback(detail ? `${copy.actionFailed} ${detail}` : copy.actionFailed);
      }
    });
  };

  return (
    <section className="plug-settings-section installation-detail-device-time">
      <div className="plug-settings-section__heading">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="plug-info-grid">
        <DiagnosticRow label={copy.currentTime} value={currentTime} />
      </div>

      <div className="plug-settings-actions">
        <button
          className="primary-action"
          type="button"
          disabled={syncMutation.isPending}
          onClick={sync}
        >
          {syncMutation.isPending ? copy.syncing : copy.sync}
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          className={`plug-settings-feedback${
            syncMutation.isError ? ' plug-settings-feedback--warning' : ''
          }`}
        >
          {feedback}
        </p>
      )}
    </section>
  );
};
