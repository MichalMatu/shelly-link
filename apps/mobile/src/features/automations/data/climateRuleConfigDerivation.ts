import { defaultRuleForPreset, type RulePresetId } from '@lcl/automation-core';
import type { SensorProfileId } from '@lcl/device-profiles';
import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript,
  type ClimateSensor,
  type ClimateSensorAggregation,
  type ShellyThermostatConfig
} from '@lcl/script-generator';
import { t } from '../../../app/i18n.js';
import {
  parseRuleAdvancedSettings,
  validateRuleAdvancedSettings
} from './climateRuleSettings.js';
import {
  DEFAULT_PULSE_CYCLE_FORM,
  parsePulseCycleForm,
  type PulseCycleFormDraft
} from './pulseCycleForm.js';

export type ClimateRuleDraftSensor = {
  id: string;
  name: string;
  runtimeAddress: string;
  profileId: SensorProfileId;
};

export type ClimateConfigState =
  | { ok: true; config: ShellyThermostatConfig; script: string }
  | { ok: false; error: string };

type AdvancedRuleInputs = {
  vpdAssistEnabled: boolean;
  vpdTargetInput: string;
  rssiMinInput: string;
  staleTimeoutMinInput: string;
  minChangeMinInput: string;
  maxOnHoursInput: string;
};

export type ClimateRuleDerivationInput = AdvancedRuleInputs & {
  selectedSensor: ClimateRuleDraftSensor | null;
  additionalSensors?: readonly ClimateRuleDraftSensor[];
  sensorAggregation?: ClimateSensorAggregation;
  rulePreset: RulePresetId;
  onThresholdInput: string;
  offThresholdInput: string;
  pulseCycleDraft?: PulseCycleFormDraft;
};

const formatSensorId = (runtimeAddress: string): string =>
  `sensor-${runtimeAddress.replace(/:/g, '').toLowerCase()}`;

const toNumberOrFallback = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const climateSensorFromDraft = (sensor: ClimateRuleDraftSensor): ClimateSensor => ({
  profileId: sensor.profileId,
  sensorId: formatSensorId(sensor.runtimeAddress),
  runtimeAddress: sensor.runtimeAddress,
  displayName: sensor.name,
  parserValidated: true
});

export const deriveClimateRuleState = ({
  selectedSensor,
  additionalSensors = [],
  sensorAggregation = 'avg',
  rulePreset,
  onThresholdInput,
  offThresholdInput,
  pulseCycleDraft = DEFAULT_PULSE_CYCLE_FORM,
  vpdAssistEnabled,
  vpdTargetInput,
  rssiMinInput,
  staleTimeoutMinInput,
  minChangeMinInput,
  maxOnHoursInput
}: ClimateRuleDerivationInput) => {
  const advancedInputs: AdvancedRuleInputs = {
    vpdAssistEnabled,
    vpdTargetInput,
    rssiMinInput,
    staleTimeoutMinInput,
    minChangeMinInput,
    maxOnHoursInput
  };
  const advancedSettingsValidation = validateRuleAdvancedSettings(advancedInputs);
  const pulseCycleValidation = parsePulseCycleForm(pulseCycleDraft);

  let configState: ClimateConfigState;
  try {
    if (!selectedSensor) {
      throw new Error(t('hardware.flow.noSelectedSensor'));
    }
    if (!advancedSettingsValidation.isValid) {
      throw new Error(t('hardware.flow.advancedOptionsInvalid'));
    }
    if (!pulseCycleValidation.ok) {
      throw new Error(t('hardware.flow.configInvalid'));
    }

    const base = createDefaultShellyThermostatConfig(
      selectedSensor.profileId,
      rulePreset
    );
    const advancedSettings = parseRuleAdvancedSettings(advancedInputs);
    const config: ShellyThermostatConfig = {
      ...base,
      sensor: climateSensorFromDraft(selectedSensor),
      ...(additionalSensors.length > 0
        ? {
            sensorSet: {
              aggregation: sensorAggregation,
              additionalSensors: additionalSensors.map(climateSensorFromDraft)
            }
          }
        : {}),
      ...(pulseCycleValidation.config
        ? { execution: { pulse: pulseCycleValidation.config } }
        : {}),
      rule: {
        ...base.rule,
        control: {
          ...base.rule.control,
          onThreshold: toNumberOrFallback(
            onThresholdInput,
            base.rule.control.onThreshold
          ),
          offThreshold: toNumberOrFallback(
            offThresholdInput,
            base.rule.control.offThreshold
          )
        },
        vpdAssist: {
          enabled: vpdAssistEnabled,
          targetKpa: advancedSettings.vpdTargetKpa
        },
        staleTimeoutSec: advancedSettings.staleTimeoutSec,
        minChangeMs: advancedSettings.minChangeMs,
        maxOnMs: advancedSettings.maxOnMs,
        rssiMin: advancedSettings.rssiMin
      }
    };

    configState = {
      ok: true,
      config,
      script: generateShellyThermostatScript(config)
    };
  } catch (error) {
    const localizedErrors = [
      t('hardware.flow.noSelectedSensor'),
      t('hardware.flow.advancedOptionsInvalid'),
      t('hardware.flow.configInvalid')
    ];
    configState = {
      ok: false,
      error:
        error instanceof Error && localizedErrors.includes(error.message)
          ? error.message
          : t('hardware.flow.configInvalid')
    };
  }

  const onThreshold = Number(onThresholdInput);
  const offThreshold = Number(offThresholdInput);
  const direction = defaultRuleForPreset(rulePreset).control.direction;
  const isThresholdValid =
    Number.isFinite(onThreshold) &&
    Number.isFinite(offThreshold) &&
    (direction === 'below' ? onThreshold < offThreshold : onThreshold > offThreshold);

  return {
    advancedSettingsValidation,
    pulseCycleValidation,
    configState,
    isThresholdValid,
    isVpdAssistValid: advancedSettingsValidation.isVpdTargetValid
  };
};
