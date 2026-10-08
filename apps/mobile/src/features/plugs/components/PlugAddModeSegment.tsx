import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import { useTranslation } from '../../../app/i18n.js';

export type PlugAddMode = 'manual' | 'scan';

export type PlugAddModeSegmentProps = {
  value: PlugAddMode;
  onChange(value: PlugAddMode): void;
};

export const PlugAddModeSegment = ({ value, onChange }: PlugAddModeSegmentProps) => {
  const { t } = useTranslation();

  return (
    <IonSegment
      aria-label={t('hardware.shelly.add')}
      className="plug-add-mode-segment"
      mode="ios"
      selectOnFocus={false}
      swipeGesture={false}
      value={value}
      onIonChange={(event) => {
        const next = event.detail.value;
        if (next === 'scan' || next === 'manual') onChange(next);
      }}
    >
      <IonSegmentButton value="scan">
        <IonLabel>{t('hardware.shelly.scanNetwork')}</IonLabel>
      </IonSegmentButton>
      <IonSegmentButton value="manual">
        <IonLabel>{t('hardware.shelly.addManual')}</IonLabel>
      </IonSegmentButton>
    </IonSegment>
  );
};
