import { IonButton, IonSelect, IonSelectOption } from '@ionic/react';
import type { ShellyPlugsUiButtonInputMode } from '@lcl/shelly-client';
import { DiagnosticRow } from '@lcl/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { deviceButtonModeCopy } from '../../../app/locales/deviceButtonMode.js';
import type { PlugButtonModeSettingsTarget } from '../data/plugButtonModeSettings.js';
import './PlugSettingsSurface.css';
import { usePlugButtonModeSettingsFlow } from '../flows/usePlugButtonModeSettingsFlow.js';

export type PlugButtonModeSettingsCardProps = {
  target: PlugButtonModeSettingsTarget;
  locked?: boolean;
};

export const PlugButtonModeSettingsCard = ({
  target,
  locked = false
}: PlugButtonModeSettingsCardProps) => {
  const { locale } = useTranslation();
  const copy = deviceButtonModeCopy[locale];
  const { query, updateMutation } = usePlugButtonModeSettingsFlow(target);
  const settings = query.data;
  const mode = settings?.supported ? settings.mode : null;
  const [baseline, setBaseline] = useState<ShellyPlugsUiButtonInputMode | null>(mode);
  const [draft, setDraft] = useState<ShellyPlugsUiButtonInputMode | null>(mode);
  const [feedback, setFeedback] = useState<string | null>(null);
  const hasChanges = draft !== null && baseline !== null && draft !== baseline;

  useEffect(() => {
    if (!mode || hasChanges) return;
    setBaseline(mode);
    setDraft(mode);
  }, [hasChanges, mode]);

  const save = () => {
    if (locked || !draft || draft === baseline) {
      setFeedback(copy.noChanges);
      return;
    }
    setFeedback(null);
    updateMutation.mutate(draft, {
      onSuccess: (confirmed) => {
        if (confirmed.supported) {
          setBaseline(confirmed.mode);
          setDraft(confirmed.mode);
        }
        setFeedback(copy.saved);
      },
      onError: () => setFeedback(copy.actionFailed)
    });
  };

  if (query.isPending) {
    return (
      <section className="plug-settings-section installation-detail-device-button">
        <h2>{copy.title}</h2>
        <p className="plug-settings-feedback">{copy.loading}</p>
      </section>
    );
  }
  if (query.isError) {
    return (
      <section className="plug-settings-section installation-detail-device-button">
        <h2>{copy.title}</h2>
        <p className="plug-settings-feedback plug-settings-feedback--warning">
          {copy.unavailable}
        </p>
      </section>
    );
  }
  if (!settings?.supported || !draft) {
    return (
      <section className="plug-settings-section installation-detail-device-button">
        <h2>{copy.title}</h2>
        <p className="plug-settings-feedback">{copy.unsupported}</p>
      </section>
    );
  }

  if (locked) {
    const modeLabel = draft === 'momentary' ? copy.momentary : copy.detached;
    return (
      <section className="plug-settings-section installation-detail-device-button">
        <div className="plug-settings-section__heading">
          <h2>{copy.title}</h2>
          <p>{copy.managedDescription}</p>
        </div>

        <div className="plug-info-grid">
          <DiagnosticRow label={copy.currentMode} value={modeLabel} />
        </div>

        <p className="plug-settings-feedback">{copy.managedHint}</p>
      </section>
    );
  }

  return (
    <section className="plug-settings-section installation-detail-device-button">
      <div className="plug-settings-section__heading">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="field">
        <span>{copy.currentMode}</span>
        <IonSelect
          aria-label={copy.currentMode}
          className="plug-settings-ionic-select"
          fill="outline"
          interface="alert"
          value={draft}
          disabled={locked}
          onIonChange={(event) => {
            const value = event.detail.value;
            if (value === 'momentary' || value === 'detached') {
              setFeedback(null);
              setDraft(value);
            }
          }}
        >
          <IonSelectOption value="momentary">{copy.momentary}</IonSelectOption>
          <IonSelectOption value="detached">{copy.detached}</IonSelectOption>
        </IonSelect>
      </div>

      <p className="plug-settings-feedback">
        {draft === 'momentary' ? copy.momentaryHint : copy.detachedHint}
      </p>

      <div className="plug-settings-actions">
        <IonButton
          className="plug-settings-ionic-action"
          type="button"
          disabled={locked || !hasChanges || updateMutation.isPending}
          onClick={save}
        >
          {updateMutation.isPending ? copy.saving : copy.save}
        </IonButton>
      </div>

      {feedback && (
        <p role="status" className="plug-settings-feedback">
          {feedback}
        </p>
      )}
    </section>
  );
};
