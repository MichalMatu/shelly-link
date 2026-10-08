import { IonInput, IonSelect, IonSelectOption } from '@ionic/react';
import { useId } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import type { SensorSetupFlow } from '../pageContracts.js';

export const sensorProfileLabels = {
  xiaomi_lywsd03mmc_bthome_v2: 'Xiaomi/PVVX BTHome v2',
  tp357_custom_v1: 'TP357'
} as const;

type SensorAddFormProps = {
  flow: SensorSetupFlow;
  showValidationErrors: boolean;
};

export const SensorAddForm = ({ flow, showValidationErrors }: SensorAddFormProps) => {
  const { t } = useTranslation();
  const nameInputId = useId();
  const nameErrorId = useId();
  const macInputId = useId();
  const macErrorId = useId();
  const nameError =
    showValidationErrors && !flow.sensorInputState.ok
      ? flow.sensorInputState.fieldErrors.name
      : undefined;
  const macError =
    showValidationErrors && !flow.sensorInputState.ok
      ? flow.sensorInputState.fieldErrors.mac
      : undefined;

  return (
    <>
      <div className="field">
        <span>{t('hardware.sensor.profileLabel')}</span>
        <IonSelect
          aria-label={t('hardware.sensor.profileLabel')}
          className="sensor-profile-select"
          fill="outline"
          interface="alert"
          value={flow.sensorProfileInput}
          onIonChange={(event) => {
            const value = event.detail.value;
            if (
              value === 'xiaomi_lywsd03mmc_bthome_v2' ||
              value === 'tp357_custom_v1'
            ) {
              flow.setSensorProfileInput(value);
            }
          }}
        >
          <IonSelectOption value="xiaomi_lywsd03mmc_bthome_v2">
            {sensorProfileLabels.xiaomi_lywsd03mmc_bthome_v2}
          </IonSelectOption>
          <IonSelectOption value="tp357_custom_v1">
            {sensorProfileLabels.tp357_custom_v1}
          </IonSelectOption>
        </IonSelect>
      </div>

      <div className={nameError ? 'field field--invalid' : 'field'}>
        <span>{t('hardware.sensor.nameLabel')}</span>
        <IonInput
          id={nameInputId}
          aria-label={t('hardware.sensor.nameLabel')}
          aria-describedby={nameError ? nameErrorId : undefined}
          aria-invalid={nameError ? true : undefined}
          className="sensor-add-input"
          fill="outline"
          type="text"
          placeholder={t('hardware.sensor.namePlaceholder')}
          value={flow.sensorNameInput}
          onIonInput={(event) =>
            flow.setSensorNameInput(String(event.detail.value ?? ''))
          }
        />
        {nameError && (
          <span className="field__error" id={nameErrorId}>
            {nameError}
          </span>
        )}
      </div>
      <div className={macError ? 'field field--invalid' : 'field'}>
        <span>{t('hardware.sensor.macLabel')}</span>
        <IonInput
          id={macInputId}
          aria-label={t('hardware.sensor.macLabel')}
          aria-describedby={macError ? macErrorId : undefined}
          aria-invalid={macError ? true : undefined}
          className="sensor-add-input"
          fill="outline"
          type="text"
          inputmode="text"
          placeholder="AA:BB:CC:DD:EE:FF"
          value={flow.sensorMacInput}
          onIonInput={(event) =>
            flow.setSensorMacInput(String(event.detail.value ?? ''))
          }
        />
        {macError && (
          <span className="field__error" id={macErrorId}>
            {macError}
          </span>
        )}
      </div>
    </>
  );
};
