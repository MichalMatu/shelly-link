import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import { useTranslation } from '../../../app/i18n.js';

export type SensorAddMode = 'manual' | 'phone-scan';

export type SensorAddModeSegmentProps = {
  value: SensorAddMode;
  onChange(value: SensorAddMode): void;
};

export const SensorAddModeSegment = ({
  value,
  onChange
}: SensorAddModeSegmentProps) => {
  const { t } = useTranslation();

  return (
    <IonSegment
      aria-label={t('hardware.sensor.add')}
      className="sensor-add-mode-segment"
      mode="ios"
      selectOnFocus={false}
      swipeGesture={false}
      value={value}
      onIonChange={(event) => {
        const next = event.detail.value;
        if (next === 'phone-scan' || next === 'manual') onChange(next);
      }}
    >
      <IonSegmentButton
        value="phone-scan"
        title={t('hardware.sensor.scanPhoneTitle')}
      >
        <IonLabel>{t('hardware.sensor.scanBle')}</IonLabel>
      </IonSegmentButton>
      <IonSegmentButton value="manual">
        <IonLabel>{t('hardware.shelly.addManual')}</IonLabel>
      </IonSegmentButton>
    </IonSegment>
  );
};
