import { SelectField } from '@lcl/ui';
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
        <SelectField
          ariaLabel={t('hardware.sensor.profileLabel')}
          value={flow.sensorProfileInput}
          options={[
            {
              value: 'xiaomi_lywsd03mmc_bthome_v2',
              label: sensorProfileLabels.xiaomi_lywsd03mmc_bthome_v2
            },
            { value: 'tp357_custom_v1', label: sensorProfileLabels.tp357_custom_v1 }
          ]}
          onChange={(value) =>
            flow.setSensorProfileInput(value as typeof flow.sensorProfileInput)
          }
        />
      </div>

      <div className={nameError ? 'field field--invalid' : 'field'}>
        <label htmlFor={nameInputId}>{t('hardware.sensor.nameLabel')}</label>
        <input
          id={nameInputId}
          aria-describedby={nameError ? nameErrorId : undefined}
          aria-invalid={nameError ? true : undefined}
          type="text"
          placeholder={t('hardware.sensor.namePlaceholder')}
          value={flow.sensorNameInput}
          onChange={(event) => flow.setSensorNameInput(event.currentTarget.value)}
        />
        {nameError && (
          <span className="field__error" id={nameErrorId}>
            {nameError}
          </span>
        )}
      </div>
      <div className={macError ? 'field field--invalid' : 'field'}>
        <label htmlFor={macInputId}>{t('hardware.sensor.macLabel')}</label>
        <input
          id={macInputId}
          aria-describedby={macError ? macErrorId : undefined}
          aria-invalid={macError ? true : undefined}
          type="text"
          inputMode="text"
          placeholder="AA:BB:CC:DD:EE:FF"
          value={flow.sensorMacInput}
          onChange={(event) => flow.setSensorMacInput(event.currentTarget.value)}
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
